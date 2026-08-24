package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	db "github.com/yurifa/expense-tracker-api/internal/repository/db"
)

// Every mutation runs inside withinLockedTx: entity write + change_log append
// commit atomically, and the per-user advisory lock keeps change_log seq order
// equal to commit order. Deletes are tombstones guarded by the in-use check.

func (r *Repository) CreateAccount(ctx context.Context, params domain.CreateAccountParams) (*domain.Account, error) {
	const op = "repository.postgres.CreateAccount"

	id := newEntityID(params.ID)
	var row db.CreateAccountRow
	err := r.withinLockedTx(ctx, params.UserID, func(q *db.Queries) error {
		var err error
		row, err = q.CreateAccount(ctx, db.CreateAccountParams{
			ID:             id,
			UserID:         params.UserID,
			Name:           params.Name,
			Currency:       params.Currency,
			OpeningBalance: params.OpeningBalance,
		})
		if err != nil {
			if pgUniqueViolation(err) {
				return domain.ErrAccountAlreadyExists
			}
			return err
		}
		return appendChangeLog(
			ctx,
			q,
			params.UserID,
			row.ID,
			domain.SyncEntityAccount,
			domain.SyncChangeUpsert,
			int(row.Version),
		)
	})
	if err != nil {
		return nil, opWrap(op, err)
	}
	return accountRow(
		row.ID, row.UserID, row.Name, row.Currency,
		row.OpeningBalance, row.ManualAdjustment, row.Balance, row.CreatedAt, row.UpdatedAt, int(row.Version),
	), nil
}

func (r *Repository) UpdateAccount(
	ctx context.Context,
	userID, id uuid.UUID,
	params domain.UpdateAccountParams,
) (*domain.Account, error) {
	const op = "repository.postgres.UpdateAccount"

	var row db.UpdateAccountRow
	err := r.withinLockedTx(ctx, userID, func(q *db.Queries) error {
		var err error
		row, err = q.UpdateAccount(ctx, db.UpdateAccountParams{
			ID:               id,
			UserID:           userID,
			Name:             params.Name,
			ManualAdjustment: params.ManualAdjustment,
			Version:          int32(params.Version), //nolint:gosec // optimistic version is a small positive int
		})
		if err != nil {
			if errNoRows(err) {
				return classifyAccountWrite(ctx, q, userID, id)
			}
			return err
		}
		return appendChangeLog(
			ctx,
			q,
			userID,
			row.ID,
			domain.SyncEntityAccount,
			domain.SyncChangeUpsert,
			int(row.Version),
		)
	})
	if err != nil {
		return nil, opWrap(op, err)
	}
	return accountRow(
		row.ID, row.UserID, row.Name, row.Currency,
		row.OpeningBalance, row.ManualAdjustment, row.Balance, row.CreatedAt, row.UpdatedAt, int(row.Version),
	), nil
}

func (r *Repository) DeleteAccount( //nolint:dupl // account/category delete twins: identical guard shape
	ctx context.Context,
	userID, id uuid.UUID,
) error {
	const op = "repository.postgres.DeleteAccount"

	err := r.withinLockedTx(ctx, userID, func(q *db.Queries) error {
		inUse, err := q.HasLiveTransactionsForAccount(ctx, db.HasLiveTransactionsForAccountParams{
			UserID:    userID,
			AccountID: &id,
		})
		if err != nil {
			return err
		}
		if inUse {
			return domain.ErrAccountHasTransactions
		}
		plansInUse, err := q.HasLivePlannedPaymentsForAccount(ctx, db.HasLivePlannedPaymentsForAccountParams{
			UserID:    userID,
			AccountID: id,
		})
		if err != nil {
			return err
		}
		if plansInUse {
			return domain.ErrAccountHasPlannedPayments
		}
		version, err := q.SoftDeleteAccount(ctx, db.SoftDeleteAccountParams{ID: id, UserID: userID})
		if err != nil {
			if errNoRows(err) {
				return classifyAccountWrite(ctx, q, userID, id)
			}
			return err
		}
		return appendChangeLog(ctx, q, userID, id, domain.SyncEntityAccount, domain.SyncChangeTombstone, int(version))
	})
	if err != nil {
		return opWrap(op, err)
	}
	return nil
}

// classifyAccountWrite distinguishes the zero-row outcomes of a CAS write for
// the REST surface: never-existed and tombstoned both read as not-found, a
// live row that did not match the expected version is a version conflict.
func classifyAccountWrite(ctx context.Context, q *db.Queries, userID, id uuid.UUID) error {
	row, err := q.GetAccountAny(ctx, db.GetAccountAnyParams{ID: id, UserID: userID})
	if err != nil || row.DeletedAt != nil {
		return domain.ErrAccountNotFound
	}
	return domain.ErrAccountVersionConflict
}

func (r *Repository) GetAccount(ctx context.Context, userID, id uuid.UUID) (*domain.Account, error) {
	const op = "repository.postgres.GetAccount"

	row, err := r.q.GetAccount(ctx, db.GetAccountParams{ID: id, UserID: userID})
	if err != nil {
		if errNoRows(err) {
			return nil, domain.ErrAccountNotFound
		}
		return nil, opWrap(op, err)
	}
	return accountRow(
		row.ID, row.UserID, row.Name, row.Currency,
		row.OpeningBalance, row.ManualAdjustment, row.Balance, row.CreatedAt, row.UpdatedAt, int(row.Version),
	), nil
}

func (r *Repository) GetAccounts(ctx context.Context, userID uuid.UUID) ([]domain.Account, error) {
	const op = "repository.postgres.GetAccounts"

	rows, err := r.q.GetAccounts(ctx, userID)
	if err != nil {
		return nil, opWrap(op, err)
	}
	out := make([]domain.Account, 0, len(rows))
	for _, row := range rows {
		out = append(
			out,
			*accountRow(row.ID, row.UserID, row.Name, row.Currency, row.OpeningBalance, row.ManualAdjustment, row.Balance, row.CreatedAt, row.UpdatedAt, int(row.Version)),
		)
	}
	return out, nil
}

func (r *Repository) GetAccountBalances(ctx context.Context, userID uuid.UUID) ([]domain.AccountBalance, error) {
	const op = "repository.postgres.GetAccountBalances"

	rows, err := r.q.GetAccountBalances(ctx, userID)
	if err != nil {
		return nil, opWrap(op, err)
	}
	out := make([]domain.AccountBalance, 0, len(rows))
	for _, row := range rows {
		out = append(out, domain.AccountBalance{
			ID:       row.ID,
			UserID:   row.UserID,
			Name:     row.Name,
			Currency: row.Currency,
			Balance:  row.Balance,
		})
	}
	return out, nil
}

// accountRow assembles a domain.Account from its fields. The account SELECT
// queries return structurally-identical generated Row types (they differ only
// in name), so the construction is centralized here.
func accountRow(
	id, userID uuid.UUID,
	name, currency string,
	openingBalance, manualAdjustment, balance int64,
	createdAt, updatedAt time.Time,
	version int,
) *domain.Account {
	return &domain.Account{
		ID:               id,
		UserID:           userID,
		Name:             name,
		Currency:         currency,
		OpeningBalance:   openingBalance,
		ManualAdjustment: manualAdjustment,
		Balance:          balance,
		CreatedAt:        createdAt,
		UpdatedAt:        updatedAt,
		Version:          version,
	}
}

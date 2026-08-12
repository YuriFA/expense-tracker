package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	db "github.com/yurifa/expense-tracker-api/internal/repository/db"
)

func (r *Repository) CreateAccount(ctx context.Context, params domain.CreateAccountParams) (*domain.Account, error) {
	const op = "repository.postgres.CreateAccount"

	row, err := r.q.CreateAccount(ctx, db.CreateAccountParams{
		UserID:         params.UserID,
		Name:           params.Name,
		Currency:       params.Currency,
		OpeningBalance: params.OpeningBalance,
	})
	if err != nil {
		return nil, opWrap(op, err)
	}
	return accountRow(
		row.ID,
		row.UserID,
		row.Name,
		row.Currency,
		row.OpeningBalance,
		row.ManualAdjustment,
		row.Balance,
		row.CreatedAt,
		row.UpdatedAt,
	), nil
}

func (r *Repository) UpdateAccount(
	ctx context.Context,
	userID, id uuid.UUID,
	params domain.UpdateAccountParams,
) (*domain.Account, error) {
	const op = "repository.postgres.UpdateAccount"

	row, err := r.q.UpdateAccount(ctx, db.UpdateAccountParams{
		ID:               id,
		UserID:           userID,
		Name:             params.Name,
		ManualAdjustment: params.ManualAdjustment,
	})
	if err != nil {
		if errNoRows(err) {
			return nil, domain.ErrAccountNotFound
		}
		return nil, opWrap(op, err)
	}
	return accountRow(
		row.ID,
		row.UserID,
		row.Name,
		row.Currency,
		row.OpeningBalance,
		row.ManualAdjustment,
		row.Balance,
		row.CreatedAt,
		row.UpdatedAt,
	), nil
}

func (r *Repository) DeleteAccount(ctx context.Context, userID, id uuid.UUID) error {
	const op = "repository.postgres.DeleteAccount"

	n, err := r.q.DeleteAccount(ctx, db.DeleteAccountParams{ID: id, UserID: userID})
	if err != nil {
		if pgConstraintViolation(err, pgCodeFKViolation) {
			return domain.ErrAccountHasTransactions
		}
		return opWrap(op, err)
	}
	if n == 0 {
		return domain.ErrAccountNotFound
	}
	return nil
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
		row.ID,
		row.UserID,
		row.Name,
		row.Currency,
		row.OpeningBalance,
		row.ManualAdjustment,
		row.Balance,
		row.CreatedAt,
		row.UpdatedAt,
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
			*accountRow(row.ID, row.UserID, row.Name, row.Currency, row.OpeningBalance, row.ManualAdjustment, row.Balance, row.CreatedAt, row.UpdatedAt),
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

// accountRow assembles a domain.Account from its fields. The four account SELECT
// queries return structurally-identical generated Row types (they differ only in
// name), so the construction is centralized here.
func accountRow(
	id, userID uuid.UUID,
	name, currency string,
	openingBalance, manualAdjustment, balance int64,
	createdAt, updatedAt time.Time,
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
	}
}

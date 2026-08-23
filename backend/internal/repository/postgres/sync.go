package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
	db "github.com/yurifa/expense-tracker-api/internal/repository/db"
)

// syncTx implements repository.SyncTx over the open batch transaction.
type syncTx struct {
	q *db.Queries
}

// Compile-time guarantee.
var _ repository.SyncTx = (*syncTx)(nil)

func (r *Repository) WithinUserTx(ctx context.Context, userID uuid.UUID, fn func(t repository.SyncTx) error) error {
	const op = "repository.postgres.WithinUserTx"

	err := r.withinLockedTx(ctx, userID, func(q *db.Queries) error {
		return fn(&syncTx{q: q})
	})
	if err != nil {
		return opWrap(op, err)
	}
	return nil
}

// --- applied_operations -----------------------------------------------------

func (t *syncTx) GetAppliedOperation(ctx context.Context, userID, opID uuid.UUID) (*domain.AppliedOperation, error) {
	const op = "repository.postgres.syncTx.GetAppliedOperation"

	row, err := t.q.GetAppliedOperation(ctx, db.GetAppliedOperationParams{UserID: userID, OpID: opID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil //nolint:nilnil // (nil, nil) is the documented "never created" signal
		}
		return nil, opWrap(op, err)
	}
	var result domain.SyncPushResult
	if err := json.Unmarshal(row.Result, &result); err != nil {
		return nil, opWrap(op, err)
	}
	return &domain.AppliedOperation{
		OpID:      row.OpID,
		UserID:    row.UserID,
		Entity:    row.Entity,
		EntityID:  row.EntityID,
		Result:    result,
		AppliedAt: row.AppliedAt,
	}, nil
}

func (t *syncTx) InsertAppliedOperation(ctx context.Context, rec domain.AppliedOperation) error {
	const op = "repository.postgres.syncTx.InsertAppliedOperation"

	raw, err := json.Marshal(rec.Result)
	if err != nil {
		return opWrap(op, err)
	}
	if err := t.q.InsertAppliedOperation(ctx, db.InsertAppliedOperationParams{
		OpID:     rec.OpID,
		UserID:   rec.UserID,
		Entity:   rec.Entity,
		EntityID: rec.EntityID,
		Result:   raw,
	}); err != nil {
		return opWrap(op, err)
	}
	return nil
}

// --- reads (incl. tombstones) -------------------------------------------------

func (t *syncTx) GetAccountAny(ctx context.Context, userID, id uuid.UUID) (*domain.Account, error) {
	const op = "repository.postgres.syncTx.GetAccountAny"

	row, err := t.q.GetAccountAny(ctx, db.GetAccountAnyParams{ID: id, UserID: userID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil //nolint:nilnil // (nil, nil) is the documented "never created" signal
		}
		return nil, opWrap(op, err)
	}
	return &domain.Account{
		ID:               row.ID,
		UserID:           row.UserID,
		Name:             row.Name,
		Currency:         row.Currency,
		OpeningBalance:   row.OpeningBalance,
		ManualAdjustment: row.ManualAdjustment,
		Balance:          row.Balance,
		CreatedAt:        row.CreatedAt,
		UpdatedAt:        row.UpdatedAt,
		Version:          int(row.Version),
		DeletedAt:        row.DeletedAt,
	}, nil
}

func (t *syncTx) GetCategoryAny(ctx context.Context, userID, id uuid.UUID) (*domain.Category, error) {
	const op = "repository.postgres.syncTx.GetCategoryAny"

	row, err := t.q.GetCategoryAny(ctx, db.GetCategoryAnyParams{ID: id, UserID: userID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil //nolint:nilnil // (nil, nil) is the documented "never created" signal
		}
		return nil, opWrap(op, err)
	}
	return &domain.Category{
		ID:        row.ID,
		UserID:    row.UserID,
		Name:      row.Name,
		Type:      domain.TransactionType(row.Type),
		Icon:      row.Icon,
		Color:     row.Color,
		CreatedAt: row.CreatedAt,
		UpdatedAt: row.UpdatedAt,
		Version:   int(row.Version),
		DeletedAt: row.DeletedAt,
	}, nil
}

func (t *syncTx) GetTransactionAny(ctx context.Context, userID, id uuid.UUID) (*domain.Transaction, error) {
	const op = "repository.postgres.syncTx.GetTransactionAny"

	row, err := t.q.GetTransactionAny(ctx, db.GetTransactionAnyParams{ID: id, UserID: userID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil //nolint:nilnil // (nil, nil) is the documented "never created" signal
		}
		return nil, opWrap(op, err)
	}
	return transactionFromFields(
		row.ID, row.UserID, row.Type, row.Amount, row.Description, row.OccurredAt,
		row.CreatedAt, row.UpdatedAt, int(row.Version),
		row.AccountID, row.CategoryID, row.FromAccountID, row.ToAccountID, row.DeletedAt,
	), nil
}

func (t *syncTx) GetDebtorAny(ctx context.Context, userID, id uuid.UUID) (*domain.Debtor, error) {
	const op = "repository.postgres.syncTx.GetDebtorAny"

	row, err := t.q.GetDebtorAny(ctx, db.GetDebtorAnyParams{ID: id, UserID: userID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil //nolint:nilnil // (nil, nil) is the documented "never created" signal
		}
		return nil, opWrap(op, err)
	}
	d := debtorFromFields(row.ID, row.UserID, row.Name, row.Note, row.CreatedAt, row.UpdatedAt, int(row.Version))
	d.DeletedAt = row.DeletedAt
	return d, nil
}

func (t *syncTx) GetDebtOperationAny(ctx context.Context, userID, id uuid.UUID) (*domain.DebtOperation, error) {
	const op = "repository.postgres.syncTx.GetDebtOperationAny"

	row, err := t.q.GetDebtOperationAny(ctx, db.GetDebtOperationAnyParams{ID: id, UserID: userID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil //nolint:nilnil // (nil, nil) is the documented "never created" signal
		}
		return nil, opWrap(op, err)
	}
	op2 := debtOperationFromFields(
		row.ID, row.UserID, row.DebtorID, row.Direction, row.Kind,
		row.Amount, row.Note, row.OccurredAt, row.CreatedAt, row.UpdatedAt, int(row.Version),
	)
	op2.DeletedAt = row.DeletedAt
	return op2, nil
}

// --- live reads ----------------------------------------------------------------

func (t *syncTx) LiveAccountExists(ctx context.Context, userID, id uuid.UUID) (bool, error) {
	const op = "repository.postgres.syncTx.LiveAccountExists"

	a, err := t.GetAccountAny(ctx, userID, id)
	if err != nil {
		return false, opWrap(op, err)
	}
	return a != nil && !a.Deleted(), nil
}

func (t *syncTx) LiveCategory(ctx context.Context, userID, id uuid.UUID) (*domain.Category, error) {
	const op = "repository.postgres.syncTx.LiveCategory"

	c, err := t.GetCategoryAny(ctx, userID, id)
	if err != nil {
		return nil, opWrap(op, err)
	}
	if c == nil || c.Deleted() {
		return nil, domain.ErrCategoryNotFound
	}
	return c, nil
}

func (t *syncTx) CategoryNameTaken(
	ctx context.Context,
	userID uuid.UUID,
	name string,
	exceptID uuid.UUID,
) (bool, error) {
	const op = "repository.postgres.syncTx.CategoryNameTaken"

	taken, err := t.q.CategoryNameTaken(ctx, db.CategoryNameTakenParams{
		UserID:   userID,
		Name:     name,
		ExceptID: exceptID,
	})
	if err != nil {
		return false, opWrap(op, err)
	}
	return taken, nil
}

func (t *syncTx) HasLiveTransactionsForAccount(ctx context.Context, userID, accountID uuid.UUID) (bool, error) {
	const op = "repository.postgres.syncTx.HasLiveTransactionsForAccount"

	inUse, err := t.q.HasLiveTransactionsForAccount(ctx, db.HasLiveTransactionsForAccountParams{
		UserID:    userID,
		AccountID: &accountID,
	})
	if err != nil {
		return false, opWrap(op, err)
	}
	return inUse, nil
}

func (t *syncTx) HasLiveTransactionsForCategory(ctx context.Context, userID, categoryID uuid.UUID) (bool, error) {
	const op = "repository.postgres.syncTx.HasLiveTransactionsForCategory"

	inUse, err := t.q.HasLiveTransactionsForCategory(ctx, db.HasLiveTransactionsForCategoryParams{
		UserID:     userID,
		CategoryID: &categoryID,
	})
	if err != nil {
		return false, opWrap(op, err)
	}
	return inUse, nil
}

func (t *syncTx) LiveDebtorExists(ctx context.Context, userID, id uuid.UUID) (bool, error) {
	const op = "repository.postgres.syncTx.LiveDebtorExists"

	d, err := t.GetDebtorAny(ctx, userID, id)
	if err != nil {
		return false, opWrap(op, err)
	}
	return d != nil && !d.Deleted(), nil
}

func (t *syncTx) DebtorNameTaken(
	ctx context.Context,
	userID uuid.UUID,
	name string,
	exceptID uuid.UUID,
) (bool, error) {
	const op = "repository.postgres.syncTx.DebtorNameTaken"

	taken, err := t.q.DebtorNameTaken(ctx, db.DebtorNameTakenParams{
		UserID:   userID,
		Name:     name,
		ExceptID: exceptID,
	})
	if err != nil {
		return false, opWrap(op, err)
	}
	return taken, nil
}

func (t *syncTx) HasLiveDebtOperationsForDebtor(ctx context.Context, userID, debtorID uuid.UUID) (bool, error) {
	const op = "repository.postgres.syncTx.HasLiveDebtOperationsForDebtor"

	inUse, err := t.q.HasLiveDebtOperationsForDebtor(ctx, db.HasLiveDebtOperationsForDebtorParams{
		UserID:   userID,
		DebtorID: debtorID,
	})
	if err != nil {
		return false, opWrap(op, err)
	}
	return inUse, nil
}

// --- writes (each appends change_log on the same tx) -----------------------------

func (t *syncTx) CreateAccount(ctx context.Context, params domain.CreateAccountParams) (*domain.Account, error) {
	const op = "repository.postgres.syncTx.CreateAccount"

	row, err := t.q.CreateAccount(ctx, db.CreateAccountParams{
		ID:             newEntityID(params.ID),
		UserID:         params.UserID,
		Name:           params.Name,
		Currency:       params.Currency,
		OpeningBalance: params.OpeningBalance,
	})
	if err != nil {
		if pgUniqueViolation(err) {
			return nil, domain.ErrAccountAlreadyExists
		}
		return nil, opWrap(op, err)
	}
	if err := appendChangeLog(
		ctx, t.q, params.UserID, row.ID,
		domain.SyncEntityAccount, domain.SyncChangeUpsert, int(row.Version),
	); err != nil {
		return nil, opWrap(op, err)
	}
	return accountRow(
		row.ID, row.UserID, row.Name, row.Currency,
		row.OpeningBalance, row.ManualAdjustment, row.Balance, row.CreatedAt, row.UpdatedAt, int(row.Version),
	), nil
}

func (t *syncTx) ReplaceAccount(
	ctx context.Context,
	userID, id uuid.UUID,
	baseVersion int,
	st domain.AccountFullState,
) (*domain.Account, error) {
	const op = "repository.postgres.syncTx.ReplaceAccount"

	row, err := t.q.SyncReplaceAccount(ctx, db.SyncReplaceAccountParams{
		ID:               id,
		UserID:           userID,
		Name:             st.Name,
		Currency:         st.Currency,
		OpeningBalance:   st.OpeningBalance,
		ManualAdjustment: st.ManualAdjustment,
		BaseVersion:      int32(baseVersion), //nolint:gosec // server versions are small positive ints
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, t.classifySyncWrite(
				ctx,
				userID,
				id,
				domain.SyncEntityAccount,
				domain.ErrAccountNotFound,
				domain.ErrAccountVersionConflict,
			)
		}
		return nil, opWrap(op, err)
	}
	if err := appendChangeLog(
		ctx, t.q, userID, row.ID, domain.SyncEntityAccount, domain.SyncChangeUpsert, int(row.Version),
	); err != nil {
		return nil, opWrap(op, err)
	}
	return accountRow(
		row.ID, row.UserID, row.Name, row.Currency,
		row.OpeningBalance, row.ManualAdjustment, row.Balance, row.CreatedAt, row.UpdatedAt, int(row.Version),
	), nil
}

func (t *syncTx) TombstoneAccount( //nolint:dupl // account/category/transaction twins
	ctx context.Context,
	userID, id uuid.UUID,
) (*domain.Account, error) {
	const op = "repository.postgres.syncTx.TombstoneAccount"

	version, err := t.q.SoftDeleteAccount(ctx, db.SoftDeleteAccountParams{ID: id, UserID: userID})
	if err != nil { //nolint:nestif // classify absent vs already-tombstoned (idempotent delete)
		if errors.Is(err, pgx.ErrNoRows) {
			current, err := t.GetAccountAny(ctx, userID, id)
			if err != nil {
				return nil, opWrap(op, err)
			}
			if current == nil {
				return nil, domain.ErrAccountNotFound
			}
			return current, nil // already tombstoned: idempotent delete
		}
		return nil, opWrap(op, err)
	}
	if err := appendChangeLog(
		ctx, t.q, userID, id, domain.SyncEntityAccount, domain.SyncChangeTombstone, int(version),
	); err != nil {
		return nil, opWrap(op, err)
	}
	a := &domain.Account{ID: id, UserID: userID, Version: int(version)}
	now := time.Now().UTC()
	a.DeletedAt = &now
	return a, nil
}

func (t *syncTx) CreateCategory(ctx context.Context, params domain.CreateCategoryParams) (*domain.Category, error) {
	const op = "repository.postgres.syncTx.CreateCategory"

	row, err := t.q.CreateCategory(ctx, db.CreateCategoryParams{
		ID:     newEntityID(params.ID),
		UserID: params.UserID,
		Name:   params.Name,
		Type:   string(params.Type),
		Icon:   params.Icon,
		Color:  params.Color,
	})
	if err != nil {
		if pgUniqueViolation(err) {
			return nil, domain.ErrCategoryAlreadyExists
		}
		return nil, opWrap(op, err)
	}
	if err := appendChangeLog(
		ctx, t.q, params.UserID, row.ID, domain.SyncEntityCategory, domain.SyncChangeUpsert, int(row.Version),
	); err != nil {
		return nil, opWrap(op, err)
	}
	return &domain.Category{
		ID: row.ID, UserID: row.UserID, Name: row.Name,
		Type: domain.TransactionType(row.Type), Icon: row.Icon, Color: row.Color,
		CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt, Version: int(row.Version),
	}, nil
}

func (t *syncTx) ReplaceCategory(
	ctx context.Context,
	userID, id uuid.UUID,
	baseVersion int,
	st domain.CategoryFullState,
) (*domain.Category, error) {
	const op = "repository.postgres.syncTx.ReplaceCategory"

	row, err := t.q.SyncReplaceCategory(ctx, db.SyncReplaceCategoryParams{
		ID:          id,
		UserID:      userID,
		Name:        st.Name,
		Type:        string(st.Type),
		Icon:        st.Icon,
		Color:       st.Color,
		BaseVersion: int32(baseVersion), //nolint:gosec // server versions are small positive ints
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, t.classifySyncWrite(
				ctx,
				userID,
				id,
				domain.SyncEntityCategory,
				domain.ErrCategoryNotFound,
				domain.ErrCategoryVersionConflict,
			)
		}
		return nil, opWrap(op, err)
	}
	if err := appendChangeLog(
		ctx, t.q, userID, row.ID, domain.SyncEntityCategory, domain.SyncChangeUpsert, int(row.Version),
	); err != nil {
		return nil, opWrap(op, err)
	}
	return &domain.Category{
		ID: row.ID, UserID: row.UserID, Name: row.Name,
		Type: domain.TransactionType(row.Type), Icon: row.Icon, Color: row.Color,
		CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt, Version: int(row.Version),
	}, nil
}

func (t *syncTx) TombstoneCategory( //nolint:dupl // account/category/transaction twins
	ctx context.Context,
	userID, id uuid.UUID,
) (*domain.Category, error) {
	const op = "repository.postgres.syncTx.TombstoneCategory"

	version, err := t.q.SoftDeleteCategory(ctx, db.SoftDeleteCategoryParams{ID: id, UserID: userID})
	if err != nil { //nolint:nestif // classify absent vs already-tombstoned (idempotent delete)
		if errors.Is(err, pgx.ErrNoRows) {
			current, err := t.GetCategoryAny(ctx, userID, id)
			if err != nil {
				return nil, opWrap(op, err)
			}
			if current == nil {
				return nil, domain.ErrCategoryNotFound
			}
			return current, nil // already tombstoned: idempotent delete
		}
		return nil, opWrap(op, err)
	}
	if err := appendChangeLog(
		ctx, t.q, userID, id, domain.SyncEntityCategory, domain.SyncChangeTombstone, int(version),
	); err != nil {
		return nil, opWrap(op, err)
	}
	c := &domain.Category{ID: id, UserID: userID, Version: int(version)}
	now := time.Now().UTC()
	c.DeletedAt = &now
	return c, nil
}

func (t *syncTx) CreateDebtor(ctx context.Context, params domain.CreateDebtorParams) (*domain.Debtor, error) {
	const op = "repository.postgres.syncTx.CreateDebtor"

	row, err := t.q.CreateDebtor(ctx, db.CreateDebtorParams{
		ID:     newEntityID(params.ID),
		UserID: params.UserID,
		Name:   params.Name,
		Note:   params.Note,
	})
	if err != nil {
		if pgUniqueViolation(err) {
			return nil, domain.ErrDebtorAlreadyExists
		}
		return nil, opWrap(op, err)
	}
	if err := appendChangeLog(
		ctx, t.q, params.UserID, row.ID, domain.SyncEntityDebtor, domain.SyncChangeUpsert, int(row.Version),
	); err != nil {
		return nil, opWrap(op, err)
	}
	return debtorFromFields(
		row.ID, row.UserID, row.Name, row.Note, row.CreatedAt, row.UpdatedAt, int(row.Version),
	), nil
}

func (t *syncTx) ReplaceDebtor(
	ctx context.Context,
	userID, id uuid.UUID,
	baseVersion int,
	st domain.DebtorFullState,
) (*domain.Debtor, error) {
	const op = "repository.postgres.syncTx.ReplaceDebtor"

	row, err := t.q.SyncReplaceDebtor(ctx, db.SyncReplaceDebtorParams{
		ID:          id,
		UserID:      userID,
		Name:        st.Name,
		Note:        st.Note,
		BaseVersion: int32(baseVersion), //nolint:gosec // server versions are small positive ints
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, t.classifySyncWrite(
				ctx,
				userID,
				id,
				domain.SyncEntityDebtor,
				domain.ErrDebtorNotFound,
				domain.ErrDebtorVersionConflict,
			)
		}
		return nil, opWrap(op, err)
	}
	if err := appendChangeLog(
		ctx, t.q, userID, row.ID, domain.SyncEntityDebtor, domain.SyncChangeUpsert, int(row.Version),
	); err != nil {
		return nil, opWrap(op, err)
	}
	return debtorFromFields(
		row.ID, row.UserID, row.Name, row.Note, row.CreatedAt, row.UpdatedAt, int(row.Version),
	), nil
}

func (t *syncTx) TombstoneDebtor( //nolint:dupl // per-entity tombstone twins: identical protocol shape
	ctx context.Context,
	userID, id uuid.UUID,
) (*domain.Debtor, error) {
	const op = "repository.postgres.syncTx.TombstoneDebtor"

	version, err := t.q.SoftDeleteDebtor(ctx, db.SoftDeleteDebtorParams{ID: id, UserID: userID})
	if err != nil { //nolint:nestif // classify absent vs already-tombstoned (idempotent delete)
		if errors.Is(err, pgx.ErrNoRows) {
			current, err := t.GetDebtorAny(ctx, userID, id)
			if err != nil {
				return nil, opWrap(op, err)
			}
			if current == nil {
				return nil, domain.ErrDebtorNotFound
			}
			return current, nil // already tombstoned: idempotent delete
		}
		return nil, opWrap(op, err)
	}
	if err := appendChangeLog(
		ctx, t.q, userID, id, domain.SyncEntityDebtor, domain.SyncChangeTombstone, int(version),
	); err != nil {
		return nil, opWrap(op, err)
	}
	d := &domain.Debtor{ID: id, UserID: userID, Version: int(version)}
	now := time.Now().UTC()
	d.DeletedAt = &now
	return d, nil
}

func (t *syncTx) CreateDebtOperation(
	ctx context.Context,
	params domain.CreateDebtOperationParams,
) (*domain.DebtOperation, error) {
	const op = "repository.postgres.syncTx.CreateDebtOperation"

	row, err := t.q.CreateDebtOperation(ctx, db.CreateDebtOperationParams{
		ID:         newEntityID(params.ID),
		UserID:     params.UserID,
		DebtorID:   params.DebtorID,
		Direction:  string(params.Direction),
		Kind:       string(params.Kind),
		Amount:     params.Amount,
		Note:       params.Note,
		OccurredAt: params.OccurredAt,
	})
	if err != nil {
		if pgUniqueViolation(err) {
			return nil, domain.ErrDebtOperationAlreadyExists
		}
		return nil, opWrap(op, err)
	}
	if err := appendChangeLog(
		ctx, t.q, params.UserID, row.ID, domain.SyncEntityDebtOperation, domain.SyncChangeUpsert, int(row.Version),
	); err != nil {
		return nil, opWrap(op, err)
	}
	return debtOperationFromFields(
		row.ID, row.UserID, row.DebtorID, row.Direction, row.Kind,
		row.Amount, row.Note, row.OccurredAt, row.CreatedAt, row.UpdatedAt, int(row.Version),
	), nil
}

func (t *syncTx) ReplaceDebtOperation(
	ctx context.Context,
	userID, id uuid.UUID,
	baseVersion int,
	st domain.DebtOperationFullState,
) (*domain.DebtOperation, error) {
	const op = "repository.postgres.syncTx.ReplaceDebtOperation"

	row, err := t.q.SyncReplaceDebtOperation(ctx, db.SyncReplaceDebtOperationParams{
		ID:          id,
		UserID:      userID,
		DebtorID:    st.DebtorID,
		Direction:   string(st.Direction),
		Kind:        string(st.Kind),
		Amount:      st.Amount,
		Note:        st.Note,
		OccurredAt:  st.OccurredAt,
		BaseVersion: int32(baseVersion), //nolint:gosec // server versions are small positive ints
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, t.classifySyncWrite(
				ctx,
				userID,
				id,
				domain.SyncEntityDebtOperation,
				domain.ErrDebtOperationNotFound,
				domain.ErrDebtOperationVersionConflict,
			)
		}
		return nil, opWrap(op, err)
	}
	if err := appendChangeLog(
		ctx, t.q, userID, row.ID, domain.SyncEntityDebtOperation, domain.SyncChangeUpsert, int(row.Version),
	); err != nil {
		return nil, opWrap(op, err)
	}
	return debtOperationFromFields(
		row.ID, row.UserID, row.DebtorID, row.Direction, row.Kind,
		row.Amount, row.Note, row.OccurredAt, row.CreatedAt, row.UpdatedAt, int(row.Version),
	), nil
}

func (t *syncTx) TombstoneDebtOperation( //nolint:dupl // per-entity tombstone twins: identical protocol shape
	ctx context.Context,
	userID, id uuid.UUID,
) (*domain.DebtOperation, error) {
	const op = "repository.postgres.syncTx.TombstoneDebtOperation"

	version, err := t.q.SoftDeleteDebtOperation(ctx, db.SoftDeleteDebtOperationParams{ID: id, UserID: userID})
	if err != nil { //nolint:nestif // classify absent vs already-tombstoned (idempotent delete)
		if errors.Is(err, pgx.ErrNoRows) {
			current, err := t.GetDebtOperationAny(ctx, userID, id)
			if err != nil {
				return nil, opWrap(op, err)
			}
			if current == nil {
				return nil, domain.ErrDebtOperationNotFound
			}
			return current, nil // already tombstoned: idempotent delete
		}
		return nil, opWrap(op, err)
	}
	if err := appendChangeLog(
		ctx, t.q, userID, id, domain.SyncEntityDebtOperation, domain.SyncChangeTombstone, int(version),
	); err != nil {
		return nil, opWrap(op, err)
	}
	o := &domain.DebtOperation{ID: id, UserID: userID, Version: int(version)}
	now := time.Now().UTC()
	o.DeletedAt = &now
	return o, nil
}

func (t *syncTx) CreateTransaction(
	ctx context.Context,
	params domain.CreateTransactionParams,
) (*domain.Transaction, error) {
	const op = "repository.postgres.syncTx.CreateTransaction"

	row, err := t.q.CreateTransaction(ctx, db.CreateTransactionParams{
		ID:            newEntityID(params.ID),
		UserID:        params.UserID,
		Type:          string(params.Type),
		Amount:        params.Amount,
		Description:   params.Description,
		OccurredAt:    params.OccurredAt,
		AccountID:     params.AccountID,
		CategoryID:    params.CategoryID,
		FromAccountID: params.FromAccountID,
		ToAccountID:   params.ToAccountID,
	})
	if err != nil {
		if pgUniqueViolation(err) {
			return nil, domain.ErrTransactionAlreadyExists
		}
		return nil, opWrap(op, err)
	}
	if err := appendChangeLog(
		ctx, t.q, params.UserID, row.ID, domain.SyncEntityTransaction, domain.SyncChangeUpsert, int(row.Version),
	); err != nil {
		return nil, opWrap(op, err)
	}
	return transactionFromFields(
		row.ID, row.UserID, row.Type, row.Amount, row.Description, row.OccurredAt,
		row.CreatedAt, row.UpdatedAt, int(row.Version),
		row.AccountID, row.CategoryID, row.FromAccountID, row.ToAccountID, nil,
	), nil
}

func (t *syncTx) ReplaceTransaction(
	ctx context.Context,
	userID, id uuid.UUID,
	baseVersion int,
	st domain.TransactionFullState,
) (*domain.Transaction, error) {
	const op = "repository.postgres.syncTx.ReplaceTransaction"

	row, err := t.q.SyncReplaceTransaction(ctx, db.SyncReplaceTransactionParams{
		ID:            id,
		UserID:        userID,
		Amount:        st.Amount,
		Description:   st.Description,
		OccurredAt:    st.OccurredAt,
		AccountID:     st.AccountID,
		CategoryID:    st.CategoryID,
		FromAccountID: st.FromAccountID,
		ToAccountID:   st.ToAccountID,
		BaseVersion:   int32(baseVersion), //nolint:gosec // server versions are small positive ints
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, t.classifySyncWrite(
				ctx,
				userID,
				id,
				domain.SyncEntityTransaction,
				domain.ErrTransactionNotFound,
				domain.ErrTransactionVersionConflict,
			)
		}
		return nil, opWrap(op, err)
	}
	if err := appendChangeLog(
		ctx, t.q, userID, row.ID, domain.SyncEntityTransaction, domain.SyncChangeUpsert, int(row.Version),
	); err != nil {
		return nil, opWrap(op, err)
	}
	return transactionFromFields(
		row.ID, row.UserID, row.Type, row.Amount, row.Description, row.OccurredAt,
		row.CreatedAt, row.UpdatedAt, int(row.Version),
		row.AccountID, row.CategoryID, row.FromAccountID, row.ToAccountID, nil,
	), nil
}

func (t *syncTx) TombstoneTransaction( //nolint:dupl // account/category/transaction twins
	ctx context.Context,
	userID, id uuid.UUID,
) (*domain.Transaction, error) {
	const op = "repository.postgres.syncTx.TombstoneTransaction"

	version, err := t.q.SoftDeleteTransaction(ctx, db.SoftDeleteTransactionParams{ID: id, UserID: userID})
	if err != nil { //nolint:nestif // classify absent vs already-tombstoned (idempotent delete)
		if errors.Is(err, pgx.ErrNoRows) {
			current, err := t.GetTransactionAny(ctx, userID, id)
			if err != nil {
				return nil, opWrap(op, err)
			}
			if current == nil {
				return nil, domain.ErrTransactionNotFound
			}
			return current, nil // already tombstoned: idempotent delete
		}
		return nil, opWrap(op, err)
	}
	if err := appendChangeLog(
		ctx, t.q, userID, id, domain.SyncEntityTransaction, domain.SyncChangeTombstone, int(version),
	); err != nil {
		return nil, opWrap(op, err)
	}
	tx := &domain.Transaction{ID: id, UserID: userID, Version: int(version)}
	now := time.Now().UTC()
	tx.DeletedAt = &now
	return tx, nil
}

// classifySyncWrite classifies a zero-row CAS write for the sync surface:
// a tombstoned row is its own sentinel (the client learns via
// SYNC_DELETED_CONFLICT); a live version mismatch is the entity's version
// conflict; an absent row keeps the entity's not-found sentinel.
func (t *syncTx) classifySyncWrite(
	ctx context.Context,
	userID, id uuid.UUID,
	entity string,
	notFound, versionConflict error,
) error {
	switch entity {
	case domain.SyncEntityAccount:
		row, err := t.q.GetAccountAny(ctx, db.GetAccountAnyParams{ID: id, UserID: userID})
		if err != nil {
			return notFound
		}
		if row.DeletedAt != nil {
			return domain.ErrRecordDeleted
		}
	case domain.SyncEntityCategory:
		row, err := t.q.GetCategoryAny(ctx, db.GetCategoryAnyParams{ID: id, UserID: userID})
		if err != nil {
			return notFound
		}
		if row.DeletedAt != nil {
			return domain.ErrRecordDeleted
		}
	case domain.SyncEntityTransaction:
		row, err := t.q.GetTransactionAny(ctx, db.GetTransactionAnyParams{ID: id, UserID: userID})
		if err != nil {
			return notFound
		}
		if row.DeletedAt != nil {
			return domain.ErrRecordDeleted
		}
	case domain.SyncEntityDebtor:
		row, err := t.q.GetDebtorAny(ctx, db.GetDebtorAnyParams{ID: id, UserID: userID})
		if err != nil {
			return notFound
		}
		if row.DeletedAt != nil {
			return domain.ErrRecordDeleted
		}
	case domain.SyncEntityDebtOperation:
		row, err := t.q.GetDebtOperationAny(ctx, db.GetDebtOperationAnyParams{ID: id, UserID: userID})
		if err != nil {
			return notFound
		}
		if row.DeletedAt != nil {
			return domain.ErrRecordDeleted
		}
	}
	return versionConflict
}

// --- pull -------------------------------------------------------------------------

// PullChanges fetches the change-log page and the CURRENT state of every
// record named by an upsert row. A record superseded later in the window may
// carry newer data than its change-time version; applying the stream in seq
// order still converges because the later change is applied right after it.
func (r *Repository) PullChanges(
	ctx context.Context,
	userID uuid.UUID,
	afterSeq int64,
	limit int,
) ([]domain.SyncChange, error) {
	const op = "repository.postgres.PullChanges"

	rows, err := r.q.PullChangeLog(ctx, db.PullChangeLogParams{
		UserID:   userID,
		AfterSeq: afterSeq,
		Limit:    int32(limit), //nolint:gosec // bounded by the service (<= max pull page size)
	})
	if err != nil {
		return nil, opWrap(op, err)
	}

	accountsByID, categoriesByID, transactionsByID, err := r.fetchPullStates(ctx, userID, rows)
	if err != nil {
		return nil, opWrap(op, err)
	}
	debtorsByID, debtOperationsByID, err := r.fetchDebtPullStates(ctx, userID, rows)
	if err != nil {
		return nil, opWrap(op, err)
	}

	changes := make([]domain.SyncChange, 0, len(rows))
	for _, row := range rows {
		change := domain.SyncChange{
			Seq:     row.Seq,
			Entity:  row.Entity,
			ID:      row.EntityID,
			Action:  row.Action,
			Version: int(row.Version),
		}
		if row.Action == domain.SyncChangeUpsert {
			change.Data = pullStateOf(
				row.Entity, row.EntityID,
				accountsByID, categoriesByID, transactionsByID, debtorsByID, debtOperationsByID,
			)
		}
		changes = append(changes, change)
	}
	return changes, nil
}

// fetchPullStates batch-loads the current state of every record named by an
// upsert row of the page, keyed by id.
func (r *Repository) fetchPullStates(
	ctx context.Context,
	userID uuid.UUID,
	rows []db.PullChangeLogRow,
) (
	map[uuid.UUID]db.SyncAccountsByIDsRow,
	map[uuid.UUID]db.SyncCategoriesByIDsRow,
	map[uuid.UUID]db.Transaction,
	error,
) {
	accIDs := make([]uuid.UUID, 0)
	catIDs := make([]uuid.UUID, 0)
	txnIDs := make([]uuid.UUID, 0)
	for _, row := range rows {
		if row.Action != domain.SyncChangeUpsert {
			continue
		}
		switch row.Entity {
		case domain.SyncEntityAccount:
			accIDs = append(accIDs, row.EntityID)
		case domain.SyncEntityCategory:
			catIDs = append(catIDs, row.EntityID)
		case domain.SyncEntityTransaction:
			txnIDs = append(txnIDs, row.EntityID)
		}
	}

	accountsByID := make(map[uuid.UUID]db.SyncAccountsByIDsRow, len(accIDs))
	if len(accIDs) > 0 {
		items, err := r.q.SyncAccountsByIDs(ctx, db.SyncAccountsByIDsParams{UserID: userID, Ids: accIDs})
		if err != nil {
			return nil, nil, nil, err
		}
		for _, a := range items {
			accountsByID[a.ID] = a
		}
	}
	categoriesByID := make(map[uuid.UUID]db.SyncCategoriesByIDsRow, len(catIDs))
	if len(catIDs) > 0 {
		items, err := r.q.SyncCategoriesByIDs(ctx, db.SyncCategoriesByIDsParams{UserID: userID, Ids: catIDs})
		if err != nil {
			return nil, nil, nil, err
		}
		for _, c := range items {
			categoriesByID[c.ID] = c
		}
	}
	transactionsByID := make(map[uuid.UUID]db.Transaction, len(txnIDs))
	if len(txnIDs) > 0 {
		items, err := r.q.SyncTransactionsByIDs(ctx, db.SyncTransactionsByIDsParams{UserID: userID, Ids: txnIDs})
		if err != nil {
			return nil, nil, nil, err
		}
		for _, t := range items {
			transactionsByID[t.ID] = t
		}
	}
	return accountsByID, categoriesByID, transactionsByID, nil
}

// fetchDebtPullStates batch-loads the current state of the debt records named
// by an upsert row of the page, keyed by id (the debt half of fetchPullStates,
// split out to keep both under the funlen budget).
func (r *Repository) fetchDebtPullStates(
	ctx context.Context,
	userID uuid.UUID,
	rows []db.PullChangeLogRow,
) (
	map[uuid.UUID]db.SyncDebtorsByIDsRow,
	map[uuid.UUID]db.SyncDebtOperationsByIDsRow,
	error,
) {
	debtorIDs := make([]uuid.UUID, 0)
	debtOpIDs := make([]uuid.UUID, 0)
	for _, row := range rows {
		if row.Action != domain.SyncChangeUpsert {
			continue
		}
		switch row.Entity {
		case domain.SyncEntityDebtor:
			debtorIDs = append(debtorIDs, row.EntityID)
		case domain.SyncEntityDebtOperation:
			debtOpIDs = append(debtOpIDs, row.EntityID)
		}
	}

	debtorsByID := make(map[uuid.UUID]db.SyncDebtorsByIDsRow, len(debtorIDs))
	if len(debtorIDs) > 0 {
		items, err := r.q.SyncDebtorsByIDs(ctx, db.SyncDebtorsByIDsParams{UserID: userID, Ids: debtorIDs})
		if err != nil {
			return nil, nil, err
		}
		for _, d := range items {
			debtorsByID[d.ID] = d
		}
	}
	debtOperationsByID := make(map[uuid.UUID]db.SyncDebtOperationsByIDsRow, len(debtOpIDs))
	if len(debtOpIDs) > 0 {
		items, err := r.q.SyncDebtOperationsByIDs(ctx, db.SyncDebtOperationsByIDsParams{UserID: userID, Ids: debtOpIDs})
		if err != nil {
			return nil, nil, err
		}
		for _, o := range items {
			debtOperationsByID[o.ID] = o
		}
	}
	return debtorsByID, debtOperationsByID, nil
}

// pullStateOf maps a change row to the full state payload of its record (nil
// when the record no longer exists). A record superseded later in the window
// may carry newer data than its change-time version; applying the stream in
// seq order still converges because the later change is applied right after.
func pullStateOf(
	entity string,
	id uuid.UUID,
	accountsByID map[uuid.UUID]db.SyncAccountsByIDsRow,
	categoriesByID map[uuid.UUID]db.SyncCategoriesByIDsRow,
	transactionsByID map[uuid.UUID]db.Transaction,
	debtorsByID map[uuid.UUID]db.SyncDebtorsByIDsRow,
	debtOperationsByID map[uuid.UUID]db.SyncDebtOperationsByIDsRow,
) any {
	switch entity {
	case domain.SyncEntityAccount:
		if a, ok := accountsByID[id]; ok {
			return &domain.AccountFullState{
				Name:             a.Name,
				Currency:         a.Currency,
				OpeningBalance:   a.OpeningBalance,
				ManualAdjustment: a.ManualAdjustment,
			}
		}
	case domain.SyncEntityCategory:
		if c, ok := categoriesByID[id]; ok {
			return &domain.CategoryFullState{
				Name:  c.Name,
				Type:  domain.TransactionType(c.Type),
				Icon:  c.Icon,
				Color: c.Color,
			}
		}
	case domain.SyncEntityTransaction:
		if t, ok := transactionsByID[id]; ok {
			return &domain.TransactionFullState{
				Type:          domain.TransactionType(t.Type),
				Amount:        t.Amount,
				Description:   t.Description,
				OccurredAt:    t.OccurredAt,
				AccountID:     t.AccountID,
				CategoryID:    t.CategoryID,
				FromAccountID: t.FromAccountID,
				ToAccountID:   t.ToAccountID,
			}
		}
	case domain.SyncEntityDebtor:
		if d, ok := debtorsByID[id]; ok {
			return &domain.DebtorFullState{
				Name: d.Name,
				Note: d.Note,
			}
		}
	case domain.SyncEntityDebtOperation:
		if o, ok := debtOperationsByID[id]; ok {
			return &domain.DebtOperationFullState{
				DebtorID:   o.DebtorID,
				Direction:  domain.DebtDirection(o.Direction),
				Kind:       domain.DebtOperationKind(o.Kind),
				Amount:     o.Amount,
				Note:       o.Note,
				OccurredAt: o.OccurredAt,
			}
		}
	}
	return nil
}

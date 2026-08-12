package postgres

import (
	"context"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	db "github.com/yurifa/expense-tracker-api/internal/repository/db"
)

// defaultListTransactionsLimit is the page size used when the caller omits one;
// the service normally sets an explicit (bounded) limit.
const defaultListTransactionsLimit = 50

func (r *Repository) CreateTransaction(
	ctx context.Context,
	params domain.CreateTransactionParams,
) (*domain.Transaction, error) {
	const op = "repository.postgres.CreateTransaction"

	row, err := r.q.CreateTransaction(ctx, db.CreateTransactionParams{
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
		return nil, opWrap(op, err)
	}
	return transactionFromRow(row), nil
}

func (r *Repository) UpdateTransaction(
	ctx context.Context,
	userID, id uuid.UUID,
	params domain.UpdateTransactionParams,
) (*domain.Transaction, error) {
	const op = "repository.postgres.UpdateTransaction"

	row, err := r.q.UpdateTransaction(ctx, db.UpdateTransactionParams{
		ID:            id,
		UserID:        userID,
		Version:       int32(params.Version), //nolint:gosec // optimistic version is a small positive int
		Amount:        params.Amount,
		Description:   params.Description,
		OccurredAt:    params.OccurredAt,
		AccountID:     params.AccountID,
		CategoryID:    params.CategoryID,
		FromAccountID: params.FromAccountID,
		ToAccountID:   params.ToAccountID,
	})
	if err != nil {
		if errNoRows(err) {
			// GetTransaction (in the service) already verified the row exists; a
			// zero-row update here means the version no longer matches. The
			// edge case where the row was deleted between the get and update is
			// also acceptable as a 409 for this scope.
			return nil, domain.ErrTransactionVersionConflict
		}
		return nil, opWrap(op, err)
	}
	return transactionFromRow(row), nil
}

func (r *Repository) DeleteTransaction(ctx context.Context, userID, id uuid.UUID) error {
	const op = "repository.postgres.DeleteTransaction"

	n, err := r.q.DeleteTransaction(ctx, db.DeleteTransactionParams{ID: id, UserID: userID})
	if err != nil {
		return opWrap(op, err)
	}
	if n == 0 {
		return domain.ErrTransactionNotFound
	}
	return nil
}

func (r *Repository) GetTransaction(ctx context.Context, userID, id uuid.UUID) (*domain.Transaction, error) {
	const op = "repository.postgres.GetTransaction"

	row, err := r.q.GetTransaction(ctx, db.GetTransactionParams{ID: id, UserID: userID})
	if err != nil {
		if errNoRows(err) {
			return nil, domain.ErrTransactionNotFound
		}
		return nil, opWrap(op, err)
	}
	return transactionFromRow(row), nil
}

func (r *Repository) GetTransactions(
	ctx context.Context,
	userID uuid.UUID,
	params domain.GetTransactionsParams,
) ([]domain.Transaction, error) {
	const op = "repository.postgres.GetTransactions"

	var typ *string
	if params.Type != nil {
		s := string(*params.Type)
		typ = &s
	}

	limit := int32(defaultListTransactionsLimit) // default; the service always sets an explicit fetchLimit.
	if params.Limit != nil {
		limit = int32(*params.Limit) //nolint:gosec // page limit is bounded by the service (<= maxTransactionPageSize)
	}

	qparams := db.ListTransactionsParams{
		UserID: userID,
		Type:   typ,
		Limit:  limit,
	}
	if params.AccountID != nil {
		id := *params.AccountID
		qparams.AccountID = &id
	}
	if params.CategoryID != nil {
		id := *params.CategoryID
		qparams.CategoryID = &id
	}
	if params.FromDate != nil {
		t := *params.FromDate
		qparams.FromDate = &t
	}
	if params.ToDate != nil {
		t := *params.ToDate
		qparams.ToDate = &t
	}
	if params.Cursor != nil {
		occ := params.Cursor.OccurredAt
		cid := params.Cursor.ID
		qparams.CursorOccurredAt = &occ
		qparams.CursorID = &cid
	}

	rows, err := r.q.ListTransactions(ctx, qparams)
	if err != nil {
		return nil, opWrap(op, err)
	}
	out := make([]domain.Transaction, 0, len(rows))
	for _, row := range rows {
		out = append(out, *transactionFromRow(row))
	}
	return out, nil
}

func transactionFromRow(row db.Transaction) *domain.Transaction {
	return &domain.Transaction{
		ID:            row.ID,
		UserID:        row.UserID,
		Type:          domain.TransactionType(row.Type),
		Amount:        row.Amount,
		Description:   row.Description,
		OccurredAt:    row.OccurredAt,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
		Version:       int(row.Version),
		AccountID:     row.AccountID,
		CategoryID:    row.CategoryID,
		FromAccountID: row.FromAccountID,
		ToAccountID:   row.ToAccountID,
	}
}

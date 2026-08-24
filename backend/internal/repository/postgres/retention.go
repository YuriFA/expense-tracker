package postgres

import (
	"context"
	"time"
)

func (r *Repository) DeleteTombstonedTransactionsBefore(ctx context.Context, cutoff time.Time) (int64, error) {
	const op = "repository.postgres.DeleteTombstonedTransactionsBefore"

	n, err := r.q.DeleteTombstonedTransactionsBefore(ctx, &cutoff)
	if err != nil {
		return 0, opWrap(op, err)
	}
	return n, nil
}

func (r *Repository) DeleteTombstonedPlannedPaymentsBefore(ctx context.Context, cutoff time.Time) (int64, error) {
	const op = "repository.postgres.DeleteTombstonedPlannedPaymentsBefore"

	n, err := r.q.DeleteTombstonedPlannedPaymentsBefore(ctx, &cutoff)
	if err != nil {
		return 0, opWrap(op, err)
	}
	return n, nil
}

func (r *Repository) DeleteTombstonedCategoriesBefore(ctx context.Context, cutoff time.Time) (int64, error) {
	const op = "repository.postgres.DeleteTombstonedCategoriesBefore"

	n, err := r.q.DeleteTombstonedCategoriesBefore(ctx, &cutoff)
	if err != nil {
		return 0, opWrap(op, err)
	}
	return n, nil
}

func (r *Repository) DeleteTombstonedAccountsBefore(ctx context.Context, cutoff time.Time) (int64, error) {
	const op = "repository.postgres.DeleteTombstonedAccountsBefore"

	n, err := r.q.DeleteTombstonedAccountsBefore(ctx, &cutoff)
	if err != nil {
		return 0, opWrap(op, err)
	}
	return n, nil
}

func (r *Repository) DeleteTombstonedDebtOperationsBefore(ctx context.Context, cutoff time.Time) (int64, error) {
	const op = "repository.postgres.DeleteTombstonedDebtOperationsBefore"

	n, err := r.q.DeleteTombstonedDebtOperationsBefore(ctx, &cutoff)
	if err != nil {
		return 0, opWrap(op, err)
	}
	return n, nil
}

func (r *Repository) DeleteTombstonedDebtorsBefore(ctx context.Context, cutoff time.Time) (int64, error) {
	const op = "repository.postgres.DeleteTombstonedDebtorsBefore"

	n, err := r.q.DeleteTombstonedDebtorsBefore(ctx, &cutoff)
	if err != nil {
		return 0, opWrap(op, err)
	}
	return n, nil
}

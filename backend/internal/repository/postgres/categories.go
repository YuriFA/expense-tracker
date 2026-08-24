package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	db "github.com/yurifa/expense-tracker-api/internal/repository/db"
)

// Every mutation runs inside withinLockedTx (entity write + change_log append
// in one committed transaction). Deletes are tombstones guarded by the in-use
// check; the live-name uniqueness is enforced by the partial unique index.

func (r *Repository) CreateCategory(ctx context.Context, params domain.CreateCategoryParams) (*domain.Category, error) {
	const op = "repository.postgres.CreateCategory"

	id := newEntityID(params.ID)
	var row db.CreateCategoryRow
	err := r.withinLockedTx(ctx, params.UserID, func(q *db.Queries) error {
		var err error
		row, err = q.CreateCategory(ctx, db.CreateCategoryParams{
			ID:     id,
			UserID: params.UserID,
			Name:   params.Name,
			Type:   string(params.Type),
			Icon:   params.Icon,
			Color:  params.Color,
		})
		if err != nil {
			if pgUniqueViolation(err) {
				// Either the live-name partial index or the PK (client id
				// duplicate); both are the same already-exists error.
				return domain.ErrCategoryAlreadyExists
			}
			return err
		}
		return appendChangeLog(
			ctx,
			q,
			params.UserID,
			row.ID,
			domain.SyncEntityCategory,
			domain.SyncChangeUpsert,
			int(row.Version),
		)
	})
	if err != nil {
		return nil, opWrap(op, err)
	}
	return categoryFromFields(
		row.ID,
		row.UserID,
		row.Name,
		row.Type,
		row.Icon,
		row.Color,
		row.CreatedAt,
		row.UpdatedAt,
		int(row.Version),
	), nil
}

func (r *Repository) UpdateCategory(
	ctx context.Context,
	userID, id uuid.UUID,
	params domain.UpdateCategoryParams,
) (*domain.Category, error) {
	const op = "repository.postgres.UpdateCategory"

	var typ *string
	if params.Type != nil {
		s := string(*params.Type)
		typ = &s
	}

	var row db.UpdateCategoryRow
	err := r.withinLockedTx(ctx, userID, func(q *db.Queries) error {
		var err error
		row, err = q.UpdateCategory(ctx, db.UpdateCategoryParams{
			ID:      id,
			UserID:  userID,
			Name:    params.Name,
			Type:    typ,
			Icon:    params.Icon,
			Color:   params.Color,
			Version: int32(params.Version), //nolint:gosec // optimistic version is a small positive int
		})
		if err != nil {
			if pgUniqueViolation(err) {
				return domain.ErrCategoryAlreadyExists
			}
			if errNoRows(err) {
				return classifyCategoryWrite(ctx, q, userID, id)
			}
			return err
		}
		return appendChangeLog(
			ctx,
			q,
			userID,
			row.ID,
			domain.SyncEntityCategory,
			domain.SyncChangeUpsert,
			int(row.Version),
		)
	})
	if err != nil {
		return nil, opWrap(op, err)
	}
	return categoryFromFields(
		row.ID,
		row.UserID,
		row.Name,
		row.Type,
		row.Icon,
		row.Color,
		row.CreatedAt,
		row.UpdatedAt,
		int(row.Version),
	), nil
}

func (r *Repository) DeleteCategory( //nolint:dupl // account/category delete twins: identical guard shape
	ctx context.Context,
	userID, id uuid.UUID,
) error {
	const op = "repository.postgres.DeleteCategory"

	err := r.withinLockedTx(ctx, userID, func(q *db.Queries) error {
		inUse, err := q.HasLiveTransactionsForCategory(ctx, db.HasLiveTransactionsForCategoryParams{
			UserID:     userID,
			CategoryID: &id,
		})
		if err != nil {
			return err
		}
		if inUse {
			return domain.ErrCategoryHasTransactions
		}
		plansInUse, err := q.HasLivePlannedPaymentsForCategory(ctx, db.HasLivePlannedPaymentsForCategoryParams{
			UserID:     userID,
			CategoryID: id,
		})
		if err != nil {
			return err
		}
		if plansInUse {
			return domain.ErrCategoryHasPlannedPayments
		}
		version, err := q.SoftDeleteCategory(ctx, db.SoftDeleteCategoryParams{ID: id, UserID: userID})
		if err != nil {
			if errNoRows(err) {
				return classifyCategoryWrite(ctx, q, userID, id)
			}
			return err
		}
		return appendChangeLog(ctx, q, userID, id, domain.SyncEntityCategory, domain.SyncChangeTombstone, int(version))
	})
	if err != nil {
		return opWrap(op, err)
	}
	return nil
}

// classifyCategoryWrite distinguishes the zero-row outcomes of a CAS write for
// the REST surface (deleted == not found; live mismatch == version conflict).
func classifyCategoryWrite(ctx context.Context, q *db.Queries, userID, id uuid.UUID) error {
	row, err := q.GetCategoryAny(ctx, db.GetCategoryAnyParams{ID: id, UserID: userID})
	if err != nil || row.DeletedAt != nil {
		return domain.ErrCategoryNotFound
	}
	return domain.ErrCategoryVersionConflict
}

func (r *Repository) GetCategory(ctx context.Context, userID, id uuid.UUID) (*domain.Category, error) {
	const op = "repository.postgres.GetCategory"

	row, err := r.q.GetCategory(ctx, db.GetCategoryParams{ID: id, UserID: userID})
	if err != nil {
		if errNoRows(err) {
			return nil, domain.ErrCategoryNotFound
		}
		return nil, opWrap(op, err)
	}
	return categoryFromFields(
		row.ID,
		row.UserID,
		row.Name,
		row.Type,
		row.Icon,
		row.Color,
		row.CreatedAt,
		row.UpdatedAt,
		int(row.Version),
	), nil
}

func (r *Repository) GetCategories(
	ctx context.Context,
	userID uuid.UUID,
	params domain.GetCategoriesParams,
) ([]domain.Category, error) {
	const op = "repository.postgres.GetCategories"

	var typ *string
	if params.Type != nil {
		s := string(*params.Type)
		typ = &s
	}

	rows, err := r.q.GetCategories(ctx, db.GetCategoriesParams{UserID: userID, Type: typ})
	if err != nil {
		return nil, opWrap(op, err)
	}
	out := make([]domain.Category, 0, len(rows))
	for _, row := range rows {
		out = append(
			out,
			*categoryFromFields(row.ID, row.UserID, row.Name, row.Type, row.Icon, row.Color, row.CreatedAt, row.UpdatedAt, int(row.Version)),
		)
	}
	return out, nil
}

// categoryFromFields assembles a domain.Category; the category queries return
// structurally-identical generated Row types, so the construction is
// centralized here.
func categoryFromFields(
	id, userID uuid.UUID,
	name, typ, icon, color string,
	createdAt, updatedAt time.Time,
	version int,
) *domain.Category {
	return &domain.Category{
		ID:        id,
		UserID:    userID,
		Name:      name,
		Type:      domain.TransactionType(typ),
		Icon:      icon,
		Color:     color,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
		Version:   version,
	}
}

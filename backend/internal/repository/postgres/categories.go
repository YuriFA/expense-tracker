package postgres

import (
	"context"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	db "github.com/yurifa/expense-tracker-api/internal/repository/db"
)

func (r *Repository) CreateCategory(ctx context.Context, params domain.CreateCategoryParams) (*domain.Category, error) {
	const op = "repository.postgres.CreateCategory"

	row, err := r.q.CreateCategory(ctx, db.CreateCategoryParams{
		UserID: params.UserID,
		Name:   params.Name,
		Type:   string(params.Type),
		Icon:   params.Icon,
		Color:  params.Color,
	})
	if err != nil {
		if pgConstraintViolation(err, pgCodeUniqueViolation) {
			return nil, domain.ErrCategoryAlreadyExists
		}
		return nil, opWrap(op, err)
	}
	return categoryFromRow(row), nil
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

	row, err := r.q.UpdateCategory(ctx, db.UpdateCategoryParams{
		ID:     id,
		UserID: userID,
		Name:   params.Name,
		Type:   typ,
		Icon:   params.Icon,
		Color:  params.Color,
	})
	if err != nil {
		if pgConstraintViolation(err, pgCodeUniqueViolation) {
			return nil, domain.ErrCategoryAlreadyExists
		}
		if errNoRows(err) {
			return nil, domain.ErrCategoryNotFound
		}
		return nil, opWrap(op, err)
	}
	return categoryFromRow(row), nil
}

func (r *Repository) DeleteCategory(ctx context.Context, userID, id uuid.UUID) error {
	const op = "repository.postgres.DeleteCategory"

	n, err := r.q.DeleteCategory(ctx, db.DeleteCategoryParams{ID: id, UserID: userID})
	if err != nil {
		if pgConstraintViolation(err, pgCodeFKViolation) {
			return domain.ErrCategoryHasTransactions
		}
		return opWrap(op, err)
	}
	if n == 0 {
		return domain.ErrCategoryNotFound
	}
	return nil
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
	return categoryFromRow(row), nil
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
		out = append(out, *categoryFromRow(row))
	}
	return out, nil
}

func categoryFromRow(row db.Category) *domain.Category {
	return &domain.Category{
		ID:        row.ID,
		UserID:    row.UserID,
		Name:      row.Name,
		Type:      domain.TransactionType(row.Type),
		Icon:      row.Icon,
		Color:     row.Color,
		CreatedAt: row.CreatedAt,
		UpdatedAt: row.UpdatedAt,
	}
}

package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

// CategoryService owns household category business rules. householdID (scoping)
// and the acting userID (authorship) are always passed explicitly from the
// transport layer.
type CategoryService struct {
	categories repository.CategoryRepository
}

func NewCategoryService(categories repository.CategoryRepository) *CategoryService {
	return &CategoryService{categories: categories}
}

func (s *CategoryService) Create(
	ctx context.Context,
	householdID, userID uuid.UUID,
	params domain.CreateCategoryParams,
) (*domain.Category, error) {
	const op = "service.category.Create"
	params.HouseholdID, params.UserID = householdID, userID
	c, err := s.categories.CreateCategory(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return c, nil
}

func (s *CategoryService) Update(
	ctx context.Context,
	householdID, userID, id uuid.UUID,
	params domain.UpdateCategoryParams,
) (*domain.Category, error) {
	const op = "service.category.Update"
	if params.Name == nil && params.Type == nil && params.Icon == nil && params.Color == nil {
		return nil, ErrNoFieldsToUpdate
	}
	c, err := s.categories.UpdateCategory(ctx, householdID, userID, id, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return c, nil
}

func (s *CategoryService) Delete(ctx context.Context, householdID, userID, id uuid.UUID) error {
	const op = "service.category.Delete"
	if err := s.categories.DeleteCategory(ctx, householdID, userID, id); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}

func (s *CategoryService) Get(ctx context.Context, householdID, id uuid.UUID) (*domain.Category, error) {
	const op = "service.category.Get"
	c, err := s.categories.GetCategory(ctx, householdID, id)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return c, nil
}

func (s *CategoryService) List(
	ctx context.Context,
	householdID uuid.UUID,
	params domain.GetCategoriesParams,
) ([]domain.Category, error) {
	const op = "service.category.List"
	c, err := s.categories.GetCategories(ctx, householdID, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return c, nil
}

package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

// CategoryService owns per-user category business rules.
type CategoryService struct {
	categories repository.CategoryRepository
}

func NewCategoryService(categories repository.CategoryRepository) *CategoryService {
	return &CategoryService{categories: categories}
}

func (s *CategoryService) Create(
	ctx context.Context,
	userID uuid.UUID,
	params domain.CreateCategoryParams,
) (*domain.Category, error) {
	const op = "service.category.Create"
	params.UserID = userID
	c, err := s.categories.CreateCategory(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return c, nil
}

func (s *CategoryService) Update(
	ctx context.Context,
	userID, id uuid.UUID,
	params domain.UpdateCategoryParams,
) (*domain.Category, error) {
	const op = "service.category.Update"
	if params.Name == nil && params.Type == nil && params.Icon == nil && params.Color == nil {
		return nil, ErrNoFieldsToUpdate
	}
	c, err := s.categories.UpdateCategory(ctx, userID, id, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return c, nil
}

func (s *CategoryService) Delete(ctx context.Context, userID, id uuid.UUID) error {
	const op = "service.category.Delete"
	if err := s.categories.DeleteCategory(ctx, userID, id); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}

func (s *CategoryService) Get(ctx context.Context, userID, id uuid.UUID) (*domain.Category, error) {
	const op = "service.category.Get"
	c, err := s.categories.GetCategory(ctx, userID, id)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return c, nil
}

func (s *CategoryService) List(
	ctx context.Context,
	userID uuid.UUID,
	params domain.GetCategoriesParams,
) ([]domain.Category, error) {
	const op = "service.category.List"
	c, err := s.categories.GetCategories(ctx, userID, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return c, nil
}

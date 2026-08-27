package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

// PlannedPaymentService owns planned-payment business rules. The account and
// category references must be LIVE records of the same household, and the category
// type must match the plan type; `next_due` may be in the past (a plan can
// start out overdue). Type is immutable. The repository handles the
// optimistic-concurrency version check (returns
// ErrPlannedPaymentVersionConflict on mismatch).
type PlannedPaymentService struct {
	plans      repository.PlannedPaymentRepository
	accounts   repository.AccountRepository
	categories repository.CategoryRepository
}

func NewPlannedPaymentService(
	plans repository.PlannedPaymentRepository,
	accounts repository.AccountRepository,
	categories repository.CategoryRepository,
) *PlannedPaymentService {
	return &PlannedPaymentService{plans: plans, accounts: accounts, categories: categories}
}

func (s *PlannedPaymentService) Create(
	ctx context.Context,
	householdID, userID uuid.UUID,
	params domain.CreatePlannedPaymentParams,
) (*domain.PlannedPayment, error) {
	const op = "service.plannedPayment.Create"

	if err := s.validateRefs(ctx, householdID, params.AccountID, params.CategoryID, params.Type); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	params.HouseholdID, params.UserID = householdID, userID
	p, err := s.plans.CreatePlannedPayment(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return p, nil
}

func (s *PlannedPaymentService) Update(
	ctx context.Context,
	householdID, userID, id uuid.UUID,
	params domain.UpdatePlannedPaymentParams,
) (*domain.PlannedPayment, error) {
	const op = "service.plannedPayment.Update"

	if params.Amount == nil && params.Name == nil && params.Note == nil &&
		params.AccountID == nil && params.CategoryID == nil && params.NextDue == nil &&
		params.Regularity == nil && params.ConfirmMode == nil && params.Reminder == nil {
		return nil, ErrNoFieldsToUpdate
	}

	if params.AccountID != nil || params.CategoryID != nil {
		// Type is immutable and comes from the stored plan; re-reading also
		// surfaces not-found before any ref work.
		current, err := s.plans.GetPlannedPayment(ctx, householdID, id)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", op, err)
		}
		accountID := current.AccountID
		if params.AccountID != nil {
			accountID = *params.AccountID
		}
		categoryID := current.CategoryID
		if params.CategoryID != nil {
			categoryID = *params.CategoryID
		}
		if err := s.validateRefs(ctx, householdID, accountID, categoryID, current.Type); err != nil {
			return nil, fmt.Errorf("%s: %w", op, err)
		}
	}

	p, err := s.plans.UpdatePlannedPayment(ctx, householdID, userID, id, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return p, nil
}

func (s *PlannedPaymentService) Delete(ctx context.Context, householdID, userID, id uuid.UUID) error {
	const op = "service.plannedPayment.Delete"
	if err := s.plans.DeletePlannedPayment(ctx, householdID, userID, id); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}

func (s *PlannedPaymentService) Get(ctx context.Context, householdID, id uuid.UUID) (*domain.PlannedPayment, error) {
	const op = "service.plannedPayment.Get"
	p, err := s.plans.GetPlannedPayment(ctx, householdID, id)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return p, nil
}

func (s *PlannedPaymentService) List(
	ctx context.Context,
	householdID uuid.UUID,
	params domain.GetPlannedPaymentsParams,
) ([]domain.PlannedPayment, error) {
	const op = "service.plannedPayment.List"
	p, err := s.plans.GetPlannedPayments(ctx, householdID, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return p, nil
}

// validateRefs verifies the account and category exist, belong to householdID, and
// that the category type matches the plan type (the plan type domain is
// expense|income; transfer is rejected at the contract layer).
func (s *PlannedPaymentService) validateRefs(
	ctx context.Context,
	householdID, accountID, categoryID uuid.UUID,
	typ domain.TransactionType,
) error {
	if _, err := s.accounts.GetAccount(ctx, householdID, accountID); err != nil {
		if errors.Is(err, domain.ErrAccountNotFound) {
			return domain.ErrPlannedPaymentAccountNotFound
		}
		return err
	}
	cat, err := s.categories.GetCategory(ctx, householdID, categoryID)
	if err != nil {
		if errors.Is(err, domain.ErrCategoryNotFound) {
			return domain.ErrPlannedPaymentCategoryNotFound
		}
		return err
	}
	if cat.Type != typ {
		return domain.ErrPlannedPaymentCategoryTypeMismatch
	}
	return nil
}

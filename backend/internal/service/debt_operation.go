package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

// DebtOperationService owns debt-operation business rules. The debtor
// reference must be a LIVE debtor of the same user (a tombstoned debtor is
// "not found"); direction and kind are immutable, so an update never
// revalidates references. The repository handles the optimistic-concurrency
// version check (returns ErrDebtOperationVersionConflict on mismatch).
type DebtOperationService struct {
	operations repository.DebtOperationRepository
	debtors    repository.DebtorRepository
}

func NewDebtOperationService(
	operations repository.DebtOperationRepository,
	debtors repository.DebtorRepository,
) *DebtOperationService {
	return &DebtOperationService{operations: operations, debtors: debtors}
}

func (s *DebtOperationService) Create(
	ctx context.Context,
	userID uuid.UUID,
	params domain.CreateDebtOperationParams,
) (*domain.DebtOperation, error) {
	const op = "service.debtOperation.Create"

	if _, err := s.debtors.GetDebtor(ctx, userID, params.DebtorID); err != nil {
		if errors.Is(err, domain.ErrDebtorNotFound) {
			return nil, fmt.Errorf("%s: %w", op, domain.ErrDebtOperationDebtorNotFound)
		}
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	params.UserID = userID
	o, err := s.operations.CreateDebtOperation(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return o, nil
}

func (s *DebtOperationService) Update(
	ctx context.Context,
	userID, id uuid.UUID,
	params domain.UpdateDebtOperationParams,
) (*domain.DebtOperation, error) {
	const op = "service.debtOperation.Update"

	if params.Amount == nil && params.Note == nil && params.OccurredAt == nil {
		return nil, ErrNoFieldsToUpdate
	}

	o, err := s.operations.UpdateDebtOperation(ctx, userID, id, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return o, nil
}

func (s *DebtOperationService) Delete(ctx context.Context, userID, id uuid.UUID) error {
	const op = "service.debtOperation.Delete"
	if err := s.operations.DeleteDebtOperation(ctx, userID, id); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}

func (s *DebtOperationService) Get(ctx context.Context, userID, id uuid.UUID) (*domain.DebtOperation, error) {
	const op = "service.debtOperation.Get"
	o, err := s.operations.GetDebtOperation(ctx, userID, id)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return o, nil
}

func (s *DebtOperationService) List(
	ctx context.Context,
	userID uuid.UUID,
	params domain.GetDebtOperationsParams,
) ([]domain.DebtOperation, error) {
	const op = "service.debtOperation.List"
	o, err := s.operations.GetDebtOperations(ctx, userID, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return o, nil
}

package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

// DebtorService owns per-user debtor business rules. The repository handles
// the optimistic-concurrency version check (returns ErrDebtorVersionConflict
// on mismatch) and the live-name uniqueness (partial unique index).
type DebtorService struct {
	debtors repository.DebtorRepository
}

func NewDebtorService(debtors repository.DebtorRepository) *DebtorService {
	return &DebtorService{debtors: debtors}
}

func (s *DebtorService) Create(
	ctx context.Context,
	userID uuid.UUID,
	params domain.CreateDebtorParams,
) (*domain.Debtor, error) {
	const op = "service.debtor.Create"
	params.UserID = userID
	d, err := s.debtors.CreateDebtor(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return d, nil
}

func (s *DebtorService) Update(
	ctx context.Context,
	userID, id uuid.UUID,
	params domain.UpdateDebtorParams,
) (*domain.Debtor, error) {
	const op = "service.debtor.Update"
	if params.Name == nil && params.Note == nil {
		return nil, ErrNoFieldsToUpdate
	}
	d, err := s.debtors.UpdateDebtor(ctx, userID, id, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return d, nil
}

func (s *DebtorService) Delete(ctx context.Context, userID, id uuid.UUID) error {
	const op = "service.debtor.Delete"
	if err := s.debtors.DeleteDebtor(ctx, userID, id); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}

func (s *DebtorService) Get(ctx context.Context, userID, id uuid.UUID) (*domain.Debtor, error) {
	const op = "service.debtor.Get"
	d, err := s.debtors.GetDebtor(ctx, userID, id)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return d, nil
}

func (s *DebtorService) List(ctx context.Context, userID uuid.UUID) ([]domain.Debtor, error) {
	const op = "service.debtor.List"
	d, err := s.debtors.GetDebtors(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return d, nil
}

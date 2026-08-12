package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

// AccountService owns account business rules. userID is always passed
// explicitly from the transport layer (never from a request body).
type AccountService struct {
	accounts repository.AccountRepository
}

func NewAccountService(accounts repository.AccountRepository) *AccountService {
	return &AccountService{accounts: accounts}
}

func (s *AccountService) Create(
	ctx context.Context,
	userID uuid.UUID,
	params domain.CreateAccountParams,
) (*domain.Account, error) {
	const op = "service.account.Create"
	params.UserID = userID
	a, err := s.accounts.CreateAccount(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return a, nil
}

func (s *AccountService) Update(
	ctx context.Context,
	userID, id uuid.UUID,
	params domain.UpdateAccountParams,
) (*domain.Account, error) {
	const op = "service.account.Update"
	if params.Name == nil && params.ManualAdjustment == nil {
		return nil, ErrNoFieldsToUpdate
	}
	a, err := s.accounts.UpdateAccount(ctx, userID, id, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return a, nil
}

func (s *AccountService) Delete(ctx context.Context, userID, id uuid.UUID) error {
	const op = "service.account.Delete"
	if err := s.accounts.DeleteAccount(ctx, userID, id); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}

func (s *AccountService) Get(ctx context.Context, userID, id uuid.UUID) (*domain.Account, error) {
	const op = "service.account.Get"
	a, err := s.accounts.GetAccount(ctx, userID, id)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return a, nil
}

func (s *AccountService) List(ctx context.Context, userID uuid.UUID) ([]domain.Account, error) {
	const op = "service.account.List"
	a, err := s.accounts.GetAccounts(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return a, nil
}

// AccountBalances is the per-account balance summary + net worth.
type AccountBalances struct {
	Balances []domain.AccountBalance
	NetWorth int64
}

func (s *AccountService) Balances(ctx context.Context, userID uuid.UUID) (*AccountBalances, error) {
	const op = "service.account.Balances"
	bs, err := s.accounts.GetAccountBalances(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	var net int64
	for _, b := range bs {
		net += b.Balance
	}
	return &AccountBalances{Balances: bs, NetWorth: net}, nil
}

// ErrNoFieldsToUpdate is returned by PATCH services when the body sets nothing.
var ErrNoFieldsToUpdate = errors.New("no fields to update")

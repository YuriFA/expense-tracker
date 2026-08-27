package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

// HouseholdService owns the household read model: the requester's household
// with its member listing. Membership itself is resolved by the auth
// middleware (single-hop by user); this service serves the authenticated
// household endpoints.
type HouseholdService struct {
	households repository.HouseholdRepository
}

func NewHouseholdService(households repository.HouseholdRepository) *HouseholdService {
	return &HouseholdService{households: households}
}

// Get returns the household with all of its members (email, display name,
// role, joined date).
func (s *HouseholdService) Get(ctx context.Context, householdID uuid.UUID) (*domain.Household, error) {
	const op = "service.household.Get"
	h, err := s.households.GetHouseholdWithMembers(ctx, householdID)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return h, nil
}

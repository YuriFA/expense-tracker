package domain

import (
	"time"

	"github.com/google/uuid"
)

// HouseholdRole is a member's role in a household. Roles are stored in v1 but
// carry no behavioral split yet (ADR-0002); both roles see and modify all of
// the household's data equally.
type HouseholdRole string

const (
	HouseholdRoleOwner  HouseholdRole = "owner"
	HouseholdRoleMember HouseholdRole = "member"
)

// Household is the shared data space: every account, category, transaction,
// debtor, debt operation, and planned payment belongs to exactly one
// household, and members access it equally.
type Household struct {
	ID        uuid.UUID
	CreatedAt time.Time
	Members   []HouseholdMember
}

// HouseholdMember is one user's membership in a household, joined with the
// profile fields the member listing exposes. DisplayName is nil when never
// set (consumers fall back to Email).
type HouseholdMember struct {
	UserID      uuid.UUID
	Email       string
	DisplayName *string
	Role        HouseholdRole
	JoinedAt    time.Time
}

// Membership is a user's single (v1) household membership row - the auth
// middleware's household resolution input.
type Membership struct {
	HouseholdID uuid.UUID
	UserID      uuid.UUID
	Role        HouseholdRole
	JoinedAt    time.Time
}

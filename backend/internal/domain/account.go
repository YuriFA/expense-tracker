package domain

import (
	"time"

	"github.com/google/uuid"
)

// Account is a user's financial account. Balance is server-computed:
// openingBalance + manualAdjustment + sum(transaction contributions).
// Version is the optimistic-concurrency revision; DeletedAt marks a tombstone
// (soft delete): tombstoned rows are excluded from listings but retained for
// sync so other devices learn of the deletion.
type Account struct {
	ID               uuid.UUID
	UserID           uuid.UUID
	Name             string
	Currency         string
	OpeningBalance   int64
	ManualAdjustment int64
	Balance          int64
	CreatedAt        time.Time
	UpdatedAt        time.Time
	Version          int
	DeletedAt        *time.Time
}

// Deleted reports whether the account is tombstoned.
func (a *Account) Deleted() bool { return a.DeletedAt != nil }

// AccountBalance is the per-account balance summary (no opening/manual split).
type AccountBalance struct {
	ID       uuid.UUID
	UserID   uuid.UUID
	Name     string
	Currency string
	Balance  int64
}

type CreateAccountParams struct {
	// ID is the optional client-generated id (offline-first clients). Zero
	// means "server generates".
	ID          uuid.UUID
	HouseholdID uuid.UUID
	// UserID is the authorship stamp (the acting member), never trusted from
	// the wire.
	UserID         uuid.UUID
	Name           string
	Currency       string
	OpeningBalance int64
}

// UpdateAccountParams holds optional PATCH fields plus the required
// optimistic-concurrency Version. Nil means "leave unchanged".
type UpdateAccountParams struct {
	Name             *string
	ManualAdjustment *int64
	Version          int
}

// AccountFullState is the complete mutable state of an account (sync upserts
// carry the full record, not a PATCH).
type AccountFullState struct {
	Name             string `json:"name"`
	Currency         string `json:"currency"`
	OpeningBalance   int64  `json:"openingBalance"`
	ManualAdjustment int64  `json:"manualAdjustment"`
}

// FullState returns the account's complete mutable state (for sync payloads).
func (a *Account) FullState() *AccountFullState {
	return &AccountFullState{
		Name:             a.Name,
		Currency:         a.Currency,
		OpeningBalance:   a.OpeningBalance,
		ManualAdjustment: a.ManualAdjustment,
	}
}

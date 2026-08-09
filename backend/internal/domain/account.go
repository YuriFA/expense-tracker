package domain

import (
	"time"

	"github.com/google/uuid"
)

// Account is a user's financial account. Balance is server-computed:
// openingBalance + manualAdjustment + sum(transaction contributions).
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
}

// AccountBalance is the per-account balance summary (no opening/manual split).
type AccountBalance struct {
	ID       uuid.UUID
	UserID   uuid.UUID
	Name     string
	Currency string
	Balance  int64
}

type CreateAccountParams struct {
	UserID         uuid.UUID
	Name           string
	Currency       string
	OpeningBalance int64
}

// UpdateAccountParams holds optional PATCH fields. Nil means "leave unchanged".
type UpdateAccountParams struct {
	Name             *string
	ManualAdjustment *int64
}

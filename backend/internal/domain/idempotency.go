package domain

import (
	"time"

	"github.com/google/uuid"
)

// IdempotencyKey caches a POST /api/transactions response keyed by
// (user_id, idempotency_key) so a retried request replays the original result.
type IdempotencyKey struct {
	ID              uuid.UUID
	IdempotencyKey  string
	UserID          uuid.UUID
	RequestHash     string
	Status          string
	ResponseStatus  *int
	ResponseHeaders *string
	ResponseBody    []byte
	CreatedAt       time.Time
	UpdatedAt       time.Time
	ExpiresAt       time.Time
}

type CreateIdempotencyKeyParams struct {
	IdempotencyKey string
	UserID         uuid.UUID
	RequestHash    string
	ExpiresAt      time.Time
}

// UpdateIdempotencyKeyParams persists the captured response. All fields are
// provided together by the idempotency middleware once the wrapped handler
// returns.
type UpdateIdempotencyKeyParams struct {
	Status          *string
	ResponseStatus  *int
	ResponseHeaders *string
	ResponseBody    []byte
}

package domain

import (
	"time"

	"github.com/google/uuid"
)

// Session is a stateful auth session. Its ID is a 256-bit crypto/rand hex token
// (the cookie value), NOT a UUID.
type Session struct {
	ID        string
	UserID    uuid.UUID
	ExpiresAt time.Time
	CreatedAt time.Time
	UpdatedAt time.Time
}

// CreateSessionParams mints a new session.
type CreateSessionParams struct {
	SessionID string
	UserID    uuid.UUID
	ExpiresAt time.Time
}

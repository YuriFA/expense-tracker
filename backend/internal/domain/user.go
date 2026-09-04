// Package domain holds the pure domain model and domain errors.
//
// It is the single source of truth for entity types shared across the service
// and repository layers. Domain types use idiomatic Go:
//   - IDs are github.com/google/uuid.UUID (UUID v4)
//   - money is int64 minor units (never float/decimal)
//   - timestamps are [time.Time], UTC everywhere
//   - optional references are *uuid.UUID
//
// No SQL, no HTTP, no gin lives here.
package domain

import (
	"time"

	"github.com/google/uuid"
)

// User is the authenticated account owner.
type User struct {
	ID            uuid.UUID
	Email         string
	EmailVerified bool
	// DisplayName is the optional member-facing label (nil = never set;
	// consumers fall back to Email). It carries no access-control meaning.
	DisplayName *string
	// PasswordHash is the bcrypt hash. It is never serialized to clients; it is
	// only populated by email-keyed lookups (login / reset).
	PasswordHash string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// RegisterUserParams is the input to create a new user.
type RegisterUserParams struct {
	Email        string
	PasswordHash string
}

// DisplayName validation bounds (enforced by the profile update service).
const (
	DisplayNameMinLength = 1
	DisplayNameMaxLength = 100
)

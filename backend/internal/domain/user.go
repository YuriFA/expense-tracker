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
	// PasswordHash is the bcrypt hash. It is never serialized to clients; it is
	// only populated by email-keyed lookups (login / reset).
	PasswordHash string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// RegisterUserParams is the input to create a new user (and, when seeding is
// explicitly enabled for this registration, the starter categories - default
// off per the mobile product's empty-start decision).
type RegisterUserParams struct {
	Email          string
	PasswordHash   string
	SeedCategories bool
}

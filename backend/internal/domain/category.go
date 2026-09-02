package domain

import (
	"time"

	"github.com/google/uuid"
)

// TransactionType is the kind of a transaction (cashflow income/expense,
// transfer, or adjustment — a signed balance reconciliation). Stored as TEXT
// with a CHECK constraint in Postgres.
type TransactionType string

const (
	TransactionTypeIncome     TransactionType = "income"
	TransactionTypeExpense    TransactionType = "expense"
	TransactionTypeTransfer   TransactionType = "transfer"
	TransactionTypeAdjustment TransactionType = "adjustment"
)

// CategoryType is the subset of transaction types a category can own.
type CategoryType string

const (
	CategoryTypeIncome  CategoryType = "income"
	CategoryTypeExpense CategoryType = "expense"
)

// Category is a per-user classification for cashflow transactions. Version is
// the optimistic-concurrency revision; DeletedAt marks a tombstone (soft
// delete): tombstoned rows are excluded from listings but retained for sync.
// ArchivedAt marks an archived category: unavailable for new records but
// kept on existing transactions (null = active).
type Category struct {
	ID         uuid.UUID
	UserID     uuid.UUID
	Name       string
	Type       TransactionType
	Icon       string
	Color      string
	ArchivedAt *time.Time
	CreatedAt  time.Time
	UpdatedAt  time.Time
	Version    int
	DeletedAt  *time.Time
}

// Deleted reports whether the category is tombstoned.
func (c *Category) Deleted() bool { return c.DeletedAt != nil }

// Archived reports whether the category is archived.
func (c *Category) Archived() bool { return c.ArchivedAt != nil }

type CreateCategoryParams struct {
	// ID is the optional client-generated id (offline-first clients). Zero
	// means "server generates".
	ID          uuid.UUID
	HouseholdID uuid.UUID
	// UserID is the authorship stamp (the acting member), never trusted from
	// the wire.
	UserID uuid.UUID
	Name   string
	Type   TransactionType
	Icon   string
	Color  string
	// ArchivedAt rides the create so an offline-archived unborn record
	// syncs as-is (nil = active).
	ArchivedAt *time.Time
}

// UpdateCategoryParams holds optional PATCH fields plus the required
// optimistic-concurrency Version. Nil means "leave unchanged". Archive is
// the tri-state archive flag: nil = keep, true = archive (server stamps
// now), false = unarchive.
type UpdateCategoryParams struct {
	Name    *string
	Type    *TransactionType
	Icon    *string
	Color   *string
	Archive *bool
	Version int
}

// GetCategoriesParams filters the category list. Nil Type means "all";
// IncludeArchived flips the default active-only filter (management UIs).
type GetCategoriesParams struct {
	Type            *TransactionType
	IncludeArchived bool
}

// CategoryFullState is the complete mutable state of a category (sync upserts
// carry the full record, not a PATCH).
type CategoryFullState struct {
	Name       string          `json:"name"`
	Type       TransactionType `json:"type"`
	Icon       string          `json:"icon"`
	Color      string          `json:"color"`
	ArchivedAt *time.Time      `json:"archivedAt"`
}

// FullState returns the category's complete mutable state (for sync payloads).
func (c *Category) FullState() *CategoryFullState {
	return &CategoryFullState{
		Name:       c.Name,
		Type:       c.Type,
		Icon:       c.Icon,
		Color:      c.Color,
		ArchivedAt: c.ArchivedAt,
	}
}

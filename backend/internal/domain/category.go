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
type Category struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	Name      string
	Type      TransactionType
	Icon      string
	Color     string
	CreatedAt time.Time
	UpdatedAt time.Time
	Version   int
	DeletedAt *time.Time
}

// Deleted reports whether the category is tombstoned.
func (c *Category) Deleted() bool { return c.DeletedAt != nil }

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
}

// UpdateCategoryParams holds optional PATCH fields plus the required
// optimistic-concurrency Version. Nil means "leave unchanged".
type UpdateCategoryParams struct {
	Name    *string
	Type    *TransactionType
	Icon    *string
	Color   *string
	Version int
}

// GetCategoriesParams filters the category list. Nil Type means "all".
type GetCategoriesParams struct {
	Type *TransactionType
}

// CategoryFullState is the complete mutable state of a category (sync upserts
// carry the full record, not a PATCH).
type CategoryFullState struct {
	Name  string          `json:"name"`
	Type  TransactionType `json:"type"`
	Icon  string          `json:"icon"`
	Color string          `json:"color"`
}

// FullState returns the category's complete mutable state (for sync payloads).
func (c *Category) FullState() *CategoryFullState {
	return &CategoryFullState{
		Name:  c.Name,
		Type:  c.Type,
		Icon:  c.Icon,
		Color: c.Color,
	}
}

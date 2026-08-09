package domain

import (
	"time"

	"github.com/google/uuid"
)

// TransactionType is the kind of a transaction (cashflow income/expense or
// transfer). Stored as TEXT with a CHECK constraint in Postgres.
type TransactionType string

const (
	TransactionTypeIncome   TransactionType = "income"
	TransactionTypeExpense  TransactionType = "expense"
	TransactionTypeTransfer TransactionType = "transfer"
)

// CategoryType is the subset of transaction types a category can own.
type CategoryType string

const (
	CategoryTypeIncome  CategoryType = "income"
	CategoryTypeExpense CategoryType = "expense"
)

// Category is a per-user classification for cashflow transactions.
type Category struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	Name      string
	Type      TransactionType
	Icon      string
	Color     string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type CreateCategoryParams struct {
	UserID uuid.UUID
	Name   string
	Type   TransactionType
	Icon   string
	Color  string
}

// UpdateCategoryParams holds optional PATCH fields. Nil means "leave unchanged".
type UpdateCategoryParams struct {
	Name  *string
	Type  *TransactionType
	Icon  *string
	Color *string
}

// GetCategoriesParams filters the category list. Nil Type means "all".
type GetCategoriesParams struct {
	Type *TransactionType
}

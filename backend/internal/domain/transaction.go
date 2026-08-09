package domain

import (
	"time"

	"github.com/google/uuid"
)

// Transaction is a single money movement. Cashflow (income/expense) carries
// AccountID + CategoryID; transfer carries FromAccountID + ToAccountID. These
// pairs are mutually exclusive.
type Transaction struct {
	ID          uuid.UUID
	UserID      uuid.UUID
	Type        TransactionType
	Amount      int64
	Description string
	OccurredAt  time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
	Version     int
	// Cashflow fields (income/expense).
	AccountID  *uuid.UUID
	CategoryID *uuid.UUID
	// Transfer fields.
	FromAccountID *uuid.UUID
	ToAccountID   *uuid.UUID
}

type CreateTransactionParams struct {
	UserID      uuid.UUID
	Type        TransactionType
	Amount      int64
	Description string
	OccurredAt  time.Time
	// Cashflow fields.
	AccountID  *uuid.UUID
	CategoryID *uuid.UUID
	// Transfer fields.
	FromAccountID *uuid.UUID
	ToAccountID   *uuid.UUID
}

// UpdateTransactionParams holds optional PATCH fields plus the required
// optimistic-concurrency Version. Pointer fields are nil to "leave unchanged".
type UpdateTransactionParams struct {
	Amount      *int64
	Description *string
	OccurredAt  *time.Time
	Version     int
	// Cashflow fields.
	AccountID  *uuid.UUID
	CategoryID *uuid.UUID
	// Transfer fields.
	FromAccountID *uuid.UUID
	ToAccountID   *uuid.UUID
}

// TransactionCursor is the opaque keyset cursor for listTransactions.
type TransactionCursor struct {
	OccurredAt time.Time
	ID         uuid.UUID
}

// GetTransactionsParams filters + paginates the transaction list.
type GetTransactionsParams struct {
	Type       *TransactionType
	AccountID  *uuid.UUID
	CategoryID *uuid.UUID
	FromDate   *time.Time
	ToDate     *time.Time
	Limit      *int
	Cursor     *TransactionCursor
}

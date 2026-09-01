package domain

import (
	"time"

	"github.com/google/uuid"
)

// Transaction is a single money movement. Cashflow (income/expense) carries
// AccountID + CategoryID; transfer carries FromAccountID + ToAccountID;
// adjustment (balance reconciliation) carries only AccountID and a nonzero
// signed Amount. These reference shapes are mutually exclusive. DeletedAt
// marks a tombstone (soft delete).
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
	// Tombstone marker (nil = live).
	DeletedAt *time.Time
}

// Deleted reports whether the transaction is tombstoned.
func (t *Transaction) Deleted() bool { return t.DeletedAt != nil }

type CreateTransactionParams struct {
	// ID is the optional client-generated id (offline-first clients). Zero
	// means "server generates".
	ID          uuid.UUID
	HouseholdID uuid.UUID
	// UserID is the authorship stamp (the acting member), never trusted from
	// the wire.
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

// TransactionFullState is the complete mutable state of a transaction (sync
// upserts carry the full record, not a PATCH). Type is immutable.
type TransactionFullState struct {
	Type        TransactionType `json:"type"`
	Amount      int64           `json:"amount"`
	Description string          `json:"description"`
	OccurredAt  time.Time       `json:"occurredAt"`
	// Cashflow fields.
	AccountID  *uuid.UUID `json:"accountId"`
	CategoryID *uuid.UUID `json:"categoryId"`
	// Transfer fields.
	FromAccountID *uuid.UUID `json:"fromAccountId"`
	ToAccountID   *uuid.UUID `json:"toAccountId"`
}

// FullState returns the transaction's complete mutable state (for sync
// payloads).
func (t *Transaction) FullState() *TransactionFullState {
	return &TransactionFullState{
		Type:          t.Type,
		Amount:        t.Amount,
		Description:   t.Description,
		OccurredAt:    t.OccurredAt,
		AccountID:     t.AccountID,
		CategoryID:    t.CategoryID,
		FromAccountID: t.FromAccountID,
		ToAccountID:   t.ToAccountID,
	}
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

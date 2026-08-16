// Package repository defines the data-access interfaces implemented by the
// Postgres layer and consumed by the service layer.
//
// Every resource query is scoped by the authenticated userID (IDOR protection:
// a cross-user access returns "not found", never the row). Services always pass
// userID explicitly - never from a request body.
package repository

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
)

// UserRepository owns the users table (identity). Not user-scoped (the user IS
// the identity).
type UserRepository interface {
	RegisterUser(ctx context.Context, params domain.RegisterUserParams) (*domain.User, error)
	GetUserByEmail(ctx context.Context, email string) (*domain.User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
}

// SessionRepository owns stateful auth sessions.
type SessionRepository interface {
	CreateSession(ctx context.Context, params domain.CreateSessionParams) (*domain.Session, error)
	GetSessionByID(ctx context.Context, id string) (*domain.Session, error)
	DeleteSession(ctx context.Context, id string) error
	ExtendSession(ctx context.Context, id string, newExpiresAt time.Time) error
	DeleteExpiredSessions(ctx context.Context) (int64, error)
	GetSessionsByUser(ctx context.Context, userID uuid.UUID) ([]domain.Session, error)
	DeleteSessionsByUserExcept(ctx context.Context, userID uuid.UUID, exceptSessionID string) (int64, error)
	DeleteSessionsByUser(ctx context.Context, userID uuid.UUID) (int64, error)
}

// AccountRepository owns accounts + their computed balances.
type AccountRepository interface {
	CreateAccount(ctx context.Context, params domain.CreateAccountParams) (*domain.Account, error)
	UpdateAccount(ctx context.Context, userID, id uuid.UUID, params domain.UpdateAccountParams) (*domain.Account, error)
	DeleteAccount(ctx context.Context, userID, id uuid.UUID) error
	GetAccount(ctx context.Context, userID, id uuid.UUID) (*domain.Account, error)
	GetAccounts(ctx context.Context, userID uuid.UUID) ([]domain.Account, error)
	GetAccountBalances(ctx context.Context, userID uuid.UUID) ([]domain.AccountBalance, error)
}

// CategoryRepository owns per-user categories.
type CategoryRepository interface {
	CreateCategory(ctx context.Context, params domain.CreateCategoryParams) (*domain.Category, error)
	UpdateCategory(
		ctx context.Context,
		userID, id uuid.UUID,
		params domain.UpdateCategoryParams,
	) (*domain.Category, error)
	DeleteCategory(ctx context.Context, userID, id uuid.UUID) error
	GetCategory(ctx context.Context, userID, id uuid.UUID) (*domain.Category, error)
	GetCategories(ctx context.Context, userID uuid.UUID, params domain.GetCategoriesParams) ([]domain.Category, error)
}

// TransactionRepository owns transactions (keyset-cursor pagination, optimistic
// concurrency). Reference validation lives in the service layer.
type TransactionRepository interface {
	CreateTransaction(ctx context.Context, params domain.CreateTransactionParams) (*domain.Transaction, error)
	UpdateTransaction(
		ctx context.Context,
		userID, id uuid.UUID,
		params domain.UpdateTransactionParams,
	) (*domain.Transaction, error)
	DeleteTransaction(ctx context.Context, userID, id uuid.UUID) error
	GetTransaction(ctx context.Context, userID, id uuid.UUID) (*domain.Transaction, error)
	GetTransactions(
		ctx context.Context,
		userID uuid.UUID,
		params domain.GetTransactionsParams,
	) ([]domain.Transaction, error)
}

// SyncTx is the unit-of-work handed to SyncRepository.WithinUserTx: every
// method operates on the SAME open database transaction (which holds the
// user's change-log advisory lock), so a whole push batch commits atomically
// and its change_log rows order with commit visibility.
type SyncTx interface {
	GetAppliedOperation(ctx context.Context, userID, opID uuid.UUID) (*domain.AppliedOperation, error)
	InsertAppliedOperation(ctx context.Context, op domain.AppliedOperation) error

	// Reads including tombstones (nil, nil when the id was never created).
	GetAccountAny(ctx context.Context, userID, id uuid.UUID) (*domain.Account, error)
	GetCategoryAny(ctx context.Context, userID, id uuid.UUID) (*domain.Category, error)
	GetTransactionAny(ctx context.Context, userID, id uuid.UUID) (*domain.Transaction, error)

	// Live-only reads for reference validation.
	LiveAccountExists(ctx context.Context, userID, id uuid.UUID) (bool, error)
	LiveCategory(ctx context.Context, userID, id uuid.UUID) (*domain.Category, error)
	CategoryNameTaken(ctx context.Context, userID uuid.UUID, name string, exceptID uuid.UUID) (bool, error)
	HasLiveTransactionsForAccount(ctx context.Context, userID, accountID uuid.UUID) (bool, error)
	HasLiveTransactionsForCategory(ctx context.Context, userID, categoryID uuid.UUID) (bool, error)

	// Writes; each appends its change_log row on the same transaction. The
	// Replace/Tombstone methods enforce the CAS/liveness invariants and return
	// the classified domain sentinel on failure (Err*VersionConflict,
	// ErrRecordDeleted, Err*NotFound).
	CreateAccount(ctx context.Context, params domain.CreateAccountParams) (*domain.Account, error)
	ReplaceAccount(
		ctx context.Context, userID, id uuid.UUID, baseVersion int, st domain.AccountFullState,
	) (*domain.Account, error)
	TombstoneAccount(ctx context.Context, userID, id uuid.UUID) (*domain.Account, error)
	CreateCategory(ctx context.Context, params domain.CreateCategoryParams) (*domain.Category, error)
	ReplaceCategory(
		ctx context.Context, userID, id uuid.UUID, baseVersion int, st domain.CategoryFullState,
	) (*domain.Category, error)
	TombstoneCategory(ctx context.Context, userID, id uuid.UUID) (*domain.Category, error)
	CreateTransaction(ctx context.Context, params domain.CreateTransactionParams) (*domain.Transaction, error)
	ReplaceTransaction(
		ctx context.Context, userID, id uuid.UUID, baseVersion int, st domain.TransactionFullState,
	) (*domain.Transaction, error)
	TombstoneTransaction(ctx context.Context, userID, id uuid.UUID) (*domain.Transaction, error)
}

// SyncRepository backs /api/sync: batched pushes (one transaction per batch)
// and the cursor pull.
type SyncRepository interface {
	// WithinUserTx opens the per-batch transaction, takes the user's
	// change-log advisory lock, runs fn, and commits iff fn succeeds.
	WithinUserTx(ctx context.Context, userID uuid.UUID, fn func(t SyncTx) error) error
	// PullChanges returns up to limit changes with seq > afterSeq in seq
	// order. The caller derives nextCursor (last seq when the page is full,
	// nil when caught up).
	PullChanges(ctx context.Context, userID uuid.UUID, afterSeq int64, limit int) ([]domain.SyncChange, error)
}

// IdempotencyRepository caches POST /api/transactions responses for replay.
type IdempotencyRepository interface {
	CreateIdempotencyKey(ctx context.Context, params domain.CreateIdempotencyKeyParams) (*domain.IdempotencyKey, error)
	UpdateIdempotencyKey(
		ctx context.Context,
		userID, id uuid.UUID,
		params domain.UpdateIdempotencyKeyParams,
	) (*domain.IdempotencyKey, error)
	GetByUserAndKey(ctx context.Context, userID uuid.UUID, key string) (*domain.IdempotencyKey, error)
	DeleteIdempotencyKey(ctx context.Context, userID, id uuid.UUID) error
	DeleteExpiredIdempotencyKeys(ctx context.Context) (int64, error)
}

// EmailVerificationRepository owns OTP verification (atomic consume flow).
type EmailVerificationRepository interface {
	CreateEmailVerificationCode(ctx context.Context, userID uuid.UUID, code string, expiresAt time.Time) error
	VerifyEmailCode(ctx context.Context, userID uuid.UUID, code string) error
	LatestVerificationCodeAgeSeconds(ctx context.Context, userID uuid.UUID) (int, bool, error)
}

// PasswordResetRepository owns hashed reset tokens (atomic consume + revoke).
type PasswordResetRepository interface {
	CreatePasswordResetToken(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error
	ResetPassword(ctx context.Context, tokenHash, passwordHash string) error
	LatestPasswordResetTokenAgeSeconds(ctx context.Context, userID uuid.UUID) (int, bool, error)
}

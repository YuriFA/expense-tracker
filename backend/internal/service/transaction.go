package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

const (
	defaultTransactionPageSize = 50
	maxTransactionPageSize     = 100
)

// TransactionService owns transaction business rules: reference validation
// (account/category ownership + type match), the cursor encode/decode, and the
// page-size +1 fetch logic. The repository handles the optimistic-concurrency
// version check (returns ErrTransactionVersionConflict on mismatch).
type TransactionService struct {
	transactions repository.TransactionRepository
	accounts     repository.AccountRepository
	categories   repository.CategoryRepository
}

func NewTransactionService(
	transactions repository.TransactionRepository,
	accounts repository.AccountRepository,
	categories repository.CategoryRepository,
) *TransactionService {
	return &TransactionService{transactions: transactions, accounts: accounts, categories: categories}
}

func (s *TransactionService) Create(
	ctx context.Context,
	householdID, userID uuid.UUID,
	params domain.CreateTransactionParams,
) (*domain.Transaction, error) {
	const op = "service.transaction.Create"

	if err := ValidateAmount(params.Type, params.Amount); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	if err := s.validateRefs(
		ctx,
		householdID,
		params.Type,
		params.AccountID,
		params.CategoryID,
		params.FromAccountID,
		params.ToAccountID,
		nil, // fresh assignment: any archived category is rejected
	); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	params.HouseholdID, params.UserID = householdID, userID
	tx, err := s.transactions.CreateTransaction(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return tx, nil
}

func (s *TransactionService) Update(
	ctx context.Context,
	householdID, userID, id uuid.UUID,
	params domain.UpdateTransactionParams,
) (*domain.Transaction, error) {
	const op = "service.transaction.Update"

	if params.Amount == nil && params.Description == nil && params.OccurredAt == nil &&
		params.AccountID == nil && params.CategoryID == nil &&
		params.FromAccountID == nil && params.ToAccountID == nil {
		return nil, ErrNoFieldsToUpdate
	}

	current, err := s.transactions.GetTransaction(ctx, householdID, id)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	// Compute the effective reference set after applying the patch.
	effectiveAccountID := current.AccountID
	if params.AccountID != nil {
		effectiveAccountID = params.AccountID
	}
	effectiveCategoryID := current.CategoryID
	if params.CategoryID != nil {
		effectiveCategoryID = params.CategoryID
	}
	effectiveFromAccountID := current.FromAccountID
	if params.FromAccountID != nil {
		effectiveFromAccountID = params.FromAccountID
	}
	effectiveToAccountID := current.ToAccountID
	if params.ToAccountID != nil {
		effectiveToAccountID = params.ToAccountID
	}

	effectiveAmount := current.Amount
	if params.Amount != nil {
		effectiveAmount = *params.Amount
	}
	if err := ValidateAmount(current.Type, effectiveAmount); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	if err := s.validateRefs(ctx, householdID, current.Type,
		effectiveAccountID, effectiveCategoryID, effectiveFromAccountID, effectiveToAccountID,
		current.CategoryID, // unchanged assignment may keep an archived category
	); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	tx, err := s.transactions.UpdateTransaction(ctx, householdID, userID, id, params)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return tx, nil
}

func (s *TransactionService) Delete(ctx context.Context, householdID, userID, id uuid.UUID) error {
	const op = "service.transaction.Delete"
	if err := s.transactions.DeleteTransaction(ctx, householdID, userID, id); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}

func (s *TransactionService) Get(ctx context.Context, householdID, id uuid.UUID) (*domain.Transaction, error) {
	const op = "service.transaction.Get"
	tx, err := s.transactions.GetTransaction(ctx, householdID, id)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return tx, nil
}

// TransactionListPage is one page of listTransactions: the rows + an opaque
// cursor for the next page (nil when there are no more pages).
type TransactionListPage struct {
	Transactions []domain.Transaction
	NextCursor   *string
}

// TransactionListQuery is the service-facing input for List: the filters plus
// the opaque cursor string straight from the query string.
type TransactionListQuery struct {
	Type       *domain.TransactionType
	AccountID  *uuid.UUID
	CategoryID *uuid.UUID
	FromDate   *time.Time
	ToDate     *time.Time
	Limit      *int
	Cursor     *string // opaque
}

// List fetches a page of transactions. It asks the repository for pageSize+1
// rows; if more than pageSize came back, it encodes a nextCursor from the last
// item of the page and trims to pageSize.
func (s *TransactionService) List(
	ctx context.Context,
	householdID uuid.UUID,
	q TransactionListQuery,
) (*TransactionListPage, error) {
	const op = "service.transaction.List"

	pageSize := boundPageSize(q.Limit)

	var cursor *domain.TransactionCursor
	if q.Cursor != nil {
		decoded, err := DecodeTransactionCursor(*q.Cursor)
		if err != nil {
			return nil, ErrInvalidCursor
		}
		cursor = decoded
	}

	fetchLimit := pageSize + 1
	rows, err := s.transactions.GetTransactions(ctx, householdID, domain.GetTransactionsParams{
		Type:       q.Type,
		AccountID:  q.AccountID,
		CategoryID: q.CategoryID,
		FromDate:   q.FromDate,
		ToDate:     q.ToDate,
		Limit:      &fetchLimit,
		Cursor:     cursor,
	})
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	page := &TransactionListPage{Transactions: rows}
	if len(rows) > pageSize {
		encoded, err := EncodeTransactionCursor(rows[pageSize-1])
		if err != nil {
			return nil, fmt.Errorf("%s: %w", op, err)
		}
		page.NextCursor = &encoded
		page.Transactions = rows[:pageSize]
	}

	return page, nil
}

// ErrInvalidCursor is returned when the cursor cannot be decoded.
var ErrInvalidCursor = errors.New("invalid cursor")

func boundPageSize(requested *int) int {
	size := defaultTransactionPageSize
	if requested != nil && *requested > 0 {
		size = *requested
	}
	return min(size, maxTransactionPageSize)
}

// validateRefs enforces the per-type reference rules (cashflow vs transfer
// vs adjustment) and that every referenced account/category exists and
// belongs to householdID, and that a cashflow category's type matches the
// transaction type. Income/expense MAY be account-less («без счета»): a nil
// accountID skips the account checks; the category is required regardless.
// The not-found errors for FK references are DISTINCT from
// the by-id fetch errors so the transport error mapper stays a pure 1:1
// function (422 inside a transaction vs 404 by id).
// validateRefs verifies the effective reference set after a patch (create
// passes the same set twice). prevCategoryID is the transaction's category
// before the change (nil on create): assigning an ARCHIVED category is
// rejected, but keeping an already-assigned archived category is allowed.
func (s *TransactionService) validateRefs(
	ctx context.Context,
	householdID uuid.UUID,
	typ domain.TransactionType,
	accountID, categoryID, fromAccountID, toAccountID *uuid.UUID,
	prevCategoryID *uuid.UUID,
) error {
	switch typ {
	case domain.TransactionTypeIncome, domain.TransactionTypeExpense:
		if fromAccountID != nil || toAccountID != nil || categoryID == nil {
			return domain.ErrInvalidRefs
		}
		return s.validateCashflowRefs(ctx, householdID, accountID, *categoryID, typ, prevCategoryID)
	case domain.TransactionTypeTransfer:
		if accountID != nil || categoryID != nil || fromAccountID == nil || toAccountID == nil {
			return domain.ErrInvalidRefs
		}
		return s.validateTransferRefs(ctx, householdID, *fromAccountID, *toAccountID)
	case domain.TransactionTypeAdjustment:
		if categoryID != nil || fromAccountID != nil || toAccountID != nil || accountID == nil {
			return domain.ErrInvalidRefs
		}
		return s.validateAdjustmentRefs(ctx, householdID, *accountID)
	}
	return nil
}

// ValidateAmount enforces the per-type amount sign rule: positive for
// income/expense/transfer, nonzero signed for adjustment (the reconciliation
// delta may lower or raise the balance).
func ValidateAmount(typ domain.TransactionType, amount int64) error {
	if typ == domain.TransactionTypeAdjustment {
		if amount == 0 {
			return domain.ErrInvalidAmount
		}
		return nil
	}
	if amount < 1 {
		return domain.ErrInvalidAmount
	}
	return nil
}

// validateAdjustmentRefs verifies the reconciled account exists and belongs
// to householdID.
func (s *TransactionService) validateAdjustmentRefs(
	ctx context.Context,
	householdID, accountID uuid.UUID,
) error {
	if _, err := s.accounts.GetAccount(ctx, householdID, accountID); err != nil {
		if errors.Is(err, domain.ErrAccountNotFound) {
			return domain.ErrTransactionAccountNotFound
		}
		return err
	}
	return nil
}

// validateCashflowRefs verifies the income/expense references: when an
// account is referenced it must exist and belong to householdID (income and
// expense MAY be account-less — a nil accountID skips this check); the
// category must exist, belong to householdID, match the transaction type,
// and an archived category is only kept, never newly assigned
// (prevCategoryID nil = a fresh assignment).
func (s *TransactionService) validateCashflowRefs(
	ctx context.Context,
	householdID uuid.UUID,
	accountID *uuid.UUID,
	categoryID uuid.UUID,
	typ domain.TransactionType,
	prevCategoryID *uuid.UUID,
) error {
	if accountID != nil {
		if _, err := s.accounts.GetAccount(ctx, householdID, *accountID); err != nil {
			if errors.Is(err, domain.ErrAccountNotFound) {
				return domain.ErrTransactionAccountNotFound
			}
			return err
		}
	}
	cat, err := s.categories.GetCategory(ctx, householdID, categoryID)
	if err != nil {
		if errors.Is(err, domain.ErrCategoryNotFound) {
			return domain.ErrTransactionCategoryNotFound
		}
		return err
	}
	if cat.Type != typ {
		return domain.ErrCategoryTypeMismatch
	}
	if cat.Archived() && (prevCategoryID == nil || *prevCategoryID != categoryID) {
		return domain.ErrCategoryArchived
	}
	return nil
}

// validateTransferRefs verifies both transfer endpoints exist and belong to
// householdID, and rejects same-account transfers.
func (s *TransactionService) validateTransferRefs(
	ctx context.Context,
	householdID, fromAccountID, toAccountID uuid.UUID,
) error {
	if _, err := s.accounts.GetAccount(ctx, householdID, fromAccountID); err != nil {
		if errors.Is(err, domain.ErrAccountNotFound) {
			return domain.ErrTransactionFromAccountNotFound
		}
		return err
	}
	if _, err := s.accounts.GetAccount(ctx, householdID, toAccountID); err != nil {
		if errors.Is(err, domain.ErrAccountNotFound) {
			return domain.ErrTransactionToAccountNotFound
		}
		return err
	}
	if fromAccountID == toAccountID {
		return domain.ErrSameAccountTransfer
	}
	return nil
}

// cursorPayload is the JSON shape of the opaque keyset cursor.
type cursorPayload struct {
	OccurredAt time.Time `json:"occurredAt"`
	ID         uuid.UUID `json:"id"`
}

// EncodeTransactionCursor encodes a transaction's (occurredAt, id) as an opaque
// base64-URL string for nextCursor.
func EncodeTransactionCursor(t domain.Transaction) (string, error) {
	b, err := json.Marshal(cursorPayload{OccurredAt: t.OccurredAt, ID: t.ID})
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// DecodeTransactionCursor decodes an opaque cursor string back into the keyset.
func DecodeTransactionCursor(s string) (*domain.TransactionCursor, error) {
	b, err := base64.URLEncoding.DecodeString(s)
	if err != nil {
		return nil, err
	}
	var p cursorPayload
	if err := json.Unmarshal(b, &p); err != nil {
		return nil, err
	}
	if p.ID == uuid.Nil {
		return nil, errors.New("invalid cursor payload")
	}
	return &domain.TransactionCursor{OccurredAt: p.OccurredAt, ID: p.ID}, nil
}

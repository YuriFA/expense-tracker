package service

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

// transactionTx is the transaction push path's slice of the batch tx
// (ADR-0003): the shared core, its own contract, and the live account/
// category reference reads the per-type validation needs (declared inline so
// the adapter sees exactly the reads it uses, not those contracts' writes).
// The compile-time check pins the contract to the full repository.SyncTx the
// applier hands in.
type transactionTx interface {
	repository.SyncCore
	repository.TransactionSyncTx
	LiveAccountExists(ctx context.Context, householdID, id uuid.UUID) (bool, error)
	LiveCategory(ctx context.Context, householdID, id uuid.UUID) (*domain.Category, error)
}

var _ transactionTx = repository.SyncTx(nil)

// transactionAdapter is the transaction's half of the push engine: the
// type/amount shape rules before the current-row read, the per-type
// reference rules (cashflow vs transfer vs adjustment, against LIVE
// accounts/categories) after it, the type immutability guard, and no delete
// guard (transactions tombstone unconditionally).
type transactionAdapter struct {
	syncAdapterDefaults[transactionTx, *domain.Transaction, domain.TransactionFullState]
}

func (transactionAdapter) entity() string { return domain.SyncEntityTransaction }
func (transactionAdapter) label() string  { return "transaction" }

func (transactionAdapter) decode(raw json.RawMessage) (domain.TransactionFullState, error) {
	var data domain.TransactionFullState
	err := decodeSyncData(raw, &data)
	return data, err
}

func (transactionAdapter) invalidDataMessage() string { return "invalid transaction data" }

// preValidate checks the type + amount sign rules every upsert must satisfy
// regardless of the transport.
func (transactionAdapter) preValidate(
	_ context.Context, _ transactionTx, _ uuid.UUID, _ domain.SyncOperation, data domain.TransactionFullState,
) (string, string, error) {
	if code := validateTransactionSyncShape(&data); code != "" {
		return code, syncRefMessage(code), nil
	}
	return "", "", nil
}

// postReadValidate enforces the per-type reference rules on the effective
// refs of the full state (update) or the new record (create) with the REST
// granularity: unknown live refs -> per-item unknown-references error; type
// mismatch / same-account transfer / archived-category assignment -> their
// codes. An archived category may stay on the record it already labels.
func (transactionAdapter) postReadValidate(
	ctx context.Context,
	t transactionTx,
	householdID uuid.UUID,
	op domain.SyncOperation,
	data domain.TransactionFullState,
) (string, string, error) {
	var prevCategoryID *uuid.UUID
	if current, found, err := (transactionAdapter{}).getAny(ctx, t, householdID, op.ID); err != nil {
		return "", "", err
	} else if found && !current.Deleted() {
		prevCategoryID = current.CategoryID
	}
	if code := validateSyncRefs(ctx, t, householdID, &data, prevCategoryID); code != "" {
		return code, syncRefMessage(code), nil
	}
	return "", "", nil
}

func (transactionAdapter) immutable(cur *domain.Transaction, data domain.TransactionFullState) (string, string) {
	if cur.Type != data.Type {
		return "VALIDATION_FAILED", "transaction type is immutable"
	}
	return "", ""
}

func (transactionAdapter) version(tr *domain.Transaction) int   { return tr.Version }
func (transactionAdapter) fullState(tr *domain.Transaction) any { return tr.FullState() }
func (transactionAdapter) isWriteRace(err error) bool {
	return errors.Is(err, domain.ErrTransactionVersionConflict) || errors.Is(err, domain.ErrRecordDeleted)
}

func (transactionAdapter) getAny(
	ctx context.Context, t transactionTx, householdID, id uuid.UUID,
) (*domain.Transaction, bool, error) {
	tr, err := t.GetTransactionAny(ctx, householdID, id)
	if err != nil || tr == nil {
		return nil, false, err
	}
	return tr, true, nil
}

func (transactionAdapter) create(
	ctx context.Context, t transactionTx, householdID, userID, id uuid.UUID, data domain.TransactionFullState,
) (*domain.Transaction, error) {
	return t.CreateTransaction(ctx, domain.CreateTransactionParams{
		ID: id, HouseholdID: householdID, UserID: userID,
		Type: data.Type, Amount: data.Amount, Description: data.Description, OccurredAt: data.OccurredAt,
		AccountID: data.AccountID, CategoryID: data.CategoryID,
		FromAccountID: data.FromAccountID, ToAccountID: data.ToAccountID,
	})
}

func (transactionAdapter) replace(
	ctx context.Context,
	t transactionTx,
	householdID, userID, id uuid.UUID,
	baseVersion int,
	data domain.TransactionFullState,
) (*domain.Transaction, error) {
	return t.ReplaceTransaction(ctx, householdID, userID, id, baseVersion, data)
}

func (transactionAdapter) tombstone(
	ctx context.Context, t transactionTx, householdID, userID, id uuid.UUID,
) (*domain.Transaction, error) {
	return t.TombstoneTransaction(ctx, householdID, userID, id)
}

// validateTransactionSyncShape checks the type + amount sign rules a pushed
// transaction must satisfy regardless of the transport.
func validateTransactionSyncShape(data *domain.TransactionFullState) string {
	switch data.Type {
	case domain.TransactionTypeIncome,
		domain.TransactionTypeExpense,
		domain.TransactionTypeTransfer,
		domain.TransactionTypeAdjustment:
	default:
		return "VALIDATION_FAILED"
	}
	if ValidateAmount(data.Type, data.Amount) != nil {
		return "INVALID_AMOUNT"
	}
	return ""
}

// validateSyncRefs enforces the per-type reference rules (cashflow vs
// transfer vs adjustment) on the LIVE accounts/categories, returning the
// machine code of the violation ("" = valid). Mirrors
// TransactionService.validateRefs with sync-tx reads; prevCategoryID (the
// record's category before this push) permits keeping an already-assigned
// archived category while rejecting new assignments.
func validateSyncRefs(
	ctx context.Context,
	t transactionTx,
	householdID uuid.UUID,
	data *domain.TransactionFullState,
	prevCategoryID *uuid.UUID,
) string {
	switch data.Type {
	case domain.TransactionTypeIncome, domain.TransactionTypeExpense:
		if data.FromAccountID != nil || data.ToAccountID != nil || data.AccountID == nil || data.CategoryID == nil {
			return "INVALID_REFS"
		}
		return validateSyncCashflowRefs(
			ctx,
			t,
			householdID,
			*data.AccountID,
			*data.CategoryID,
			data.Type,
			prevCategoryID,
		)
	case domain.TransactionTypeTransfer:
		if data.AccountID != nil || data.CategoryID != nil || data.FromAccountID == nil || data.ToAccountID == nil {
			return "INVALID_REFS"
		}
		return validateSyncTransferRefs(ctx, t, householdID, *data.FromAccountID, *data.ToAccountID)
	case domain.TransactionTypeAdjustment:
		if data.CategoryID != nil || data.FromAccountID != nil || data.ToAccountID != nil || data.AccountID == nil {
			return "INVALID_REFS"
		}
		return validateSyncAdjustmentRefs(ctx, t, householdID, *data.AccountID)
	}
	return ""
}

// liveAccountCode maps an account existence read to a sync result code: ""
// when the account exists, ACCOUNT_NOT_FOUND when it does not, INVALID_REFS
// when the read itself failed.
func liveAccountCode(ctx context.Context, t transactionTx, householdID, accountID uuid.UUID) string {
	exists, err := t.LiveAccountExists(ctx, householdID, accountID)
	if err != nil {
		return "INVALID_REFS"
	}
	if !exists {
		return "ACCOUNT_NOT_FOUND"
	}
	return ""
}

func validateSyncCashflowRefs(
	ctx context.Context,
	t transactionTx,
	householdID, accountID, categoryID uuid.UUID,
	typ domain.TransactionType,
	prevCategoryID *uuid.UUID,
) string {
	if code := liveAccountCode(ctx, t, householdID, accountID); code != "" {
		return code
	}
	category, err := t.LiveCategory(ctx, householdID, categoryID)
	if err != nil || category == nil {
		return "CATEGORY_NOT_FOUND"
	}
	if category.Type != typ {
		return "CATEGORY_TYPE_MISMATCH"
	}
	if category.Archived() && (prevCategoryID == nil || *prevCategoryID != categoryID) {
		return "CATEGORY_ARCHIVED"
	}
	return ""
}

func validateSyncTransferRefs(
	ctx context.Context,
	t transactionTx,
	householdID, fromAccountID, toAccountID uuid.UUID,
) string {
	if code := liveAccountCode(ctx, t, householdID, fromAccountID); code != "" {
		return code
	}
	if code := liveAccountCode(ctx, t, householdID, toAccountID); code != "" {
		return code
	}
	if fromAccountID == toAccountID {
		return "SAME_ACCOUNT_TRANSFER"
	}
	return ""
}

func validateSyncAdjustmentRefs(
	ctx context.Context,
	t transactionTx,
	householdID, accountID uuid.UUID,
) string {
	return liveAccountCode(ctx, t, householdID, accountID)
}

func syncRefMessage(code string) string {
	switch code {
	case "ACCOUNT_NOT_FOUND":
		return "account not found"
	case "CATEGORY_NOT_FOUND":
		return "category not found"
	case "CATEGORY_TYPE_MISMATCH":
		return "transaction type does not match category type"
	case "CATEGORY_ARCHIVED":
		return "category is archived and not available for new transactions"
	case "SAME_ACCOUNT_TRANSFER":
		return "transaction from and to accounts are the same"
	case "INVALID_AMOUNT":
		return "invalid amount"
	default:
		return "invalid references"
	}
}

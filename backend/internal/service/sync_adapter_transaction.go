package service

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

// transactionAdapter is the transaction's half of the push engine: the
// type/amount shape rules before the current-row read, the per-type
// reference rules (cashflow vs transfer vs adjustment, against LIVE
// accounts/categories) after it, the type immutability guard, and no delete
// guard (transactions tombstone unconditionally).
type transactionAdapter struct {
	syncAdapterDefaults[*domain.Transaction, domain.TransactionFullState]
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
	_ context.Context, _ repository.SyncTx, _ uuid.UUID, _ domain.SyncOperation, data domain.TransactionFullState,
) (string, string, error) {
	if code := validateTransactionSyncShape(&data); code != "" {
		return code, syncRefMessage(code), nil
	}
	return "", "", nil
}

// postReadValidate enforces the per-type reference rules on the effective
// refs of the full state (update) or the new record (create) with the REST
// granularity: unknown live refs -> per-item unknown-references error; type
// mismatch / same-account transfer -> invalid-payload codes.
func (transactionAdapter) postReadValidate(
	ctx context.Context,
	t repository.SyncTx,
	householdID uuid.UUID,
	_ domain.SyncOperation,
	data domain.TransactionFullState,
) (string, string, error) {
	if code := validateSyncRefs(ctx, t, householdID, &data); code != "" {
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
	ctx context.Context, t repository.SyncTx, householdID, id uuid.UUID,
) (*domain.Transaction, bool, error) {
	tr, err := t.GetTransactionAny(ctx, householdID, id)
	if err != nil || tr == nil {
		return nil, false, err
	}
	return tr, true, nil
}

func (transactionAdapter) create(
	ctx context.Context, t repository.SyncTx, householdID, userID, id uuid.UUID, data domain.TransactionFullState,
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
	t repository.SyncTx,
	householdID, userID, id uuid.UUID,
	baseVersion int,
	data domain.TransactionFullState,
) (*domain.Transaction, error) {
	return t.ReplaceTransaction(ctx, householdID, userID, id, baseVersion, data)
}

func (transactionAdapter) tombstone(
	ctx context.Context, t repository.SyncTx, householdID, userID, id uuid.UUID,
) (*domain.Transaction, error) {
	return t.TombstoneTransaction(ctx, householdID, userID, id)
}

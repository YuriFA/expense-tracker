package service

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

// debtOperationAdapter is the debt operation's half of the push engine: the
// amount/direction/kind shape rules and the live-debtor reference check as
// pre-validation, the debtor/direction/kind immutability guard, and no
// delete guard (debt operations tombstone unconditionally).
type debtOperationAdapter struct {
	syncAdapterDefaults[*domain.DebtOperation, domain.DebtOperationFullState]
}

func (debtOperationAdapter) entity() string { return domain.SyncEntityDebtOperation }
func (debtOperationAdapter) label() string  { return "debt operation" }

func (debtOperationAdapter) decode(raw json.RawMessage) (domain.DebtOperationFullState, error) {
	var data domain.DebtOperationFullState
	err := decodeSyncData(raw, &data)
	return data, err
}

func (debtOperationAdapter) invalidDataMessage() string { return "invalid debt operation data" }

// preValidate checks the shape rules, then the debtor reference against the
// LIVE debtors (a tombstoned debtor is "not found") - with the REST
// granularity.
func (debtOperationAdapter) preValidate(
	ctx context.Context,
	t repository.SyncTx,
	householdID uuid.UUID,
	_ domain.SyncOperation,
	data domain.DebtOperationFullState,
) (string, string, error) {
	if data.Amount < 1 {
		return "VALIDATION_FAILED", "amount must be at least 1 minor unit", nil
	}
	if data.Direction != domain.DebtDirectionReceivable && data.Direction != domain.DebtDirectionPayable {
		return "VALIDATION_FAILED", "invalid debt direction", nil
	}
	if data.Kind != domain.DebtOperationKindDebt && data.Kind != domain.DebtOperationKindRepayment {
		return "VALIDATION_FAILED", "invalid debt operation kind", nil
	}
	live, err := t.LiveDebtorExists(ctx, householdID, data.DebtorID)
	if err != nil {
		return "", "", err
	}
	if !live {
		return "DEBT_OPERATION_DEBTOR_NOT_FOUND", "debtor not found", nil
	}
	return "", "", nil
}

func (debtOperationAdapter) immutable(cur *domain.DebtOperation, data domain.DebtOperationFullState) (string, string) {
	if cur.DebtorID != data.DebtorID || cur.Direction != data.Direction || cur.Kind != data.Kind {
		return "VALIDATION_FAILED", "debtor, direction, and kind are immutable"
	}
	return "", ""
}

func (debtOperationAdapter) version(o *domain.DebtOperation) int   { return o.Version }
func (debtOperationAdapter) fullState(o *domain.DebtOperation) any { return o.FullState() }
func (debtOperationAdapter) isWriteRace(err error) bool {
	return errors.Is(err, domain.ErrDebtOperationVersionConflict) || errors.Is(err, domain.ErrRecordDeleted)
}

func (debtOperationAdapter) getAny(
	ctx context.Context, t repository.SyncTx, householdID, id uuid.UUID,
) (*domain.DebtOperation, bool, error) {
	o, err := t.GetDebtOperationAny(ctx, householdID, id)
	if err != nil || o == nil {
		return nil, false, err
	}
	return o, true, nil
}

func (debtOperationAdapter) create(
	ctx context.Context, t repository.SyncTx, householdID, userID, id uuid.UUID, data domain.DebtOperationFullState,
) (*domain.DebtOperation, error) {
	return t.CreateDebtOperation(ctx, domain.CreateDebtOperationParams{
		ID: id, HouseholdID: householdID, UserID: userID,
		DebtorID: data.DebtorID, Direction: data.Direction, Kind: data.Kind,
		Amount: data.Amount, Note: data.Note, OccurredAt: data.OccurredAt,
	})
}

func (debtOperationAdapter) replace(
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID, id uuid.UUID,
	baseVersion int,
	data domain.DebtOperationFullState,
) (*domain.DebtOperation, error) {
	return t.ReplaceDebtOperation(ctx, householdID, userID, id, baseVersion, data)
}

func (debtOperationAdapter) tombstone(
	ctx context.Context, t repository.SyncTx, householdID, userID, id uuid.UUID,
) (*domain.DebtOperation, error) {
	return t.TombstoneDebtOperation(ctx, householdID, userID, id)
}

package service

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

// debtorAdapter is the debtor's half of the push engine: the live-name
// uniqueness pre-check, the in-use delete guard, and no immutable fields.
type debtorAdapter struct {
	syncAdapterDefaults[*domain.Debtor, domain.DebtorFullState]
}

func (debtorAdapter) entity() string { return domain.SyncEntityDebtor }
func (debtorAdapter) label() string  { return "debtor" }

func (debtorAdapter) decode(raw json.RawMessage) (domain.DebtorFullState, error) {
	var data domain.DebtorFullState
	err := decodeSyncData(raw, &data)
	return data, err
}

func (debtorAdapter) invalidDataMessage() string { return "invalid debtor data" }

// preValidate is the live-name uniqueness check, pre-checked under the
// advisory lock so a violation surfaces as a per-item error, never an
// aborted batch.
func (debtorAdapter) preValidate(
	ctx context.Context,
	t repository.SyncTx,
	householdID uuid.UUID,
	op domain.SyncOperation,
	data domain.DebtorFullState,
) (string, string, error) {
	nameTaken, err := t.DebtorNameTaken(ctx, householdID, data.Name, op.ID)
	if err != nil {
		return "", "", err
	}
	if nameTaken {
		return "DEBTOR_ALREADY_EXISTS", "debtor name already exists", nil
	}
	return "", "", nil
}

func (debtorAdapter) version(d *domain.Debtor) int   { return d.Version }
func (debtorAdapter) fullState(d *domain.Debtor) any { return d.FullState() }
func (debtorAdapter) isWriteRace(err error) bool {
	return errors.Is(err, domain.ErrDebtorVersionConflict) || errors.Is(err, domain.ErrRecordDeleted)
}

func (debtorAdapter) getAny(
	ctx context.Context, t repository.SyncTx, householdID, id uuid.UUID,
) (*domain.Debtor, bool, error) {
	d, err := t.GetDebtorAny(ctx, householdID, id)
	if err != nil || d == nil {
		return nil, false, err
	}
	return d, true, nil
}

func (debtorAdapter) create(
	ctx context.Context, t repository.SyncTx, householdID, userID, id uuid.UUID, data domain.DebtorFullState,
) (*domain.Debtor, error) {
	return t.CreateDebtor(ctx, domain.CreateDebtorParams{
		ID: id, HouseholdID: householdID, UserID: userID, Name: data.Name, Note: data.Note,
	})
}

func (debtorAdapter) replace(
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID, id uuid.UUID,
	baseVersion int,
	data domain.DebtorFullState,
) (*domain.Debtor, error) {
	return t.ReplaceDebtor(ctx, householdID, userID, id, baseVersion, data)
}

func (debtorAdapter) tombstone(
	ctx context.Context, t repository.SyncTx, householdID, userID, id uuid.UUID,
) (*domain.Debtor, error) {
	return t.TombstoneDebtor(ctx, householdID, userID, id)
}

func (debtorAdapter) inUse(
	ctx context.Context, t repository.SyncTx, householdID, id uuid.UUID,
) (bool, error) {
	return t.HasLiveDebtOperationsForDebtor(ctx, householdID, id)
}

func (debtorAdapter) inUseCode() string    { return "DEBTOR_IN_USE" }
func (debtorAdapter) inUseMessage() string { return "debtor has debt operations and cannot be deleted" }

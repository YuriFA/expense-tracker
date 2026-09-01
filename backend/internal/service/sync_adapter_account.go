package service

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

// accountAdapter is the account's half of the push engine: no validation
// stages, no immutable fields, the in-use delete guard, and the create
// id-race safety net unique to accounts (global PK + client-chosen
// offline-first ids).
type accountAdapter struct {
	syncAdapterDefaults[*domain.Account, domain.AccountFullState]
}

func (accountAdapter) entity() string { return domain.SyncEntityAccount }
func (accountAdapter) label() string  { return "account" }

func (accountAdapter) decode(raw json.RawMessage) (domain.AccountFullState, error) {
	var data domain.AccountFullState
	err := decodeSyncData(raw, &data)
	return data, err
}

func (accountAdapter) invalidDataMessage() string { return "invalid account data" }

func (accountAdapter) version(a *domain.Account) int   { return a.Version }
func (accountAdapter) fullState(a *domain.Account) any { return a.FullState() }
func (accountAdapter) isWriteRace(err error) bool {
	return errors.Is(err, domain.ErrAccountVersionConflict) || errors.Is(err, domain.ErrRecordDeleted)
}

func (accountAdapter) getAny(
	ctx context.Context, t repository.SyncTx, householdID, id uuid.UUID,
) (*domain.Account, bool, error) {
	a, err := t.GetAccountAny(ctx, householdID, id)
	if err != nil || a == nil {
		return nil, false, err
	}
	return a, true, nil
}

func (accountAdapter) create(
	ctx context.Context, t repository.SyncTx, householdID, userID, id uuid.UUID, data domain.AccountFullState,
) (*domain.Account, error) {
	return t.CreateAccount(ctx, domain.CreateAccountParams{
		ID: id, HouseholdID: householdID, UserID: userID,
		Name: data.Name, Currency: data.Currency, OpeningBalance: data.OpeningBalance,
	})
}

// onCreateError is the safety net for an id race (the advisory lock makes it
// unlikely): report the actual stored record as the conflict's serverState;
// an id taken OUTSIDE this household (a cross-household collision) conflicts
// with no serverState - the foreign record must not be revealed.
func (accountAdapter) onCreateError(
	ctx context.Context, t repository.SyncTx, householdID uuid.UUID, op domain.SyncOperation, err error,
) (domain.SyncPushResult, bool, error) {
	if !errors.Is(err, domain.ErrAccountAlreadyExists) {
		return domain.SyncPushResult{}, false, nil
	}
	fresh, ferr := t.GetAccountAny(ctx, householdID, op.ID)
	if ferr != nil {
		return domain.SyncPushResult{}, false, ferr
	}
	if fresh == nil {
		return conflictResult(op.OpID, domain.SyncCodeAlreadyExists, "account already exists", nil), true, nil
	}
	return conflictResult(
		op.OpID, domain.SyncCodeAlreadyExists, "account already exists",
		serverStateOf(fresh.Version, fresh.Deleted(), fresh.FullState()),
	), true, nil
}

func (accountAdapter) replace(
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID, id uuid.UUID,
	baseVersion int,
	data domain.AccountFullState,
) (*domain.Account, error) {
	return t.ReplaceAccount(ctx, householdID, userID, id, baseVersion, data)
}

func (accountAdapter) tombstone(
	ctx context.Context, t repository.SyncTx, householdID, userID, id uuid.UUID,
) (*domain.Account, error) {
	return t.TombstoneAccount(ctx, householdID, userID, id)
}

func (accountAdapter) inUse(
	ctx context.Context, t repository.SyncTx, householdID, id uuid.UUID,
) (bool, error) {
	return t.HasLiveTransactionsForAccount(ctx, householdID, id)
}

func (accountAdapter) inUseCode() string    { return "ACCOUNT_IN_USE" }
func (accountAdapter) inUseMessage() string { return "account has transactions and cannot be deleted" }

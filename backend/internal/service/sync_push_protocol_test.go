package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/service"
	"github.com/yurifa/expense-tracker-api/internal/service/fakes"
)

// Push-protocol characterization (ADR-0003): these pin the frozen per-item
// outcomes of the engine-backed entities against the fake store - the
// four-way conflict classification (already-exists / not-found / deleted /
// version), delete idempotence, in-use guards, name-uniqueness pre-checks,
// opId replay, and decode/action validation. They are behavior tests: the
// same cases must keep passing as each entity's twin migrates onto the
// engine. Cross-household adoption semantics are Postgres-only (the fake's
// AdoptOrphanedID is a stub) and live in the e2e household-join suite.

func pushFixture(t *testing.T) (*service.SyncService, *domain.User, uuid.UUID) {
	t.Helper()
	store := fakes.New()
	user := seedFakeUser(t, store)
	householdID := householdOf(t, store, user.ID)
	return service.NewSyncService(store), user, householdID
}

func pushOne(
	t *testing.T,
	syncSvc *service.SyncService,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
) domain.SyncPushResult {
	t.Helper()
	results, err := syncSvc.Push(context.Background(), householdID, userID, []domain.SyncOperation{op})
	require.NoError(t, err)
	require.Len(t, results, 1)
	return results[0]
}

func upsertOp(entity string, opID, recordID uuid.UUID, base int, data any) domain.SyncOperation {
	return domain.SyncOperation{
		OpID: opID, Entity: entity, Action: domain.SyncActionUpsert,
		ID: recordID, BaseVersion: base, Data: mustJSON(data),
	}
}

func deleteOp(entity string, opID, recordID uuid.UUID) domain.SyncOperation {
	return domain.SyncOperation{
		OpID: opID, Entity: entity, Action: domain.SyncActionDelete, ID: recordID,
	}
}

func TestSyncPush_AccountProtocol(t *testing.T) {
	t.Parallel()
	accountData := &domain.AccountFullState{Name: "Карта", Currency: "RUB", OpeningBalance: 100}

	t.Run("create at base 0 applies at version 1", func(t *testing.T) {
		t.Parallel()
		syncSvc, user, householdID := pushFixture(t)
		res := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityAccount, uuid.New(), uuid.New(), 0, accountData))
		assert.Equal(t, domain.SyncStatusApplied, res.Status)
		assert.Equal(t, 1, res.Version)
		assert.Empty(t, res.Code)
	})

	t.Run("a different opId claiming the id is an already-exists conflict with server state", func(t *testing.T) {
		t.Parallel()
		syncSvc, user, householdID := pushFixture(t)
		recordID := uuid.New()
		created := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityAccount, uuid.New(), recordID, 0, accountData))
		require.Equal(t, domain.SyncStatusApplied, created.Status)

		res := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityAccount, uuid.New(), recordID, 0, accountData))
		assert.Equal(t, domain.SyncStatusConflict, res.Status)
		assert.Equal(t, domain.SyncCodeAlreadyExists, res.Code)
		require.NotNil(t, res.ServerState)
		assert.Equal(t, 1, res.ServerState.Version)
		assert.False(t, res.ServerState.Deleted)
		assert.NotNil(t, res.ServerState.Data)
	})

	t.Run("update on the current base applies and bumps the version", func(t *testing.T) {
		t.Parallel()
		syncSvc, user, householdID := pushFixture(t)
		recordID := uuid.New()
		created := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityAccount, uuid.New(), recordID, 0, accountData))
		require.Equal(t, domain.SyncStatusApplied, created.Status)

		res := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityAccount, uuid.New(), recordID, 1, accountData))
		assert.Equal(t, domain.SyncStatusApplied, res.Status)
		assert.Equal(t, 2, res.Version)
	})

	t.Run("update on a stale base conflicts with the current server state", func(t *testing.T) {
		t.Parallel()
		syncSvc, user, householdID := pushFixture(t)
		recordID := uuid.New()
		for _, base := range []int{0, 1} {
			created := pushOne(t, syncSvc, householdID, user.ID,
				upsertOp(domain.SyncEntityAccount, uuid.New(), recordID, base, accountData))
			require.Equal(t, domain.SyncStatusApplied, created.Status)
		}

		res := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityAccount, uuid.New(), recordID, 1, accountData))
		assert.Equal(t, domain.SyncStatusConflict, res.Status)
		assert.Equal(t, domain.SyncCodeVersionConflict, res.Code)
		require.NotNil(t, res.ServerState)
		assert.Equal(t, 2, res.ServerState.Version)
		assert.NotNil(t, res.ServerState.Data)
	})

	t.Run("update on an unknown id conflicts with the zero state", func(t *testing.T) {
		t.Parallel()
		syncSvc, user, householdID := pushFixture(t)
		res := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityAccount, uuid.New(), uuid.New(), 5, accountData))
		assert.Equal(t, domain.SyncStatusConflict, res.Status)
		assert.Equal(t, domain.SyncCodeVersionConflict, res.Code)
		require.NotNil(t, res.ServerState)
		assert.Equal(t, 0, res.ServerState.Version)
		assert.Nil(t, res.ServerState.Data)
	})

	t.Run("delete of an unknown id is idempotently applied at version 0", func(t *testing.T) {
		t.Parallel()
		syncSvc, user, householdID := pushFixture(t)
		res := pushOne(t, syncSvc, householdID, user.ID,
			deleteOp(domain.SyncEntityAccount, uuid.New(), uuid.New()))
		assert.Equal(t, domain.SyncStatusApplied, res.Status)
		assert.Equal(t, 0, res.Version)
	})

	t.Run("delete tombstones, repeats idempotently, and upserts hit the deleted conflict", func(t *testing.T) {
		t.Parallel()
		syncSvc, user, householdID := pushFixture(t)
		recordID := uuid.New()
		created := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityAccount, uuid.New(), recordID, 0, accountData))
		require.Equal(t, domain.SyncStatusApplied, created.Status)

		deleted := pushOne(t, syncSvc, householdID, user.ID,
			deleteOp(domain.SyncEntityAccount, uuid.New(), recordID))
		assert.Equal(t, domain.SyncStatusApplied, deleted.Status)
		assert.Equal(t, 2, deleted.Version)

		again := pushOne(t, syncSvc, householdID, user.ID,
			deleteOp(domain.SyncEntityAccount, uuid.New(), recordID))
		assert.Equal(t, domain.SyncStatusApplied, again.Status)
		assert.Equal(t, deleted.Version, again.Version)

		res := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityAccount, uuid.New(), recordID, deleted.Version, accountData))
		assert.Equal(t, domain.SyncStatusConflict, res.Status)
		assert.Equal(t, domain.SyncCodeDeletedConflict, res.Code)
		require.NotNil(t, res.ServerState)
		assert.Equal(t, deleted.Version, res.ServerState.Version)
		assert.True(t, res.ServerState.Deleted)
		assert.Nil(t, res.ServerState.Data)
	})

	t.Run("delete of an account with live transactions is a per-item error", func(t *testing.T) {
		t.Parallel()
		syncSvc, user, householdID := pushFixture(t)
		busy := uuid.New()
		created := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityAccount, uuid.New(), busy, 0, accountData))
		require.Equal(t, domain.SyncStatusApplied, created.Status)
		pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityTransaction, uuid.New(), uuid.New(), 0,
				&domain.TransactionFullState{
					Type: domain.TransactionTypeAdjustment, Amount: 500,
					OccurredAt: time.Now().UTC(), AccountID: &busy,
				}))

		res := pushOne(t, syncSvc, householdID, user.ID,
			deleteOp(domain.SyncEntityAccount, uuid.New(), busy))
		assert.Equal(t, domain.SyncStatusError, res.Status)
		assert.Equal(t, "ACCOUNT_IN_USE", res.Code)
	})

	t.Run("opId replay returns the stored result with no new mutation", func(t *testing.T) {
		t.Parallel()
		syncSvc, user, householdID := pushFixture(t)
		opID := uuid.New()
		fresh := uuid.New()
		first := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityAccount, opID, fresh, 0, accountData))
		replayed := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityAccount, opID, fresh, 0, accountData))
		assert.Equal(t, first, replayed)

		page, err := syncSvc.Pull(context.Background(), householdID, 0, nil)
		require.NoError(t, err)
		accountCreates := 0
		for _, change := range page.Changes {
			if change.Entity == domain.SyncEntityAccount && change.ID == fresh {
				accountCreates++
			}
		}
		assert.Equal(t, 1, accountCreates, "the replay must not append a second change")
	})

	t.Run("undecodable data is a per-item validation error", func(t *testing.T) {
		t.Parallel()
		syncSvc, user, householdID := pushFixture(t)
		res := pushOne(t, syncSvc, householdID, user.ID, domain.SyncOperation{
			OpID: uuid.New(), Entity: domain.SyncEntityAccount, Action: domain.SyncActionUpsert,
			ID: uuid.New(), Data: []byte(`{not json`),
		})
		assert.Equal(t, domain.SyncStatusError, res.Status)
		assert.Equal(t, "VALIDATION_FAILED", res.Code)
		assert.Equal(t, "invalid account data", res.Message)
	})

	t.Run("unknown action and unknown entity are per-item validation errors", func(t *testing.T) {
		t.Parallel()
		syncSvc, user, householdID := pushFixture(t)
		action := pushOne(t, syncSvc, householdID, user.ID, domain.SyncOperation{
			OpID: uuid.New(), Entity: domain.SyncEntityAccount, Action: "purge", ID: uuid.New(),
		})
		assert.Equal(t, domain.SyncStatusError, action.Status)
		assert.Equal(t, "VALIDATION_FAILED", action.Code)
		assert.Equal(t, "unknown action", action.Message)

		entity := pushOne(t, syncSvc, householdID, user.ID, domain.SyncOperation{
			OpID: uuid.New(), Entity: "widget", Action: domain.SyncActionUpsert, ID: uuid.New(), Data: []byte(`{}`),
		})
		assert.Equal(t, domain.SyncStatusError, entity.Status)
		assert.Equal(t, "VALIDATION_FAILED", entity.Code)
		assert.Equal(t, "unknown entity", entity.Message)
	})
}

func TestSyncPush_DebtorProtocol(t *testing.T) {
	t.Parallel()

	t.Run("create at base 0 applies at version 1", func(t *testing.T) {
		t.Parallel()
		syncSvc, user, householdID := pushFixture(t)
		res := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityDebtor, uuid.New(), uuid.New(), 0,
				&domain.DebtorFullState{Name: "Анна", Note: ""}))
		assert.Equal(t, domain.SyncStatusApplied, res.Status)
		assert.Equal(t, 1, res.Version)
	})

	t.Run("duplicate live name under a different id is a per-item error", func(t *testing.T) {
		t.Parallel()
		syncSvc, user, householdID := pushFixture(t)
		created := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityDebtor, uuid.New(), uuid.New(), 0,
				&domain.DebtorFullState{Name: "Анна", Note: ""}))
		require.Equal(t, domain.SyncStatusApplied, created.Status)

		res := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityDebtor, uuid.New(), uuid.New(), 0,
				&domain.DebtorFullState{Name: "Анна", Note: "другая"}))
		assert.Equal(t, domain.SyncStatusError, res.Status)
		assert.Equal(t, "DEBTOR_ALREADY_EXISTS", res.Code)
	})

	t.Run("update on the current base applies, unknown id conflicts with the zero state", func(t *testing.T) {
		t.Parallel()
		syncSvc, user, householdID := pushFixture(t)
		recordID := uuid.New()
		created := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityDebtor, uuid.New(), recordID, 0,
				&domain.DebtorFullState{Name: "Борис", Note: "x"}))
		require.Equal(t, domain.SyncStatusApplied, created.Status)

		updated := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityDebtor, uuid.New(), recordID, 1,
				&domain.DebtorFullState{Name: "Борис", Note: "y"}))
		assert.Equal(t, domain.SyncStatusApplied, updated.Status)
		assert.Equal(t, 2, updated.Version)

		unknown := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityDebtor, uuid.New(), uuid.New(), 3,
				&domain.DebtorFullState{Name: "Григорий", Note: ""}))
		assert.Equal(t, domain.SyncStatusConflict, unknown.Status)
		assert.Equal(t, domain.SyncCodeVersionConflict, unknown.Code)
		require.NotNil(t, unknown.ServerState)
		assert.Equal(t, 0, unknown.ServerState.Version)

		// The name pre-check outranks the four-way classification: a taken
		// name on an unknown id is DEBTOR_ALREADY_EXISTS, not a conflict.
		precheck := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityDebtor, uuid.New(), uuid.New(), 3,
				&domain.DebtorFullState{Name: "Борис", Note: ""}))
		assert.Equal(t, domain.SyncStatusError, precheck.Status)
		assert.Equal(t, "DEBTOR_ALREADY_EXISTS", precheck.Code)
	})

	t.Run("delete of a debtor with live debt operations is a per-item error", func(t *testing.T) {
		t.Parallel()
		syncSvc, user, householdID := pushFixture(t)
		debtorID := uuid.New()
		created := pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityDebtor, uuid.New(), debtorID, 0,
				&domain.DebtorFullState{Name: "Вера", Note: ""}))
		require.Equal(t, domain.SyncStatusApplied, created.Status)

		pushOne(t, syncSvc, householdID, user.ID,
			upsertOp(domain.SyncEntityDebtOperation, uuid.New(), uuid.New(), 0,
				&domain.DebtOperationFullState{
					DebtorID: debtorID, Direction: domain.DebtDirectionPayable, Kind: domain.DebtOperationKindDebt,
					Amount: 1000, OccurredAt: time.Now().UTC(),
				}))

		res := pushOne(t, syncSvc, householdID, user.ID,
			deleteOp(domain.SyncEntityDebtor, uuid.New(), debtorID))
		assert.Equal(t, domain.SyncStatusError, res.Status)
		assert.Equal(t, "DEBTOR_IN_USE", res.Code)
	})
}

package service

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

// The push-protocol engine (ADR-0003): ONE implementation of the per-entity
// push skeleton - decode -> staged validation -> base-0 create (incl.
// adopt-orphaned) vs strict-CAS update -> four-way conflict classification ->
// replace + race re-read -> per-item result shaping. Idempotent replay and
// applied-op recording live one level up in applySyncOperation. Outcomes
// (codes, ordering, conflict shapes) are identical to the per-entity twins it
// replaced, except the delete in-use guards: they also block on live planned
// payments now, matching the REST delete semantics (2026-09-01 fix).

// syncRow is the stored-row shape every synced entity offers the engine: the
// tombstone flag. (The full-state projection returns a concrete type per
// entity, so it rides the adapter instead of this constraint.)
type syncRow interface {
	Deleted() bool
}

// syncAdapter supplies everything entity-specific the engine cannot know:
// the decode target, the staged validation hooks, the immutability guard,
// the persistence calls, and the write-race sentinels. R is the stored row
// (pointer type), S the decoded full-state type.
type syncAdapter[R syncRow, S any] interface {
	// entity labels change-log rows and drives the adopt-orphaned check.
	entity() string
	// label names the entity in per-item messages ("account", "debt operation").
	label() string

	decode(raw json.RawMessage) (S, error)
	invalidDataMessage() string

	// preValidate runs before the current-row read (shape rules, live-name
	// uniqueness pre-checks); "" = pass, err = batch error.
	preValidate(
		ctx context.Context,
		t repository.SyncTx,
		householdID uuid.UUID,
		op domain.SyncOperation,
		data S,
	) (code, message string, err error)
	// postReadValidate runs after the current-row read, before the
	// create-vs-update split (transaction reference rules); "" = pass.
	postReadValidate(
		ctx context.Context,
		t repository.SyncTx,
		householdID uuid.UUID,
		op domain.SyncOperation,
		data S,
	) (code, message string, err error)

	version(row R) int
	fullState(row R) any
	// getAny reads the row including tombstones; found = false means the id
	// was never created in this household.
	getAny(ctx context.Context, t repository.SyncTx, householdID, id uuid.UUID) (row R, found bool, err error)

	// immutable fires between the deleted-check and the version-check of the
	// update branch (an immutable-field violation outranks the version
	// conflict); "" = pass.
	immutable(cur R, data S) (code, message string)

	create(ctx context.Context, t repository.SyncTx, householdID, userID, id uuid.UUID, data S) (R, error)
	// onCreateError turns a create failure into a per-item result when the
	// entity knows how (the account id-race safety net); handled = false
	// makes the engine propagate the error as a batch error.
	onCreateError(
		ctx context.Context,
		t repository.SyncTx,
		householdID uuid.UUID,
		op domain.SyncOperation,
		err error,
	) (result domain.SyncPushResult, handled bool, ferr error)

	replace(
		ctx context.Context,
		t repository.SyncTx,
		householdID, userID, id uuid.UUID,
		baseVersion int,
		data S,
	) (R, error)
	isWriteRace(err error) bool
	tombstone(ctx context.Context, t repository.SyncTx, householdID, userID, id uuid.UUID) (R, error)
}

// syncInUseGuard is implemented by the entities whose delete is blocked by
// live dependants (account, category, debtor); the other synced entities
// tombstone unconditionally. inUse reports which relation blocks the delete
// by returning its message (an entity with several dependants checks them in
// the REST order and names the one that fired).
type syncInUseGuard[R syncRow] interface {
	inUse(ctx context.Context, t repository.SyncTx, householdID, id uuid.UUID) (blocked bool, message string, err error)
	inUseCode() string
}

// syncAdapterDefaults carries the no-op answers for the optional adapter
// hooks (validation stages, immutability, create-error recovery). Adapters
// embed it, instantiated with their row and full-state types, and override
// only what their entity actually has.
type syncAdapterDefaults[R syncRow, S any] struct{}

func (syncAdapterDefaults[R, S]) preValidate(
	context.Context, repository.SyncTx, uuid.UUID, domain.SyncOperation, S,
) (string, string, error) {
	return "", "", nil
}

func (syncAdapterDefaults[R, S]) postReadValidate(
	context.Context, repository.SyncTx, uuid.UUID, domain.SyncOperation, S,
) (string, string, error) {
	return "", "", nil
}

func (syncAdapterDefaults[R, S]) immutable(R, S) (string, string) {
	return "", ""
}

func (syncAdapterDefaults[R, S]) onCreateError(
	context.Context, repository.SyncTx, uuid.UUID, domain.SyncOperation, error,
) (domain.SyncPushResult, bool, error) {
	return domain.SyncPushResult{}, false, nil
}

// syncOpApplier applies one pushed operation for one entity; the registry
// built in NewSyncService maps entities to appliers.
type syncOpApplier func(ctx context.Context, t repository.SyncTx, householdID, userID uuid.UUID, op domain.SyncOperation) (domain.SyncPushResult, error)

// applySyncOperationFor binds an adapter into the registry's applier shape.
func applySyncOperationFor[R syncRow, S any](ad syncAdapter[R, S]) syncOpApplier {
	return func(ctx context.Context, t repository.SyncTx, householdID, userID uuid.UUID, op domain.SyncOperation) (domain.SyncPushResult, error) {
		return applySyncEntity(ctx, t, householdID, userID, op, ad)
	}
}

func applySyncEntity[R syncRow, S any](
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
	ad syncAdapter[R, S],
) (domain.SyncPushResult, error) {
	if op.Action == domain.SyncActionDelete {
		return deleteSyncEntity(ctx, t, householdID, userID, op, ad)
	}
	if op.Action != domain.SyncActionUpsert {
		return errorResult(op.OpID, "VALIDATION_FAILED", "unknown action"), nil
	}

	data, err := ad.decode(op.Data)
	if err != nil {
		return errorResult( //nolint:nilerr // decode failure is a per-item error result, not a batch error
			op.OpID,
			"VALIDATION_FAILED",
			ad.invalidDataMessage(),
		), nil
	}
	if code, message, verr := ad.preValidate(ctx, t, householdID, op, data); verr != nil {
		return domain.SyncPushResult{}, verr
	} else if code != "" {
		return errorResult(op.OpID, code, message), nil
	}

	current, found, err := ad.getAny(ctx, t, householdID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if code, message, verr := ad.postReadValidate(ctx, t, householdID, op, data); verr != nil {
		return domain.SyncPushResult{}, verr
	} else if code != "" {
		return errorResult(op.OpID, code, message), nil
	}

	if op.BaseVersion == 0 {
		return createSyncEntity(ctx, t, householdID, userID, op, ad, data, current, found)
	}
	return updateSyncEntity(ctx, t, householdID, userID, op, ad, data, current, found)
}

// createSyncEntity is the base-0 branch: absent -> adopt-orphaned check ->
// create; exists -> already-exists conflict (a replay of the same opId was
// answered one level up, so this is a DIFFERENT operation claiming the id -
// never a silent overwrite).
func createSyncEntity[R syncRow, S any](
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
	ad syncAdapter[R, S],
	data S, current R, found bool,
) (domain.SyncPushResult, error) {
	if found {
		return conflictResult(
			op.OpID, domain.SyncCodeAlreadyExists, ad.label()+" already exists",
			serverStateOf(ad.version(current), current.Deleted(), ad.fullState(current)),
		), nil
	}
	if res, err := adoptOrphanedOrConflict(ctx, t, ad.entity(), op, householdID,
		ad.label()+" already exists in another household"); err != nil {
		return domain.SyncPushResult{}, err
	} else if res.Status != "" {
		return res, nil
	}
	created, err := ad.create(ctx, t, householdID, userID, op.ID, data)
	if err != nil {
		if res, handled, ferr := ad.onCreateError(ctx, t, householdID, op, err); ferr != nil {
			return domain.SyncPushResult{}, ferr
		} else if handled {
			return res, nil
		}
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, ad.version(created)), nil
}

// updateSyncEntity is the update branch: strict CAS on the base version of a
// live record.
func updateSyncEntity[R syncRow, S any](
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
	ad syncAdapter[R, S],
	data S, current R, found bool,
) (domain.SyncPushResult, error) {
	if !found {
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, ad.label()+" not found on server",
			serverStateOf(0, false, nil),
		), nil
	}
	if current.Deleted() {
		return conflictResult(
			op.OpID, domain.SyncCodeDeletedConflict, ad.label()+" was deleted on server",
			serverStateOf(ad.version(current), true, nil),
		), nil
	}
	if code, message := ad.immutable(current, data); code != "" {
		return errorResult(op.OpID, code, message), nil
	}
	if ad.version(current) != op.BaseVersion {
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, ad.label()+" version conflict",
			serverStateOf(ad.version(current), false, ad.fullState(current)),
		), nil
	}

	updated, err := ad.replace(ctx, t, householdID, userID, op.ID, op.BaseVersion, data)
	if ad.isWriteRace(err) {
		// Lost a race inside the batch (two ops touching the same record);
		// report the conflict, the client re-pushes on the new base.
		fresh, _, ferr := ad.getAny(ctx, t, householdID, op.ID)
		if ferr != nil {
			return domain.SyncPushResult{}, ferr
		}
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, ad.label()+" version conflict",
			serverStateOf(ad.version(fresh), fresh.Deleted(), ad.fullState(fresh)),
		), nil
	}
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, ad.version(updated)), nil
}

// deleteSyncEntity implements the delete side: idempotent on tombstones and
// missing records, delete-wins over concurrent edits (the device that edited
// learns of the tombstone via pull and its conflict flow), in-use guard as a
// per-item error.
func deleteSyncEntity[R syncRow, S any](
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
	ad syncAdapter[R, S],
) (domain.SyncPushResult, error) {
	current, found, err := ad.getAny(ctx, t, householdID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if !found {
		// The server never saw the record; nothing to delete (idempotent).
		return appliedResult(op.OpID, 0), nil
	}
	if current.Deleted() {
		return appliedResult(op.OpID, ad.version(current)), nil
	}
	if guard, ok := any(ad).(syncInUseGuard[R]); ok {
		blocked, message, err := guard.inUse(ctx, t, householdID, op.ID)
		if err != nil {
			return domain.SyncPushResult{}, err
		}
		if blocked {
			return errorResult(op.OpID, guard.inUseCode(), message), nil
		}
	}
	deleted, err := ad.tombstone(ctx, t, householdID, userID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, ad.version(deleted)), nil
}

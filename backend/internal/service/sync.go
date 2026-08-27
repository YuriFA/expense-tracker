package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

const (
	defaultSyncPullLimit = 100
	maxSyncPullLimit     = 500
)

// SyncService owns the sync protocol rules: per-item push semantics
// (idempotent replay by opId, CAS updates, delete-wins deletes, per-item
// business-rule errors) and the cursor pull. The whole push batch commits
// atomically via repository.SyncRepository.WithinHouseholdTx; householdID is
// the scoping key and userID the authorship stamp of the pushing member.
type SyncService struct {
	sync repository.SyncRepository
}

func NewSyncService(sync repository.SyncRepository) *SyncService {
	return &SyncService{sync: sync}
}

// Push applies a batch of client operations. Every item yields its own
// result; an unexpected error aborts the whole batch (the client retries the
// batch - confirmed opIds replay their stored results, so nothing duplicates).
func (s *SyncService) Push(
	ctx context.Context,
	householdID, userID uuid.UUID,
	ops []domain.SyncOperation,
) ([]domain.SyncPushResult, error) {
	const op = "service.sync.Push"

	results := make([]domain.SyncPushResult, 0, len(ops))
	err := s.sync.WithinHouseholdTx(ctx, householdID, func(t repository.SyncTx) error {
		for _, operation := range ops {
			result, err := applySyncOperation(ctx, t, householdID, userID, operation)
			if err != nil {
				return err
			}
			results = append(results, result)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return results, nil
}

// SyncPullPage is one pull page: changes in seq order plus the next cursor
// (nil when the client is caught up).
type SyncPullPage struct {
	Changes    []domain.SyncChange
	NextCursor *int64
}

// Pull returns the change-log page after afterSeq. A full page yields a
// nextCursor; the following pull then reports caught-up (nil cursor).
func (s *SyncService) Pull(ctx context.Context, householdID uuid.UUID, afterSeq int64, limit *int) (*SyncPullPage, error) {
	const op = "service.sync.Pull"

	pageSize := defaultSyncPullLimit
	if limit != nil && *limit > 0 {
		pageSize = min(*limit, maxSyncPullLimit)
	}

	changes, err := s.sync.PullChanges(ctx, householdID, afterSeq, pageSize)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	page := &SyncPullPage{Changes: changes}
	if len(changes) == pageSize {
		next := changes[len(changes)-1].Seq
		page.NextCursor = &next
	}
	return page, nil
}

// applySyncOperation processes ONE operation and returns its per-item result.
// Domain-rule violations become `error` results (the batch keeps going);
// unexpected infrastructure errors abort the batch via the returned error.
func applySyncOperation(
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	// Persistent idempotency: an already-applied opId replays its stored
	// result without side effects (retry after a lost response, duplicate
	// delivery across batches), scoped to this household's applied operations.
	if previous, err := t.GetAppliedOperation(ctx, householdID, op.OpID); err != nil {
		return domain.SyncPushResult{}, err
	} else if previous != nil {
		return previous.Result, nil
	}

	var result domain.SyncPushResult
	var err error
	switch op.Entity {
	case domain.SyncEntityAccount:
		result, err = applyAccountOperation(ctx, t, householdID, userID, op)
	case domain.SyncEntityCategory:
		result, err = applyCategoryOperation(ctx, t, householdID, userID, op)
	case domain.SyncEntityTransaction:
		result, err = applyTransactionOperation(ctx, t, householdID, userID, op)
	case domain.SyncEntityDebtor:
		result, err = applyDebtorOperation(ctx, t, householdID, userID, op)
	case domain.SyncEntityDebtOperation:
		result, err = applyDebtOperationOperation(ctx, t, householdID, userID, op)
	case domain.SyncEntityPlannedPayment:
		result, err = applyPlannedPaymentOperation(ctx, t, householdID, userID, op)
	default:
		return domain.SyncPushResult{
			OpID: op.OpID, Status: domain.SyncStatusError,
			Code: "VALIDATION_FAILED", Message: "unknown entity",
		}, nil
	}
	if err != nil {
		return domain.SyncPushResult{}, err
	}

	// Only APPLIED operations are durably recorded: a recorded opId always
	// corresponds to an applied change (conflicts/errors are re-evaluated on
	// redelivery).
	if result.Status == domain.SyncStatusApplied {
		if err := t.InsertAppliedOperation(ctx, domain.AppliedOperation{
			OpID:        op.OpID,
			HouseholdID: householdID,
			UserID:      userID,
			Entity:      op.Entity,
			EntityID:    op.ID,
			Result:      result,
		}); err != nil {
			return domain.SyncPushResult{}, err
		}
	}
	return result, nil
}

func appliedResult(opID uuid.UUID, version int) domain.SyncPushResult {
	return domain.SyncPushResult{OpID: opID, Status: domain.SyncStatusApplied, Version: version}
}

func conflictResult(opID uuid.UUID, code, message string, server *domain.SyncServerState) domain.SyncPushResult {
	return domain.SyncPushResult{
		OpID: opID, Status: domain.SyncStatusConflict, Code: code, Message: message, ServerState: server,
	}
}

func errorResult(opID uuid.UUID, code, message string) domain.SyncPushResult {
	return domain.SyncPushResult{OpID: opID, Status: domain.SyncStatusError, Code: code, Message: message}
}

// serverStateOf builds the serverState payload for conflict results. Data is
// the full record state in wire format (nil for tombstones).
func serverStateOf(version int, deleted bool, data any) *domain.SyncServerState {
	state := &domain.SyncServerState{Version: version, Deleted: deleted}
	if !deleted && data != nil {
		if raw, err := json.Marshal(data); err == nil {
			state.Data = raw
		}
	}
	return state
}

// --- accounts -----------------------------------------------------------------

func applyAccountOperation(
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	if op.Action == domain.SyncActionDelete {
		return deleteAccountOp(ctx, t, householdID, userID, op)
	}
	if op.Action != domain.SyncActionUpsert {
		return errorResult(op.OpID, "VALIDATION_FAILED", "unknown action"), nil
	}

	var data domain.AccountFullState
	if err := decodeSyncData(op.Data, &data); err != nil {
		return errorResult( //nolint:nilerr // decode failure is a per-item error result, not a batch error
			op.OpID,
			"VALIDATION_FAILED",
			"invalid account data",
		), nil
	}

	current, err := t.GetAccountAny(ctx, householdID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}

	// Create (base 0): absent -> create; exists -> already-exists conflict
	// (a replay of the same opId was answered above, so this is a DIFFERENT
	// operation claiming the id - never a silent overwrite).
	if op.BaseVersion == 0 { //nolint:nestif // create-vs-update branches mirror the protocol spec
		if current != nil {
			return conflictResult(
				op.OpID, domain.SyncCodeAlreadyExists, "account already exists",
				serverStateOf(current.Version, current.Deleted(), current.FullState()),
			), nil
		}
		created, err := t.CreateAccount(ctx, domain.CreateAccountParams{
			ID: op.ID, HouseholdID: householdID, UserID: userID,
			Name: data.Name, Currency: data.Currency, OpeningBalance: data.OpeningBalance,
		})
		if errors.Is(err, domain.ErrAccountAlreadyExists) {
			// Safety net for an id race (the advisory lock makes it unlikely):
			// report the actual stored record as the conflict's serverState.
			fresh, ferr := t.GetAccountAny(ctx, householdID, op.ID)
			if ferr != nil {
				return domain.SyncPushResult{}, ferr
			}
			return conflictResult(
				op.OpID, domain.SyncCodeAlreadyExists, "account already exists",
				serverStateOf(fresh.Version, fresh.Deleted(), fresh.FullState()),
			), nil
		}
		if err != nil {
			return domain.SyncPushResult{}, err
		}
		return appliedResult(op.OpID, created.Version), nil
	}

	// Update: strict CAS on the base version of a live record.
	if current == nil {
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "account not found on server",
			serverStateOf(0, false, nil),
		), nil
	}
	if current.Deleted() {
		return conflictResult(
			op.OpID, domain.SyncCodeDeletedConflict, "account was deleted on server",
			serverStateOf(current.Version, true, nil),
		), nil
	}
	if current.Version != op.BaseVersion {
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "account version conflict",
			serverStateOf(current.Version, false, current.FullState()),
		), nil
	}

	updated, err := t.ReplaceAccount(ctx, householdID, userID, op.ID, op.BaseVersion, data)
	if errors.Is(err, domain.ErrAccountVersionConflict) || errors.Is(err, domain.ErrRecordDeleted) {
		// Lost a race inside the batch (two ops touching the same record);
		// report the conflict, the client re-pushes on the new base.
		fresh, ferr := t.GetAccountAny(ctx, householdID, op.ID)
		if ferr != nil {
			return domain.SyncPushResult{}, ferr
		}
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "account version conflict",
			serverStateOf(fresh.Version, fresh.Deleted(), fresh.FullState()),
		), nil
	}
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, updated.Version), nil
}

// deleteAccountOp implements the delete side: idempotent on tombstones and
// missing records, delete-wins over concurrent edits (the device that edited
// learns of the tombstone via pull and its conflict flow), in-use guard as a
// per-item error.
func deleteAccountOp( //nolint:dupl // account/category/transaction delete twins: identical protocol shape per entity
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	current, err := t.GetAccountAny(ctx, householdID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if current == nil {
		// The server never saw the record; nothing to delete (idempotent).
		return appliedResult(op.OpID, 0), nil
	}
	if current.Deleted() {
		return appliedResult(op.OpID, current.Version), nil
	}
	inUse, err := t.HasLiveTransactionsForAccount(ctx, householdID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if inUse {
		return errorResult(op.OpID, "ACCOUNT_IN_USE", "account has transactions and cannot be deleted"), nil
	}
	deleted, err := t.TombstoneAccount(ctx, householdID, userID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, deleted.Version), nil
}

// --- categories -----------------------------------------------------------------

func applyCategoryOperation(
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	if op.Action == domain.SyncActionDelete {
		return deleteCategoryOp(ctx, t, householdID, userID, op)
	}
	if op.Action != domain.SyncActionUpsert {
		return errorResult(op.OpID, "VALIDATION_FAILED", "unknown action"), nil
	}

	var data domain.CategoryFullState
	if err := decodeSyncData(op.Data, &data); err != nil {
		return errorResult( //nolint:nilerr // decode failure is a per-item error result, not a batch error
			op.OpID,
			"VALIDATION_FAILED",
			"invalid category data",
		), nil
	}
	if data.Type != domain.TransactionTypeIncome && data.Type != domain.TransactionTypeExpense {
		return errorResult(op.OpID, "VALIDATION_FAILED", "invalid category type"), nil
	}

	// Live-name uniqueness (pre-checked under the advisory lock so a
	// violation surfaces as a per-item error, never an aborted batch).
	nameTaken, err := t.CategoryNameTaken(ctx, householdID, data.Name, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if nameTaken {
		return errorResult(op.OpID, "CATEGORY_ALREADY_EXISTS", "category name already exists"), nil
	}

	current, err := t.GetCategoryAny(ctx, householdID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}

	if op.BaseVersion == 0 {
		if current != nil {
			return conflictResult(
				op.OpID, domain.SyncCodeAlreadyExists, "category already exists",
				serverStateOf(current.Version, current.Deleted(), current.FullState()),
			), nil
		}
		created, err := t.CreateCategory(ctx, domain.CreateCategoryParams{
			ID: op.ID, HouseholdID: householdID, UserID: userID,
			Name: data.Name, Type: data.Type, Icon: data.Icon, Color: data.Color,
		})
		if err != nil {
			return domain.SyncPushResult{}, err
		}
		return appliedResult(op.OpID, created.Version), nil
	}

	if current == nil {
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "category not found on server",
			serverStateOf(0, false, nil),
		), nil
	}
	if current.Deleted() {
		return conflictResult(
			op.OpID, domain.SyncCodeDeletedConflict, "category was deleted on server",
			serverStateOf(current.Version, true, nil),
		), nil
	}
	if current.Version != op.BaseVersion {
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "category version conflict",
			serverStateOf(current.Version, false, current.FullState()),
		), nil
	}

	updated, err := t.ReplaceCategory(ctx, householdID, userID, op.ID, op.BaseVersion, data)
	if errors.Is(err, domain.ErrCategoryVersionConflict) || errors.Is(err, domain.ErrRecordDeleted) {
		fresh, ferr := t.GetCategoryAny(ctx, householdID, op.ID)
		if ferr != nil {
			return domain.SyncPushResult{}, ferr
		}
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "category version conflict",
			serverStateOf(fresh.Version, fresh.Deleted(), fresh.FullState()),
		), nil
	}
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, updated.Version), nil
}

func deleteCategoryOp( //nolint:dupl // account/category/transaction delete twins: identical protocol shape per entity
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	current, err := t.GetCategoryAny(ctx, householdID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if current == nil {
		return appliedResult(op.OpID, 0), nil
	}
	if current.Deleted() {
		return appliedResult(op.OpID, current.Version), nil
	}
	inUse, err := t.HasLiveTransactionsForCategory(ctx, householdID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if inUse {
		return errorResult(op.OpID, "CATEGORY_IN_USE", "category has transactions and cannot be deleted"), nil
	}
	deleted, err := t.TombstoneCategory(ctx, householdID, userID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, deleted.Version), nil
}

// --- transactions -----------------------------------------------------------------

func applyTransactionOperation(
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	if op.Action == domain.SyncActionDelete {
		return deleteTransactionOp(ctx, t, householdID, userID, op)
	}
	if op.Action != domain.SyncActionUpsert {
		return errorResult(op.OpID, "VALIDATION_FAILED", "unknown action"), nil
	}

	var data domain.TransactionFullState
	if err := decodeSyncData(op.Data, &data); err != nil {
		return errorResult( //nolint:nilerr // decode failure is a per-item error result, not a batch error
			op.OpID,
			"VALIDATION_FAILED",
			"invalid transaction data",
		), nil
	}
	if data.Amount < 1 {
		return errorResult(op.OpID, "VALIDATION_FAILED", "amount must be at least 1 minor unit"), nil
	}
	if data.Type != domain.TransactionTypeIncome &&
		data.Type != domain.TransactionTypeExpense &&
		data.Type != domain.TransactionTypeTransfer {
		return errorResult(op.OpID, "VALIDATION_FAILED", "invalid transaction type"), nil
	}

	current, err := t.GetTransactionAny(ctx, householdID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}

	// Reference validation with the REST granularity: unknown live refs ->
	// per-item unknown-references error; type mismatch / same-account
	// transfer -> invalid-payload codes. Validated on the effective refs of
	// the full state (update) or the new record (create).
	if verr := validateSyncRefs(ctx, t, householdID, &data); verr != "" {
		return errorResult(op.OpID, verr, syncRefMessage(verr)), nil
	}

	if op.BaseVersion == 0 {
		if current != nil {
			return conflictResult(
				op.OpID, domain.SyncCodeAlreadyExists, "transaction already exists",
				serverStateOf(current.Version, current.Deleted(), current.FullState()),
			), nil
		}
		created, err := t.CreateTransaction(ctx, domain.CreateTransactionParams{
			ID: op.ID, HouseholdID: householdID, UserID: userID,
			Type: data.Type, Amount: data.Amount, Description: data.Description, OccurredAt: data.OccurredAt,
			AccountID: data.AccountID, CategoryID: data.CategoryID,
			FromAccountID: data.FromAccountID, ToAccountID: data.ToAccountID,
		})
		if err != nil {
			return domain.SyncPushResult{}, err
		}
		return appliedResult(op.OpID, created.Version), nil
	}

	if current == nil {
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "transaction not found on server",
			serverStateOf(0, false, nil),
		), nil
	}
	if current.Deleted() {
		return conflictResult(
			op.OpID, domain.SyncCodeDeletedConflict, "transaction was deleted on server",
			serverStateOf(current.Version, true, nil),
		), nil
	}
	if current.Type != data.Type {
		return errorResult(op.OpID, "VALIDATION_FAILED", "transaction type is immutable"), nil
	}
	if current.Version != op.BaseVersion {
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "transaction version conflict",
			serverStateOf(current.Version, false, current.FullState()),
		), nil
	}

	updated, err := t.ReplaceTransaction(ctx, householdID, userID, op.ID, op.BaseVersion, data)
	if errors.Is(err, domain.ErrTransactionVersionConflict) || errors.Is(err, domain.ErrRecordDeleted) {
		fresh, ferr := t.GetTransactionAny(ctx, householdID, op.ID)
		if ferr != nil {
			return domain.SyncPushResult{}, ferr
		}
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "transaction version conflict",
			serverStateOf(fresh.Version, fresh.Deleted(), fresh.FullState()),
		), nil
	}
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, updated.Version), nil
}

func deleteTransactionOp(
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	current, err := t.GetTransactionAny(ctx, householdID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if current == nil {
		return appliedResult(op.OpID, 0), nil
	}
	if current.Deleted() {
		return appliedResult(op.OpID, current.Version), nil
	}
	deleted, err := t.TombstoneTransaction(ctx, householdID, userID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, deleted.Version), nil
}

// --- debtors -----------------------------------------------------------------

func applyDebtorOperation(
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	if op.Action == domain.SyncActionDelete {
		return deleteDebtorOp(ctx, t, householdID, userID, op)
	}
	if op.Action != domain.SyncActionUpsert {
		return errorResult(op.OpID, "VALIDATION_FAILED", "unknown action"), nil
	}

	var data domain.DebtorFullState
	if err := decodeSyncData(op.Data, &data); err != nil {
		return errorResult( //nolint:nilerr // decode failure is a per-item error result, not a batch error
			op.OpID,
			"VALIDATION_FAILED",
			"invalid debtor data",
		), nil
	}

	// Live-name uniqueness (pre-checked under the advisory lock so a
	// violation surfaces as a per-item error, never an aborted batch).
	nameTaken, err := t.DebtorNameTaken(ctx, householdID, data.Name, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if nameTaken {
		return errorResult(op.OpID, "DEBTOR_ALREADY_EXISTS", "debtor name already exists"), nil
	}

	current, err := t.GetDebtorAny(ctx, householdID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}

	if op.BaseVersion == 0 {
		if current != nil {
			return conflictResult(
				op.OpID, domain.SyncCodeAlreadyExists, "debtor already exists",
				serverStateOf(current.Version, current.Deleted(), current.FullState()),
			), nil
		}
		created, err := t.CreateDebtor(ctx, domain.CreateDebtorParams{
			ID: op.ID, HouseholdID: householdID, UserID: userID, Name: data.Name, Note: data.Note,
		})
		if err != nil {
			return domain.SyncPushResult{}, err
		}
		return appliedResult(op.OpID, created.Version), nil
	}

	if current == nil {
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "debtor not found on server",
			serverStateOf(0, false, nil),
		), nil
	}
	if current.Deleted() {
		return conflictResult(
			op.OpID, domain.SyncCodeDeletedConflict, "debtor was deleted on server",
			serverStateOf(current.Version, true, nil),
		), nil
	}
	if current.Version != op.BaseVersion {
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "debtor version conflict",
			serverStateOf(current.Version, false, current.FullState()),
		), nil
	}

	updated, err := t.ReplaceDebtor(ctx, householdID, userID, op.ID, op.BaseVersion, data)
	if errors.Is(err, domain.ErrDebtorVersionConflict) || errors.Is(err, domain.ErrRecordDeleted) {
		fresh, ferr := t.GetDebtorAny(ctx, householdID, op.ID)
		if ferr != nil {
			return domain.SyncPushResult{}, ferr
		}
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "debtor version conflict",
			serverStateOf(fresh.Version, fresh.Deleted(), fresh.FullState()),
		), nil
	}
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, updated.Version), nil
}

// deleteDebtorOp mirrors deleteCategoryOp: idempotent on tombstones and
// missing records, delete-wins over concurrent edits, live-operations in-use
// guard as a per-item error.
func deleteDebtorOp( //nolint:dupl // per-entity delete twins: identical protocol shape
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	current, err := t.GetDebtorAny(ctx, householdID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if current == nil {
		return appliedResult(op.OpID, 0), nil
	}
	if current.Deleted() {
		return appliedResult(op.OpID, current.Version), nil
	}
	inUse, err := t.HasLiveDebtOperationsForDebtor(ctx, householdID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if inUse {
		return errorResult(op.OpID, "DEBTOR_IN_USE", "debtor has debt operations and cannot be deleted"), nil
	}
	deleted, err := t.TombstoneDebtor(ctx, householdID, userID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, deleted.Version), nil
}

// --- debt operations ----------------------------------------------------------

func applyDebtOperationOperation(
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	if op.Action == domain.SyncActionDelete {
		return deleteDebtOperationOp(ctx, t, householdID, userID, op)
	}
	if op.Action != domain.SyncActionUpsert {
		return errorResult(op.OpID, "VALIDATION_FAILED", "unknown action"), nil
	}

	var data domain.DebtOperationFullState
	if err := decodeSyncData(op.Data, &data); err != nil {
		return errorResult( //nolint:nilerr // decode failure is a per-item error result, not a batch error
			op.OpID,
			"VALIDATION_FAILED",
			"invalid debt operation data",
		), nil
	}
	if data.Amount < 1 {
		return errorResult(op.OpID, "VALIDATION_FAILED", "amount must be at least 1 minor unit"), nil
	}
	if data.Direction != domain.DebtDirectionReceivable && data.Direction != domain.DebtDirectionPayable {
		return errorResult(op.OpID, "VALIDATION_FAILED", "invalid debt direction"), nil
	}
	if data.Kind != domain.DebtOperationKindDebt && data.Kind != domain.DebtOperationKindRepayment {
		return errorResult(op.OpID, "VALIDATION_FAILED", "invalid debt operation kind"), nil
	}

	// Reference validation with the REST granularity: the debtor must be
	// among the user's LIVE debtors (a tombstoned debtor is "not found").
	live, err := t.LiveDebtorExists(ctx, householdID, data.DebtorID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if !live {
		return errorResult(op.OpID, "DEBT_OPERATION_DEBTOR_NOT_FOUND", "debtor not found"), nil
	}

	current, err := t.GetDebtOperationAny(ctx, householdID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}

	if op.BaseVersion == 0 {
		if current != nil {
			return conflictResult(
				op.OpID, domain.SyncCodeAlreadyExists, "debt operation already exists",
				serverStateOf(current.Version, current.Deleted(), current.FullState()),
			), nil
		}
		created, err := t.CreateDebtOperation(ctx, domain.CreateDebtOperationParams{
			ID: op.ID, HouseholdID: householdID, UserID: userID,
			DebtorID: data.DebtorID, Direction: data.Direction, Kind: data.Kind,
			Amount: data.Amount, Note: data.Note, OccurredAt: data.OccurredAt,
		})
		if err != nil {
			return domain.SyncPushResult{}, err
		}
		return appliedResult(op.OpID, created.Version), nil
	}

	if current == nil {
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "debt operation not found on server",
			serverStateOf(0, false, nil),
		), nil
	}
	if current.Deleted() {
		return conflictResult(
			op.OpID, domain.SyncCodeDeletedConflict, "debt operation was deleted on server",
			serverStateOf(current.Version, true, nil),
		), nil
	}
	if current.DebtorID != data.DebtorID || current.Direction != data.Direction || current.Kind != data.Kind {
		return errorResult(op.OpID, "VALIDATION_FAILED", "debtor, direction, and kind are immutable"), nil
	}
	if current.Version != op.BaseVersion {
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "debt operation version conflict",
			serverStateOf(current.Version, false, current.FullState()),
		), nil
	}

	updated, err := t.ReplaceDebtOperation(ctx, householdID, userID, op.ID, op.BaseVersion, data)
	if errors.Is(err, domain.ErrDebtOperationVersionConflict) || errors.Is(err, domain.ErrRecordDeleted) {
		fresh, ferr := t.GetDebtOperationAny(ctx, householdID, op.ID)
		if ferr != nil {
			return domain.SyncPushResult{}, ferr
		}
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "debt operation version conflict",
			serverStateOf(fresh.Version, fresh.Deleted(), fresh.FullState()),
		), nil
	}
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, updated.Version), nil
}

func deleteDebtOperationOp(
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	current, err := t.GetDebtOperationAny(ctx, householdID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if current == nil {
		return appliedResult(op.OpID, 0), nil
	}
	if current.Deleted() {
		return appliedResult(op.OpID, current.Version), nil
	}
	deleted, err := t.TombstoneDebtOperation(ctx, householdID, userID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, deleted.Version), nil
}

// --- planned payments ----------------------------------------------------------

func applyPlannedPaymentOperation(
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	if op.Action == domain.SyncActionDelete {
		return deletePlannedPaymentOp(ctx, t, householdID, userID, op)
	}
	if op.Action != domain.SyncActionUpsert {
		return errorResult(op.OpID, "VALIDATION_FAILED", "unknown action"), nil
	}

	var data domain.PlannedPaymentFullState
	if err := decodeSyncData(op.Data, &data); err != nil {
		return errorResult( //nolint:nilerr // decode failure is a per-item error result, not a batch error
			op.OpID,
			"VALIDATION_FAILED",
			"invalid planned payment data",
		), nil
	}
	if code := validatePlannedPaymentSyncData(&data); code != "" {
		return errorResult(op.OpID, code, "invalid planned payment data"), nil
	}

	// Reference validation with the REST granularity (see the helper).
	if code, message, err := plannedPaymentRefViolation(ctx, t, householdID, &data); err != nil {
		return domain.SyncPushResult{}, err
	} else if code != "" {
		return errorResult(op.OpID, code, message), nil
	}

	current, err := t.GetPlannedPaymentAny(ctx, householdID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}

	if op.BaseVersion == 0 {
		if current != nil {
			return conflictResult(
				op.OpID, domain.SyncCodeAlreadyExists, "planned payment already exists",
				serverStateOf(current.Version, current.Deleted(), current.FullState()),
			), nil
		}
		created, err := t.CreatePlannedPayment(ctx, domain.CreatePlannedPaymentParams{
			ID: op.ID, HouseholdID: householdID, UserID: userID,
			Type: data.Type, Amount: data.Amount, Name: data.Name,
			AccountID: data.AccountID, CategoryID: data.CategoryID,
			NextDue: data.NextDue.Time, Regularity: data.Regularity,
			ConfirmMode: data.ConfirmMode, Reminder: data.Reminder, Note: data.Note,
		})
		if err != nil {
			return domain.SyncPushResult{}, err
		}
		return appliedResult(op.OpID, created.Version), nil
	}

	if current == nil {
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "planned payment not found on server",
			serverStateOf(0, false, nil),
		), nil
	}
	if current.Deleted() {
		return conflictResult(
			op.OpID, domain.SyncCodeDeletedConflict, "planned payment was deleted on server",
			serverStateOf(current.Version, true, nil),
		), nil
	}
	if current.Type != data.Type {
		return errorResult(op.OpID, "VALIDATION_FAILED", "plan type is immutable"), nil
	}
	if current.Version != op.BaseVersion {
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "planned payment version conflict",
			serverStateOf(current.Version, false, current.FullState()),
		), nil
	}

	updated, err := t.ReplacePlannedPayment(ctx, householdID, userID, op.ID, op.BaseVersion, data)
	if errors.Is(err, domain.ErrPlannedPaymentVersionConflict) || errors.Is(err, domain.ErrRecordDeleted) {
		fresh, ferr := t.GetPlannedPaymentAny(ctx, householdID, op.ID)
		if ferr != nil {
			return domain.SyncPushResult{}, ferr
		}
		return conflictResult(
			op.OpID, domain.SyncCodeVersionConflict, "planned payment version conflict",
			serverStateOf(fresh.Version, fresh.Deleted(), fresh.FullState()),
		), nil
	}
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, updated.Version), nil
}

func deletePlannedPaymentOp(
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	current, err := t.GetPlannedPaymentAny(ctx, householdID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if current == nil {
		return appliedResult(op.OpID, 0), nil
	}
	if current.Deleted() {
		return appliedResult(op.OpID, current.Version), nil
	}
	deleted, err := t.TombstonePlannedPayment(ctx, householdID, userID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, deleted.Version), nil
}

// plannedPaymentRefViolation validates a plan's account/category references
// against the LIVE records (REST granularity): a missing/tombstoned account
// or category, or a category whose type does not match the plan, returns the
// per-item machine code + message ("" = valid).
func plannedPaymentRefViolation(
	ctx context.Context,
	t repository.SyncTx,
	householdID uuid.UUID,
	data *domain.PlannedPaymentFullState,
) (string, string, error) {
	liveAccount, err := t.LiveAccountExists(ctx, householdID, data.AccountID)
	if err != nil {
		return "", "", err
	}
	if !liveAccount {
		return "PLANNED_PAYMENT_ACCOUNT_NOT_FOUND", "account not found", nil
	}
	category, err := t.LiveCategory(ctx, householdID, data.CategoryID)
	if err != nil {
		if errors.Is(err, domain.ErrCategoryNotFound) {
			return "PLANNED_PAYMENT_CATEGORY_NOT_FOUND", "category not found", nil
		}
		return "", "", err
	}
	if category.Type != data.Type {
		return "PLANNED_PAYMENT_CATEGORY_NOT_FOUND", "category type does not match the plan type", nil
	}
	return "", "", nil
}

// validatePlannedPaymentSyncData checks the shape a plan upsert must satisfy
// regardless of the transport (the REST surface gets this from the OpenAPI
// request validator), returning the machine code of the violation ("" =
// valid).
func validatePlannedPaymentSyncData(data *domain.PlannedPaymentFullState) string {
	if data.Amount < 1 {
		return "VALIDATION_FAILED"
	}
	if data.Type != domain.TransactionTypeIncome && data.Type != domain.TransactionTypeExpense {
		return "VALIDATION_FAILED"
	}
	switch data.Regularity {
	case domain.PlannedRegularityDaily, domain.PlannedRegularityWeekly,
		domain.PlannedRegularityMonthly, domain.PlannedRegularityYearly:
	default:
		return "VALIDATION_FAILED"
	}
	if data.ConfirmMode != domain.PlannedConfirmManual && data.ConfirmMode != domain.PlannedConfirmAuto {
		return "VALIDATION_FAILED"
	}
	switch data.Reminder {
	case domain.PlannedReminderOff, domain.PlannedReminderDayBefore, domain.PlannedReminderOnDay:
	default:
		return "VALIDATION_FAILED"
	}
	if data.NextDue.IsZero() || data.AnchorDate.IsZero() {
		return "VALIDATION_FAILED"
	}
	return ""
}

// validateSyncRefs enforces the cashflow-vs-transfer reference rules on the
// LIVE accounts/categories, returning the machine code of the violation ("" =
// valid). Mirrors TransactionService.validateRefs with sync-tx reads.
func validateSyncRefs(
	ctx context.Context,
	t repository.SyncTx,
	householdID uuid.UUID,
	data *domain.TransactionFullState,
) string {
	switch data.Type {
	case domain.TransactionTypeIncome, domain.TransactionTypeExpense:
		if data.FromAccountID != nil || data.ToAccountID != nil || data.AccountID == nil || data.CategoryID == nil {
			return "INVALID_REFS"
		}
		exists, err := t.LiveAccountExists(ctx, householdID, *data.AccountID)
		if err != nil {
			return "INVALID_REFS"
		}
		if !exists {
			return "ACCOUNT_NOT_FOUND"
		}
		category, err := t.LiveCategory(ctx, householdID, *data.CategoryID)
		if err != nil || category == nil {
			return "CATEGORY_NOT_FOUND"
		}
		if category.Type != data.Type {
			return "CATEGORY_TYPE_MISMATCH"
		}
	case domain.TransactionTypeTransfer:
		if data.AccountID != nil || data.CategoryID != nil || data.FromAccountID == nil || data.ToAccountID == nil {
			return "INVALID_REFS"
		}
		fromExists, err := t.LiveAccountExists(ctx, householdID, *data.FromAccountID)
		if err != nil {
			return "INVALID_REFS"
		}
		if !fromExists {
			return "ACCOUNT_NOT_FOUND"
		}
		toExists, err := t.LiveAccountExists(ctx, householdID, *data.ToAccountID)
		if err != nil {
			return "INVALID_REFS"
		}
		if !toExists {
			return "ACCOUNT_NOT_FOUND"
		}
		if data.FromAccountID == data.ToAccountID {
			return "SAME_ACCOUNT_TRANSFER"
		}
	}
	return ""
}

func syncRefMessage(code string) string {
	switch code {
	case "ACCOUNT_NOT_FOUND":
		return "account not found"
	case "CATEGORY_NOT_FOUND":
		return "category not found"
	case "CATEGORY_TYPE_MISMATCH":
		return "transaction type does not match category type"
	case "SAME_ACCOUNT_TRANSFER":
		return "transaction from and to accounts are the same"
	default:
		return "invalid references"
	}
}

func decodeSyncData(raw json.RawMessage, target any) error {
	if len(raw) == 0 {
		return errors.New("missing data")
	}
	return json.Unmarshal(raw, target)
}

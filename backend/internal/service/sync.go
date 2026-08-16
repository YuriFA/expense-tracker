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
// atomically via repository.SyncRepository.WithinUserTx.
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
	userID uuid.UUID,
	ops []domain.SyncOperation,
) ([]domain.SyncPushResult, error) {
	const op = "service.sync.Push"

	results := make([]domain.SyncPushResult, 0, len(ops))
	err := s.sync.WithinUserTx(ctx, userID, func(t repository.SyncTx) error {
		for _, operation := range ops {
			result, err := applySyncOperation(ctx, t, userID, operation)
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
func (s *SyncService) Pull(ctx context.Context, userID uuid.UUID, afterSeq int64, limit *int) (*SyncPullPage, error) {
	const op = "service.sync.Pull"

	pageSize := defaultSyncPullLimit
	if limit != nil && *limit > 0 {
		pageSize = min(*limit, maxSyncPullLimit)
	}

	changes, err := s.sync.PullChanges(ctx, userID, afterSeq, pageSize)
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
	userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	// Persistent idempotency: an already-applied opId replays its stored
	// result without side effects (retry after a lost response, duplicate
	// delivery across batches).
	if previous, err := t.GetAppliedOperation(ctx, op.OpID); err != nil {
		return domain.SyncPushResult{}, err
	} else if previous != nil {
		return previous.Result, nil
	}

	var result domain.SyncPushResult
	var err error
	switch op.Entity {
	case domain.SyncEntityAccount:
		result, err = applyAccountOperation(ctx, t, userID, op)
	case domain.SyncEntityCategory:
		result, err = applyCategoryOperation(ctx, t, userID, op)
	case domain.SyncEntityTransaction:
		result, err = applyTransactionOperation(ctx, t, userID, op)
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
			OpID:     op.OpID,
			UserID:   userID,
			Entity:   op.Entity,
			EntityID: op.ID,
			Result:   result,
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
	userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	if op.Action == domain.SyncActionDelete {
		return deleteAccountOp(ctx, t, userID, op)
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

	current, err := t.GetAccountAny(ctx, userID, op.ID)
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
			ID: op.ID, UserID: userID,
			Name: data.Name, Currency: data.Currency, OpeningBalance: data.OpeningBalance,
		})
		if errors.Is(err, domain.ErrAccountAlreadyExists) {
			// Safety net for an id race (the advisory lock makes it unlikely):
			// report the actual stored record as the conflict's serverState.
			fresh, ferr := t.GetAccountAny(ctx, userID, op.ID)
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

	updated, err := t.ReplaceAccount(ctx, userID, op.ID, op.BaseVersion, data)
	if errors.Is(err, domain.ErrAccountVersionConflict) || errors.Is(err, domain.ErrRecordDeleted) {
		// Lost a race inside the batch (two ops touching the same record);
		// report the conflict, the client re-pushes on the new base.
		fresh, ferr := t.GetAccountAny(ctx, userID, op.ID)
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
	userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	current, err := t.GetAccountAny(ctx, userID, op.ID)
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
	inUse, err := t.HasLiveTransactionsForAccount(ctx, userID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if inUse {
		return errorResult(op.OpID, "ACCOUNT_IN_USE", "account has transactions and cannot be deleted"), nil
	}
	deleted, err := t.TombstoneAccount(ctx, userID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, deleted.Version), nil
}

// --- categories -----------------------------------------------------------------

func applyCategoryOperation(
	ctx context.Context,
	t repository.SyncTx,
	userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	if op.Action == domain.SyncActionDelete {
		return deleteCategoryOp(ctx, t, userID, op)
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
	nameTaken, err := t.CategoryNameTaken(ctx, userID, data.Name, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if nameTaken {
		return errorResult(op.OpID, "CATEGORY_ALREADY_EXISTS", "category name already exists"), nil
	}

	current, err := t.GetCategoryAny(ctx, userID, op.ID)
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
			ID: op.ID, UserID: userID,
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

	updated, err := t.ReplaceCategory(ctx, userID, op.ID, op.BaseVersion, data)
	if errors.Is(err, domain.ErrCategoryVersionConflict) || errors.Is(err, domain.ErrRecordDeleted) {
		fresh, ferr := t.GetCategoryAny(ctx, userID, op.ID)
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
	userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	current, err := t.GetCategoryAny(ctx, userID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if current == nil {
		return appliedResult(op.OpID, 0), nil
	}
	if current.Deleted() {
		return appliedResult(op.OpID, current.Version), nil
	}
	inUse, err := t.HasLiveTransactionsForCategory(ctx, userID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if inUse {
		return errorResult(op.OpID, "CATEGORY_IN_USE", "category has transactions and cannot be deleted"), nil
	}
	deleted, err := t.TombstoneCategory(ctx, userID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, deleted.Version), nil
}

// --- transactions -----------------------------------------------------------------

func applyTransactionOperation(
	ctx context.Context,
	t repository.SyncTx,
	userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	if op.Action == domain.SyncActionDelete {
		return deleteTransactionOp(ctx, t, userID, op)
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

	current, err := t.GetTransactionAny(ctx, userID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}

	// Reference validation with the REST granularity: unknown live refs ->
	// per-item unknown-references error; type mismatch / same-account
	// transfer -> invalid-payload codes. Validated on the effective refs of
	// the full state (update) or the new record (create).
	if verr := validateSyncRefs(ctx, t, userID, &data); verr != "" {
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
			ID: op.ID, UserID: userID,
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

	updated, err := t.ReplaceTransaction(ctx, userID, op.ID, op.BaseVersion, data)
	if errors.Is(err, domain.ErrTransactionVersionConflict) || errors.Is(err, domain.ErrRecordDeleted) {
		fresh, ferr := t.GetTransactionAny(ctx, userID, op.ID)
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
	userID uuid.UUID,
	op domain.SyncOperation,
) (domain.SyncPushResult, error) {
	current, err := t.GetTransactionAny(ctx, userID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if current == nil {
		return appliedResult(op.OpID, 0), nil
	}
	if current.Deleted() {
		return appliedResult(op.OpID, current.Version), nil
	}
	deleted, err := t.TombstoneTransaction(ctx, userID, op.ID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	return appliedResult(op.OpID, deleted.Version), nil
}

// validateSyncRefs enforces the cashflow-vs-transfer reference rules on the
// LIVE accounts/categories, returning the machine code of the violation ("" =
// valid). Mirrors TransactionService.validateRefs with sync-tx reads.
func validateSyncRefs(
	ctx context.Context,
	t repository.SyncTx,
	userID uuid.UUID,
	data *domain.TransactionFullState,
) string {
	switch data.Type {
	case domain.TransactionTypeIncome, domain.TransactionTypeExpense:
		if data.FromAccountID != nil || data.ToAccountID != nil || data.AccountID == nil || data.CategoryID == nil {
			return "INVALID_REFS"
		}
		exists, err := t.LiveAccountExists(ctx, userID, *data.AccountID)
		if err != nil {
			return "INVALID_REFS"
		}
		if !exists {
			return "ACCOUNT_NOT_FOUND"
		}
		category, err := t.LiveCategory(ctx, userID, *data.CategoryID)
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
		fromExists, err := t.LiveAccountExists(ctx, userID, *data.FromAccountID)
		if err != nil {
			return "INVALID_REFS"
		}
		if !fromExists {
			return "ACCOUNT_NOT_FOUND"
		}
		toExists, err := t.LiveAccountExists(ctx, userID, *data.ToAccountID)
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

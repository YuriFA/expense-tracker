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
// Push dispatch goes through the per-entity applier registry: entities with
// a landed adapter (ADR-0003) ride the engine, the rest their legacy twins.
type SyncService struct {
	sync     repository.SyncRepository
	appliers map[string]syncOpApplier
}

func NewSyncService(sync repository.SyncRepository) *SyncService {
	return &SyncService{
		sync: sync,
		appliers: map[string]syncOpApplier{
			domain.SyncEntityAccount:        applySyncOperationFor(accountAdapter{}),
			domain.SyncEntityDebtor:         applySyncOperationFor(debtorAdapter{}),
			domain.SyncEntityCategory:       applySyncOperationFor(categoryAdapter{}),
			domain.SyncEntityDebtOperation:  applySyncOperationFor(debtOperationAdapter{}),
			domain.SyncEntityTransaction:    applySyncOperationFor(transactionAdapter{}),
			domain.SyncEntityPlannedPayment: applyPlannedPaymentOperation,
		},
	}
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
			result, err := applySyncOperation(ctx, t, householdID, userID, operation, s.appliers)
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
func (s *SyncService) Pull(
	ctx context.Context,
	householdID uuid.UUID,
	afterSeq int64,
	limit *int,
) (*SyncPullPage, error) {
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
	appliers map[string]syncOpApplier,
) (domain.SyncPushResult, error) {
	// Persistent idempotency: an already-applied opId replays its stored
	// result without side effects (retry after a lost response, duplicate
	// delivery across batches), scoped to this household's applied operations.
	if previous, err := t.GetAppliedOperation(ctx, householdID, op.OpID); err != nil {
		return domain.SyncPushResult{}, err
	} else if previous != nil {
		return previous.Result, nil
	}

	applier, known := appliers[op.Entity]
	if !known {
		return domain.SyncPushResult{
			OpID: op.OpID, Status: domain.SyncStatusError,
			Code: "VALIDATION_FAILED", Message: "unknown entity",
		}, nil
	}
	result, err := applier(ctx, t, householdID, userID, op)
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

// adoptOrphanedOrConflict runs the create-time cross-household id check
// (household-join union semantics): a base-0 create whose id lives in
// another household may only proceed when that household is orphaned (the
// adopt frees the id); a live household's record yields an already-exists
// conflict result. The zero result means "free to create".
func adoptOrphanedOrConflict(
	ctx context.Context,
	t repository.SyncTx,
	entity string,
	op domain.SyncOperation,
	householdID uuid.UUID,
	message string,
) (domain.SyncPushResult, error) {
	blocked, err := t.AdoptOrphanedID(ctx, entity, op.ID, householdID)
	if err != nil {
		return domain.SyncPushResult{}, err
	}
	if blocked != nil {
		return conflictResult(op.OpID, domain.SyncCodeAlreadyExists, message, blocked), nil
	}
	return domain.SyncPushResult{}, nil
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
		if res, err := adoptOrphanedOrConflict(ctx, t, domain.SyncEntityPlannedPayment, op, householdID,
			"planned payment already exists in another household"); err != nil {
			return domain.SyncPushResult{}, err
		} else if res.Status != "" {
			return res, nil
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

// validateTransactionSyncShape checks the type + amount sign rules a
// transaction upsert must satisfy regardless of the transport (the REST
// surface gets this from TransactionService), returning the machine code of
// the violation ("" = valid).
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
// TransactionService.validateRefs with sync-tx reads.
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
		return validateSyncCashflowRefs(ctx, t, householdID, *data.AccountID, *data.CategoryID, data.Type)
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
func liveAccountCode(ctx context.Context, t repository.SyncTx, householdID, accountID uuid.UUID) string {
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
	t repository.SyncTx,
	householdID, accountID, categoryID uuid.UUID,
	typ domain.TransactionType,
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
	return ""
}

func validateSyncTransferRefs(
	ctx context.Context,
	t repository.SyncTx,
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
	t repository.SyncTx,
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
	case "SAME_ACCOUNT_TRANSFER":
		return "transaction from and to accounts are the same"
	case "INVALID_AMOUNT":
		return "invalid amount"
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

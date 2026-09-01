package service

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

// plannedPaymentAdapter is the planned payment's half of the push engine:
// the shape rules and account/category reference checks as pre-validation,
// the plan-type immutability guard, and no delete guard (plans tombstone
// unconditionally; advancement is the auto-confirm job's, not push's).
type plannedPaymentAdapter struct {
	syncAdapterDefaults[*domain.PlannedPayment, domain.PlannedPaymentFullState]
}

func (plannedPaymentAdapter) entity() string { return domain.SyncEntityPlannedPayment }
func (plannedPaymentAdapter) label() string  { return "planned payment" }

func (plannedPaymentAdapter) decode(raw json.RawMessage) (domain.PlannedPaymentFullState, error) {
	var data domain.PlannedPaymentFullState
	err := decodeSyncData(raw, &data)
	return data, err
}

func (plannedPaymentAdapter) invalidDataMessage() string { return "invalid planned payment data" }

// preValidate checks the shape a plan upsert must satisfy regardless of the
// transport (the REST surface gets this from the OpenAPI request validator),
// then the references against the LIVE records (REST granularity).
func (plannedPaymentAdapter) preValidate(
	ctx context.Context,
	t repository.SyncTx,
	householdID uuid.UUID,
	_ domain.SyncOperation,
	data domain.PlannedPaymentFullState,
) (string, string, error) {
	if code := validatePlannedPaymentSyncData(&data); code != "" {
		return code, "invalid planned payment data", nil
	}
	code, message, err := plannedPaymentRefViolation(ctx, t, householdID, &data)
	if err != nil {
		return "", "", err
	}
	if code != "" {
		return code, message, nil
	}
	return "", "", nil
}

func (plannedPaymentAdapter) immutable(
	cur *domain.PlannedPayment,
	data domain.PlannedPaymentFullState,
) (string, string) {
	if cur.Type != data.Type {
		return "VALIDATION_FAILED", "plan type is immutable"
	}
	return "", ""
}

func (plannedPaymentAdapter) version(p *domain.PlannedPayment) int   { return p.Version }
func (plannedPaymentAdapter) fullState(p *domain.PlannedPayment) any { return p.FullState() }
func (plannedPaymentAdapter) isWriteRace(err error) bool {
	return errors.Is(err, domain.ErrPlannedPaymentVersionConflict) || errors.Is(err, domain.ErrRecordDeleted)
}

func (plannedPaymentAdapter) getAny(
	ctx context.Context, t repository.SyncTx, householdID, id uuid.UUID,
) (*domain.PlannedPayment, bool, error) {
	p, err := t.GetPlannedPaymentAny(ctx, householdID, id)
	if err != nil || p == nil {
		return nil, false, err
	}
	return p, true, nil
}

func (plannedPaymentAdapter) create(
	ctx context.Context, t repository.SyncTx, householdID, userID, id uuid.UUID, data domain.PlannedPaymentFullState,
) (*domain.PlannedPayment, error) {
	return t.CreatePlannedPayment(ctx, domain.CreatePlannedPaymentParams{
		ID: id, HouseholdID: householdID, UserID: userID,
		Type: data.Type, Amount: data.Amount, Name: data.Name,
		AccountID: data.AccountID, CategoryID: data.CategoryID,
		NextDue: data.NextDue.Time, Regularity: data.Regularity,
		ConfirmMode: data.ConfirmMode, Reminder: data.Reminder, Note: data.Note,
	})
}

func (plannedPaymentAdapter) replace(
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID, id uuid.UUID,
	baseVersion int,
	data domain.PlannedPaymentFullState,
) (*domain.PlannedPayment, error) {
	return t.ReplacePlannedPayment(ctx, householdID, userID, id, baseVersion, data)
}

func (plannedPaymentAdapter) tombstone(
	ctx context.Context, t repository.SyncTx, householdID, userID, id uuid.UUID,
) (*domain.PlannedPayment, error) {
	return t.TombstonePlannedPayment(ctx, householdID, userID, id)
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

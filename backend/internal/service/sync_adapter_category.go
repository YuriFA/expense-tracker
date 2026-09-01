package service

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

// categoryAdapter is the category's half of the push engine: the type shape
// rule and live-name uniqueness pre-check, and the in-use delete guard. No
// immutable fields.
type categoryAdapter struct {
	syncAdapterDefaults[*domain.Category, domain.CategoryFullState]
}

func (categoryAdapter) entity() string { return domain.SyncEntityCategory }
func (categoryAdapter) label() string  { return "category" }

func (categoryAdapter) decode(raw json.RawMessage) (domain.CategoryFullState, error) {
	var data domain.CategoryFullState
	err := decodeSyncData(raw, &data)
	return data, err
}

func (categoryAdapter) invalidDataMessage() string { return "invalid category data" }

// preValidate checks the type shape, then the live-name uniqueness - the
// latter pre-checked under the advisory lock so a violation surfaces as a
// per-item error, never an aborted batch.
func (categoryAdapter) preValidate(
	ctx context.Context,
	t repository.SyncTx,
	householdID uuid.UUID,
	op domain.SyncOperation,
	data domain.CategoryFullState,
) (string, string, error) {
	if data.Type != domain.TransactionTypeIncome && data.Type != domain.TransactionTypeExpense {
		return "VALIDATION_FAILED", "invalid category type", nil
	}
	nameTaken, err := t.CategoryNameTaken(ctx, householdID, data.Name, op.ID)
	if err != nil {
		return "", "", err
	}
	if nameTaken {
		return "CATEGORY_ALREADY_EXISTS", "category name already exists", nil
	}
	return "", "", nil
}

func (categoryAdapter) version(c *domain.Category) int   { return c.Version }
func (categoryAdapter) fullState(c *domain.Category) any { return c.FullState() }
func (categoryAdapter) isWriteRace(err error) bool {
	return errors.Is(err, domain.ErrCategoryVersionConflict) || errors.Is(err, domain.ErrRecordDeleted)
}

func (categoryAdapter) getAny(
	ctx context.Context, t repository.SyncTx, householdID, id uuid.UUID,
) (*domain.Category, bool, error) {
	c, err := t.GetCategoryAny(ctx, householdID, id)
	if err != nil || c == nil {
		return nil, false, err
	}
	return c, true, nil
}

func (categoryAdapter) create(
	ctx context.Context, t repository.SyncTx, householdID, userID, id uuid.UUID, data domain.CategoryFullState,
) (*domain.Category, error) {
	return t.CreateCategory(ctx, domain.CreateCategoryParams{
		ID: id, HouseholdID: householdID, UserID: userID,
		Name: data.Name, Type: data.Type, Icon: data.Icon, Color: data.Color,
	})
}

func (categoryAdapter) replace(
	ctx context.Context,
	t repository.SyncTx,
	householdID, userID, id uuid.UUID,
	baseVersion int,
	data domain.CategoryFullState,
) (*domain.Category, error) {
	return t.ReplaceCategory(ctx, householdID, userID, id, baseVersion, data)
}

func (categoryAdapter) tombstone(
	ctx context.Context, t repository.SyncTx, householdID, userID, id uuid.UUID,
) (*domain.Category, error) {
	return t.TombstoneCategory(ctx, householdID, userID, id)
}

// inUse reports the category's live dependants in the REST order (postgres
// DeleteCategory): live transactions first, then live planned payments - the
// message names the relation that fired.
func (categoryAdapter) inUse(
	ctx context.Context, t repository.SyncTx, householdID, id uuid.UUID,
) (bool, string, error) {
	transactions, err := t.HasLiveTransactionsForCategory(ctx, householdID, id)
	if err != nil {
		return false, "", err
	}
	if transactions {
		return true, "category has transactions and cannot be deleted", nil
	}
	plans, err := t.HasLivePlannedPaymentsForCategory(ctx, householdID, id)
	if err != nil {
		return false, "", err
	}
	if plans {
		return true, "category has planned payments and cannot be deleted", nil
	}
	return false, "", nil
}

func (categoryAdapter) inUseCode() string { return "CATEGORY_IN_USE" }

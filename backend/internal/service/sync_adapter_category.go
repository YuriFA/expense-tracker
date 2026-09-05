package service

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
)

// categoryTx is the category push path's slice of the batch tx (ADR-0003):
// the shared core plus the category's own contract. The compile-time check
// pins the contract to the full repository.SyncTx the applier hands in.
type categoryTx interface {
	repository.SyncCore
	repository.CategorySyncTx
}

var _ categoryTx = repository.SyncTx(nil)

// categoryAdapter is the category's half of the push engine: the type shape
// rule and live-name uniqueness pre-check, and the in-use delete guard. No
// immutable fields.
type categoryAdapter struct {
	syncAdapterDefaults[categoryTx, *domain.Category, domain.CategoryFullState]
}

func (categoryAdapter) entity() string { return domain.SyncEntityCategory }
func (categoryAdapter) label() string  { return catalogSyncEntityLabel(domain.SyncEntityCategory) }

func (categoryAdapter) decode(raw json.RawMessage) (domain.CategoryFullState, error) {
	var data domain.CategoryFullState
	err := decodeSyncData(raw, &data)
	return data, err
}

func (categoryAdapter) invalidDataMessage() string {
	return catalogSyncEntityInvalidDataMessage(domain.SyncEntityCategory)
}

// preValidate checks the type shape, then the live-name uniqueness - the
// latter pre-checked under the advisory lock so a violation surfaces as a
// per-item error, never an aborted batch.
func (categoryAdapter) preValidate(
	ctx context.Context,
	t categoryTx,
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
	ctx context.Context, t categoryTx, householdID, id uuid.UUID,
) (*domain.Category, bool, error) {
	c, err := t.GetCategoryAny(ctx, householdID, id)
	if err != nil || c == nil {
		return nil, false, err
	}
	return c, true, nil
}

func (categoryAdapter) create(
	ctx context.Context, t categoryTx, householdID, userID, id uuid.UUID, data domain.CategoryFullState,
) (*domain.Category, error) {
	return t.CreateCategory(ctx, domain.CreateCategoryParams{
		ID: id, HouseholdID: householdID, UserID: userID,
		Name: data.Name, Type: data.Type, Icon: data.Icon, Color: data.Color,
	})
}

func (categoryAdapter) replace(
	ctx context.Context,
	t categoryTx,
	householdID, userID, id uuid.UUID,
	baseVersion int,
	data domain.CategoryFullState,
) (*domain.Category, error) {
	return t.ReplaceCategory(ctx, householdID, userID, id, baseVersion, data)
}

func (categoryAdapter) tombstone(
	ctx context.Context, t categoryTx, householdID, userID, id uuid.UUID,
) (*domain.Category, error) {
	return t.TombstoneCategory(ctx, householdID, userID, id)
}

// inUse reports the category's live dependants in the REST order (postgres
// DeleteCategory): live transactions first, then live planned payments - the
// message names the relation that fired.
func (categoryAdapter) inUse(
	ctx context.Context, t categoryTx, householdID, id uuid.UUID,
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

// categoryDeleteData is the delete-op payload shape ("cascade": true).
type categoryDeleteData struct {
	Cascade bool `json:"cascade"`
}

// resolveDelete parses the delete payload: absent data is a plain guarded
// delete; {"cascade": true} cascades to the referencing transactions;
// anything else is a per-item validation error.
func (categoryAdapter) resolveDelete(op domain.SyncOperation) (bool, string, string) {
	if len(op.Data) == 0 || string(op.Data) == "null" {
		return false, "", ""
	}
	var data categoryDeleteData
	if err := decodeSyncData(op.Data, &data); err != nil {
		return false, "VALIDATION_FAILED", "invalid category delete data"
	}
	return data.Cascade, "", ""
}

// inUseUnderCascade is the reduced guard for a cascaded delete: the
// referencing transactions are removed by the cascade itself, so only live
// planned payments still block (mirrors the REST DeleteCategory order).
func (categoryAdapter) inUseUnderCascade(
	ctx context.Context, t categoryTx, householdID, id uuid.UUID,
) (bool, string, error) {
	plans, err := t.HasLivePlannedPaymentsForCategory(ctx, householdID, id)
	if err != nil {
		return false, "", err
	}
	if plans {
		return true, "category has planned payments and cannot be deleted", nil
	}
	return false, "", nil
}

// cascadeTombstone tombstones the category and every referencing live
// transaction, each with its own change_log row, on the batch transaction.
func (categoryAdapter) cascadeTombstone(
	ctx context.Context, t categoryTx, householdID, userID, id uuid.UUID,
) (*domain.Category, error) {
	return t.CascadeTombstoneCategory(ctx, householdID, userID, id)
}

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
)

func TestTransactionService_RefValidation(t *testing.T) {
	t.Parallel()
	_, _, txSvc, _, _, store := services(t)
	ctx := context.Background()

	user := seedFakeUser(t, store)
	acct := seedFakeAccount(t, store, user.ID)
	cat := seedFakeCategory(t, store, user.ID, "CustomIncome", domain.TransactionTypeIncome)

	t.Run("income requires account+category", func(t *testing.T) {
		t.Parallel()
		_, err := txSvc.Create(ctx, user.ID, domain.CreateTransactionParams{
			Type: domain.TransactionTypeIncome, Amount: 100, OccurredAt: time.Now().UTC(),
		})
		require.ErrorIs(t, err, domain.ErrInvalidRefs)
	})

	t.Run("income with transfer refs rejected", func(t *testing.T) {
		t.Parallel()
		_, err := txSvc.Create(ctx, user.ID, domain.CreateTransactionParams{
			Type: domain.TransactionTypeIncome, Amount: 100, OccurredAt: time.Now().UTC(),
			FromAccountID: &acct.ID, ToAccountID: &acct.ID,
		})
		require.ErrorIs(t, err, domain.ErrInvalidRefs)
	})

	t.Run("income account not owned -> transaction account not found", func(t *testing.T) {
		t.Parallel()
		other := uuid.New()
		_, err := txSvc.Create(ctx, user.ID, domain.CreateTransactionParams{
			Type: domain.TransactionTypeIncome, Amount: 100, OccurredAt: time.Now().UTC(),
			AccountID: &other, CategoryID: &cat.ID,
		})
		require.ErrorIs(t, err, domain.ErrTransactionAccountNotFound)
	})

	t.Run("income category type mismatch", func(t *testing.T) {
		t.Parallel()
		expenseCat := seedFakeCategory(t, store, user.ID, "CustomExpense", domain.TransactionTypeExpense)
		_, err := txSvc.Create(ctx, user.ID, domain.CreateTransactionParams{
			Type: domain.TransactionTypeIncome, Amount: 100, OccurredAt: time.Now().UTC(),
			AccountID: &acct.ID, CategoryID: &expenseCat.ID,
		})
		require.ErrorIs(t, err, domain.ErrCategoryTypeMismatch)
	})

	t.Run("transfer same account rejected", func(t *testing.T) {
		t.Parallel()
		_, err := txSvc.Create(ctx, user.ID, domain.CreateTransactionParams{
			Type: domain.TransactionTypeTransfer, Amount: 100, OccurredAt: time.Now().UTC(),
			FromAccountID: &acct.ID, ToAccountID: &acct.ID,
		})
		require.ErrorIs(t, err, domain.ErrSameAccountTransfer)
	})

	t.Run("transfer with account+category rejected", func(t *testing.T) {
		t.Parallel()
		_, err := txSvc.Create(ctx, user.ID, domain.CreateTransactionParams{
			Type: domain.TransactionTypeTransfer, Amount: 100, OccurredAt: time.Now().UTC(),
			AccountID: &acct.ID, CategoryID: &cat.ID,
		})
		require.ErrorIs(t, err, domain.ErrInvalidRefs)
	})

	t.Run("valid income creates", func(t *testing.T) {
		t.Parallel()
		created, err := txSvc.Create(ctx, user.ID, domain.CreateTransactionParams{
			Type: domain.TransactionTypeIncome, Amount: 100, OccurredAt: time.Now().UTC(),
			AccountID: &acct.ID, CategoryID: &cat.ID,
		})
		require.NoError(t, err)
		assert.Equal(t, 1, created.Version)
	})
}

func TestTransactionService_CursorEncodeDecode(t *testing.T) {
	t.Parallel()
	tx := domain.Transaction{ID: uuid.New(), OccurredAt: time.Date(2026, 3, 1, 10, 0, 0, 0, time.UTC)}
	encoded, err := service.EncodeTransactionCursor(tx)
	require.NoError(t, err)

	decoded, err := service.DecodeTransactionCursor(encoded)
	require.NoError(t, err)
	assert.Equal(t, tx.ID, decoded.ID)
	assert.True(t, tx.OccurredAt.Equal(decoded.OccurredAt))

	_, err = service.DecodeTransactionCursor("!!!not-base64!!!")
	assert.Error(t, err)
}

func TestTransactionService_PaginationLogic(t *testing.T) {
	t.Parallel()
	_, _, txSvc, _, _, store := services(t)
	ctx := context.Background()

	user := seedFakeUser(t, store)
	acct := seedFakeAccount(t, store, user.ID)
	cat := seedFakeCategory(t, store, user.ID, "P", domain.TransactionTypeIncome)

	// 5 transactions, distinct occurred_at.
	base := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	for i := range 5 {
		_, err := txSvc.Create(ctx, user.ID, domain.CreateTransactionParams{
			Type:       domain.TransactionTypeIncome,
			Amount:     int64(i + 1),
			OccurredAt: base.Add(time.Duration(i) * time.Hour),
			AccountID:  &acct.ID,
			CategoryID: &cat.ID,
		})
		require.NoError(t, err)
	}

	pageSize := 2
	// Page 1: 2 items + nextCursor.
	p1, err := txSvc.List(ctx, user.ID, service.TransactionListQuery{Limit: &pageSize})
	require.NoError(t, err)
	require.Len(t, p1.Transactions, 2)
	require.NotNil(t, p1.NextCursor)
	assert.Equal(t, int64(5), p1.Transactions[0].Amount) // newest first

	// Page 2 with the cursor.
	p2, err := txSvc.List(ctx, user.ID, service.TransactionListQuery{Limit: &pageSize, Cursor: p1.NextCursor})
	require.NoError(t, err)
	require.Len(t, p2.Transactions, 2)
	require.NotNil(t, p2.NextCursor)
	assert.Equal(t, int64(3), p2.Transactions[0].Amount)

	// Page 3: 1 item, no nextCursor.
	p3, err := txSvc.List(ctx, user.ID, service.TransactionListQuery{Limit: &pageSize, Cursor: p2.NextCursor})
	require.NoError(t, err)
	require.Len(t, p3.Transactions, 1)
	assert.Nil(t, p3.NextCursor)
}

func TestTransactionService_InvalidCursor(t *testing.T) {
	t.Parallel()
	_, _, txSvc, _, _, store := services(t)
	ctx := context.Background()
	user := seedFakeUser(t, store)

	_, err := txSvc.List(ctx, user.ID, service.TransactionListQuery{Cursor: strPtr("!!!invalid!!!")})
	require.ErrorIs(t, err, service.ErrInvalidCursor)
}

func TestTransactionService_UpdateNoFields(t *testing.T) {
	t.Parallel()
	_, _, txSvc, _, _, store := services(t)
	ctx := context.Background()
	user := seedFakeUser(t, store)
	acct := seedFakeAccount(t, store, user.ID)
	cat := seedFakeCategory(t, store, user.ID, "U", domain.TransactionTypeIncome)

	tx, err := txSvc.Create(ctx, user.ID, domain.CreateTransactionParams{
		Type: domain.TransactionTypeIncome, Amount: 10, OccurredAt: time.Now().UTC(),
		AccountID: &acct.ID, CategoryID: &cat.ID,
	})
	require.NoError(t, err)

	_, err = txSvc.Update(ctx, user.ID, tx.ID, domain.UpdateTransactionParams{Version: 1})
	require.ErrorIs(t, err, service.ErrNoFieldsToUpdate)

	// Optimistic concurrency mismatch surfaces the version-conflict domain error.
	_, err = txSvc.Update(ctx, user.ID, tx.ID, domain.UpdateTransactionParams{Version: 999, Amount: i64(20)})
	require.Error(t, err)
	require.ErrorIs(t, err, domain.ErrTransactionVersionConflict)
}

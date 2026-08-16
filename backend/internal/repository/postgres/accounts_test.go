package postgres_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/yurifa/expense-tracker-api/internal/domain"
)

func TestAccountCRUDAndBalance(t *testing.T) {
	if testing.Short() {
		t.Skip("requires Docker for testcontainers")
	}
	user := seedUser(t, "acct")
	ctx := newCtx(t)

	created, err := testRepo.CreateAccount(ctx, domain.CreateAccountParams{
		UserID:         user.ID,
		Name:           "Wallet",
		Currency:       "USD",
		OpeningBalance: 10000, // $100.00
	})
	require.NoError(t, err)
	assert.Equal(t, int64(10000), created.Balance, "fresh account balance = opening")
	assert.Equal(t, int64(0), created.ManualAdjustment)

	// Manual adjustment shifts balance.
	adj := int64(-2500)
	updated, err := testRepo.UpdateAccount(
		ctx,
		user.ID,
		created.ID,
		domain.UpdateAccountParams{ManualAdjustment: &adj, Version: created.Version},
	)
	require.NoError(t, err)
	assert.Equal(t, int64(7500), updated.Balance)

	// Rename keeps balance.
	name := "Wallet Pro"
	updated, err = testRepo.UpdateAccount(
		ctx,
		user.ID,
		created.ID,
		domain.UpdateAccountParams{Name: &name, Version: updated.Version},
	)
	require.NoError(t, err)
	assert.Equal(t, "Wallet Pro", updated.Name)
	assert.Equal(t, int64(7500), updated.Balance)

	// Get + list.
	got, err := testRepo.GetAccount(ctx, user.ID, created.ID)
	require.NoError(t, err)
	assert.Equal(t, updated.Name, got.Name)

	all, err := testRepo.GetAccounts(ctx, user.ID)
	require.NoError(t, err)
	require.Len(t, all, 1)

	balances, err := testRepo.GetAccountBalances(ctx, user.ID)
	require.NoError(t, err)
	require.Len(t, balances, 1)
	assert.Equal(t, int64(7500), balances[0].Balance)

	// Delete.
	require.NoError(t, testRepo.DeleteAccount(ctx, user.ID, created.ID))
	_, err = testRepo.GetAccount(ctx, user.ID, created.ID)
	require.ErrorIs(t, err, domain.ErrAccountNotFound)
}

func TestAccountIDORScoping(t *testing.T) {
	if testing.Short() {
		t.Skip("requires Docker for testcontainers")
	}
	owner := seedUser(t, "owner")
	intruder := seedUser(t, "intruder")
	ctx := newCtx(t)

	acct, err := testRepo.CreateAccount(ctx, domain.CreateAccountParams{
		UserID: owner.ID, Name: "Secret", Currency: "USD", OpeningBalance: 1,
	})
	require.NoError(t, err)

	// Intruder cannot read owner's account -> not found.
	_, err = testRepo.GetAccount(ctx, intruder.ID, acct.ID)
	require.ErrorIs(t, err, domain.ErrAccountNotFound)

	// Intruder cannot delete owner's account -> not found (NOT a FK error).
	err = testRepo.DeleteAccount(ctx, intruder.ID, acct.ID)
	require.ErrorIs(t, err, domain.ErrAccountNotFound)

	// Intruder cannot update owner's account.
	name := "hacked"
	_, err = testRepo.UpdateAccount(ctx, intruder.ID, acct.ID, domain.UpdateAccountParams{Name: &name})
	require.ErrorIs(t, err, domain.ErrAccountNotFound)
}

func TestDeleteAccountInUseReturnsConflict(t *testing.T) {
	if testing.Short() {
		t.Skip("requires Docker for testcontainers")
	}
	user := seedUser(t, "inuse")
	ctx := newCtx(t)

	acct, err := testRepo.CreateAccount(ctx, domain.CreateAccountParams{
		UserID: user.ID, Name: "A", Currency: "USD", OpeningBalance: 0,
	})
	require.NoError(t, err)
	cat := seedCategory(t, user.ID, "Cat")

	_, err = testRepo.CreateTransaction(ctx, domain.CreateTransactionParams{
		UserID: user.ID, Type: domain.TransactionTypeIncome, Amount: 100,
		OccurredAt: mustNow(), AccountID: &acct.ID, CategoryID: &cat.ID,
	})
	require.NoError(t, err)

	// Deleting the referenced account must surface a domain error (-> 409).
	err = testRepo.DeleteAccount(ctx, user.ID, acct.ID)
	require.ErrorIs(t, err, domain.ErrAccountHasTransactions)
}

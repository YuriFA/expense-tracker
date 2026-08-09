package postgres_test

import (
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
)

// mustNow returns a UTC timestamp suitable for occurred_at.
func mustNow() time.Time {
	return time.Now().UTC()
}

// seedCategory creates a category for the user and returns its id.
func seedCategory(t *testing.T, userID uuid.UUID, name string, typ domain.TransactionType) *domain.Category {
	t.Helper()
	ctx := newCtx(t)
	c, err := testRepo.CreateCategory(ctx, domain.CreateCategoryParams{
		UserID: userID, Name: name, Type: typ, Icon: "x", Color: "#fff",
	})
	if err != nil {
		t.Fatalf("seedCategory: %v", err)
	}
	return c
}

// seedAccount creates an account for the user and returns it.
func seedAccount(t *testing.T, userID uuid.UUID, name string) *domain.Account {
	t.Helper()
	ctx := newCtx(t)
	a, err := testRepo.CreateAccount(ctx, domain.CreateAccountParams{
		UserID: userID, Name: name, Currency: "USD", OpeningBalance: 0,
	})
	if err != nil {
		t.Fatalf("seedAccount: %v", err)
	}
	return a
}

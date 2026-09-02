package e2e_test

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Category archive + hybrid delete e2e (category-management change): the
// closest-to-user REST flow - archive via PATCH, active-only listing with an
// includeArchived switch, archived categories closed for new references, and
// the cascade delete tombstoning the category with its transactions
// atomically (balances follow).

func TestE2E_CategoryArchiveAndCascadeDelete(t *testing.T) {
	if testing.Short() {
		t.Skip("e2e requires Postgres")
	}

	c := &client{t: t, jar: map[string]string{}}
	resp := c.do("POST", "/api/auth/register",
		map[string]any{"email": uniqueEmail(), "password": "supersecret1"})
	require.Equal(t, 201, resp["__status"], resp["__body"])

	account := c.do("POST", "/api/accounts",
		map[string]any{"name": "Карта", "currency": "RUB", "openingBalance": 100000})
	require.Equal(t, 201, account["__status"], account["__body"])
	accountID := account["id"].(string)

	category := c.do("POST", "/api/categories",
		map[string]any{"name": "Продукты", "type": "expense", "icon": "cart", "color": "#7c5cff"})
	require.Equal(t, 201, category["__status"], category["__body"])
	categoryID := category["id"].(string)

	// Two transactions in the category.
	for i := range 2 {
		tx := c.doPostTransaction(map[string]any{
			"type": "expense", "amount": 2500, "occurredAt": "2026-09-01T10:00:00Z",
			"accountId": accountID, "categoryId": categoryID, "description": fmt.Sprintf("t%d", i),
		}, fmt.Sprintf("cat-cascade-%d", i))
		require.Equal(t, 201, tx["__status"], tx["__body"])
	}

	// Balance reflects both transactions.
	accounts := c.do("GET", "/api/accounts", nil)
	require.Equal(t, 200, accounts["__status"])
	list := accounts["__body"]
	assert.Contains(t, list, "95000", "opening minus two expenses")

	// --- Archive via PATCH -------------------------------------------------
	archived := c.do("PATCH", "/api/categories/"+categoryID,
		map[string]any{"version": 1, "archived": true})
	require.Equal(t, 200, archived["__status"], archived["__body"])
	assert.NotNil(t, archived["archivedAt"])

	// Default listing hides it; includeArchived shows it.
	def := c.do("GET", "/api/categories", nil)
	require.Equal(t, 200, def["__status"])
	assert.NotContains(t, def["__body"], categoryID)
	withArchived := c.do("GET", "/api/categories?includeArchived=true", nil)
	require.Equal(t, 200, withArchived["__status"])
	assert.Contains(t, withArchived["__body"], categoryID)

	// New transactions cannot assign the archived category...
	blocked := c.doPostTransaction(map[string]any{
		"type": "expense", "amount": 100, "occurredAt": "2026-09-02T10:00:00Z",
		"accountId": accountID, "categoryId": categoryID,
	}, "cat-cascade-blocked")
	require.Equal(t, 422, blocked["__status"], blocked["__body"])
	assert.Equal(t, "CATEGORY_ARCHIVED", blocked["code"])

	// ...and a live planned payment cannot reference it either.
	plan := c.do("POST", "/api/planned-payments", map[string]any{
		"type": "expense", "amount": 600, "name": "Mobile",
		"accountId": accountID, "categoryId": categoryID,
		"nextDue": "2026-10-01", "regularity": "monthly", "confirmMode": "manual", "reminder": "off",
	})
	require.Equal(t, 422, plan["__status"], plan["__body"])
	assert.Equal(t, "PLANNED_PAYMENT_CATEGORY_ARCHIVED", plan["code"])

	// Plain delete without the cascade flag is still the guarded error.
	guarded := c.do("DELETE", "/api/categories/"+categoryID, nil)
	require.Equal(t, 409, guarded["__status"], guarded["__body"])
	assert.Equal(t, "CATEGORY_IN_USE", guarded["code"])

	// --- Cascade delete ----------------------------------------------------
	cascade := c.do("DELETE", "/api/categories/"+categoryID+"?cascade=true", nil)
	require.Equal(t, 204, cascade["__status"], cascade["__body"])

	// The category is gone from every listing...
	withArchived2 := c.do("GET", "/api/categories?includeArchived=true", nil)
	require.Equal(t, 200, withArchived2["__status"])
	assert.NotContains(t, withArchived2["__body"], categoryID)

	// ...its transactions vanished and the balance snapped back to opening.
	transactions := c.do("GET", "/api/transactions?limit=50", nil)
	require.Equal(t, 200, transactions["__status"])
	assert.NotContains(t, transactions["__body"], `"Продукты"`)
	accounts2 := c.do("GET", "/api/accounts", nil)
	require.Equal(t, 200, accounts2["__status"])
	assert.Contains(t, accounts2["__body"], "100000")
}

func TestE2E_CategoryArchiveBlockedByLivePlan(t *testing.T) {
	if testing.Short() {
		t.Skip("e2e requires Postgres")
	}

	c := &client{t: t, jar: map[string]string{}}
	resp := c.do("POST", "/api/auth/register",
		map[string]any{"email": uniqueEmail(), "password": "supersecret1"})
	require.Equal(t, 201, resp["__status"], resp["__body"])

	account := c.do("POST", "/api/accounts",
		map[string]any{"name": "Карта", "currency": "RUB", "openingBalance": 0})
	require.Equal(t, 201, account["__status"])
	accountID := account["id"].(string)

	category := c.do("POST", "/api/categories",
		map[string]any{"name": "Подписки", "type": "expense", "icon": "tv", "color": "#000"})
	require.Equal(t, 201, category["__status"], category["__body"])
	categoryID := category["id"].(string)

	plan := c.do("POST", "/api/planned-payments", map[string]any{
		"type": "expense", "amount": 500, "name": "Internet",
		"accountId": accountID, "categoryId": categoryID,
		"nextDue": "2026-10-01", "regularity": "monthly", "confirmMode": "manual", "reminder": "off",
	})
	require.Equal(t, 201, plan["__status"], plan["__body"])

	// Archiving is blocked with the in-use code, exactly like deleting.
	blocked := c.do("PATCH", "/api/categories/"+categoryID,
		map[string]any{"version": 1, "archived": true})
	require.Equal(t, 409, blocked["__status"], blocked["__body"])
	assert.Equal(t, "CATEGORY_IN_USE", blocked["code"])

	// The cascade flag does not lift the plan guard either.
	cascade := c.do("DELETE", "/api/categories/"+categoryID+"?cascade=true", nil)
	require.Equal(t, 409, cascade["__status"], cascade["__body"])
	assert.Equal(t, "CATEGORY_IN_USE", cascade["code"])

	// Removing the plan unblocks the archive.
	planID := plan["id"].(string)
	deleted := c.do("DELETE", "/api/planned-payments/"+planID, nil)
	require.Equal(t, 204, deleted["__status"], deleted["__body"])
	ok := c.do("PATCH", "/api/categories/"+categoryID,
		map[string]any{"version": 1, "archived": true})
	require.Equal(t, 200, ok["__status"], ok["__body"])
}

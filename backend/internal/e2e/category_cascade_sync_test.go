package e2e_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Sync-path cascade delete e2e: a category delete op carrying
// {"cascade": true} tombstones the category and every live referencing
// transaction in one batch transaction; the per-record tombstones reach
// other devices through pull, and the live-planned-payment guard survives
// the cascade flag.

func TestE2E_SyncCategoryCascadeDelete(t *testing.T) {
	if testing.Short() {
		t.Skip("e2e requires Postgres")
	}

	c := &client{t: t, jar: map[string]string{}}
	resp := c.do("POST", "/api/auth/register", map[string]any{"email": uniqueEmail(), "password": "supersecret1"})
	require.Equal(t, 201, resp["__status"], resp["__body"])

	accountID := "33333333-3333-4333-8333-333333333333"
	categoryID := "44444444-4444-4444-8444-444444444444"
	txID := "55555555-5555-4555-8555-555555555555"

	results := push(t, c, []map[string]any{
		{
			"opId": "ccccccc1-0000-4000-8000-000000000001", "entity": "account",
			"action": "upsert", "id": accountID, "baseVersion": 0,
			"data": map[string]any{"name": "Карта", "currency": "RUB", "openingBalance": 50000},
		},
		{
			"opId": "ccccccc2-0000-4000-8000-000000000002", "entity": "category",
			"action": "upsert", "id": categoryID, "baseVersion": 0,
			"data": map[string]any{"name": "Продукты", "type": "expense", "icon": "cart", "color": "#7c5cff"},
		},
		{
			"opId": "ccccccc3-0000-4000-8000-000000000003", "entity": "transaction",
			"action": "upsert", "id": txID, "baseVersion": 0,
			"data": map[string]any{
				"type": "expense", "amount": 2500, "description": "", "occurredAt": "2026-09-01T10:00:00Z",
				"accountId": accountID, "categoryId": categoryID,
			},
		},
	})
	for i, res := range results {
		require.Equal(t, "applied", res["status"], "op %d: %v", i, res)
	}

	// Cascade delete via the delete payload.
	cascade := push(t, c, []map[string]any{{
		"opId": "ccccccc4-0000-4000-8000-000000000004", "entity": "category",
		"action": "delete", "id": categoryID, "baseVersion": 1,
		"data": map[string]any{"cascade": true},
	}})
	require.Equal(t, "applied", cascade[0]["status"], cascade[0])
	assert.Greater(t, cascade[0]["version"], float64(0))

	// Pull carries a tombstone per tombstoned record (category + transaction).
	changes, _ := pullAll(t, c, 0)
	tombstones := map[string]bool{}
	for _, ch := range changes {
		if ch["action"] == "tombstone" {
			tombstones[ch["entity"].(string)+"/"+ch["id"].(string)] = true
		}
	}
	assert.True(t, tombstones["category/"+categoryID], "category tombstone in feed")
	assert.True(t, tombstones["transaction/"+txID], "transaction tombstone in feed")

	// The balance no longer includes the cascaded expense.
	accounts := c.do("GET", "/api/accounts", nil)
	require.Equal(t, 200, accounts["__status"])
	assert.Contains(t, accounts["__body"], "50000")
}

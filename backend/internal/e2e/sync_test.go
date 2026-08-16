package e2e_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Sync e2e: the /api/sync push/pull contract against the real Postgres stack -
// idempotent replay by opId, already-exists conflicts, CAS version conflicts
// with serverState, partial batches, tombstones, and cursor pulls.

// push sends a sync batch and returns the per-item results.
func push(t *testing.T, c *client, operations []map[string]any) []map[string]any {
	t.Helper()
	resp := c.do("POST", "/api/sync/push", map[string]any{"operations": operations})
	require.Equal(t, 200, resp["__status"], resp["__body"])
	raw, ok := resp["results"].([]any)
	require.True(t, ok, "results array: %v", resp["__body"])
	out := make([]map[string]any, 0, len(raw))
	for _, item := range raw {
		m, ok := item.(map[string]any)
		require.True(t, ok)
		out = append(out, m)
	}
	return out
}

// pull fetches one page (following nextCursor until caught up) and returns all
// changes plus the final cursor.
func pullAll(t *testing.T, c *client, fromCursor float64) ([]map[string]any, float64) {
	t.Helper()
	var all []map[string]any
	cursor := fromCursor
	for {
		resp := c.do("GET", "/api/sync/pull?cursor="+formatFloat(cursor), nil)
		require.Equal(t, 200, resp["__status"], resp["__body"])
		changes, _ := resp["changes"].([]any)
		for _, change := range changes {
			m, ok := change.(map[string]any)
			require.True(t, ok)
			all = append(all, m)
		}
		next, ok := resp["nextCursor"]
		if !ok || next == nil {
			// Caught up: the client stores the last seq it APPLIED (the
			// server reports null, not the final seq).
			if n := len(all); n > 0 {
				cursor = all[n-1]["seq"].(float64)
			}
			return all, cursor
		}
		nextCursor, ok := next.(float64)
		require.True(t, ok, "nextCursor: %v", next)
		assert.Greater(t, nextCursor, cursor, "cursor must advance")
		cursor = nextCursor
	}
}

func formatFloat(f float64) string {
	if f == float64(int64(f)) {
		return formatInt(int64(f))
	}
	return formatFloatExact(f)
}

func formatInt(i int64) string {
	digits := ""
	if i == 0 {
		return "0"
	}
	for i > 0 {
		digits = string(rune('0'+i%10)) + digits
		i /= 10
	}
	return digits
}

func formatFloatExact(f float64) string {
	// Cursors are integers in practice; keep the fallback minimal.
	return formatInt(int64(f))
}

func TestE2E_SyncPushPullFlows(t *testing.T) {
	if testing.Short() {
		t.Skip("e2e requires Postgres")
	}

	c := &client{t: t, jar: map[string]string{}}
	resp := c.do("POST", "/api/auth/register", map[string]any{"email": uniqueEmail(), "password": "supersecret1"})
	require.Equal(t, 201, resp["__status"], resp["__body"])

	// --- Initial pull: registration did NOT seed categories (default off) ---
	changes, cursor := pullAll(t, c, 0)
	assert.Empty(t, changes, "no changes on a fresh unseeded account")

	// --- Push: create account + category (client ids, baseVersion 0) ---
	accountID := "11111111-1111-4111-8111-111111111111"
	categoryID := "22222222-2222-4222-8222-222222222222"
	accountOp := "aaaaaaa1-0000-4000-8000-000000000001"
	categoryOp := "aaaaaaa2-0000-4000-8000-000000000002"

	results := push(t, c, []map[string]any{
		{
			"opId": accountOp, "entity": "account", "action": "upsert", "id": accountID, "baseVersion": 0,
			"data": map[string]any{
				"name": "Карта", "currency": "RUB", "openingBalance": 10050, "manualAdjustment": 0,
			},
		},
		{
			"opId": categoryOp, "entity": "category", "action": "upsert", "id": categoryID, "baseVersion": 0,
			"data": map[string]any{"name": "Продукты", "type": "expense", "icon": "cart", "color": "#7c5cff"},
		},
	})
	require.Len(t, results, 2)
	for _, r := range results {
		assert.Equal(t, "applied", r["status"], "%v", r)
		assert.InDelta(t, float64(1), r["version"], 0, "creates land at version 1")
	}

	// --- Replay across batches: same opId returns the stored result ---
	results = push(t, c, []map[string]any{
		{
			"opId": accountOp, "entity": "account", "action": "upsert", "id": accountID, "baseVersion": 0,
			"data": map[string]any{
				"name": "Карта", "currency": "RUB", "openingBalance": 10050, "manualAdjustment": 0,
			},
		},
	})
	require.Len(t, results, 1)
	assert.Equal(t, "applied", results[0]["status"])
	assert.InDelta(t, float64(1), results[0]["version"], 0, "replay reports the original result")

	// The account exists exactly once with its client id.
	list := c.do("GET", "/api/accounts", nil)
	accounts, _ := list["__body"].(string)
	assert.Contains(t, accounts, accountID)

	// --- Different opId claims the existing id -> SYNC_ALREADY_EXISTS ---
	results = push(t, c, []map[string]any{
		{
			"opId": "bbbbbbb1-0000-4000-8000-000000000001", "entity": "account", "action": "upsert",
			"id": accountID, "baseVersion": 0,
			"data": map[string]any{
				"name": "Другая", "currency": "USD", "openingBalance": 0, "manualAdjustment": 0,
			},
		},
	})
	require.Len(t, results, 1)
	assert.Equal(t, "conflict", results[0]["status"])
	assert.Equal(t, "SYNC_ALREADY_EXISTS", results[0]["code"])
	serverState, ok := results[0]["serverState"].(map[string]any)
	require.True(t, ok, "conflict carries serverState")
	assert.InDelta(t, float64(1), serverState["version"], 0)

	// The stored record was NOT overwritten.
	list = c.do("GET", "/api/accounts", nil)
	accounts, _ = list["__body"].(string)
	assert.Contains(t, accounts, "Карта")

	// --- Update: CAS on baseVersion ---
	updateOp := "ccccccc1-0000-4000-8000-000000000001"
	results = push(t, c, []map[string]any{
		{
			"opId": updateOp, "entity": "account", "action": "upsert", "id": accountID, "baseVersion": 1,
			"data": map[string]any{
				"name": "Карта", "currency": "RUB", "openingBalance": 20000, "manualAdjustment": 0,
			},
		},
	})
	require.Len(t, results, 1)
	assert.Equal(t, "applied", results[0]["status"])
	assert.InDelta(t, float64(2), results[0]["version"], 0)

	// Stale base -> version conflict with the current server state.
	results = push(t, c, []map[string]any{
		{
			"opId": "ccccccc2-0000-4000-8000-000000000002", "entity": "account", "action": "upsert",
			"id": accountID, "baseVersion": 1,
			"data": map[string]any{
				"name": "Карта", "currency": "RUB", "openingBalance": 0, "manualAdjustment": 0,
			},
		},
	})
	assert.Equal(t, "conflict", results[0]["status"])
	assert.Equal(t, "SYNC_VERSION_CONFLICT", results[0]["code"])
	serverState, ok = results[0]["serverState"].(map[string]any)
	require.True(t, ok)
	assert.InDelta(t, float64(2), serverState["version"], 0)

	// --- Partial batch: valid transaction + invalid refs + duplicate name ---
	txnID := "33333333-3333-4333-8333-333333333333"
	validTxnOp := "ddddddd1-0000-4000-8000-000000000001"
	invalidTxnOp := "ddddddd2-0000-4000-8000-000000000002"
	dupCategoryOp := "ddddddd3-0000-4000-8000-000000000003"

	results = push(t, c, []map[string]any{
		{
			"opId": validTxnOp, "entity": "transaction", "action": "upsert", "id": txnID, "baseVersion": 0,
			"data": map[string]any{
				"type": "expense", "amount": 1500, "description": "хлеб", "occurredAt": "2026-08-01T10:00:00Z",
				"accountId": accountID, "categoryId": categoryID,
			},
		},
		{
			"opId": invalidTxnOp, "entity": "transaction", "action": "upsert",
			"id": "44444444-4444-4444-8444-444444444444", "baseVersion": 0,
			"data": map[string]any{
				"type": "expense", "amount": 100, "description": "", "occurredAt": "2026-08-01T10:00:00Z",
				"accountId": "55555555-5555-4555-8555-555555555555", "categoryId": categoryID,
			},
		},
		{
			"opId": dupCategoryOp, "entity": "category", "action": "upsert",
			"id": "66666666-6666-4666-8666-666666666666", "baseVersion": 0,
			"data": map[string]any{"name": "Продукты", "type": "expense", "icon": "cart", "color": "#7c5cff"},
		},
	})
	require.Len(t, results, 3)
	assert.Equal(t, "applied", results[0]["status"], "valid item applied")
	assert.Equal(t, "error", results[1]["status"], "%v", results[1])
	assert.Equal(t, "ACCOUNT_NOT_FOUND", results[1]["code"])
	assert.Equal(t, "error", results[2]["status"], "%v", results[2])
	assert.Equal(t, "CATEGORY_ALREADY_EXISTS", results[2]["code"])

	// Applied items were not rolled back.
	txn := c.do("GET", "/api/transactions/"+txnID, nil)
	require.Equal(t, 200, txn["__status"], txn["__body"])

	// --- Pull: everything since the last cursor, in seq order ---
	changes, cursor = pullAll(t, c, cursor)
	// Only APPLIED changes are logged: 2 account rows (create + update), the
	// category create, and the valid transaction. The replay, the
	// already-exists conflict, the CAS conflict, and the two failed items
	// never touch the change log.
	require.Len(t, changes, 4)
	byEntity := map[string]int{}
	for _, change := range changes {
		byEntity[change["entity"].(string)]++
		assert.Equal(t, "upsert", change["action"])
	}
	assert.Equal(t, 2, byEntity["account"])
	assert.Equal(t, 1, byEntity["category"])
	assert.Equal(t, 1, byEntity["transaction"])
	assert.InDelta(t, float64(1), changes[0]["version"], 0, "create at version 1")
	assert.InDelta(t, float64(2), changes[2]["version"], 0, "account update at version 2")

	// --- Delete via push: in-use guard, then tombstone ---
	categoryDeleteOp := "eeeeeee1-0000-4000-8000-000000000001"
	results = push(t, c, []map[string]any{
		{
			"opId": categoryDeleteOp, "entity": "category", "action": "delete",
			"id": categoryID, "baseVersion": 1,
		},
	})
	require.Len(t, results, 1)
	assert.Equal(t, "error", results[0]["status"], "referenced by a live transaction")
	assert.Equal(t, "CATEGORY_IN_USE", results[0]["code"])

	// Delete the transaction first (unborn on the server? no - confirmed, so a
	// real tombstone), then the category delete succeeds.
	txnDeleteOp := "eeeeeee2-0000-4000-8000-000000000002"
	results = push(t, c, []map[string]any{
		{"opId": txnDeleteOp, "entity": "transaction", "action": "delete", "id": txnID, "baseVersion": 1},
	})
	require.Len(t, results, 1)
	assert.Equal(t, "applied", results[0]["status"])
	assert.InDelta(t, float64(2), results[0]["version"], 0, "tombstone bumps the version")

	results = push(t, c, []map[string]any{
		{
			"opId":        "eeeeeee3-0000-4000-8000-000000000003",
			"entity":      "category",
			"action":      "delete",
			"id":          categoryID,
			"baseVersion": 1,
		},
	})
	assert.Equal(t, "applied", results[0]["status"])

	// Delete x delete is idempotent.
	results = push(t, c, []map[string]any{
		{
			"opId":        "eeeeeee4-0000-4000-8000-000000000004",
			"entity":      "category",
			"action":      "delete",
			"id":          categoryID,
			"baseVersion": 2,
		},
	})
	assert.Equal(t, "applied", results[0]["status"])

	// Pushing an update onto the tombstoned record -> deleted conflict.
	results = push(t, c, []map[string]any{
		{
			"opId": "eeeeeee5-0000-4000-8000-000000000005", "entity": "category", "action": "upsert",
			"id": categoryID, "baseVersion": 1,
			"data": map[string]any{"name": "Продукты", "type": "expense", "icon": "cart", "color": "#000000"},
		},
	})
	assert.Equal(t, "conflict", results[0]["status"])
	assert.Equal(t, "SYNC_DELETED_CONFLICT", results[0]["code"])
	serverState, ok = results[0]["serverState"].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, true, serverState["deleted"])

	// Listings exclude the tombstones.
	list = c.do("GET", "/api/categories", nil)
	body, _ := list["__body"].(string)
	assert.NotContains(t, body, categoryID)
	list = c.do("GET", "/api/transactions", nil)
	body, _ = list["__body"].(string)
	assert.NotContains(t, body, txnID)

	// --- Pull delivers tombstones with their final versions ---
	changes, cursor = pullAll(t, c, cursor)
	tombstones := map[string]map[string]any{}
	for _, change := range changes {
		if change["action"] == "tombstone" {
			tombstones[change["id"].(string)] = change
		}
	}
	assert.Len(t, tombstones, 2, "transaction + category tombstones")
	require.NotNil(t, tombstones[txnID])
	assert.InDelta(t, float64(2), tombstones[txnID]["version"], 0)
	require.NotNil(t, tombstones[categoryID])
	assert.InDelta(t, float64(2), tombstones[categoryID]["version"], 0)

	// Caught up: another pull returns nothing and a null cursor.
	resp = c.do("GET", "/api/sync/pull?cursor="+formatFloat(cursor), nil)
	require.Equal(t, 200, resp["__status"])
	assert.Empty(t, resp["changes"])
	assert.Nil(t, resp["nextCursor"], "nextCursor is null when caught up")
}

func TestE2E_SyncPullIncludesSeededCategoriesWhenEnabled(t *testing.T) {
	if testing.Short() {
		t.Skip("e2e requires Postgres")
	}

	c := &client{t: t, jar: map[string]string{}}
	resp := c.do(
		"POST",
		"/api/auth/register",
		map[string]any{"email": uniqueEmail(), "password": "supersecret1", "seedCategories": true},
	)
	require.Equal(t, 201, resp["__status"], resp["__body"])

	changes, _ := pullAll(t, c, 0)
	require.NotEmpty(t, changes, "seeded registrations expose their categories via the change feed")
	for _, change := range changes {
		assert.Equal(t, "category", change["entity"])
		assert.Equal(t, "upsert", change["action"])
		assert.InDelta(t, float64(1), change["version"], 0)
	}
}

func TestE2E_RestTombstonesFeedTheChangeLog(t *testing.T) {
	if testing.Short() {
		t.Skip("e2e requires Postgres")
	}

	c := &client{t: t, jar: map[string]string{}}
	resp := c.do(
		"POST",
		"/api/auth/register",
		map[string]any{"email": uniqueEmail(), "password": "supersecret1", "seedCategories": true},
	)
	require.Equal(t, 201, resp["__status"], resp["__body"])
	_, cursor := pullAll(t, c, 0) // consume the seeds

	// REST create carries the client id and lands in the change log.
	accountID := "77777777-7777-4777-8777-777777777777"
	created := c.do("POST", "/api/accounts", map[string]any{
		"id": accountID, "name": "Наличные", "currency": "USD", "openingBalance": 5000,
	})
	require.Equal(t, 201, created["__status"], created["__body"])

	changes, _ := pullAll(t, c, cursor)
	require.Len(t, changes, 1)
	assert.Equal(t, "account", changes[0]["entity"])
	assert.Equal(t, accountID, changes[0]["id"])
	assert.Equal(t, "upsert", changes[0]["action"])

	// REST delete -> tombstone change; the account leaves listings/balances.
	_, cursor = pullAll(t, c, 0)
	deleted := c.do("DELETE", "/api/accounts/"+accountID, nil)
	require.Equal(t, 204, deleted["__status"])

	changes, _ = pullAll(t, c, cursor)
	require.Len(t, changes, 1)
	assert.Equal(t, "tombstone", changes[0]["action"])

	list := c.do("GET", "/api/accounts", nil)
	body, _ := list["__body"].(string)
	assert.NotContains(t, body, accountID)
}

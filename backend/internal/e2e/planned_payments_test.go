package e2e_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Planned payments e2e: REST CRUD semantics (client ids, legal duplicate
// names, ref validation with type matching, anchor reset on next_due change,
// unguarded delete) plus the sync edges of the add-planned-payments design
// D8 (opId replay, entity-id claims, delete-wins, deleted conflicts,
// per-item ref errors) and the account/category in-use guards.

func seedPlanAccount(t *testing.T, c *client) string {
	t.Helper()
	resp := c.do(
		"POST",
		"/api/accounts",
		map[string]any{"name": "Карта", "currency": "RUB", "openingBalance": 0},
	)
	require.Equal(t, 201, resp["__status"], resp["__body"])
	return resp["id"].(string)
}

func seedPlanCategory(t *testing.T, c *client, name, typ string) string {
	t.Helper()
	resp := c.do(
		"POST",
		"/api/categories",
		map[string]any{"name": name, "type": typ, "icon": "x", "color": "#fff"},
	)
	require.Equal(t, 201, resp["__status"], resp["__body"])
	return resp["id"].(string)
}

func planBody(accountID, categoryID string) map[string]any {
	return map[string]any{
		"type": "expense", "amount": 59900, "name": "Netflix",
		"accountId": accountID, "categoryId": categoryID,
		"nextDue": "2026-09-05", "regularity": "monthly",
		"confirmMode": "manual", "reminder": "day_before", "note": "family",
	}
}

func TestE2E_PlannedPaymentsRestFlows(t *testing.T) {
	if testing.Short() {
		t.Skip("e2e requires Postgres")
	}

	c := &client{t: t, jar: map[string]string{}}
	resp := c.do(
		"POST",
		"/api/auth/register",
		map[string]any{"email": uniqueEmail(), "password": "supersecret1"},
	)
	require.Equal(t, 201, resp["__status"], resp["__body"])

	accountID := seedPlanAccount(t, c)
	categoryID := seedPlanCategory(t, c, "Подписки", "expense")
	planID := "77777777-7777-4777-8777-777777777777"

	// --- Create with a client id; anchor starts at next_due ---
	created := c.do(
		"POST",
		"/api/planned-payments",
		withID(planBody(accountID, categoryID), planID),
	)
	require.Equal(t, 201, created["__status"], created["__body"])
	assert.Equal(t, "2026-09-05", created["nextDue"])
	assert.Equal(t, "2026-09-05", created["anchorDate"])
	assert.InDelta(t, float64(1), created["version"], 0)

	// --- Duplicate client id -> 409; duplicate name is legal ---
	dup := c.do("POST", "/api/planned-payments", withID(planBody(accountID, categoryID), planID))
	require.Equal(t, 409, dup["__status"], dup["__body"])
	assert.Equal(t, "PLANNED_PAYMENT_ALREADY_EXISTS", dup["code"])

	sameName := c.do("POST", "/api/planned-payments", planBody(accountID, categoryID))
	require.Equal(
		t,
		201,
		sameName["__status"],
		sameName["__body"],
	) // two live Netflix plans are legal

	// --- Ref validation: unknown account / unknown category / type mismatch ---
	unknownAccount := c.do(
		"POST",
		"/api/planned-payments",
		planBody("99999999-9999-4999-8999-999999999999", categoryID),
	)
	require.Equal(t, 422, unknownAccount["__status"], unknownAccount["__body"])
	assert.Equal(t, "PLANNED_PAYMENT_ACCOUNT_NOT_FOUND", unknownAccount["code"])

	unknownCategory := c.do(
		"POST",
		"/api/planned-payments",
		planBody(accountID, "99999999-9999-4999-8999-999999999999"),
	)
	require.Equal(t, 422, unknownCategory["__status"])
	assert.Equal(t, "PLANNED_PAYMENT_CATEGORY_NOT_FOUND", unknownCategory["code"])

	incomeCategoryID := seedPlanCategory(t, c, "Зарплата", "income")
	mismatch := c.do("POST", "/api/planned-payments", planBody(accountID, incomeCategoryID))
	require.Equal(t, 422, mismatch["__status"], mismatch["__body"])
	assert.Equal(
		t,
		"PLANNED_PAYMENT_CATEGORY_NOT_FOUND",
		mismatch["code"],
		"type mismatch shares the category code",
	)

	// Past next_due is accepted (a plan may start out overdue).
	past := planBody(accountID, categoryID)
	past["nextDue"] = "2025-01-01"
	pastCreated := c.do("POST", "/api/planned-payments", past)
	require.Equal(t, 201, pastCreated["__status"], pastCreated["__body"])

	// --- PATCH: absent note keeps, empty string clears, null rejected ---
	updated := c.do(
		"PATCH",
		"/api/planned-payments/"+planID,
		map[string]any{"version": 1, "amount": 64900},
	)
	require.Equal(t, 200, updated["__status"], updated["__body"])
	assert.Equal(t, "family", updated["note"], "absent note keeps the value")
	assert.Equal(t, "2026-09-05", updated["anchorDate"], "amount change keeps the anchor")
	assert.InDelta(t, float64(64900), updated["amount"], 0)

	updated = c.do(
		"PATCH",
		"/api/planned-payments/"+planID,
		map[string]any{"version": 2, "nextDue": "2026-10-20"},
	)
	require.Equal(t, 200, updated["__status"], updated["__body"])
	assert.Equal(t, "2026-10-20", updated["anchorDate"], "next_due change resets the anchor")

	nullNote := c.do(
		"PATCH",
		"/api/planned-payments/"+planID,
		map[string]any{"version": 3, "note": nil},
	)
	require.Equal(t, 400, nullNote["__status"], nullNote["__body"])

	stale := c.do(
		"PATCH",
		"/api/planned-payments/"+planID,
		map[string]any{"version": 1, "note": "stale"},
	)
	require.Equal(t, 409, stale["__status"])
	assert.Equal(t, "PLANNED_PAYMENT_VERSION_CONFLICT", stale["code"])

	empty := c.do("PATCH", "/api/planned-payments/"+planID, map[string]any{"version": 3})
	require.Equal(t, 400, empty["__status"], empty["__body"])

	// --- In-use guards: live plans block account/category deletion ---
	accountInUse := c.do("DELETE", "/api/accounts/"+accountID, nil)
	require.Equal(t, 409, accountInUse["__status"], accountInUse["__body"])
	assert.Equal(t, "ACCOUNT_IN_USE", accountInUse["code"])

	categoryInUse := c.do("DELETE", "/api/categories/"+categoryID, nil)
	require.Equal(t, 409, categoryInUse["__status"], categoryInUse["__body"])
	assert.Equal(t, "CATEGORY_IN_USE", categoryInUse["code"])

	// --- Unguarded plan delete; guards clear once no live plans remain ---
	del := c.do("DELETE", "/api/planned-payments/"+planID, nil)
	require.Equal(t, 204, del["__status"])
	sameNameID := sameName["id"].(string)
	deleteAllPlans(t, c, sameNameID, pastCreated["id"].(string))

	accountGone := c.do("DELETE", "/api/accounts/"+accountID, nil)
	require.Equal(t, 204, accountGone["__status"], accountGone["__body"])
	categoryGone := c.do("DELETE", "/api/categories/"+categoryID, nil)
	require.Equal(t, 204, categoryGone["__status"], categoryGone["__body"])

	// Tombstoned reads classify as not-found.
	gone := c.do("GET", "/api/planned-payments/"+planID, nil)
	require.Equal(t, 404, gone["__status"])
	gone = c.do("DELETE", "/api/planned-payments/"+planID, nil)
	require.Equal(t, 404, gone["__status"])
}

func TestE2E_PlannedPaymentsSyncFlows(t *testing.T) {
	if testing.Short() {
		t.Skip("e2e requires Postgres")
	}

	c := &client{t: t, jar: map[string]string{}}
	resp := c.do(
		"POST",
		"/api/auth/register",
		map[string]any{"email": uniqueEmail(), "password": "supersecret1"},
	)
	require.Equal(t, 201, resp["__status"], resp["__body"])

	// Seed live refs via REST, then go "offline": everything else goes through
	// the sync surface.
	accountID := seedPlanAccount(t, c)
	categoryID := seedPlanCategory(t, c, "Развлечения", "expense")
	_, cursor := pullAll(t, c, 0)

	planID := "88888888-7777-4777-8777-777777777777"
	createOp := "88888888-8888-4888-8888-888888888888"
	planData := func(nextDue string) map[string]any {
		return map[string]any{
			"type": "expense", "amount": 59900, "name": "Netflix",
			"accountId": accountID, "categoryId": categoryID,
			"nextDue": nextDue, "anchorDate": "2026-09-05",
			"regularity": "monthly", "confirmMode": "auto",
			"reminder": "off", "note": "",
		}
	}

	// --- Offline create converges ---
	results := push(t, c, []map[string]any{
		{
			"opId": createOp, "entity": "planned_payment", "action": "upsert", "id": planID, "baseVersion": 0,
			"data": planData("2026-09-05"),
		},
	})
	require.Len(t, results, 1)
	assert.Equal(t, "applied", results[0]["status"], "%v", results[0])
	assert.InDelta(t, float64(1), results[0]["version"], 0)

	// The plan is visible over REST under its client id and the wire keeps
	// calendar dates.
	got := c.do("GET", "/api/planned-payments/"+planID, nil)
	require.Equal(t, 200, got["__status"], got["__body"])
	assert.Equal(t, "2026-09-05", got["nextDue"])
	assert.Equal(t, "2026-09-05", got["anchorDate"])

	// --- opId replay returns the stored result; a different opId claiming
	// the same entity id is a conflict ---
	results = push(t, c, []map[string]any{
		{
			"opId": createOp, "entity": "planned_payment", "action": "upsert", "id": planID, "baseVersion": 0,
			"data": planData("2026-09-05"),
		},
	})
	require.Len(t, results, 1)
	assert.Equal(t, "applied", results[0]["status"])

	results = push(t, c, []map[string]any{
		{
			"opId": "88888888-9999-4999-8999-999999999999", "entity": "planned_payment", "action": "upsert",
			"id": planID, "baseVersion": 0, "data": planData("2026-09-05"),
		},
	})
	require.Len(t, results, 1)
	assert.Equal(t, "conflict", results[0]["status"])
	assert.Equal(t, "SYNC_ALREADY_EXISTS", results[0]["code"])

	// --- Update under CAS, then delete-wins with a stale baseVersion ---
	updateOp := "88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
	results = push(t, c, []map[string]any{
		{
			"opId": updateOp, "entity": "planned_payment", "action": "upsert", "id": planID, "baseVersion": 1,
			"data": planData("2026-12-05"),
		},
	})
	require.Len(t, results, 1)
	assert.Equal(t, "applied", results[0]["status"])
	assert.InDelta(t, float64(2), results[0]["version"], 0)

	deleteOp := "88888888-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
	results = push(t, c, []map[string]any{
		{
			"opId":        deleteOp,
			"entity":      "planned_payment",
			"action":      "delete",
			"id":          planID,
			"baseVersion": 1,
		},
	})
	require.Len(t, results, 1)
	assert.Equal(t, "applied", results[0]["status"], "delete-wins over a concurrent edit")
	assert.InDelta(t, float64(3), results[0]["version"], 0)

	// Upsert onto the tombstone -> deleted conflict.
	results = push(t, c, []map[string]any{
		{
			"opId": "88888888-cccc-4ccc-8ccc-cccccccccccc", "entity": "planned_payment", "action": "upsert",
			"id": planID, "baseVersion": 3, "data": planData("2026-12-05"),
		},
	})
	require.Len(t, results, 1)
	assert.Equal(t, "conflict", results[0]["status"])
	assert.Equal(t, "SYNC_DELETED_CONFLICT", results[0]["code"])

	// --- Plan referencing a server-deleted category: per-item error, batch
	// intact ---
	deletedCategoryPlan := "88888888-dddd-4ddd-8ddd-dddddddddddd"
	freshCategoryID := seedPlanCategory(t, c, "Другое", "expense")
	freshPlan := planData("2026-11-05")
	freshPlan["categoryId"] = freshCategoryID

	// Delete the fresh category via sync (no plans reference it yet).
	results = push(t, c, []map[string]any{
		{
			"opId":        "88888888-eeee-4eee-8eee-eeeeeeeeeeee",
			"entity":      "category",
			"action":      "delete",
			"id":          freshCategoryID,
			"baseVersion": 1,
		},
		{
			"opId": "88888888-ffff-4fff-8fff-ffffffffffff", "entity": "planned_payment", "action": "upsert",
			"id": deletedCategoryPlan, "baseVersion": 0, "data": freshPlan,
		},
	})
	require.Len(t, results, 2)
	assert.Equal(t, "applied", results[0]["status"], "%v", results[0])
	assert.Equal(t, "error", results[1]["status"])
	assert.Equal(t, "PLANNED_PAYMENT_CATEGORY_NOT_FOUND", results[1]["code"])

	// --- Plan referencing an archived category: per-item error (push
	// validation parity with the REST surface; a live category is
	// non-deleted AND non-archived) ---
	archivedCategoryID := seedPlanCategory(t, c, "Архив", "expense")
	archived := c.do("PATCH", "/api/categories/"+archivedCategoryID,
		map[string]any{"version": 1, "archived": true})
	require.Equal(t, 200, archived["__status"], archived["__body"])

	archivedPlan := planData("2026-11-15")
	archivedPlan["categoryId"] = archivedCategoryID
	results = push(t, c, []map[string]any{
		{
			"opId": "88888888-abcd-4abc-8abc-abcabcabcabc", "entity": "planned_payment", "action": "upsert",
			"id": "88888888-abce-4abc-8abc-abcabcabcabc", "baseVersion": 0, "data": archivedPlan,
		},
	})
	require.Len(t, results, 1)
	assert.Equal(t, "error", results[0]["status"], "%v", results[0])
	assert.Equal(t, "PLANNED_PAYMENT_CATEGORY_ARCHIVED", results[0]["code"])

	// --- Pull delivers planned-payment upserts and tombstones ---
	changes, _ := pullAll(t, c, cursor)
	var planUpserts, planTombstones int
	for _, change := range changes {
		if change["entity"] != "planned_payment" {
			continue
		}
		switch change["action"] {
		case "upsert":
			planUpserts++
		case "tombstone":
			planTombstones++
		}
	}
	assert.Equal(t, 2, planUpserts, "create + update")
	assert.Equal(t, 1, planTombstones)
}

func withID(body map[string]any, id string) map[string]any {
	body["id"] = id
	return body
}

func deleteAllPlans(t *testing.T, c *client, ids ...string) {
	t.Helper()
	for _, id := range ids {
		resp := c.do("DELETE", "/api/planned-payments/"+id, nil)
		if resp["__status"] != 204 {
			t.Fatalf("delete plan %s: %v %v", id, resp["__status"], resp["__body"])
		}
	}
}

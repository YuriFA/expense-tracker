package e2e_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Adjustment transactions e2e: the fourth transaction type reconciles an
// account balance with a signed amount (no category, no transfer refs),
// flows through the usual REST CRUD + listing filter, and accounts no longer
// carry a manual adjustment field.

// doPostTransaction is client.do for a transaction create (the endpoint
// requires an Idempotency-Key header).
func (c *client) doPostTransaction(body any, idempotencyKey string) map[string]any {
	c.t.Helper()
	b, err := json.Marshal(body)
	require.NoError(c.t, err)
	req := httptest.NewRequest(http.MethodPost, "/api/transactions", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", idempotencyKey)
	for k, v := range c.jar {
		req.AddCookie(&http.Cookie{Name: k, Value: v})
	}
	w := httptest.NewRecorder()
	e2eEngine.ServeHTTP(w, req)
	for _, sc := range w.Result().Cookies() {
		if sc.Value != "" {
			c.jar[sc.Name] = sc.Value
		} else {
			delete(c.jar, sc.Name)
		}
	}
	resp := map[string]any{}
	if w.Body.Len() > 0 {
		_ = json.Unmarshal(w.Body.Bytes(), &resp)
	}
	resp["__status"] = w.Code
	resp["__body"] = w.Body.String()
	return resp
}

func TestE2E_AdjustmentTransactions(t *testing.T) {
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

	accountID := "88888888-8888-4888-8888-888888888888"
	created := c.do("POST", "/api/accounts", map[string]any{
		"id": accountID, "name": "Наличные", "currency": "USD", "openingBalance": 12000,
	})
	require.Equal(t, 201, created["__status"], created["__body"])

	accountBalance := func() int64 {
		t.Helper()
		list := c.do("GET", "/api/accounts", nil)
		var accounts []map[string]any
		require.NoError(t, json.Unmarshal([]byte(list["__body"].(string)), &accounts), list["__body"])
		for _, m := range accounts {
			if m["id"] == accountID {
				return int64(m["balance"].(float64))
			}
		}
		t.Fatal("account not found in listing")
		return 0
	}

	require.Equal(t, int64(12000), accountBalance())

	// Shape: a category or a transfer pair on an adjustment is rejected.
	catCreated := c.do("POST", "/api/categories", map[string]any{
		"name": "Пополнение", "type": "income", "icon": "💼", "color": "#7c3aed",
	})
	require.Equal(t, 201, catCreated["__status"], catCreated["__body"])
	var category struct {
		ID string `json:"id"`
	}
	require.NoError(t, json.Unmarshal([]byte(catCreated["__body"].(string)), &category), catCreated["__body"])
	categoryID := category.ID

	bad := c.doPostTransaction(map[string]any{
		"type": "adjustment", "amount": -500, "occurredAt": "2026-09-01T10:00:00Z",
		"accountId": accountID, "categoryId": categoryID,
	}, "adj-bad-1")
	require.Equal(t, 422, bad["__status"], bad["__body"])
	assert.Equal(t, "INVALID_REFS", bad["code"])

	bad = c.doPostTransaction(map[string]any{
		"type": "adjustment", "amount": 0, "occurredAt": "2026-09-01T10:00:00Z",
		"accountId": accountID,
	}, "adj-bad-2")
	require.Equal(t, 422, bad["__status"], bad["__body"])
	assert.Equal(t, "INVALID_AMOUNT", bad["code"])

	// Positive-only rule still applies to the classic types.
	bad = c.doPostTransaction(map[string]any{
		"type": "expense", "amount": -300, "occurredAt": "2026-09-01T10:00:00Z",
		"accountId": accountID, "categoryId": categoryID,
	}, "adj-bad-3")
	require.Equal(t, 422, bad["__status"], bad["__body"])
	assert.Equal(t, "INVALID_AMOUNT", bad["code"])

	// Create: a negative delta lowers the balance by its signed amount.
	adj := c.doPostTransaction(map[string]any{
		"type": "adjustment", "amount": -500, "description": "сверка наличных",
		"occurredAt": "2026-09-01T10:00:00Z", "accountId": accountID,
	}, "adj-create-1")
	require.Equal(t, 201, adj["__status"], adj["__body"])
	assert.Equal(t, "adjustment", adj["type"])
	assert.EqualValues(t, -500, adj["amount"])
	assert.Nil(t, adj["categoryId"])
	adjID := adj["id"].(string)
	require.Equal(t, int64(11500), accountBalance())

	// Update the delta: the balance follows.
	version := int(adj["version"].(float64))
	updated := c.do("PATCH", "/api/transactions/"+adjID, map[string]any{
		"amount": -700, "version": version,
	})
	require.Equal(t, 200, updated["__status"], updated["__body"])
	require.Equal(t, int64(11300), accountBalance())

	// A second (positive) adjustment stacks, it does not replace.
	adj2 := c.doPostTransaction(map[string]any{
		"type": "adjustment", "amount": 200, "occurredAt": "2026-09-01T11:00:00Z",
		"accountId": accountID,
	}, "adj-create-2")
	require.Equal(t, 201, adj2["__status"], adj2["__body"])
	require.Equal(t, int64(11500), accountBalance())

	// Listing includes adjustments unfiltered and via the type filter.
	list := c.do("GET", "/api/transactions", nil)
	txns, _ := list["transactions"].([]any)
	require.Len(t, txns, 2)

	filtered := c.do("GET", "/api/transactions?type=adjustment", nil)
	txns, _ = filtered["transactions"].([]any)
	require.Len(t, txns, 2)

	filtered = c.do("GET", "/api/transactions?type=expense", nil)
	txns, _ = filtered["transactions"].([]any)
	require.Empty(t, txns)

	// Delete restores the balance contribution.
	del := c.do("DELETE", "/api/transactions/"+adjID, nil)
	require.Equal(t, 204, del["__status"])
	require.Equal(t, int64(12200), accountBalance())
}

func TestE2E_AccountUpdateNameOnly(t *testing.T) {
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

	accountID := "99999999-9999-4999-8999-999999999999"
	created := c.do("POST", "/api/accounts", map[string]any{
		"id": accountID, "name": "Карта", "currency": "RUB", "openingBalance": 10000,
	})
	require.Equal(t, 201, created["__status"], created["__body"])
	assert.NotContains(t, created["__body"], "manualAdjustment")
	version := int(created["version"].(float64))

	// No fields -> rejected.
	noFields := c.do("PATCH", "/api/accounts/"+accountID, map[string]any{"version": version})
	require.Equal(t, 400, noFields["__status"], noFields["__body"])

	// Stale version -> conflict.
	stale := c.do("PATCH", "/api/accounts/"+accountID, map[string]any{"name": "Новое имя", "version": version + 5})
	require.Equal(t, 409, stale["__status"], stale["__body"])
	assert.Equal(t, "ACCOUNT_VERSION_CONFLICT", stale["code"])

	// Name-only update works and keeps the balance.
	renamed := c.do("PATCH", "/api/accounts/"+accountID, map[string]any{"name": "Карта основная", "version": version})
	require.Equal(t, 200, renamed["__status"], renamed["__body"])
	assert.Equal(t, "Карта основная", renamed["name"])
	assert.EqualValues(t, 10000, renamed["balance"])
}

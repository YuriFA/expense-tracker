package http_test

import (
	"context"
	"log/slog"
	"net/http"
	"slices"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// captureHandler records every log record's message and attrs so tests can
// assert on the sync metrics feed emitted by the handlers.
type captureHandler struct {
	mu      sync.Mutex
	records []map[string]any
}

func (h *captureHandler) Enabled(_ context.Context, _ slog.Level) bool { return true }

func (h *captureHandler) Handle(_ context.Context, r slog.Record) error {
	entry := map[string]any{"msg": r.Message}
	r.Attrs(func(a slog.Attr) bool {
		entry[a.Key] = a.Value.Any()
		return true
	})
	h.mu.Lock()
	defer h.mu.Unlock()
	h.records = append(h.records, entry)
	return nil
}

func (h *captureHandler) WithAttrs(_ []slog.Attr) slog.Handler { return h }
func (h *captureHandler) WithGroup(_ string) slog.Handler      { return h }

// find returns the last record with the given message, or nil.
func (h *captureHandler) find(message string) map[string]any {
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, entry := range slices.Backward(h.records) {
		if entry["msg"] == message {
			return entry
		}
	}
	return nil
}

// The sync handlers emit structured metrics events (the dashboard feed):
// per-batch status counts, the conflict rate, and the conflict-code breakdown
// on push; page shape on pull. Both carry user_id and request_id for joining
// with the request log.
func TestTransport_SyncMetricsLogEvents(t *testing.T) {
	t.Parallel()

	capture := &captureHandler{}
	engine := newTestEngineWithLogger(t, slog.New(capture))
	client := newClient(t, engine)

	rec := client.do(
		"POST",
		"/api/auth/register",
		map[string]any{"email": "metrics@example.com", "password": "supersecret1"},
		nil,
	)
	require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())

	accountID := "33333333-3333-4333-8333-333333333333"
	rec = client.do(
		"POST",
		"/api/sync/push",
		map[string]any{"operations": []map[string]any{
			{
				"opId": "ccccccc1-0000-4000-8000-000000000001", "entity": "account", "action": "upsert",
				"id": accountID, "baseVersion": 0,
				"data": map[string]any{"name": "Карта", "currency": "RUB", "openingBalance": 0, "manualAdjustment": 0},
			},
			{
				"opId": "ccccccc2-0000-4000-8000-000000000002", "entity": "account", "action": "upsert",
				"id": accountID, "baseVersion": 9,
				"data": map[string]any{"name": "Другая", "currency": "RUB", "openingBalance": 0, "manualAdjustment": 0},
			},
			{
				"opId": "ccccccc3-0000-4000-8000-000000000003", "entity": "transaction", "action": "upsert",
				"id": "44444444-4444-4444-8444-444444444444", "baseVersion": 0,
				"data": map[string]any{
					"type": "expense", "amount": 100, "description": "", "occurredAt": "2026-08-16T12:00:00Z",
					"accountId": "55555555-5555-4555-8555-555555555555",
				},
			},
		}},
		nil,
	)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var pushBody struct {
		Results []map[string]any `json:"results"`
	}
	decode(t, rec, &pushBody)
	results := pushBody.Results
	require.Len(t, results, 3)
	assert.Equal(t, "applied", results[0]["status"])
	assert.Equal(t, "conflict", results[1]["status"])
	assert.Equal(t, "SYNC_VERSION_CONFLICT", results[1]["code"])
	assert.Equal(t, "error", results[2]["status"])

	pushMetrics := capture.find("sync push metrics")
	require.NotNil(t, pushMetrics, "push handler must emit a metrics event")
	assert.EqualValues(t, 3, pushMetrics["operations"])
	assert.EqualValues(t, 1, pushMetrics["applied"])
	assert.EqualValues(t, 1, pushMetrics["conflicts"])
	assert.EqualValues(t, 1, pushMetrics["errors"])
	assert.InDelta(t, 1.0/3.0, pushMetrics["conflict_rate"], 1e-9)
	assert.Equal(t, map[string]int{"SYNC_VERSION_CONFLICT": 1}, pushMetrics["conflict_codes"])
	assert.NotEmpty(t, pushMetrics["user_id"])
	assert.NotEmpty(t, pushMetrics["request_id"])

	rec = client.do("GET", "/api/sync/pull?cursor=0", nil, nil)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	pullMetrics := capture.find("sync pull metrics")
	require.NotNil(t, pullMetrics, "pull handler must emit a metrics event")
	assert.Equal(t, int64(0), pullMetrics["cursor"])
	assert.EqualValues(t, 1, pullMetrics["changes"])
	assert.EqualValues(t, 0, pullMetrics["tombstones"])
	assert.Equal(t, true, pullMetrics["caught_up"])
	assert.NotEmpty(t, pullMetrics["user_id"])
	assert.NotEmpty(t, pullMetrics["request_id"])
}

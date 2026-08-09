package http_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/yurifa/expense-tracker-api/internal/config"
	"github.com/yurifa/expense-tracker-api/internal/logger"
	"github.com/yurifa/expense-tracker-api/internal/service"
	"github.com/yurifa/expense-tracker-api/internal/service/fakes"
	httptransport "github.com/yurifa/expense-tracker-api/internal/transport/http"
)

func newTestEngine(t *testing.T) (*gin.Engine, *fakes.Store) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	log := logger.NewDiscardLogger()
	store := fakes.New()
	authSvc := service.NewAuthService(store, store, store, store, service.NewLogMailer(log), service.AuthConfig{SessionTTL: time.Hour})
	accountSvc := service.NewAccountService(store)
	categorySvc := service.NewCategoryService(store)
	txnSvc := service.NewTransactionService(store, store, store)
	sessionSvc := service.NewSessionService(store)

	server := httptransport.NewServer(log, testHTTPConfig(), accountSvc, categorySvc, txnSvc, authSvc, sessionSvc)
	engine := httptransport.NewEngine(testHTTPConfig(), log, server, store, store, store)
	return engine, store
}

func testHTTPConfig() *config.HTTPServer {
	return &config.HTTPServer{
		Address:         "127.0.0.1:0",
		CorsConfig:      config.CORSConfig{AllowedOrigins: []string{"*"}, AllowedMethods: []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"}, AllowedHeaders: []string{"Content-Type"}},
		SessionConfig:   config.SessionConfig{TTL: time.Hour, CookieName: "session_id", Secure: false, SameSite: "lax", SlidingExpiration: true},
		FailureRateLimit: config.FailureRateLimit{MaxAttempts: 100, LockoutDuration: time.Minute},
	}
}

type apiClient struct {
	t   *testing.T
	jar map[string]string
	h   http.Handler
}

func (c *apiClient) do(method, path string, body any, extraHeaders map[string]string) *httptest.ResponseRecorder {
	c.t.Helper()
	var rdr io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		require.NoError(c.t, err)
		rdr = bytes.NewReader(b)
	}
	req := httptest.NewRequest(method, path, rdr)
	req.Header.Set("Content-Type", "application/json")
	for k, v := range c.jar {
		req.AddCookie(&http.Cookie{Name: k, Value: v})
	}
	for k, v := range extraHeaders {
		req.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	c.h.ServeHTTP(w, req)
	for _, sc := range w.Result().Cookies() {
		if sc.Value != "" {
			c.jar[sc.Name] = sc.Value
		} else {
			delete(c.jar, sc.Name)
		}
	}
	return w
}

func newClient(t *testing.T, h http.Handler) *apiClient {
	return &apiClient{t: t, jar: map[string]string{}, h: h}
}

func decode(t *testing.T, rec *httptest.ResponseRecorder, v any) {
	t.Helper()
	require.NoErrorf(t, json.Unmarshal(rec.Body.Bytes(), v), "body: %s", rec.Body.String())
}

func TestTransport_RegisterLoginCreateFlow(t *testing.T) {
	engine, _ := newTestEngine(t)
	client := newClient(t, engine)

	// Register -> 201 + session cookie.
	rec := client.do("POST", "/api/auth/register", map[string]string{"email": "flow@example.com", "password": "supersecret1"}, nil)
	require.Equal(t, 201, rec.Code, rec.Body.String())
	require.NotEmpty(t, client.jar["session_id"], "register sets a session cookie")

	// Me -> 200 (auth works).
	rec = client.do("GET", "/api/auth/me", nil, nil)
	require.Equal(t, 200, rec.Code, rec.Body.String())

	// Create account.
	rec = client.do("POST", "/api/accounts", map[string]any{"name": "Wallet", "currency": "USD", "openingBalance": 10000}, nil)
	require.Equal(t, 201, rec.Code, rec.Body.String())
	var acct map[string]any
	decode(t, rec, &acct)
	assert.Equal(t, float64(10000), acct["balance"])
	accountID := acct["id"].(string)

	// Seed categories include income ones.
	rec = client.do("GET", "/api/categories?type=income", nil, nil)
	require.Equal(t, 200, rec.Code, rec.Body.String())
	var cats []map[string]any
	decode(t, rec, &cats)
	require.NotEmpty(t, cats)
	catID := cats[0]["id"].(string)

	// Create transaction referencing the account + category (idempotent).
	rec = client.do("POST", "/api/transactions", map[string]any{
		"type": "income", "amount": 5000, "description": "pay", "occurredAt": "2026-01-15T10:00:00Z",
		"accountId": accountID, "categoryId": catID,
	}, map[string]string{"Idempotency-Key": "k-1"})
	require.Equal(t, 201, rec.Code, rec.Body.String())

	// Idempotency replay: same key + body -> 201 (replayed).
	rec = client.do("POST", "/api/transactions", map[string]any{
		"type": "income", "amount": 5000, "description": "pay", "occurredAt": "2026-01-15T10:00:00Z",
		"accountId": accountID, "categoryId": catID,
	}, map[string]string{"Idempotency-Key": "k-1"})
	require.Equal(t, 201, rec.Code, rec.Body.String())

	// Balance now reflects the income.
	rec = client.do("GET", "/api/accounts/"+accountID, nil, nil)
	require.Equal(t, 200, rec.Code, rec.Body.String())
	decode(t, rec, &acct)
	assert.Equal(t, float64(15000), acct["balance"])
}

func TestTransport_UnauthReturns401(t *testing.T) {
	engine, _ := newTestEngine(t)
	client := newClient(t, engine)
	rec := client.do("GET", "/api/accounts", nil, nil)
	assert.Equal(t, 401, rec.Code, rec.Body.String())
}

func TestTransport_SpecValidationRejectsBadBody(t *testing.T) {
	engine, _ := newTestEngine(t)
	client := newClient(t, engine)

	_ = client.do("POST", "/api/auth/register", map[string]string{"email": "v@example.com", "password": "supersecret1"}, nil)

	// Account create missing required openingBalance -> 400 validation.
	rec := client.do("POST", "/api/accounts", map[string]any{"name": "X", "currency": "USD"}, nil)
	assert.Equal(t, 400, rec.Code, rec.Body.String())
}

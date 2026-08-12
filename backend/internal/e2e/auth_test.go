package e2e_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type client struct {
	t   *testing.T
	jar map[string]string
}

func (c *client) do(method, path string, body any) map[string]any {
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
	w := httptest.NewRecorder()
	e2eEngine.ServeHTTP(w, req)
	for _, sc := range w.Result().Cookies() {
		if sc.Value != "" {
			c.jar[sc.Name] = sc.Value
		} else {
			delete(c.jar, sc.Name)
		}
	}
	var resp = map[string]any{}
	if w.Body.Len() > 0 {
		_ = json.Unmarshal(w.Body.Bytes(), &resp)
	}
	resp["__status"] = w.Code
	resp["__body"] = w.Body.String()
	return resp
}

func uniqueEmail() string {
	return "e2e-" + randString(8) + "@example.com"
}

func TestE2E_AuthFlows(t *testing.T) {
	if testing.Short() {
		t.Skip("requires Docker for testcontainers")
	}
	email := uniqueEmail()
	c := &client{t: t, jar: map[string]string{}}

	// Register -> 201 + cookie + verification code issued.
	r := c.do("POST", "/api/auth/register", map[string]string{"email": email, "password": "supersecret1"})
	require.Equal(t, 201, r["__status"], "%v", r["__body"])
	require.NotEmpty(t, c.jar["session_id"])

	// Me.
	r = c.do("GET", "/api/auth/me", nil)
	require.Equal(t, 200, r["__status"])
	assert.Equal(t, email, r["email"])
	assert.False(t, r["emailVerified"].(bool))

	// Verify email with the issued code.
	code := mailer.code(email)
	require.NotEmpty(t, code, "verification code was issued")
	r = c.do("POST", "/api/auth/verify-email", map[string]string{"code": code})
	require.Equal(t, 204, r["__status"], "%v", r["__body"])

	// Me again -> emailVerified true.
	r = c.do("GET", "/api/auth/me", nil)
	require.True(t, r["emailVerified"].(bool))

	// Verify again -> 409 already verified.
	r = c.do("POST", "/api/auth/verify-email", map[string]string{"code": "000000"})
	require.Equal(t, 409, r["__status"])
}

func TestE2E_SessionsListAndRevoke(t *testing.T) {
	if testing.Short() {
		t.Skip("requires Docker for testcontainers")
	}
	email := uniqueEmail()
	c1 := &client{t: t, jar: map[string]string{}}
	r := c1.do("POST", "/api/auth/register", map[string]string{"email": email, "password": "supersecret1"})
	require.Equal(t, 201, r["__status"])

	// Second session (login from another "device").
	c2 := &client{t: t, jar: map[string]string{}}
	r = c2.do("POST", "/api/auth/login", map[string]string{"email": email, "password": "supersecret1"})
	require.Equal(t, 200, r["__status"])

	// c1 lists sessions -> 2, one current.
	r = c1.do("GET", "/api/auth/sessions", nil)
	require.Equal(t, 200, r["__status"])
	sessions := r["__body"] // unused; decode via re-do
	_ = sessions
	list := doRaw(t, c1, "GET", "/api/auth/sessions", nil)
	arr := list.([]any)
	require.Len(t, arr, 2)

	// c1 revokes all others -> c2 is now invalid.
	r = c1.do("DELETE", "/api/auth/sessions", nil)
	require.Equal(t, 204, r["__status"])

	// c2's session is revoked -> me returns 401.
	r = c2.do("GET", "/api/auth/me", nil)
	require.Equal(t, 401, r["__status"])
}

func TestE2E_PasswordReset(t *testing.T) {
	if testing.Short() {
		t.Skip("requires Docker for testcontainers")
	}
	email := uniqueEmail()
	c := &client{t: t, jar: map[string]string{}}
	require.Equal(
		t,
		201,
		c.do("POST", "/api/auth/register", map[string]string{"email": email, "password": "supersecret1"})["__status"],
	)

	// Request reset -> 204 (anti-enumeration: always 204).
	r := c.do("POST", "/api/auth/password-reset/request", map[string]string{"email": email})
	require.Equal(t, 204, r["__status"])

	// Non-existent email also 204.
	r = c.do("POST", "/api/auth/password-reset/request", map[string]string{"email": "ghost@example.com"})
	require.Equal(t, 204, r["__status"])

	token := mailer.token(email)
	require.NotEmpty(t, token)

	// Confirm reset with wrong token -> 400.
	r = c.do(
		"POST",
		"/api/auth/password-reset/confirm",
		map[string]string{"token": "wrong", "newPassword": "newpass123"},
	)
	require.Equal(t, 400, r["__status"])

	// Confirm with the right token -> 204, sessions revoked.
	r = c.do("POST", "/api/auth/password-reset/confirm", map[string]string{"token": token, "newPassword": "newpass123"})
	require.Equal(t, 204, r["__status"])

	// Old session cookie is now invalid (sessions revoked).
	r = c.do("GET", "/api/auth/me", nil)
	require.Equal(t, 401, r["__status"])

	// Login with the NEW password works.
	r = c.do("POST", "/api/auth/login", map[string]string{"email": email, "password": "newpass123"})
	require.Equal(t, 200, r["__status"])
}

func TestE2E_LoginWrongPassword(t *testing.T) {
	if testing.Short() {
		t.Skip("requires Docker for testcontainers")
	}
	email := uniqueEmail()
	c := &client{t: t, jar: map[string]string{}}
	require.Equal(
		t,
		201,
		c.do("POST", "/api/auth/register", map[string]string{"email": email, "password": "supersecret1"})["__status"],
	)

	// Wrong password -> 401 invalid credentials.
	r := c.do("POST", "/api/auth/login", map[string]string{"email": email, "password": "nope"})
	require.Equal(t, 401, r["__status"])
	assert.Equal(t, "INVALID_CREDENTIALS", r["code"])
}

func TestE2E_Logout(t *testing.T) {
	if testing.Short() {
		t.Skip("requires Docker for testcontainers")
	}
	email := uniqueEmail()
	c := &client{t: t, jar: map[string]string{}}
	require.Equal(
		t,
		201,
		c.do("POST", "/api/auth/register", map[string]string{"email": email, "password": "supersecret1"})["__status"],
	)

	r := c.do("POST", "/api/auth/logout", nil)
	require.Equal(t, 204, r["__status"])
	require.Empty(t, c.jar["session_id"], "logout clears the cookie")

	// After logout, the session is revoked.
	r = c.do("GET", "/api/auth/me", nil)
	require.Equal(t, 401, r["__status"])
}

func doRaw(t *testing.T, c *client, method, path string, body any) any {
	t.Helper()
	var rdr io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		require.NoError(t, err)
		rdr = bytes.NewReader(b)
	}
	req := httptest.NewRequest(method, path, rdr)
	req.Header.Set("Content-Type", "application/json")
	for k, v := range c.jar {
		req.AddCookie(&http.Cookie{Name: k, Value: v})
	}
	w := httptest.NewRecorder()
	e2eEngine.ServeHTTP(w, req)
	var v any
	_ = json.Unmarshal(w.Body.Bytes(), &v)
	return v
}

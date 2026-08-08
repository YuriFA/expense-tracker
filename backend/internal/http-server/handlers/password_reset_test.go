package handlers_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/yurifa/expense-tracker-api/internal/auth"
	"github.com/yurifa/expense-tracker-api/internal/storage"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRequestPasswordReset(t *testing.T) {
	t.Parallel()

	t.Run("Issues token for existing email, 204", func(t *testing.T) {
		t.Parallel()
		router, db := setupTestEnv(t)
		user := seedUser(t, db, "test@example.com")

		req := newJSONRequest(t, http.MethodPost, "/api/auth/password-reset/request",
			map[string]any{"email": "test@example.com"})
		w := performRequest(t, router, req)
		assert.Equal(t, http.StatusNoContent, w.Code)

		_, exists, err := db.LatestPasswordResetTokenAgeSeconds(context.Background(), user.ID)
		require.NoError(t, err)
		assert.True(t, exists, "reset token should be created")
	})

	t.Run("Non-existent email also 204 (anti-enumeration)", func(t *testing.T) {
		t.Parallel()
		router, _ := setupTestEnv(t)

		req := newJSONRequest(t, http.MethodPost, "/api/auth/password-reset/request",
			map[string]any{"email": "nobody@example.com"})
		w := performRequest(t, router, req)
		assert.Equal(t, http.StatusNoContent, w.Code)
	})

	t.Run("Invalid email format returns 400", func(t *testing.T) {
		t.Parallel()
		router, _ := setupTestEnv(t)

		req := newJSONRequest(t, http.MethodPost, "/api/auth/password-reset/request",
			map[string]any{"email": "not-an-email"})
		w := performRequest(t, router, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestConfirmPasswordReset(t *testing.T) {
	t.Parallel()

	t.Run("Success changes password and revokes sessions", func(t *testing.T) {
		t.Parallel()
		router, db := setupTestEnv(t)

		regW := performRequest(t, router, newJSONRequest(t, http.MethodPost, "/api/auth/register", map[string]any{
			"email":    "test@example.com",
			"password": "oldpass123",
		}))
		require.Equal(t, http.StatusCreated, regW.Code)
		var user storage.User
		parseBody(t, regW, &user)
		require.Len(t, regW.Result().Cookies(), 1)
		regCookie := regW.Result().Cookies()[0]

		knownToken := "reset-token-value"
		require.NoError(t, db.CreatePasswordResetToken(
			context.Background(),
			user.ID,
			auth.HashToken(knownToken),
			time.Now().UTC().Add(storage.PasswordResetTokenTTL),
		))

		confReq := newJSONRequest(t, http.MethodPost, "/api/auth/password-reset/confirm", map[string]any{
			"token":       knownToken,
			"newPassword": "newpass123",
		})
		confW := performRequest(t, router, confReq)
		require.Equal(t, http.StatusNoContent, confW.Code)

		loginW := performRequest(t, router, newJSONRequest(t, http.MethodPost, "/api/auth/login", map[string]any{
			"email":    "test@example.com",
			"password": "newpass123",
		}))
		require.Equal(t, http.StatusOK, loginW.Code)

		oldLoginW := performRequest(t, router, newJSONRequest(t, http.MethodPost, "/api/auth/login", map[string]any{
			"email":    "test@example.com",
			"password": "oldpass123",
		}))
		require.Equal(t, http.StatusUnauthorized, oldLoginW.Code)

		meReq := newJSONRequest(t, http.MethodGet, "/api/auth/me", nil)
		meReq.AddCookie(regCookie)
		meW := performRequest(t, router, meReq)
		require.Equal(t, http.StatusUnauthorized, meW.Code)
	})

	t.Run("Invalid token returns 400", func(t *testing.T) {
		t.Parallel()
		router, _ := setupTestEnv(t)

		req := newJSONRequest(t, http.MethodPost, "/api/auth/password-reset/confirm", map[string]any{
			"token":       "nonexistent-token",
			"newPassword": "newpass123",
		})
		w := performRequest(t, router, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Invalid new password returns 400", func(t *testing.T) {
		t.Parallel()
		router, _ := setupTestEnv(t)

		req := newJSONRequest(t, http.MethodPost, "/api/auth/password-reset/confirm", map[string]any{
			"token":       "some-token",
			"newPassword": "short",
		})
		w := performRequest(t, router, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

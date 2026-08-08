package handlers_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/yurifa/expense-tracker-api/internal/storage"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seedVerifyCode(t *testing.T, f *authFixture, expiresAt time.Time) {
	t.Helper()
	require.NoError(t, f.DB.CreateEmailVerificationCode(
		context.Background(),
		f.User.ID,
		"123456",
		expiresAt,
	))
}

func TestVerifyEmail(t *testing.T) {
	t.Parallel()

	t.Run("Success marks email verified", func(t *testing.T) {
		t.Parallel()
		f := newAuthFixture(t)
		seedVerifyCode(t, f, time.Now().UTC().Add(storage.VerificationCodeTTL))

		w := f.do(t, http.MethodPost, "/api/auth/verify-email", map[string]any{"code": "123456"})
		require.Equal(t, http.StatusNoContent, w.Code)

		meW := f.do(t, http.MethodGet, "/api/auth/me", nil)
		require.Equal(t, http.StatusOK, meW.Code)
		var user storage.User
		parseBody(t, meW, &user)
		assert.True(t, user.EmailVerified)
	})

	t.Run("Wrong code returns 403", func(t *testing.T) {
		t.Parallel()
		f := newAuthFixture(t)
		seedVerifyCode(t, f, time.Now().UTC().Add(storage.VerificationCodeTTL))

		w := f.do(t, http.MethodPost, "/api/auth/verify-email", map[string]any{"code": "000000"})
		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("Expired code returns 400", func(t *testing.T) {
		t.Parallel()
		f := newAuthFixture(t)
		seedVerifyCode(t, f, time.Now().UTC().Add(-time.Minute))

		w := f.do(t, http.MethodPost, "/api/auth/verify-email", map[string]any{"code": "123456"})
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("No active code returns 400", func(t *testing.T) {
		t.Parallel()
		f := newAuthFixture(t)

		w := f.do(t, http.MethodPost, "/api/auth/verify-email", map[string]any{"code": "123456"})
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Already verified returns 409", func(t *testing.T) {
		t.Parallel()
		f := newAuthFixture(t)
		seedVerifyCode(t, f, time.Now().UTC().Add(storage.VerificationCodeTTL))
		require.NoError(t, f.DB.VerifyEmailCode(context.Background(), f.User.ID, "123456"))

		w := f.do(t, http.MethodPost, "/api/auth/verify-email", map[string]any{"code": "123456"})
		assert.Equal(t, http.StatusConflict, w.Code)
	})

	t.Run("Requires auth", func(t *testing.T) {
		t.Parallel()
		router, _ := setupTestEnv(t)

		req := newJSONRequest(t, http.MethodPost, "/api/auth/verify-email", map[string]any{"code": "123456"})
		w := performRequest(t, router, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("Brute-force locks after max attempts", func(t *testing.T) {
		t.Parallel()
		f := newAuthFixture(t)
		seedVerifyCode(t, f, time.Now().UTC().Add(storage.VerificationCodeTTL))

		for range storage.MaxVerificationAttempts {
			w := f.do(t, http.MethodPost, "/api/auth/verify-email", map[string]any{"code": "000000"})
			require.Equal(t, http.StatusForbidden, w.Code)
		}

		w := f.do(t, http.MethodPost, "/api/auth/verify-email", map[string]any{"code": "000000"})
		assert.Equal(t, http.StatusTooManyRequests, w.Code)
	})
}

func TestResendVerification(t *testing.T) {
	t.Parallel()

	t.Run("Issues code when none exists then throttles", func(t *testing.T) {
		t.Parallel()
		f := newAuthFixture(t)

		w := f.do(t, http.MethodPost, "/api/auth/verify-email/resend", nil)
		require.Equal(t, http.StatusNoContent, w.Code)

		w2 := f.do(t, http.MethodPost, "/api/auth/verify-email/resend", nil)
		assert.Equal(t, http.StatusTooManyRequests, w2.Code)
		assert.NotEmpty(t, w2.Result().Header.Get("Retry-After"))
	})

	t.Run("Already verified returns 409", func(t *testing.T) {
		t.Parallel()
		f := newAuthFixture(t)
		seedVerifyCode(t, f, time.Now().UTC().Add(storage.VerificationCodeTTL))
		require.NoError(t, f.DB.VerifyEmailCode(context.Background(), f.User.ID, "123456"))

		w := f.do(t, http.MethodPost, "/api/auth/verify-email/resend", nil)
		assert.Equal(t, http.StatusConflict, w.Code)
	})

	t.Run("Requires auth", func(t *testing.T) {
		t.Parallel()
		router, _ := setupTestEnv(t)

		req := newJSONRequest(t, http.MethodPost, "/api/auth/verify-email/resend", nil)
		w := performRequest(t, router, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

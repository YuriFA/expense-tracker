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

type sessionItem struct {
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
	ExpiresAt string `json:"expiresAt"`
	IsCurrent bool   `json:"isCurrent"`
}

func TestListSessions(t *testing.T) {
	t.Parallel()
	t.Run("Returns own active sessions with isCurrent and no token leak", func(t *testing.T) {
		t.Parallel()
		f := newAuthFixture(t)

		secondCookie := createSessionCookie(t, f.DB, f.User.ID)

		_, err := f.DB.CreateSession(context.Background(), storage.CreateSessionParams{
			SessionID: "expired-session",
			UserID:    f.User.ID,
			ExpiresAt: time.Now().Add(-time.Minute),
		})
		require.NoError(t, err)

		otherUser := seedUser(t, f.DB, "other@example.com")
		createSessionCookie(t, f.DB, otherUser.ID)

		w := f.do(t, http.MethodGet, "/api/auth/sessions", nil)
		require.Equal(t, http.StatusOK, w.Code)

		var items []sessionItem
		parseBody(t, w, &items)
		require.Len(t, items, 2)

		currentCount := 0
		for _, it := range items {
			if it.IsCurrent {
				currentCount++
			}
		}
		assert.Equal(t, 1, currentCount, "exactly one session must be marked current")

		body := w.Body.String()
		assert.NotContains(t, body, f.Cookie.Value, "current session token must not leak")
		assert.NotContains(t, body, secondCookie.Value, "other session token must not leak")
		assert.NotContains(t, body, "expired-session")
	})

	t.Run("Requires auth", func(t *testing.T) {
		t.Parallel()
		router, _ := setupTestEnv(t)

		req := newJSONRequest(t, http.MethodGet, "/api/auth/sessions", nil)
		w := performRequest(t, router, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

func TestDeleteAllSessions(t *testing.T) {
	t.Parallel()
	t.Run("Revokes other sessions but keeps current", func(t *testing.T) {
		t.Parallel()
		f := newAuthFixture(t)
		secondCookie := createSessionCookie(t, f.DB, f.User.ID)

		otherUser := seedUser(t, f.DB, "other@example.com")
		otherCookie := createSessionCookie(t, f.DB, otherUser.ID)

		w := f.do(t, http.MethodDelete, "/api/auth/sessions", nil)
		require.Equal(t, http.StatusNoContent, w.Code)

		currentW := f.do(t, http.MethodGet, "/api/auth/me", nil)
		assert.Equal(t, http.StatusOK, currentW.Code)

		secondReq := newJSONRequest(t, http.MethodGet, "/api/auth/me", nil)
		secondReq.AddCookie(secondCookie)
		secondW := performRequest(t, f.Router, secondReq)
		assert.Equal(t, http.StatusUnauthorized, secondW.Code)

		otherReq := newJSONRequest(t, http.MethodGet, "/api/auth/me", nil)
		otherReq.AddCookie(otherCookie)
		otherW := performRequest(t, f.Router, otherReq)
		assert.Equal(t, http.StatusOK, otherW.Code)
	})

	t.Run("Requires auth", func(t *testing.T) {
		t.Parallel()
		router, _ := setupTestEnv(t)

		req := newJSONRequest(t, http.MethodDelete, "/api/auth/sessions", nil)
		w := performRequest(t, router, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

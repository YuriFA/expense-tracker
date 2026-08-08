package sqlite_test

import (
	"context"
	"testing"
	"time"

	"github.com/yurifa/expense-tracker-api/internal/storage"
	"github.com/yurifa/expense-tracker-api/internal/storage/sqlite"
	"github.com/yurifa/expense-tracker-api/internal/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateSession(t *testing.T) {
	t.Parallel()
	t.Run("Success", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		session, err := f.DB.CreateSession(context.Background(), storage.CreateSessionParams{
			SessionID: "session-id-123",
			UserID:    f.User.ID,
			ExpiresAt: time.Now().Add(24 * time.Hour),
		})

		require.NoError(t, err)
		assert.NotNil(t, session)
		assert.Equal(t, f.User.ID, session.UserID)
		assert.Equal(t, "session-id-123", session.ID)
	})

	t.Run("Non existing user", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		_, err := f.DB.CreateSession(context.Background(), storage.CreateSessionParams{
			SessionID: "session-id-123",
			UserID:    "",
			ExpiresAt: time.Now().Add(24 * time.Hour),
		})
		require.Error(t, err)
	})
}

func TestGetSessionByID(t *testing.T) {
	t.Parallel()
	t.Run("Success", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		session, err := f.DB.CreateSession(context.Background(), storage.CreateSessionParams{
			SessionID: "session-id-123",
			UserID:    f.User.ID,
			ExpiresAt: time.Now().Add(24 * time.Hour),
		})
		require.NoError(t, err)

		retrieved, err := f.DB.GetSessionByID(context.Background(), session.ID)
		require.NoError(t, err)
		assert.Equal(t, session.ID, retrieved.ID)
		assert.Equal(t, session.UserID, retrieved.UserID)
	})

	t.Run("Non existing session", func(t *testing.T) {
		t.Parallel()
		db := sqlite.NewTestDB(t)
		_, err := db.GetSessionByID(context.Background(), "non-existing-session-id")
		require.ErrorIs(t, err, storage.ErrSessionNotFound)
	})
}

func TestDeleteSession(t *testing.T) {
	t.Parallel()
	t.Run("Success", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		session, err := f.DB.CreateSession(context.Background(), storage.CreateSessionParams{
			SessionID: "session-id-123",
			UserID:    f.User.ID,
			ExpiresAt: time.Now().Add(24 * time.Hour),
		})
		require.NoError(t, err)

		err = f.DB.DeleteSession(context.Background(), session.ID)
		require.NoError(t, err)

		_, err = f.DB.GetSessionByID(context.Background(), session.ID)
		require.ErrorIs(t, err, storage.ErrSessionNotFound)
	})

	t.Run("Non existing session", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		err := f.DB.DeleteSession(context.Background(), "non-existing-session-id")
		require.Error(t, err)
	})
}

func TestExtendSession(t *testing.T) {
	t.Parallel()
	t.Run("Success", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		session, err := f.DB.CreateSession(context.Background(), storage.CreateSessionParams{
			SessionID: "session-id-123",
			UserID:    f.User.ID,
			ExpiresAt: time.Now().Add(24 * time.Hour),
		})
		require.NoError(t, err)

		newExpiry := time.Now().Add(48 * time.Hour)
		err = f.DB.ExtendSession(context.Background(), session.ID, newExpiry)
		require.NoError(t, err)

		updated, err := f.DB.GetSessionByID(context.Background(), session.ID)
		require.NoError(t, err)
		assert.Equal(
			t,
			newExpiry.UnixMilli(),
			testutil.ParseDatetime(t, updated.ExpiresAt).UnixMilli(),
		)
	})

	t.Run("Non existing session", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		err := f.DB.ExtendSession(context.Background(), "non-existing-session-id", time.Now().Add(48*time.Hour))
		require.Error(t, err)
	})
}

func TestDeleteExpiredSessions(t *testing.T) {
	t.Parallel()
	t.Run("Success", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)

		_, err := f.DB.CreateSession(context.Background(), storage.CreateSessionParams{
			SessionID: "session-id-123",
			UserID:    f.User.ID,
			ExpiresAt: time.Now().UTC().Add(-24 * time.Hour),
		})
		require.NoError(t, err)

		_, err = f.DB.CreateSession(context.Background(), storage.CreateSessionParams{
			SessionID: "session-id-124",
			UserID:    f.User.ID,
			ExpiresAt: time.Now().UTC().Add(24 * time.Hour),
		})
		require.NoError(t, err)

		count, err := f.DB.DeleteExpiredSessions(context.Background())
		require.NoError(t, err)
		assert.Equal(t, int64(1), count)

		_, err = f.DB.GetSessionByID(context.Background(), "session-id-123")
		require.ErrorIs(t, err, storage.ErrSessionNotFound)

		_, err = f.DB.GetSessionByID(context.Background(), "session-id-124")
		require.NoError(t, err)
	})
}

func seedSession(t *testing.T, db *sqlite.Storage, sessionID, userID string, expiresAt time.Time) {
	t.Helper()
	_, err := db.CreateSession(context.Background(), storage.CreateSessionParams{
		SessionID: sessionID,
		UserID:    userID,
		ExpiresAt: expiresAt,
	})
	require.NoError(t, err)
}

func TestGetSessionsByUser(t *testing.T) {
	t.Parallel()
	t.Run("Returns only active sessions of the user", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		active := time.Now().UTC().Add(24 * time.Hour)

		seedSession(t, f.DB, "s-active-1", f.User.ID, active)
		seedSession(t, f.DB, "s-active-2", f.User.ID, active)
		seedSession(t, f.DB, "s-expired", f.User.ID, time.Now().UTC().Add(-24*time.Hour))

		other := seedUser(t, f.DB)
		seedSession(t, f.DB, "s-other", other.ID, active)

		sessions, err := f.DB.GetSessionsByUser(context.Background(), f.User.ID)
		require.NoError(t, err)

		ids := make([]string, 0, len(sessions))
		for _, s := range sessions {
			ids = append(ids, s.ID)
		}
		assert.ElementsMatch(t, []string{"s-active-1", "s-active-2"}, ids)
	})

	t.Run("Empty when user has no active sessions", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)

		sessions, err := f.DB.GetSessionsByUser(context.Background(), f.User.ID)
		require.NoError(t, err)
		assert.Empty(t, sessions)
	})
}

func TestDeleteSessionsByUserExcept(t *testing.T) {
	t.Parallel()
	t.Run("Deletes all user sessions except the current one", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		active := time.Now().UTC().Add(24 * time.Hour)

		seedSession(t, f.DB, "s-1", f.User.ID, active)
		seedSession(t, f.DB, "s-2", f.User.ID, active)
		seedSession(t, f.DB, "s-current", f.User.ID, active)

		other := seedUser(t, f.DB)
		seedSession(t, f.DB, "s-other", other.ID, active)

		count, err := f.DB.DeleteSessionsByUserExcept(context.Background(), f.User.ID, "s-current")
		require.NoError(t, err)
		assert.Equal(t, int64(2), count)

		_, err = f.DB.GetSessionByID(context.Background(), "s-current")
		require.NoError(t, err)

		_, err = f.DB.GetSessionByID(context.Background(), "s-1")
		require.ErrorIs(t, err, storage.ErrSessionNotFound)

		_, err = f.DB.GetSessionByID(context.Background(), "s-other")
		require.NoError(t, err)
	})

	t.Run("Zero affected when only the current session exists", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		seedSession(t, f.DB, "s-current", f.User.ID, time.Now().UTC().Add(24*time.Hour))

		count, err := f.DB.DeleteSessionsByUserExcept(context.Background(), f.User.ID, "s-current")
		require.NoError(t, err)
		assert.Equal(t, int64(0), count)

		_, err = f.DB.GetSessionByID(context.Background(), "s-current")
		require.NoError(t, err)
	})
}

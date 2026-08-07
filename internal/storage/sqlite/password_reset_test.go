package sqlite_test

import (
	"context"
	"testing"
	"time"

	"github.com/yurifa/expense-tracker-api/internal/storage"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreatePasswordResetToken(t *testing.T) {
	t.Parallel()
	t.Run("Rotates previous token for user", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		future := time.Now().UTC().Add(storage.PasswordResetTokenTTL)

		require.NoError(t, f.DB.CreatePasswordResetToken(context.Background(), f.User.ID, "hash1", future))
		require.NoError(t, f.DB.CreatePasswordResetToken(context.Background(), f.User.ID, "hash2", future))

		err := f.DB.ResetPassword(context.Background(), "hash1", "newpasswordhash")
		require.ErrorIs(t, err, storage.ErrPasswordResetTokenNotFound)
	})
}

func TestResetPassword(t *testing.T) {
	t.Parallel()

	t.Run("Success consumes token, changes password, revokes sessions", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		future := time.Now().UTC().Add(storage.PasswordResetTokenTTL)

		session, err := f.DB.CreateSession(context.Background(), storage.CreateSessionParams{
			SessionID: "session-to-revoke",
			UserID:    f.User.ID,
			ExpiresAt: future,
		})
		require.NoError(t, err)

		require.NoError(t, f.DB.CreatePasswordResetToken(context.Background(), f.User.ID, "hash1", future))
		require.NoError(t, f.DB.ResetPassword(context.Background(), "hash1", "newpasswordhash"))

		user, err := f.DB.GetUserByEmail(context.Background(), f.User.Email)
		require.NoError(t, err)
		assert.Equal(t, "newpasswordhash", user.PasswordHash)

		_, err = f.DB.GetSessionByID(context.Background(), session.ID)
		require.ErrorIs(t, err, storage.ErrSessionNotFound)
	})

	t.Run("Expired token rejected", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)

		require.NoError(t, f.DB.CreatePasswordResetToken(
			context.Background(), f.User.ID, "hash1", time.Now().UTC().Add(-time.Minute)))

		err := f.DB.ResetPassword(context.Background(), "hash1", "newpasswordhash")
		require.ErrorIs(t, err, storage.ErrPasswordResetTokenNotFound)
	})

	t.Run("Single-use: second reset fails", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		future := time.Now().UTC().Add(storage.PasswordResetTokenTTL)

		require.NoError(t, f.DB.CreatePasswordResetToken(context.Background(), f.User.ID, "hash1", future))
		require.NoError(t, f.DB.ResetPassword(context.Background(), "hash1", "newpasswordhash"))

		err := f.DB.ResetPassword(context.Background(), "hash1", "anotherhash")
		require.ErrorIs(t, err, storage.ErrPasswordResetTokenNotFound)
	})
}

func TestLatestPasswordResetTokenAgeSeconds(t *testing.T) {
	t.Parallel()

	t.Run("No token returns false", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)

		_, exists, err := f.DB.LatestPasswordResetTokenAgeSeconds(context.Background(), f.User.ID)
		require.NoError(t, err)
		assert.False(t, exists)
	})

	t.Run("Returns age for existing token", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		require.NoError(t, f.DB.CreatePasswordResetToken(
			context.Background(), f.User.ID, "hash1", time.Now().UTC().Add(storage.PasswordResetTokenTTL)))

		age, exists, err := f.DB.LatestPasswordResetTokenAgeSeconds(context.Background(), f.User.ID)
		require.NoError(t, err)
		assert.True(t, exists)
		assert.GreaterOrEqual(t, age, 0)
		assert.Less(t, age, 60)
	})
}

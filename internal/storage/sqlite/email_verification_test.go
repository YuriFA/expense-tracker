package sqlite_test

import (
	"context"
	"testing"
	"time"

	"github.com/yurifa/expense-tracker-api/internal/storage"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateEmailVerificationCode(t *testing.T) {
	t.Parallel()
	t.Run("Rotates previous code for user", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)

		require.NoError(t, f.DB.CreateEmailVerificationCode(
			context.Background(), f.User.ID, "111111", time.Now().UTC().Add(storage.VerificationCodeTTL)))
		require.NoError(t, f.DB.CreateEmailVerificationCode(
			context.Background(), f.User.ID, "222222", time.Now().UTC().Add(storage.VerificationCodeTTL)))

		err := f.DB.VerifyEmailCode(context.Background(), f.User.ID, "111111")
		require.ErrorIs(t, err, storage.ErrInvalidVerificationCode)
		require.NoError(t, f.DB.VerifyEmailCode(context.Background(), f.User.ID, "222222"))

		user, err := f.DB.GetUserByID(context.Background(), f.User.ID)
		require.NoError(t, err)
		assert.True(t, user.EmailVerified)
	})
}

func TestVerifyEmailCode(t *testing.T) {
	t.Parallel()

	t.Run("Success consumes code and marks user verified", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		require.NoError(t, f.DB.CreateEmailVerificationCode(
			context.Background(), f.User.ID, "123456", time.Now().UTC().Add(storage.VerificationCodeTTL)))

		require.NoError(t, f.DB.VerifyEmailCode(context.Background(), f.User.ID, "123456"))

		err := f.DB.VerifyEmailCode(context.Background(), f.User.ID, "123456")
		require.ErrorIs(t, err, storage.ErrVerificationCodeNotFound)
	})

	t.Run("Wrong code locks at cap and invalidates code", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		require.NoError(t, f.DB.CreateEmailVerificationCode(
			context.Background(), f.User.ID, "123456", time.Now().UTC().Add(storage.VerificationCodeTTL)))

		for range storage.MaxVerificationAttempts {
			err := f.DB.VerifyEmailCode(context.Background(), f.User.ID, "000000")
			require.ErrorIs(t, err, storage.ErrInvalidVerificationCode)
		}

		err := f.DB.VerifyEmailCode(context.Background(), f.User.ID, "123456")
		require.ErrorIs(t, err, storage.ErrVerificationCodeNotFound)

		user, err := f.DB.GetUserByID(context.Background(), f.User.ID)
		require.NoError(t, err)
		assert.False(t, user.EmailVerified)
	})

	t.Run("Expired code rejected", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		require.NoError(t, f.DB.CreateEmailVerificationCode(
			context.Background(), f.User.ID, "123456", time.Now().UTC().Add(-time.Minute)))

		err := f.DB.VerifyEmailCode(context.Background(), f.User.ID, "123456")
		require.ErrorIs(t, err, storage.ErrVerificationCodeExpired)
	})

	t.Run("No active code", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)

		err := f.DB.VerifyEmailCode(context.Background(), f.User.ID, "123456")
		require.ErrorIs(t, err, storage.ErrVerificationCodeNotFound)
	})
}

func TestLatestVerificationCodeAgeSeconds(t *testing.T) {
	t.Parallel()

	t.Run("No code returns false", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)

		_, exists, err := f.DB.LatestVerificationCodeAgeSeconds(context.Background(), f.User.ID)
		require.NoError(t, err)
		assert.False(t, exists)
	})

	t.Run("Returns age for existing code", func(t *testing.T) {
		t.Parallel()
		f := newFixture(t)
		require.NoError(t, f.DB.CreateEmailVerificationCode(
			context.Background(), f.User.ID, "123456", time.Now().UTC().Add(storage.VerificationCodeTTL)))

		age, exists, err := f.DB.LatestVerificationCodeAgeSeconds(context.Background(), f.User.ID)
		require.NoError(t, err)
		assert.True(t, exists)
		assert.GreaterOrEqual(t, age, 0)
		assert.Less(t, age, 60, "just-created code should be young")
	})
}

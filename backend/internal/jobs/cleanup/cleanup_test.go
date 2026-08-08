package cleanup_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/yurifa/expense-tracker-api/internal/jobs/cleanup"
	"github.com/yurifa/expense-tracker-api/internal/logger"
	"github.com/yurifa/expense-tracker-api/internal/storage"
	"github.com/yurifa/expense-tracker-api/internal/storage/sqlite"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func newCleanupDB(t *testing.T) (*sqlite.Storage, *storage.User) {
	t.Helper()
	db := sqlite.NewTestDB(t)
	user, err := db.RegisterUser(context.Background(), storage.RegisterUserParams{
		Email:        uuid.NewString()[:8] + "@test.com",
		PasswordHash: "hash",
	})
	require.NoError(t, err)
	return db, user
}

func TestCleanup_Run_DeletesExpiredOnStartupSweep(t *testing.T) {
	t.Parallel()
	db, user := newCleanupDB(t)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	const (
		expiredKey = "expired-key"
		validKey   = "valid-key"
	)
	past := time.Now().UTC().Add(-time.Hour)
	future := time.Now().UTC().Add(time.Hour)

	_, err := db.CreateIdempotencyKey(ctx, storage.CreateIdempotencyKeyParams{
		IdempotencyKey: expiredKey,
		UserID:         user.ID,
		RequestHash:    "h1",
		ExpiresAt:      past,
	})
	require.NoError(t, err)
	_, err = db.CreateIdempotencyKey(ctx, storage.CreateIdempotencyKeyParams{
		IdempotencyKey: validKey,
		UserID:         user.ID,
		RequestHash:    "h2",
		ExpiresAt:      future,
	})
	require.NoError(t, err)

	job := cleanup.New(db, logger.NewDiscardLogger(), time.Hour)
	done := make(chan struct{})
	go func() {
		_ = job.Run(ctx)
		close(done)
	}()

	// Startup sweep runs synchronously at the top of Run, but in a goroutine, so
	// poll until the expired key is gone.
	require.Eventually(t, func() bool {
		_, err := db.GetByUserAndKey(ctx, user.ID, expiredKey)
		return errors.Is(err, storage.ErrIdempotencyKeyNotFound)
	}, time.Second, 10*time.Millisecond)

	_, err = db.GetByUserAndKey(ctx, user.ID, validKey)
	require.NoError(t, err, "non-expired key must survive cleanup")

	cancel()
	<-done
}

func TestCleanup_Run_StopsOnContextCancel(t *testing.T) {
	t.Parallel()
	db, _ := newCleanupDB(t)

	ctx, cancel := context.WithCancel(context.Background())
	job := cleanup.New(db, logger.NewDiscardLogger(), time.Hour)

	done := make(chan struct{})
	go func() {
		_ = job.Run(ctx)
		close(done)
	}()

	cancel()

	select {
	case <-done:
		// job returned promptly after context cancellation
	case <-time.After(2 * time.Second):
		t.Fatal("cleanup job did not stop after context cancellation")
	}
}

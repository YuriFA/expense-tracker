package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/yurifa/expense-tracker-api/internal/storage"
)

func (s *Storage) CreatePasswordResetToken(
	ctx context.Context,
	userID, tokenHash string,
	expiresAt time.Time,
) error {
	const op = "storage.sqlite.CreatePasswordResetToken"

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx,
		`DELETE FROM password_reset_tokens WHERE user_id = ?`, userID,
	); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}

	if _, err := tx.ExecContext(ctx,
		`INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)`,
		tokenHash, userID, expiresAt,
	); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}

	return nil
}

func (s *Storage) ResetPassword(
	ctx context.Context,
	tokenHash, passwordHash string,
) error {
	const op = "storage.sqlite.ResetPassword"

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	defer func() { _ = tx.Rollback() }()

	var userID string
	err = tx.QueryRowContext(ctx,
		`DELETE FROM password_reset_tokens
		WHERE token_hash = ? AND datetime(expires_at) > CURRENT_TIMESTAMP
		RETURNING user_id`,
		tokenHash,
	).Scan(&userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("%s: %w", op, storage.ErrPasswordResetTokenNotFound)
		}
		return fmt.Errorf("%s: %w", op, err)
	}

	if _, err := tx.ExecContext(ctx,
		`UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		passwordHash, userID,
	); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}

	if _, err := tx.ExecContext(ctx,
		`DELETE FROM sessions WHERE user_id = ?`, userID,
	); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}

	return nil
}

func (s *Storage) LatestPasswordResetTokenAgeSeconds(
	ctx context.Context,
	userID string,
) (int, bool, error) {
	const op = "storage.sqlite.LatestPasswordResetTokenAgeSeconds"

	var age sql.NullInt64
	err := s.db.QueryRowContext(ctx,
		`SELECT CAST(strftime('%s', 'now') AS INTEGER) - CAST(strftime('%s', created_at) AS INTEGER)
		FROM password_reset_tokens
		WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
		userID,
	).Scan(&age)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, false, nil
		}
		return 0, false, fmt.Errorf("%s: %w", op, err)
	}
	if !age.Valid {
		return 0, false, nil
	}
	return int(age.Int64), true, nil
}

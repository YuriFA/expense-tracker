package sqlite

import (
	"context"
	"crypto/subtle"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/yurifa/expense-tracker-api/internal/storage"

	"github.com/google/uuid"
)

func (s *Storage) CreateEmailVerificationCode(
	ctx context.Context,
	userID, code string,
	expiresAt time.Time,
) error {
	const op = "storage.sqlite.CreateEmailVerificationCode"

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx,
		`DELETE FROM email_verification_codes WHERE user_id = ?`, userID,
	); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}

	if _, err := tx.ExecContext(ctx,
		`INSERT INTO email_verification_codes (id, user_id, code, expires_at) VALUES (?, ?, ?, ?)`,
		uuid.NewString(), userID, code, expiresAt,
	); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}

	return nil
}

func (s *Storage) VerifyEmailCode(ctx context.Context, userID, code string) error {
	const op = "storage.sqlite.VerifyEmailCode"

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	defer func() { _ = tx.Rollback() }()

	var (
		rowID    string
		rowCode  string
		attempts int
		expired  int
	)
	err = tx.QueryRowContext(ctx,
		`SELECT id, code, attempts, (datetime(expires_at) <= CURRENT_TIMESTAMP) AS expired
		FROM email_verification_codes
		WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
		userID,
	).Scan(&rowID, &rowCode, &attempts, &expired)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("%s: %w", op, storage.ErrVerificationCodeNotFound)
		}
		return fmt.Errorf("%s: %w", op, err)
	}

	if expired != 0 {
		if _, err := tx.ExecContext(ctx,
			`DELETE FROM email_verification_codes WHERE id = ?`, rowID,
		); err != nil {
			return fmt.Errorf("%s: %w", op, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("%s: %w", op, err)
		}
		return fmt.Errorf("%s: %w", op, storage.ErrVerificationCodeExpired)
	}

	if subtle.ConstantTimeCompare([]byte(rowCode), []byte(code)) == 1 {
		if _, err := tx.ExecContext(ctx,
			`DELETE FROM email_verification_codes WHERE id = ?`, rowID,
		); err != nil {
			return fmt.Errorf("%s: %w", op, err)
		}
		if _, err := tx.ExecContext(ctx,
			`UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE id = ?`, userID,
		); err != nil {
			return fmt.Errorf("%s: %w", op, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("%s: %w", op, err)
		}
		return nil
	}

	newAttempts := attempts + 1
	if newAttempts >= storage.MaxVerificationAttempts {
		if _, err := tx.ExecContext(ctx,
			`DELETE FROM email_verification_codes WHERE id = ?`, rowID,
		); err != nil {
			return fmt.Errorf("%s: %w", op, err)
		}
	} else {
		if _, err := tx.ExecContext(ctx,
			`UPDATE email_verification_codes SET attempts = ? WHERE id = ?`, newAttempts, rowID,
		); err != nil {
			return fmt.Errorf("%s: %w", op, err)
		}
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return fmt.Errorf("%s: %w", op, storage.ErrInvalidVerificationCode)
}

func (s *Storage) LatestVerificationCodeAgeSeconds(
	ctx context.Context,
	userID string,
) (int, bool, error) {
	const op = "storage.sqlite.LatestVerificationCodeAgeSeconds"

	var age sql.NullInt64
	err := s.db.QueryRowContext(ctx,
		`SELECT CAST(strftime('%s', 'now') AS INTEGER) - CAST(strftime('%s', created_at) AS INTEGER)
		FROM email_verification_codes
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

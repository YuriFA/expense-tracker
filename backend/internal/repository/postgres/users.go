package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
)

// RegisterUser creates a user atomically, seeding the starter categories
// only when params.SeedCategories is set (registration seeding is opt-in).
// Duplicate email -> domain.ErrUserAlreadyExists.
func (r *Repository) RegisterUser(ctx context.Context, params domain.RegisterUserParams) (*domain.User, error) {
	const op = "repository.postgres.RegisterUser"

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, opWrap(op, err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	userID := uuid.New()
	var u domain.User
	err = tx.QueryRow(ctx, `
		INSERT INTO users (id, email, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id, email, (email_verified_at IS NOT NULL) AS email_verified, created_at, updated_at`,
		userID, params.Email, params.PasswordHash,
	).Scan(&u.ID, &u.Email, &u.EmailVerified, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if pgUniqueViolation(err) {
			return nil, domain.ErrUserAlreadyExists
		}
		return nil, opWrap(op, err)
	}

	// Take the fresh user's change-log lock up front so the seed writes obey
	// the same seq/commit ordering invariant as every other mutation (the
	// user was just created, so the lock is uncontended).
	lockStmt := `SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))`
	if _, err := tx.Exec(ctx, lockStmt, u.ID.String()); err != nil {
		return nil, opWrap(op, err)
	}

	// Seed the starter categories when explicitly enabled for this
	// registration. Every seed write also lands in the change_log so synced
	// devices receive them via pull (no change without a log entry).
	if params.SeedCategories {
		for _, c := range domain.DefaultCategories {
			categoryID := uuid.New()
			_, err = tx.Exec(ctx, `
				INSERT INTO categories (id, user_id, name, type, icon, color)
				VALUES ($1, $2, $3, $4, $5, $6)`,
				categoryID, u.ID, c.Name, c.Type, c.Icon, c.Color,
			)
			if err != nil {
				return nil, opWrap(op, err)
			}
			_, err = tx.Exec(ctx, `
				INSERT INTO change_log (user_id, entity, entity_id, action, version)
				VALUES ($1, 'category', $2, 'upsert', 1)`,
				u.ID, categoryID,
			)
			if err != nil {
				return nil, opWrap(op, err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, opWrap(op, err)
	}

	return &u, nil
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	const op = "repository.postgres.GetUserByEmail"

	row, err := r.q.GetUserByEmail(ctx, email)
	if err != nil {
		if errNoRows(err) {
			return nil, domain.ErrUserNotFound
		}
		return nil, opWrap(op, err)
	}
	return &domain.User{
		ID:            row.ID,
		Email:         row.Email,
		EmailVerified: row.EmailVerified,
		PasswordHash:  row.PasswordHash,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}, nil
}

func (r *Repository) GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	const op = "repository.postgres.GetUserByID"

	row, err := r.q.GetUserByID(ctx, id)
	if err != nil {
		if errNoRows(err) {
			return nil, domain.ErrUserNotFound
		}
		return nil, opWrap(op, err)
	}
	return &domain.User{
		ID:            row.ID,
		Email:         row.Email,
		EmailVerified: row.EmailVerified,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}, nil
}

// opWrap is a thin alias to keep the per-method op tag readable without importing
// fmt in every file.
func opWrap(o string, err error) error { return fmt.Errorf("%s: %w", o, err) }

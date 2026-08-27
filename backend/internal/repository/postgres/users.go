package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	db "github.com/yurifa/expense-tracker-api/internal/repository/db"
)

// RegisterUser creates a user, their personal household, and the owner
// membership atomically (ADR-0002: every user belongs to exactly one
// household, of which they are the owner), seeding the starter categories only
// when params.SeedCategories is set (registration seeding is opt-in).
// Duplicate email -> domain.ErrUserAlreadyExists.
func (r *Repository) RegisterUser(ctx context.Context, params domain.RegisterUserParams) (*domain.User, error) {
	const op = "repository.postgres.RegisterUser"

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, opWrap(op, err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	userID := uuid.New()
	householdID := uuid.New()
	var u domain.User
	err = tx.QueryRow(ctx, `
		INSERT INTO users (id, email, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id, email, (email_verified_at IS NOT NULL) AS email_verified, display_name, created_at, updated_at`,
		userID, params.Email, params.PasswordHash,
	).Scan(&u.ID, &u.Email, &u.EmailVerified, &u.DisplayName, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if pgUniqueViolation(err) {
			return nil, domain.ErrUserAlreadyExists
		}
		return nil, opWrap(op, err)
	}

	if _, err = tx.Exec(ctx, `
		INSERT INTO households (id) VALUES ($1)`, householdID,
	); err != nil {
		return nil, opWrap(op, err)
	}
	if _, err = tx.Exec(ctx, `
		INSERT INTO household_members (household_id, user_id, role)
		VALUES ($1, $2, 'owner')`, householdID, u.ID,
	); err != nil {
		return nil, opWrap(op, err)
	}

	// Take the fresh household's change-log lock up front so the seed writes
	// obey the same seq/commit ordering invariant as every other mutation (the
	// household was just created, so the lock is uncontended).
	lockStmt := `SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))`
	if _, err := tx.Exec(ctx, lockStmt, householdID.String()); err != nil {
		return nil, opWrap(op, err)
	}

	// Seed the starter categories when explicitly enabled for this
	// registration. Every seed write also lands in the change_log so synced
	// devices receive them via pull (no change without a log entry).
	if params.SeedCategories {
		for _, c := range domain.DefaultCategories {
			categoryID := uuid.New()
			_, err = tx.Exec(ctx, `
				INSERT INTO categories (id, household_id, user_id, name, type, icon, color)
				VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				categoryID, householdID, u.ID, c.Name, c.Type, c.Icon, c.Color,
			)
			if err != nil {
				return nil, opWrap(op, err)
			}
			_, err = tx.Exec(ctx, `
				INSERT INTO change_log (household_id, user_id, entity, entity_id, action, version)
				VALUES ($1, $2, 'category', $3, 'upsert', 1)`,
				householdID, u.ID, categoryID,
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
		DisplayName:   row.DisplayName,
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
		DisplayName:   row.DisplayName,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}, nil
}

// UpdateDisplayName sets the member-facing display name and returns the
// updated profile row.
func (r *Repository) UpdateDisplayName(
	ctx context.Context,
	userID uuid.UUID,
	displayName string,
) (*domain.User, error) {
	const op = "repository.postgres.UpdateDisplayName"

	row, err := r.q.UpdateUserDisplayName(ctx, db.UpdateUserDisplayNameParams{
		ID:          userID,
		DisplayName: &displayName,
	})
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
		DisplayName:   row.DisplayName,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}, nil
}

// opWrap is a thin alias to keep the per-method op tag readable without importing
// fmt in every file.
func opWrap(o string, err error) error { return fmt.Errorf("%s: %w", o, err) }

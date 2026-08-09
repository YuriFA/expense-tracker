package postgres

import (
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/yurifa/expense-tracker-api/internal/repository"
	db "github.com/yurifa/expense-tracker-api/internal/repository/db"
)

// Repository is the concrete Postgres implementation of the repository
// interfaces. It wraps the sqlc-generated Queries (over a pgxpool) and adds the
// few procedural, multi-statement flows (registration, email-verify, password
// reset) that sqlc cannot express.
type Repository struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

// NewRepository builds a Repository over the given pool. Migrations must have
// been applied already.
func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool, q: db.New(pool)}
}

// Compile-time guarantees that *Repository implements every repository
// interface. If a method signature drifts, the build breaks here.
var (
	_ repository.UserRepository             = (*Repository)(nil)
	_ repository.SessionRepository          = (*Repository)(nil)
	_ repository.AccountRepository          = (*Repository)(nil)
	_ repository.CategoryRepository         = (*Repository)(nil)
	_ repository.TransactionRepository      = (*Repository)(nil)
	_ repository.IdempotencyRepository      = (*Repository)(nil)
	_ repository.EmailVerificationRepository = (*Repository)(nil)
	_ repository.PasswordResetRepository    = (*Repository)(nil)
)

// pgConstraintViolation reports whether err is a Postgres error with the given
// SQLSTATE (e.g. "23503" foreign_key_violation, "23505" unique_violation).
func pgConstraintViolation(err error, code string) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == code
	}
	return false
}

const (
	pgCodeUniqueViolation = "23505"
	pgCodeFKViolation     = "23503"
)

// errNoRows unwraps the pgx "no rows" case.
func errNoRows(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

// op wraps an error with an operation tag using the project convention.
func op(op string, err error) error {
	return fmt.Errorf("%s: %w", op, err)
}

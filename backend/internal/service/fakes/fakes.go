// Package fakes provides in-memory implementations of the repository interfaces
// for fast, hermetic service-layer unit tests (no database).
package fakes

import (
	"context"
	"crypto/subtle"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/yurifa/expense-tracker-api/internal/domain"
)

// Store is an in-memory fake implementing every repository interface. It
// approximates Postgres semantics enough to exercise service logic: unique
// constraints, FK existence, optimistic concurrency, and not-found mapping.
type Store struct {
	mu sync.Mutex

	users        map[uuid.UUID]*domain.User
	emails       map[string]uuid.UUID // email -> user id
	sessions     map[string]*domain.Session
	accounts     map[uuid.UUID]*domain.Account
	categories   map[uuid.UUID]*domain.Category
	transactions map[uuid.UUID]*domain.Transaction

	// catUnique enforces UNIQUE(user_id, name).
	catUnique map[string]struct{} // "userID|name"

	// idempotency: keyed by "userID|key"
	idemKeys map[string]*domain.IdempotencyKey

	verifyCodes  map[uuid.UUID]*verifyCode
	resetTokens  map[string]*resetToken // tokenHash -> resetToken
	verifyAge    map[uuid.UUID]int      // override for LatestVerificationCodeAgeSeconds
	verifyExists map[uuid.UUID]bool
	resetAge     map[uuid.UUID]int
	resetExists  map[uuid.UUID]bool
}

type verifyCode struct {
	code      string
	attempts  int
	expiresAt time.Time
	createdAt time.Time
}

type resetToken struct {
	userID    uuid.UUID
	expiresAt time.Time
	createdAt time.Time
}

// New returns an empty Store.
func New() *Store {
	return &Store{
		users:        make(map[uuid.UUID]*domain.User),
		emails:       make(map[string]uuid.UUID),
		sessions:     make(map[string]*domain.Session),
		accounts:     make(map[uuid.UUID]*domain.Account),
		categories:   make(map[uuid.UUID]*domain.Category),
		transactions: make(map[uuid.UUID]*domain.Transaction),
		catUnique:    make(map[string]struct{}),
		idemKeys:     make(map[string]*domain.IdempotencyKey),
		verifyCodes:  make(map[uuid.UUID]*verifyCode),
		resetTokens:  make(map[string]*resetToken),
		verifyAge:    make(map[uuid.UUID]int),
		verifyExists: make(map[uuid.UUID]bool),
		resetAge:     make(map[uuid.UUID]int),
		resetExists:  make(map[uuid.UUID]bool),
	}
}

// --- helpers --------------------------------------------------------------

func cloneUser(u *domain.User) *domain.User {
	c := *u
	return &c
}

// --- UserRepository -------------------------------------------------------

func (s *Store) RegisterUser(_ context.Context, params domain.RegisterUserParams) (*domain.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.emails[params.Email]; exists {
		return nil, domain.ErrUserAlreadyExists
	}
	now := time.Now().UTC()
	u := &domain.User{
		ID: uuid.New(), Email: params.Email, PasswordHash: params.PasswordHash,
		CreatedAt: now, UpdatedAt: now,
	}
	s.users[u.ID] = u
	s.emails[u.Email] = u.ID
	for _, c := range domain.DefaultCategories {
		cat := &domain.Category{
			ID:        uuid.New(),
			UserID:    u.ID,
			Name:      c.Name,
			Type:      c.Type,
			Icon:      c.Icon,
			Color:     c.Color,
			CreatedAt: now,
			UpdatedAt: now,
		}
		s.categories[cat.ID] = cat
		s.catUnique[u.ID.String()+"|"+c.Name] = struct{}{}
	}
	return cloneUser(u), nil
}

func (s *Store) GetUserByEmail(_ context.Context, email string) (*domain.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	id, ok := s.emails[email]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	return cloneUser(s.users[id]), nil
}

func (s *Store) GetUserByID(_ context.Context, id uuid.UUID) (*domain.User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	u, ok := s.users[id]
	if !ok {
		return nil, domain.ErrUserNotFound
	}
	return cloneUser(u), nil
}

// --- SessionRepository ----------------------------------------------------

func (s *Store) CreateSession(_ context.Context, params domain.CreateSessionParams) (*domain.Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	sess := &domain.Session{
		ID:        params.SessionID,
		UserID:    params.UserID,
		ExpiresAt: params.ExpiresAt,
		CreatedAt: now,
		UpdatedAt: now,
	}
	s.sessions[sess.ID] = sess
	c := *sess
	return &c, nil
}

func (s *Store) GetSessionByID(_ context.Context, id string) (*domain.Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sess, ok := s.sessions[id]
	if !ok || sess.ExpiresAt.Before(time.Now()) {
		return nil, domain.ErrSessionNotFound
	}
	c := *sess
	return &c, nil
}

func (s *Store) DeleteSession(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.sessions[id]; !ok {
		return domain.ErrSessionNotFound
	}
	delete(s.sessions, id)
	return nil
}

func (s *Store) ExtendSession(_ context.Context, id string, newExpiresAt time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	sess, ok := s.sessions[id]
	if !ok || sess.ExpiresAt.Before(time.Now()) {
		return domain.ErrSessionNotFound
	}
	sess.ExpiresAt = newExpiresAt
	return nil
}

func (s *Store) DeleteExpiredSessions(_ context.Context) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var n int64
	for id, sess := range s.sessions {
		if sess.ExpiresAt.Before(time.Now()) {
			delete(s.sessions, id)
			n++
		}
	}
	return n, nil
}

func (s *Store) GetSessionsByUser(_ context.Context, userID uuid.UUID) ([]domain.Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var out []domain.Session
	for _, sess := range s.sessions {
		if sess.UserID == userID && sess.ExpiresAt.After(time.Now()) {
			out = append(out, *sess)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}

func (s *Store) DeleteSessionsByUserExcept(_ context.Context, userID uuid.UUID, except string) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var n int64
	for id, sess := range s.sessions {
		if sess.UserID == userID && id != except {
			delete(s.sessions, id)
			n++
		}
	}
	return n, nil
}

func (s *Store) DeleteSessionsByUser(_ context.Context, userID uuid.UUID) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var n int64
	for id, sess := range s.sessions {
		if sess.UserID == userID {
			delete(s.sessions, id)
			n++
		}
	}
	return n, nil
}

// --- AccountRepository ----------------------------------------------------

func (s *Store) CreateAccount(_ context.Context, params domain.CreateAccountParams) (*domain.Account, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	a := &domain.Account{
		ID: uuid.New(), UserID: params.UserID, Name: params.Name, Currency: params.Currency,
		OpeningBalance: params.OpeningBalance, ManualAdjustment: 0,
		Balance: params.OpeningBalance, CreatedAt: now, UpdatedAt: now,
	}
	s.accounts[a.ID] = a
	c := *a
	return &c, nil
}

func (s *Store) recomputeBalance(a *domain.Account) int64 {
	bal := a.OpeningBalance + a.ManualAdjustment
	for _, t := range s.transactions {
		if t.UserID != a.UserID {
			continue
		}
		switch t.Type {
		case domain.TransactionTypeIncome:
			if t.AccountID != nil && *t.AccountID == a.ID {
				bal += t.Amount
			}
		case domain.TransactionTypeExpense:
			if t.AccountID != nil && *t.AccountID == a.ID {
				bal -= t.Amount
			}
		case domain.TransactionTypeTransfer:
			if t.FromAccountID != nil && *t.FromAccountID == a.ID {
				bal -= t.Amount
			}
			if t.ToAccountID != nil && *t.ToAccountID == a.ID {
				bal += t.Amount
			}
		}
	}
	return bal
}

func (s *Store) UpdateAccount(
	_ context.Context,
	userID, id uuid.UUID,
	params domain.UpdateAccountParams,
) (*domain.Account, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	a, ok := s.accounts[id]
	if !ok || a.UserID != userID {
		return nil, domain.ErrAccountNotFound
	}
	if params.Name != nil {
		a.Name = *params.Name
	}
	if params.ManualAdjustment != nil {
		a.ManualAdjustment = *params.ManualAdjustment
	}
	a.UpdatedAt = time.Now().UTC()
	a.Balance = s.recomputeBalance(a)
	c := *a
	return &c, nil
}

func (s *Store) DeleteAccount(_ context.Context, userID, id uuid.UUID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	a, ok := s.accounts[id]
	if !ok || a.UserID != userID {
		return domain.ErrAccountNotFound
	}
	for _, t := range s.transactions {
		if (t.AccountID != nil && *t.AccountID == id) ||
			(t.FromAccountID != nil && *t.FromAccountID == id) ||
			(t.ToAccountID != nil && *t.ToAccountID == id) {
			return domain.ErrAccountHasTransactions
		}
	}
	_ = a
	delete(s.accounts, id)
	return nil
}

func (s *Store) GetAccount(_ context.Context, userID, id uuid.UUID) (*domain.Account, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	a, ok := s.accounts[id]
	if !ok || a.UserID != userID {
		return nil, domain.ErrAccountNotFound
	}
	a.Balance = s.recomputeBalance(a)
	c := *a
	return &c, nil
}

func (s *Store) GetAccounts(_ context.Context, userID uuid.UUID) ([]domain.Account, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var out []domain.Account
	for _, a := range s.accounts {
		if a.UserID == userID {
			a.Balance = s.recomputeBalance(a)
			out = append(out, *a)
		}
	}
	return out, nil
}

func (s *Store) GetAccountBalances(_ context.Context, userID uuid.UUID) ([]domain.AccountBalance, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var out []domain.AccountBalance
	for _, a := range s.accounts {
		if a.UserID == userID {
			out = append(
				out,
				domain.AccountBalance{
					ID:       a.ID,
					UserID:   a.UserID,
					Name:     a.Name,
					Currency: a.Currency,
					Balance:  s.recomputeBalance(a),
				},
			)
		}
	}
	return out, nil
}

// --- CategoryRepository ---------------------------------------------------

func catUniqueKey(userID uuid.UUID, name string) string { return userID.String() + "|" + name }

func (s *Store) CreateCategory(_ context.Context, params domain.CreateCategoryParams) (*domain.Category, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.catUnique[catUniqueKey(params.UserID, params.Name)]; exists {
		return nil, domain.ErrCategoryAlreadyExists
	}
	now := time.Now().UTC()
	c := &domain.Category{
		ID:        uuid.New(),
		UserID:    params.UserID,
		Name:      params.Name,
		Type:      params.Type,
		Icon:      params.Icon,
		Color:     params.Color,
		CreatedAt: now,
		UpdatedAt: now,
	}
	s.categories[c.ID] = c
	s.catUnique[catUniqueKey(params.UserID, params.Name)] = struct{}{}
	cc := *c
	return &cc, nil
}

func (s *Store) UpdateCategory(
	_ context.Context,
	userID, id uuid.UUID,
	params domain.UpdateCategoryParams,
) (*domain.Category, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	c, ok := s.categories[id]
	if !ok || c.UserID != userID {
		return nil, domain.ErrCategoryNotFound
	}
	if params.Name != nil {
		if _, exists := s.catUnique[catUniqueKey(userID, *params.Name)]; exists && c.Name != *params.Name {
			return nil, domain.ErrCategoryAlreadyExists
		}
		delete(s.catUnique, catUniqueKey(userID, c.Name))
		c.Name = *params.Name
		s.catUnique[catUniqueKey(userID, c.Name)] = struct{}{}
	}
	if params.Type != nil {
		c.Type = *params.Type
	}
	if params.Icon != nil {
		c.Icon = *params.Icon
	}
	if params.Color != nil {
		c.Color = *params.Color
	}
	c.UpdatedAt = time.Now().UTC()
	cc := *c
	return &cc, nil
}

func (s *Store) DeleteCategory(_ context.Context, userID, id uuid.UUID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	c, ok := s.categories[id]
	if !ok || c.UserID != userID {
		return domain.ErrCategoryNotFound
	}
	for _, t := range s.transactions {
		if t.CategoryID != nil && *t.CategoryID == id {
			return domain.ErrCategoryHasTransactions
		}
	}
	delete(s.catUnique, catUniqueKey(userID, c.Name))
	delete(s.categories, id)
	return nil
}

func (s *Store) GetCategory(_ context.Context, userID, id uuid.UUID) (*domain.Category, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	c, ok := s.categories[id]
	if !ok || c.UserID != userID {
		return nil, domain.ErrCategoryNotFound
	}
	cc := *c
	return &cc, nil
}

func (s *Store) GetCategories(
	_ context.Context,
	userID uuid.UUID,
	params domain.GetCategoriesParams,
) ([]domain.Category, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var out []domain.Category
	for _, c := range s.categories {
		if c.UserID != userID {
			continue
		}
		if params.Type != nil && c.Type != *params.Type {
			continue
		}
		out = append(out, *c)
	}
	return out, nil
}

// --- TransactionRepository -----------------------------------------------

func (s *Store) CreateTransaction(
	_ context.Context,
	params domain.CreateTransactionParams,
) (*domain.Transaction, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	t := &domain.Transaction{
		ID:            uuid.New(),
		UserID:        params.UserID,
		Type:          params.Type,
		Amount:        params.Amount,
		Description:   params.Description,
		OccurredAt:    params.OccurredAt,
		CreatedAt:     now,
		UpdatedAt:     now,
		Version:       1,
		AccountID:     params.AccountID,
		CategoryID:    params.CategoryID,
		FromAccountID: params.FromAccountID,
		ToAccountID:   params.ToAccountID,
	}
	s.transactions[t.ID] = t
	c := *t
	return &c, nil
}

func (s *Store) UpdateTransaction(
	_ context.Context,
	userID, id uuid.UUID,
	params domain.UpdateTransactionParams,
) (*domain.Transaction, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	t, ok := s.transactions[id]
	if !ok || t.UserID != userID {
		return nil, domain.ErrTransactionNotFound
	}
	if t.Version != params.Version {
		return nil, domain.ErrTransactionVersionConflict
	}
	if params.Amount != nil {
		t.Amount = *params.Amount
	}
	if params.Description != nil {
		t.Description = *params.Description
	}
	if params.OccurredAt != nil {
		t.OccurredAt = *params.OccurredAt
	}
	if params.AccountID != nil {
		t.AccountID = params.AccountID
	}
	if params.CategoryID != nil {
		t.CategoryID = params.CategoryID
	}
	if params.FromAccountID != nil {
		t.FromAccountID = params.FromAccountID
	}
	if params.ToAccountID != nil {
		t.ToAccountID = params.ToAccountID
	}
	t.Version++
	t.UpdatedAt = time.Now().UTC()
	c := *t
	return &c, nil
}

func (s *Store) DeleteTransaction(_ context.Context, userID, id uuid.UUID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	t, ok := s.transactions[id]
	if !ok || t.UserID != userID {
		return domain.ErrTransactionNotFound
	}
	delete(s.transactions, id)
	return nil
}

func (s *Store) GetTransaction(_ context.Context, userID, id uuid.UUID) (*domain.Transaction, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	t, ok := s.transactions[id]
	if !ok || t.UserID != userID {
		return nil, domain.ErrTransactionNotFound
	}
	c := *t
	return &c, nil
}

func (s *Store) GetTransactions(
	_ context.Context,
	userID uuid.UUID,
	params domain.GetTransactionsParams,
) ([]domain.Transaction, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var out []domain.Transaction
	for _, t := range s.transactions {
		if t.UserID == userID && transactionMatchesFilters(*t, params) {
			out = append(out, *t)
		}
	}
	// ORDER BY occurred_at DESC, id DESC
	sort.Slice(out, func(i, j int) bool {
		if !out[i].OccurredAt.Equal(out[j].OccurredAt) {
			return out[i].OccurredAt.After(out[j].OccurredAt)
		}
		return uuidLess(out[j].ID, out[i].ID)
	})
	if params.Limit != nil && len(out) > *params.Limit {
		out = out[:*params.Limit]
	}
	return out, nil
}

// transactionMatchesFilters reports whether a single transaction satisfies all
// of the list filters (type, account, category, date range, keyset cursor).
func transactionMatchesFilters(t domain.Transaction, params domain.GetTransactionsParams) bool {
	if params.Type != nil && t.Type != *params.Type {
		return false
	}
	if params.AccountID != nil {
		match := (t.AccountID != nil && *t.AccountID == *params.AccountID) ||
			(t.FromAccountID != nil && *t.FromAccountID == *params.AccountID) ||
			(t.ToAccountID != nil && *t.ToAccountID == *params.AccountID)
		if !match {
			return false
		}
	}
	if params.CategoryID != nil && (t.CategoryID == nil || *t.CategoryID != *params.CategoryID) {
		return false
	}
	if params.FromDate != nil && t.OccurredAt.Before(*params.FromDate) {
		return false
	}
	if params.ToDate != nil && t.OccurredAt.After(*params.ToDate) {
		return false
	}
	if params.Cursor != nil {
		if t.OccurredAt.After(params.Cursor.OccurredAt) {
			return false
		}
		if t.OccurredAt.Equal(params.Cursor.OccurredAt) && !uuidLess(t.ID, params.Cursor.ID) {
			return false
		}
	}
	return true
}

func uuidLess(a, b uuid.UUID) bool {
	for i := range a {
		if a[i] != b[i] {
			return a[i] < b[i]
		}
	}
	return false
}

// --- IdempotencyRepository ------------------------------------------------------

func idemKey(userID uuid.UUID, key string) string { return userID.String() + "|" + key }

func (s *Store) CreateIdempotencyKey(
	_ context.Context,
	params domain.CreateIdempotencyKeyParams,
) (*domain.IdempotencyKey, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	k := idemKey(params.UserID, params.IdempotencyKey)
	if _, exists := s.idemKeys[k]; exists {
		return nil, domain.ErrIdempotencyKeyInUse
	}
	now := time.Now().UTC()
	ik := &domain.IdempotencyKey{
		ID: uuid.New(), IdempotencyKey: params.IdempotencyKey, UserID: params.UserID,
		RequestHash: params.RequestHash, Status: "pending",
		CreatedAt: now, UpdatedAt: now, ExpiresAt: params.ExpiresAt,
	}
	s.idemKeys[k] = ik
	c := *ik
	return &c, nil
}

func (s *Store) UpdateIdempotencyKey(
	_ context.Context,
	userID, id uuid.UUID,
	params domain.UpdateIdempotencyKeyParams,
) (*domain.IdempotencyKey, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for k, ik := range s.idemKeys {
		if ik.ID == id && ik.UserID == userID {
			if params.Status != nil {
				ik.Status = *params.Status
			}
			if params.ResponseStatus != nil {
				ik.ResponseStatus = params.ResponseStatus
			}
			if params.ResponseHeaders != nil {
				ik.ResponseHeaders = params.ResponseHeaders
			}
			if params.ResponseBody != nil {
				ik.ResponseBody = params.ResponseBody
			}
			ik.UpdatedAt = time.Now().UTC()
			c := *ik
			_ = k
			return &c, nil
		}
	}
	return nil, domain.ErrIdempotencyKeyNotFound
}

func (s *Store) GetByUserAndKey(_ context.Context, userID uuid.UUID, key string) (*domain.IdempotencyKey, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	ik, ok := s.idemKeys[idemKey(userID, key)]
	if !ok {
		return nil, domain.ErrIdempotencyKeyNotFound
	}
	c := *ik
	return &c, nil
}

func (s *Store) DeleteIdempotencyKey(_ context.Context, userID, id uuid.UUID) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for k, ik := range s.idemKeys {
		if ik.ID == id && ik.UserID == userID {
			delete(s.idemKeys, k)
			return nil
		}
	}
	return nil
}

func (s *Store) DeleteExpiredIdempotencyKeys(_ context.Context) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var n int64
	for k, ik := range s.idemKeys {
		if ik.ExpiresAt.Before(time.Now()) {
			delete(s.idemKeys, k)
			n++
		}
	}
	return n, nil
}

// --- EmailVerificationRepository -----------------------------------------

func (s *Store) CreateEmailVerificationCode(
	_ context.Context,
	userID uuid.UUID,
	code string,
	expiresAt time.Time,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.verifyCodes[userID] = &verifyCode{code: code, attempts: 0, expiresAt: expiresAt, createdAt: time.Now().UTC()}
	return nil
}

func (s *Store) VerifyEmailCode(_ context.Context, userID uuid.UUID, code string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	vc, ok := s.verifyCodes[userID]
	if !ok {
		return domain.ErrVerificationCodeNotFound
	}
	if vc.expiresAt.Before(time.Now()) {
		delete(s.verifyCodes, userID)
		return domain.ErrVerificationCodeExpired
	}
	if subtle.ConstantTimeCompare([]byte(vc.code), []byte(code)) == 1 {
		delete(s.verifyCodes, userID)
		if u, ok := s.users[userID]; ok {
			u.EmailVerified = true
		}
		return nil
	}
	vc.attempts++
	if vc.attempts >= domain.MaxVerificationAttempts {
		delete(s.verifyCodes, userID)
	}
	return domain.ErrInvalidVerificationCode
}

func (s *Store) LatestVerificationCodeAgeSeconds(_ context.Context, userID uuid.UUID) (int, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	vc, ok := s.verifyCodes[userID]
	if !ok {
		return 0, false, nil
	}
	return int(time.Since(vc.createdAt).Seconds()), true, nil
}

// --- PasswordResetRepository --------------------------------------------

func (s *Store) CreatePasswordResetToken(
	_ context.Context,
	userID uuid.UUID,
	tokenHash string,
	expiresAt time.Time,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.resetTokens[tokenHash] = &resetToken{userID: userID, expiresAt: expiresAt, createdAt: time.Now().UTC()}
	return nil
}

func (s *Store) ResetPassword(_ context.Context, tokenHash, passwordHash string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	rt, ok := s.resetTokens[tokenHash]
	if !ok || rt.expiresAt.Before(time.Now()) {
		return domain.ErrPasswordResetTokenNotFound
	}
	delete(s.resetTokens, tokenHash)
	if u, ok := s.users[rt.userID]; ok {
		u.PasswordHash = passwordHash
	}
	// revoke all sessions
	for id, sess := range s.sessions {
		if sess.UserID == rt.userID {
			delete(s.sessions, id)
		}
	}
	return nil
}

func (s *Store) LatestPasswordResetTokenAgeSeconds(_ context.Context, userID uuid.UUID) (int, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var latest time.Time
	found := false
	for _, rt := range s.resetTokens {
		if rt.userID == userID && (!found || rt.createdAt.After(latest)) {
			latest = rt.createdAt
			found = true
		}
	}
	if !found {
		return 0, false, nil
	}
	return int(time.Since(latest).Seconds()), true, nil
}

// silence unused import in some build configs.
var _ = pgx.ErrNoRows

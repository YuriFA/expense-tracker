package domain

import (
	"errors"
	"time"
)

// Auth/verification policy constants. Centralized here so services and the
// repository layer share one definition of the policy.
const (
	VerificationCodeTTL          = 10 * time.Minute
	MaxVerificationAttempts      = 5
	VerificationResendThrottle   = 60 * time.Second
	PasswordResetTokenTTL        = 15 * time.Minute
	PasswordResetRequestThrottle = 60 * time.Second
)

// Sentinel domain errors. Services return these; the transport layer maps them
// to HTTP status + code in one central place (transport/http/errormap.go).
//
// Note on the ACCOUNT_NOT_FOUND duality: ErrAccountNotFound is 404 when an
// account is fetched by id, but 422 when an account is referenced as an FK
// inside a transaction. The transaction-FK case uses distinct errors below
// (ErrTransactionAccountNotFound / ErrTransactionFromAccountNotFound /
// ErrTransactionToAccountNotFound) so the mapper stays a pure 1:1 function.
var (
	ErrUserNotFound                       = errors.New("user not found")
	ErrUserAlreadyExists                  = errors.New("user already exists")
	ErrSessionNotFound                    = errors.New("session not found")
	ErrSessionExpired                     = errors.New("session expired")
	ErrAccountNotFound                    = errors.New("account not found")
	ErrAccountAlreadyExists               = errors.New("account already exists")
	ErrAccountVersionConflict             = errors.New("account version conflict")
	ErrCategoryNotFound                   = errors.New("category not found")
	ErrCategoryAlreadyExists              = errors.New("category already exists")
	ErrCategoryVersionConflict            = errors.New("category version conflict")
	ErrCategoryTypeMismatch               = errors.New("category type mismatch")
	ErrTransactionNotFound                = errors.New("transaction not found")
	ErrTransactionAlreadyExists           = errors.New("transaction already exists")
	ErrTransactionVersionConflict         = errors.New("transaction version conflict")
	ErrAccountHasTransactions             = errors.New("account has transactions and cannot be deleted")
	ErrCategoryHasTransactions            = errors.New("category has transactions and cannot be deleted")
	ErrRecordDeleted                      = errors.New("record is deleted on the server")
	ErrSyncOpIDReused                     = errors.New("sync operation id reused for a different operation")
	ErrInvalidRefs                        = errors.New("invalid references in transaction")
	ErrSameAccountTransfer                = errors.New("transfer cannot be made to the same account")
	ErrTransactionAccountNotFound         = errors.New("transaction references an account that does not exist")
	ErrTransactionCategoryNotFound        = errors.New("transaction references a category that does not exist")
	ErrTransactionFromAccountNotFound     = errors.New("transaction references a from-account that does not exist")
	ErrTransactionToAccountNotFound       = errors.New("transaction references a to-account that does not exist")
	ErrDebtorNotFound                     = errors.New("debtor not found")
	ErrDebtorAlreadyExists                = errors.New("debtor already exists")
	ErrDebtorVersionConflict              = errors.New("debtor version conflict")
	ErrDebtorHasOperations                = errors.New("debtor has debt operations and cannot be deleted")
	ErrDebtOperationNotFound              = errors.New("debt operation not found")
	ErrDebtOperationAlreadyExists         = errors.New("debt operation already exists")
	ErrDebtOperationVersionConflict       = errors.New("debt operation version conflict")
	ErrDebtOperationDebtorNotFound        = errors.New("debt operation references a debtor that does not exist")
	ErrPlannedPaymentNotFound             = errors.New("planned payment not found")
	ErrPlannedPaymentAlreadyExists        = errors.New("planned payment already exists")
	ErrPlannedPaymentVersionConflict      = errors.New("planned payment version conflict")
	ErrPlannedPaymentAccountNotFound      = errors.New("planned payment references an account that does not exist")
	ErrPlannedPaymentCategoryNotFound     = errors.New("planned payment references a category that does not exist")
	ErrPlannedPaymentCategoryTypeMismatch = errors.New("planned payment category type does not match the plan type")
	ErrAccountHasPlannedPayments          = errors.New("account has planned payments and cannot be deleted")
	ErrCategoryHasPlannedPayments         = errors.New("category has planned payments and cannot be deleted")
	ErrInvalidDate                        = errors.New("date must be YYYY-MM-DD")
	ErrIdempotencyKeyNotFound             = errors.New("idempotency key not found")
	ErrIdempotencyKeyInUse                = errors.New("idempotency key is already in use")
	ErrVerificationCodeNotFound           = errors.New("verification code not found")
	ErrVerificationCodeExpired            = errors.New("verification code expired")
	ErrInvalidVerificationCode            = errors.New("invalid verification code")
	ErrPasswordResetTokenNotFound         = errors.New("password reset token not found")
	ErrEmailAlreadyVerified               = errors.New("email already verified")
	ErrInvalidCredentials                 = errors.New("invalid credentials")
)

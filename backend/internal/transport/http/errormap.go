package http

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/logger"
	"github.com/yurifa/expense-tracker-api/internal/service"
	"github.com/yurifa/expense-tracker-api/internal/transport/http/httperr"
)

// writeDomainError is the ONE central domain-error -> HTTP mapper. It maps every
// sentinel domain error to the status + machine code documented in the OpenAPI
// spec. Handlers call this when a service returns an error; on return the
// response is already written (handler returns a nil ResponseObject).
//
// Nuance preserved: ErrAccountNotFound is 404 when an account is fetched by id,
// but the transaction-FK case uses DISTINCT errors
// (ErrTransactionAccountNotFound / ErrTransactionFromAccountNotFound) that map
// to 422, so this function stays a pure 1:1 mapping.
func writeDomainError(c *gin.Context, log *slog.Logger, err error) {
	switch {
	// --- resource not found by id (404) ---
	case errors.Is(err, domain.ErrAccountNotFound):
		httperr.Write(c, http.StatusNotFound, httperr.ErrCodeAccountNotFound, "account not found")
	case errors.Is(err, domain.ErrCategoryNotFound):
		httperr.Write(c, http.StatusNotFound, httperr.ErrCodeCategoryNotFound, "category not found")
	case errors.Is(err, domain.ErrTransactionNotFound):
		httperr.Write(c, http.StatusNotFound, httperr.ErrCodeTransactionNotFound, "transaction not found")
	case errors.Is(err, domain.ErrPasswordResetTokenNotFound):
		httperr.Write(c, http.StatusBadRequest, httperr.ErrCodeInvalidPasswordResetToken, "invalid or expired reset token")
	case errors.Is(err, domain.ErrIdempotencyKeyNotFound):
		httperr.Write(c, http.StatusNotFound, httperr.ErrCodeInternal, "idempotency key not found")

	// --- conflict (409) ---
	case errors.Is(err, domain.ErrUserAlreadyExists):
		httperr.Write(c, http.StatusConflict, httperr.ErrCodeUserAlreadyExists, "user already exists")
	case errors.Is(err, domain.ErrCategoryAlreadyExists):
		httperr.Write(c, http.StatusConflict, httperr.ErrCodeCategoryAlreadyExists, "category already exists")
	case errors.Is(err, domain.ErrTransactionVersionConflict):
		httperr.Write(c, http.StatusConflict, httperr.ErrCodeTransactionVersionConflict,
			"transaction was modified by another request, please refetch and retry")
	case errors.Is(err, domain.ErrAccountHasTransactions):
		httperr.Write(c, http.StatusConflict, httperr.ErrCodeAccountInUse, "account has transactions and cannot be deleted")
	case errors.Is(err, domain.ErrCategoryHasTransactions):
		httperr.Write(c, http.StatusConflict, httperr.ErrCodeCategoryInUse, "category has transactions and cannot be deleted")

	// --- auth (401/403) ---
	case errors.Is(err, domain.ErrInvalidCredentials):
		httperr.Write(c, http.StatusUnauthorized, httperr.ErrCodeInvalidCredentials, "invalid credentials")
	case errors.Is(err, domain.ErrEmailAlreadyVerified):
		httperr.Write(c, http.StatusConflict, httperr.ErrCodeEmailAlreadyVerified, "email already verified")
	case errors.Is(err, domain.ErrInvalidVerificationCode):
		httperr.Write(c, http.StatusForbidden, httperr.ErrCodeInvalidVerificationCode, "invalid verification code")

	// --- verification code states (400) ---
	case errors.Is(err, domain.ErrVerificationCodeExpired):
		httperr.Write(c, http.StatusBadRequest, httperr.ErrCodeVerificationCodeExpired, "verification code expired, request a new one")
	case errors.Is(err, domain.ErrVerificationCodeNotFound):
		httperr.Write(c, http.StatusBadRequest, httperr.ErrCodeVerificationCodeNotFound, "no active verification code, request a new one")

	// --- transaction business-rule violations (422) ---
	case errors.Is(err, domain.ErrTransactionAccountNotFound):
		httperr.Write(c, http.StatusUnprocessableEntity, httperr.ErrCodeAccountNotFound, "account not found")
	case errors.Is(err, domain.ErrTransactionCategoryNotFound):
		httperr.Write(c, http.StatusUnprocessableEntity, httperr.ErrCodeCategoryNotFound, "category not found")
	case errors.Is(err, domain.ErrTransactionFromAccountNotFound):
		httperr.Write(c, http.StatusUnprocessableEntity, httperr.ErrCodeAccountNotFound, "account not found")
	case errors.Is(err, domain.ErrTransactionToAccountNotFound):
		httperr.Write(c, http.StatusUnprocessableEntity, httperr.ErrCodeAccountNotFound, "account not found")
	case errors.Is(err, domain.ErrCategoryTypeMismatch):
		httperr.Write(c, http.StatusUnprocessableEntity, httperr.ErrCodeCategoryTypeMismatch, "transaction type does not match category type")
	case errors.Is(err, domain.ErrSameAccountTransfer):
		httperr.Write(c, http.StatusUnprocessableEntity, httperr.ErrCodeSameAccountTransfer, "transaction from and to accounts are the same")
	case errors.Is(err, domain.ErrInvalidRefs):
		httperr.Write(c, http.StatusUnprocessableEntity, httperr.ErrCodeInvalidRefs, "invalid references")

	// --- transport/service errors ---
	case errors.Is(err, service.ErrNoFieldsToUpdate):
		httperr.Write(c, http.StatusBadRequest, httperr.ErrCodeValidationFailed, "no fields to update")
	case errors.Is(err, service.ErrInvalidCursor):
		httperr.Write(c, http.StatusBadRequest, httperr.ErrCodeInvalidRequest, "invalid cursor")

	// --- throttle (429 with Retry-After) ---
	default:
		var throttle *service.ThrottleError
		if errors.As(err, &throttle) {
			c.Header("Retry-After", strconv.Itoa(throttle.RetryAfterSeconds))
			httperr.Write(c, http.StatusTooManyRequests, httperr.ErrCodeTooManyRequests, "please wait before requesting a new code")
			return
		}
		log.Error("unhandled domain error", logger.Error(err))
		httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "internal server error")
	}
}

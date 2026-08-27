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

// domainErrorSpec is the (status, machine code, human message) triple every
// sentinel domain error maps to. It is the documented shape from the OpenAPI
// spec's error responses.
type domainErrorSpec struct {
	status  int
	code    string
	message string
}

// writeDomainError is the ONE central domain-error -> HTTP mapper, wired in as
// the oapi-codegen HandlerErrorFunc (see NewEngine). Handlers therefore just
// `return nil, err` and this single place decides the status + machine code.
func writeDomainError(c *gin.Context, log *slog.Logger, err error) {
	// Throttle is a wrapped error type (not a sentinel): it needs a Retry-After
	// header, so handle it before the sentinel table lookup.
	var throttle *service.ThrottleError
	if errors.As(err, &throttle) {
		c.Header("Retry-After", strconv.Itoa(throttle.RetryAfterSeconds))
		httperr.Write(
			c,
			http.StatusTooManyRequests,
			httperr.ErrCodeTooManyRequests,
			"please wait before requesting a new code",
		)
		return
	}

	for sentinel, spec := range domainErrorMap {
		if errors.Is(err, sentinel) {
			httperr.Write(c, spec.status, spec.code, spec.message)
			return
		}
	}

	log.Error("unhandled domain error", logger.Error(err))
	httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "internal server error")
}

// domainErrorMap is the sentinel -> HTTP shape mapping table. Add a row when a
// new sentinel error needs an HTTP response. Read-only after init.
//
// Nuance preserved: ErrAccountNotFound is 404 when an account is fetched by id,
// but the transaction-FK case uses DISTINCT errors
// (ErrTransactionAccountNotFound / ErrTransactionFromAccountNotFound) that map
// to 422, so this table stays a pure 1:1 mapping.
//
//nolint:gochecknoglobals // immutable lookup table; the idiomatic home for constant dispatch data
var domainErrorMap = map[error]domainErrorSpec{
	// --- resource not found by id (404) ---
	domain.ErrAccountNotFound:  {http.StatusNotFound, httperr.ErrCodeAccountNotFound, "account not found"},
	domain.ErrCategoryNotFound: {http.StatusNotFound, httperr.ErrCodeCategoryNotFound, "category not found"},
	domain.ErrTransactionNotFound: {
		http.StatusNotFound,
		httperr.ErrCodeTransactionNotFound,
		"transaction not found",
	},
	domain.ErrDebtorNotFound: {http.StatusNotFound, httperr.ErrCodeDebtorNotFound, "debtor not found"},
	domain.ErrDebtOperationNotFound: {
		http.StatusNotFound,
		httperr.ErrCodeDebtOperationNotFound,
		"debt operation not found",
	},
	domain.ErrPlannedPaymentNotFound: {
		http.StatusNotFound,
		httperr.ErrCodePlannedPaymentNotFound,
		"planned payment not found",
	},

	// --- conflict (409) ---
	domain.ErrUserAlreadyExists: {
		http.StatusConflict,
		httperr.ErrCodeUserAlreadyExists,
		"user already exists",
	},
	domain.ErrCategoryAlreadyExists: {
		http.StatusConflict,
		httperr.ErrCodeCategoryAlreadyExists,
		"category already exists",
	},
	domain.ErrAccountAlreadyExists: {
		http.StatusConflict,
		httperr.ErrCodeAccountAlreadyExists,
		"account already exists",
	},
	domain.ErrTransactionAlreadyExists: {
		http.StatusConflict,
		httperr.ErrCodeTransactionAlreadyExists,
		"transaction already exists",
	},
	domain.ErrDebtorAlreadyExists: {
		http.StatusConflict,
		httperr.ErrCodeDebtorAlreadyExists,
		"debtor already exists",
	},
	domain.ErrDebtOperationAlreadyExists: {
		http.StatusConflict,
		httperr.ErrCodeDebtOperationAlreadyExists,
		"debt operation already exists",
	},
	domain.ErrPlannedPaymentAlreadyExists: {
		http.StatusConflict,
		httperr.ErrCodePlannedPaymentAlreadyExists,
		"planned payment already exists",
	},
	domain.ErrAccountVersionConflict: {
		http.StatusConflict,
		httperr.ErrCodeAccountVersionConflict,
		"account was modified by another request, please refetch and retry",
	},
	domain.ErrCategoryVersionConflict: {
		http.StatusConflict,
		httperr.ErrCodeCategoryVersionConflict,
		"category was modified by another request, please refetch and retry",
	},
	domain.ErrTransactionVersionConflict: {
		http.StatusConflict,
		httperr.ErrCodeTransactionVersionConflict,
		"transaction was modified by another request, please refetch and retry",
	},
	domain.ErrDebtorVersionConflict: {
		http.StatusConflict,
		httperr.ErrCodeDebtorVersionConflict,
		"debtor was modified by another request, please refetch and retry",
	},
	domain.ErrDebtOperationVersionConflict: {
		http.StatusConflict,
		httperr.ErrCodeDebtOperationVersionConflict,
		"debt operation was modified by another request, please refetch and retry",
	},
	domain.ErrPlannedPaymentVersionConflict: {
		http.StatusConflict,
		httperr.ErrCodePlannedPaymentVersionConflict,
		"planned payment was modified by another request, please refetch and retry",
	},
	domain.ErrAccountHasTransactions: {
		http.StatusConflict,
		httperr.ErrCodeAccountInUse,
		"account has transactions and cannot be deleted",
	},
	domain.ErrCategoryHasTransactions: {
		http.StatusConflict,
		httperr.ErrCodeCategoryInUse,
		"category has transactions and cannot be deleted",
	},
	domain.ErrDebtorHasOperations: {
		http.StatusConflict,
		httperr.ErrCodeDebtorInUse,
		"debtor has debt operations and cannot be deleted",
	},
	domain.ErrAccountHasPlannedPayments: {
		http.StatusConflict,
		httperr.ErrCodeAccountInUse,
		"account has planned payments and cannot be deleted",
	},
	domain.ErrCategoryHasPlannedPayments: {
		http.StatusConflict,
		httperr.ErrCodeCategoryInUse,
		"category has planned payments and cannot be deleted",
	},
	domain.ErrEmailAlreadyVerified: {
		http.StatusConflict,
		httperr.ErrCodeEmailAlreadyVerified,
		"email already verified",
	},

	// --- auth (401/403) ---
	domain.ErrInvalidCredentials: {
		http.StatusUnauthorized,
		httperr.ErrCodeInvalidCredentials,
		"invalid credentials",
	},
	domain.ErrInvalidVerificationCode: {
		http.StatusForbidden,
		httperr.ErrCodeInvalidVerificationCode,
		"invalid verification code",
	},

	// --- verification / password-reset code states (400) ---
	domain.ErrPasswordResetTokenNotFound: {
		http.StatusBadRequest,
		httperr.ErrCodeInvalidPasswordResetToken,
		"invalid or expired reset token",
	},
	domain.ErrVerificationCodeExpired: {
		http.StatusBadRequest,
		httperr.ErrCodeVerificationCodeExpired,
		"verification code expired, request a new one",
	},
	domain.ErrVerificationCodeNotFound: {
		http.StatusBadRequest,
		httperr.ErrCodeVerificationCodeNotFound,
		"no active verification code, request a new one",
	},

	// --- transaction business-rule violations (422) ---
	domain.ErrTransactionAccountNotFound: {
		http.StatusUnprocessableEntity,
		httperr.ErrCodeAccountNotFound,
		"account not found",
	},
	domain.ErrTransactionCategoryNotFound: {
		http.StatusUnprocessableEntity,
		httperr.ErrCodeCategoryNotFound,
		"category not found",
	},
	domain.ErrTransactionFromAccountNotFound: {
		http.StatusUnprocessableEntity,
		httperr.ErrCodeAccountNotFound,
		"account not found",
	},
	domain.ErrTransactionToAccountNotFound: {
		http.StatusUnprocessableEntity,
		httperr.ErrCodeAccountNotFound,
		"account not found",
	},
	domain.ErrCategoryTypeMismatch: {
		http.StatusUnprocessableEntity,
		httperr.ErrCodeCategoryTypeMismatch,
		"transaction type does not match category type",
	},
	domain.ErrSameAccountTransfer: {
		http.StatusUnprocessableEntity,
		httperr.ErrCodeSameAccountTransfer,
		"transaction from and to accounts are the same",
	},
	domain.ErrDebtOperationDebtorNotFound: {
		http.StatusUnprocessableEntity,
		httperr.ErrCodeDebtOperationDebtorNotFound,
		"debtor not found",
	},
	domain.ErrPlannedPaymentAccountNotFound: {
		http.StatusUnprocessableEntity,
		httperr.ErrCodePlannedPaymentAccountNotFound,
		"account not found",
	},
	domain.ErrPlannedPaymentCategoryNotFound: {
		http.StatusUnprocessableEntity,
		httperr.ErrCodePlannedPaymentCategoryNotFound,
		"category not found",
	},
	domain.ErrPlannedPaymentCategoryTypeMismatch: {
		http.StatusUnprocessableEntity,
		httperr.ErrCodePlannedPaymentCategoryNotFound,
		"plan type does not match category type",
	},
	domain.ErrInvalidDate: {
		http.StatusBadRequest,
		httperr.ErrCodeValidationFailed,
		"date must be YYYY-MM-DD",
	},
	domain.ErrInvalidRefs: {
		http.StatusUnprocessableEntity,
		httperr.ErrCodeInvalidRefs,
		"invalid references",
	},

	// --- transport/service errors ---
	service.ErrNoFieldsToUpdate: {http.StatusBadRequest, httperr.ErrCodeValidationFailed, "no fields to update"},
	service.ErrInvalidCursor:    {http.StatusBadRequest, httperr.ErrCodeInvalidRequest, "invalid cursor"},

	// --- household / profile ---
	domain.ErrInvalidDisplayName: {
		http.StatusBadRequest,
		httperr.ErrCodeValidationFailed,
		"display name must be 1-100 characters after trimming",
	},
	// The household endpoints operate on the middleware-resolved membership, so
	// a missing household/membership is a violated data invariant, not a client
	// error: it surfaces as 500 so it is logged and noticed.
	domain.ErrHouseholdNotFound:  {http.StatusInternalServerError, httperr.ErrCodeInternal, "internal server error"},
	domain.ErrMembershipNotFound: {http.StatusInternalServerError, httperr.ErrCodeInternal, "internal server error"},

	// --- household join lifecycle (household-join change) ---
	domain.ErrHouseholdOwnerRequired: {http.StatusForbidden, httperr.ErrCodeForbidden, "only the household owner may perform this action"},
	domain.ErrInvitationNotFound: {
		http.StatusNotFound,
		httperr.ErrCodeHouseholdInvitationNotFound,
		"invitation not found",
	},
	domain.ErrInvitationEmailMismatch: {
		http.StatusForbidden,
		httperr.ErrCodeHouseholdInvitationEmailMismatch,
		"this invitation was sent to a different email address",
	},
	domain.ErrInvitationExpired: {
		http.StatusBadRequest,
		httperr.ErrCodeHouseholdInvitationExpired,
		"invitation expired",
	},
	domain.ErrInvitationRevoked: {
		http.StatusBadRequest,
		httperr.ErrCodeHouseholdInvitationRevoked,
		"invitation revoked",
	},
	domain.ErrInvitationAlreadyAccepted: {
		http.StatusConflict,
		httperr.ErrCodeHouseholdInvitationAlreadyAccepted,
		"invitation already accepted",
	},
	domain.ErrInvitationAlreadyMember: {
		http.StatusConflict,
		httperr.ErrCodeHouseholdInvitationAlreadyMember,
		"this email is already a member of the household",
	},
	domain.ErrInvitationRateLimited: {
		http.StatusTooManyRequests,
		httperr.ErrCodeHouseholdInvitationRateLimited,
		"household invitation rate limit exceeded, try again later",
	},
	domain.ErrHouseholdCodeInvalid: {
		http.StatusBadRequest,
		httperr.ErrCodeHouseholdCodeInvalid,
		"unknown or revoked household code",
	},
	domain.ErrHouseholdOwnerWithMembers: {
		http.StatusConflict,
		httperr.ErrCodeHouseholdOwnerWithMembers,
		"the owner cannot leave a household with other members; remove them or dissolve the household",
	},
	domain.ErrHouseholdMemberNotFound: {
		http.StatusNotFound,
		httperr.ErrCodeHouseholdMemberNotFound,
		"member not found",
	},
	domain.ErrHouseholdMemberIsOwner: {
		http.StatusConflict,
		httperr.ErrCodeHouseholdMemberIsOwner,
		"the owner cannot be removed; dissolve the household instead",
	},
	domain.ErrHouseholdDissolveConfirmRequired: {
		http.StatusBadRequest,
		httperr.ErrCodeHouseholdDissolveConfirmRequired,
		"dissolution requires an explicit confirm",
	},
}

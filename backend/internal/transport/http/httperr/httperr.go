// Package httperr provides the shared HTTP error response shape and helpers to
// write it. Handlers and middleware use the same types and codes so clients can
// parse errors uniformly regardless of which layer produced them.
package httperr

import (
	"github.com/gin-gonic/gin"
)

const (
	ErrCodeUserAlreadyExists              = "USER_ALREADY_EXISTS"
	ErrCodeInvalidCredentials             = "INVALID_CREDENTIALS" //nolint:gosec // G101 false positive: error code string, not a credential
	ErrCodeInvalidRequest                 = "INVALID_REQUEST"
	ErrCodeValidationFailed               = "VALIDATION_FAILED"
	ErrCodeAccountNotFound                = "ACCOUNT_NOT_FOUND"
	ErrCodeCategoryNotFound               = "CATEGORY_NOT_FOUND"
	ErrCodeCategoryAlreadyExists          = "CATEGORY_ALREADY_EXISTS"
	ErrCodeCategoryTypeMismatch           = "CATEGORY_TYPE_MISMATCH"
	ErrCodeCategoryArchived               = "CATEGORY_ARCHIVED"
	ErrCodeTransactionNotFound            = "TRANSACTION_NOT_FOUND"
	ErrCodeInternal                       = "INTERNAL_ERROR"
	ErrCodeForbidden                      = "FORBIDDEN"
	ErrCodeAccountInUse                   = "ACCOUNT_IN_USE"
	ErrCodeCategoryInUse                  = "CATEGORY_IN_USE"
	ErrCodeInvalidRefs                    = "INVALID_REFS"
	ErrCodeInvalidAmount                  = "INVALID_AMOUNT"
	ErrCodeSameAccountTransfer            = "SAME_ACCOUNT_TRANSFER"
	ErrCodeUnauthorized                   = "UNAUTHORIZED"
	ErrCodeTooManyRequests                = "TOO_MANY_REQUESTS"
	ErrCodeIdempotencyKeyMissing          = "IDEMPOTENCY_KEY_MISSING"
	ErrCodeIdempotencyKeyInUse            = "IDEMPOTENCY_KEY_IN_USE"
	ErrCodeIdempotencyKeyMismatch         = "IDEMPOTENCY_KEY_MISMATCH"
	ErrCodeTransactionVersionConflict     = "TRANSACTION_VERSION_CONFLICT"
	ErrCodeAccountVersionConflict         = "ACCOUNT_VERSION_CONFLICT"
	ErrCodeCategoryVersionConflict        = "CATEGORY_VERSION_CONFLICT"
	ErrCodeAccountAlreadyExists           = "ACCOUNT_ALREADY_EXISTS"
	ErrCodeTransactionAlreadyExists       = "TRANSACTION_ALREADY_EXISTS"
	ErrCodeEmailAlreadyVerified           = "EMAIL_ALREADY_VERIFIED"
	ErrCodeInvalidVerificationCode        = "INVALID_VERIFICATION_CODE"
	ErrCodeVerificationCodeExpired        = "VERIFICATION_CODE_EXPIRED"
	ErrCodeVerificationCodeNotFound       = "VERIFICATION_CODE_NOT_FOUND"
	ErrCodeInvalidPasswordResetToken      = "INVALID_PASSWORD_RESET_TOKEN"
	ErrCodeDebtorNotFound                 = "DEBTOR_NOT_FOUND"
	ErrCodeDebtorAlreadyExists            = "DEBTOR_ALREADY_EXISTS"
	ErrCodeDebtorInUse                    = "DEBTOR_IN_USE"
	ErrCodeDebtorVersionConflict          = "DEBTOR_VERSION_CONFLICT"
	ErrCodeDebtOperationNotFound          = "DEBT_OPERATION_NOT_FOUND"
	ErrCodeDebtOperationAlreadyExists     = "DEBT_OPERATION_ALREADY_EXISTS"
	ErrCodeDebtOperationVersionConflict   = "DEBT_OPERATION_VERSION_CONFLICT"
	ErrCodeDebtOperationDebtorNotFound    = "DEBT_OPERATION_DEBTOR_NOT_FOUND"
	ErrCodePlannedPaymentNotFound         = "PLANNED_PAYMENT_NOT_FOUND"
	ErrCodePlannedPaymentAlreadyExists    = "PLANNED_PAYMENT_ALREADY_EXISTS"
	ErrCodePlannedPaymentVersionConflict  = "PLANNED_PAYMENT_VERSION_CONFLICT"
	ErrCodePlannedPaymentAccountNotFound  = "PLANNED_PAYMENT_ACCOUNT_NOT_FOUND"
	ErrCodePlannedPaymentCategoryNotFound = "PLANNED_PAYMENT_CATEGORY_NOT_FOUND"
	ErrCodePlannedPaymentCategoryArchived = "PLANNED_PAYMENT_CATEGORY_ARCHIVED"

	// ErrCodeHouseholdInvitationNotFound and the codes below it carry the
	// household join lifecycle (household-join change).
	ErrCodeHouseholdInvitationNotFound        = "HOUSEHOLD_INVITATION_NOT_FOUND"
	ErrCodeHouseholdInvitationEmailMismatch   = "HOUSEHOLD_INVITATION_EMAIL_MISMATCH"
	ErrCodeHouseholdInvitationExpired         = "HOUSEHOLD_INVITATION_EXPIRED"
	ErrCodeHouseholdInvitationRevoked         = "HOUSEHOLD_INVITATION_REVOKED"
	ErrCodeHouseholdInvitationAlreadyAccepted = "HOUSEHOLD_INVITATION_ALREADY_ACCEPTED"
	ErrCodeHouseholdInvitationAlreadyMember   = "HOUSEHOLD_INVITATION_ALREADY_MEMBER"
	ErrCodeHouseholdInvitationRateLimited     = "HOUSEHOLD_INVITATION_RATE_LIMITED"
	ErrCodeHouseholdCodeInvalid               = "HOUSEHOLD_CODE_INVALID"
	ErrCodeHouseholdOwnerWithMembers          = "HOUSEHOLD_OWNER_WITH_MEMBERS"
	ErrCodeHouseholdMemberNotFound            = "HOUSEHOLD_MEMBER_NOT_FOUND"
	ErrCodeHouseholdMemberIsOwner             = "HOUSEHOLD_MEMBER_IS_OWNER"
	ErrCodeHouseholdDissolveConfirmRequired   = "HOUSEHOLD_DISSOLVE_CONFIRM_REQUIRED"

	// Transport-hardening codes (api-hardening change): unlike the domain
	// sentinels mapped in errormap.go, these are written directly by their
	// middleware via httperr.Write (middleware rejections cannot flow
	// through the strict-handler error mapper).

	// ErrCodeOriginRejected is the 403 for non-GET requests whose Origin is
	// outside the CORS allowlist (ADR-0001 CSRF control).
	ErrCodeOriginRejected = "ORIGIN_REJECTED"

	// ErrCodeRegisterRateLimited is the 429 for over-budget registration
	// attempts from one client IP (count-all-attempts limiter).
	ErrCodeRegisterRateLimited = "REGISTER_RATE_LIMITED"
)

type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Write sends a JSON error response with the given status, code, and message.
func Write(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, ErrorResponse{
		Code:    code,
		Message: message,
	})
}

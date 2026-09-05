// Package httperr provides the shared HTTP error response shape and helpers to
// write it. Handlers and middleware use the same types and codes so clients can
// parse errors uniformly regardless of which layer produced them.
package httperr

import (
	"github.com/gin-gonic/gin"
)

const (
	ErrCodeInvalidRequest         = "INVALID_REQUEST"
	ErrCodeValidationFailed       = "VALIDATION_FAILED"
	ErrCodeInternal               = "INTERNAL_ERROR"
	ErrCodeUnauthorized           = "UNAUTHORIZED"
	ErrCodeTooManyRequests        = "TOO_MANY_REQUESTS"
	ErrCodeIdempotencyKeyMissing  = "IDEMPOTENCY_KEY_MISSING"
	ErrCodeIdempotencyKeyInUse    = "IDEMPOTENCY_KEY_IN_USE"
	ErrCodeIdempotencyKeyMismatch = "IDEMPOTENCY_KEY_MISMATCH"

	// Entity/domain machine codes are NOT defined here anymore: they live in
	// domain.errorSpecs (domain.ErrorSpecFor), shared by the REST mapper and
	// the sync push results. What remains are the transport-only codes,
	// written directly by middleware via httperr.Write (middleware rejections
	// cannot flow through the strict-handler error mapper). The union of
	// these constants and errorSpecs is parity-checked against
	// docs/api/openapi.yaml by internal/domain/errspec_parity_test.go — a new
	// constant here must join its transportEmittedCodes list and, unless
	// undocumentedCodes covers it, get a `code:` example in the spec.

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

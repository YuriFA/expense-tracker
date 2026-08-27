// Package httpctx provides typed accessors for request-scoped values set by
// middleware (the authenticated user, the current session id, the request id).
package httpctx

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/transport/http/keys"
)

// CurrentUser returns the authenticated user set by the auth middleware, or nil.
func CurrentUser(c *gin.Context) *domain.User {
	val, exists := c.Get(keys.CurrentUserKey)
	if !exists {
		return nil
	}
	user, ok := val.(*domain.User)
	if !ok {
		return nil
	}
	return user
}

// CurrentSessionID returns the current session id set by the auth middleware.
func CurrentSessionID(c *gin.Context) string {
	return c.GetString(keys.CurrentSessionIDKey)
}

// CurrentHouseholdID returns the household id of the user's (single, v1)
// membership, resolved by the auth middleware, or uuid.Nil when absent.
func CurrentHouseholdID(c *gin.Context) uuid.UUID {
	return c.MustGet(keys.CurrentHouseholdKey).(uuid.UUID)
}

// RequestID returns the X-Request-ID for the request.
func RequestID(c *gin.Context) string {
	return c.GetHeader(keys.RequestIDHeader)
}

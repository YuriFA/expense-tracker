package httpctx

import (
	"github.com/yurifa/expense-tracker-api/internal/http-server/keys"
	"github.com/yurifa/expense-tracker-api/internal/storage"

	"github.com/gin-gonic/gin"
)

func CurrentUser(c *gin.Context) *storage.User {
	val, exists := c.Get(keys.CurrentUserKey)
	if !exists {
		return nil
	}
	user, ok := val.(*storage.User)
	if !ok {
		return nil
	}
	return user
}

func CurrentSessionID(c *gin.Context) string {
	return c.GetString(keys.CurrentSessionIDKey)
}

func RequestID(c *gin.Context) string {
	return c.GetHeader(keys.RequestIDHeader)
}

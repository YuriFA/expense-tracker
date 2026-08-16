// Package http is the transport layer: it implements the generated
// StrictServerInterface as thin handlers that extract the authenticated userID
// from the request context, call a service, and map domain results/errors to
// typed OpenAPI response objects. No business logic, no SQL lives here.
package http

import (
	"context"

	"github.com/gin-gonic/gin"

	"github.com/yurifa/expense-tracker-api/internal/config"
	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/service"
	"github.com/yurifa/expense-tracker-api/internal/transport/http/httpctx"
)

// Server implements api.StrictServerInterface. It holds the services and the
// session config (needed to set/clear cookies on login/logout).
type Server struct {
	cfg        *config.HTTPServer
	accounts   *service.AccountService
	categories *service.CategoryService
	txn        *service.TransactionService
	auth       *service.AuthService
	sessions   *service.SessionService
	sync       *service.SyncService
}

func NewServer(
	cfg *config.HTTPServer,
	accounts *service.AccountService,
	categories *service.CategoryService,
	txn *service.TransactionService,
	auth *service.AuthService,
	sessions *service.SessionService,
	sync *service.SyncService,
) *Server {
	return &Server{
		cfg:      cfg,
		accounts: accounts, categories: categories, txn: txn,
		auth: auth, sessions: sessions, sync: sync,
	}
}

// ginCtx extracts the underlying *gin.Context. oapi-codegen passes the gin
// context as a [context.Context] to the strict handler; this type assertion
// recovers it so handlers can read auth context / set cookies.
func ginCtx(ctx context.Context) *gin.Context {
	c, _ := ctx.(*gin.Context)
	return c
}

// currentUser returns the authenticated user (guaranteed set by auth middleware
// on protected routes).
func (s *Server) currentUser(ctx context.Context) *domain.User {
	return httpctx.CurrentUser(ginCtx(ctx))
}

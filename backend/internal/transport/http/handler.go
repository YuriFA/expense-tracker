// Package http is the transport layer: it implements the generated
// StrictServerInterface as thin handlers that extract the authenticated userID
// from the request context, call a service, and map domain results/errors to
// typed OpenAPI response objects. No business logic, no SQL lives here.
package http

import (
	"context"
	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/yurifa/expense-tracker-api/internal/config"
	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/logger"
	"github.com/yurifa/expense-tracker-api/internal/service"
	"github.com/yurifa/expense-tracker-api/internal/transport/http/httpctx"
)

// Server implements api.StrictServerInterface. It holds the services, the
// session config (needed to set/clear cookies on login/logout), and a logger
// for request telemetry (sync metrics events).
type Server struct {
	cfg        *config.HTTPServer
	log        *slog.Logger
	accounts   *service.AccountService
	categories *service.CategoryService
	txn        *service.TransactionService
	debtors    *service.DebtorService
	debtOps    *service.DebtOperationService
	plans      *service.PlannedPaymentService
	auth       *service.AuthService
	sessions   *service.SessionService
	sync       *service.SyncService
}

func NewServer(
	cfg *config.HTTPServer,
	log *slog.Logger,
	accounts *service.AccountService,
	categories *service.CategoryService,
	txn *service.TransactionService,
	debtors *service.DebtorService,
	debtOps *service.DebtOperationService,
	plans *service.PlannedPaymentService,
	auth *service.AuthService,
	sessions *service.SessionService,
	sync *service.SyncService,
) *Server {
	return &Server{
		cfg:      cfg,
		log:      logger.WithComponent(log, "http"),
		accounts: accounts, categories: categories, txn: txn,
		debtors: debtors, debtOps: debtOps,
		plans: plans,
		auth:  auth, sessions: sessions, sync: sync,
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

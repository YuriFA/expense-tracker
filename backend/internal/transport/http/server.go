package http

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	ginmiddleware "github.com/oapi-codegen/gin-middleware"

	"github.com/yurifa/expense-tracker-api/internal/api"
	"github.com/yurifa/expense-tracker-api/internal/config"
	"github.com/yurifa/expense-tracker-api/internal/repository"
	"github.com/yurifa/expense-tracker-api/internal/transport/http/httperr"
	"github.com/yurifa/expense-tracker-api/internal/transport/http/middleware"
)

const corsMaxAge = 12 * time.Hour

// NewEngine builds the gin engine, wires middleware (request-id, recovery,
// logging, CORS, spec-driven request validation, auth, rate limit, idempotency)
// and registers the generated handlers backed by the StrictServerInterface.
func NewEngine(
	cfg *config.HTTPServer,
	log *slog.Logger,
	ssi api.StrictServerInterface,
	sessions repository.SessionRepository,
	users repository.UserRepository,
	idempotency repository.IdempotencyRepository,
) *gin.Engine {
	router := gin.New()
	if err := router.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		panic("failed to set trusted proxies: " + err.Error())
	}

	// ADR-0001 (docs/adr/0001-auth-csrf-threat-model.md): the Origin/CORS
	// allowlist is the CSRF correctness dependency — explicit origins only.
	// Wildcard/empty origins are forbidden while credentials are enabled:
	// browsers reject credentialed wildcards, so fail fast instead.
	for _, origin := range cfg.CorsConfig.AllowedOrigins {
		if origin == "*" || origin == "" {
			panic("forbidden cors allowed origin " + origin + ": explicit origins only (ADR-0001)")
		}
	}

	router.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CorsConfig.AllowedOrigins,
		AllowMethods:     cfg.CorsConfig.AllowedMethods,
		AllowHeaders:     cfg.CorsConfig.AllowedHeaders,
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           corsMaxAge,
	}))
	router.Use(middleware.RequestID())
	router.Use(gin.Recovery())
	router.Use(middleware.SlogLogger(log))

	// API docs: served from the embedded spec (the same copy that powers
	// runtime validation), so the routes work from any working directory
	// and can never drift from the contract. Registered BEFORE the
	// spec-validation middleware — /docs is deliberately not part of the
	// OpenAPI contract, so the validator would 404 it.
	router.GET("/docs", func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(redocShell))
	})
	router.GET("/docs/openapi.json", func(c *gin.Context) {
		spec, err := api.GetSpecJSON()
		if err != nil {
			httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to serialize spec")
			return
		}
		c.Data(http.StatusOK, "application/json", spec)
	})

	// Spec-driven request validation (path/query/header params + request body)
	// via the embedded OpenAPI document. Auth is NOT enforced here (see below).
	swagger, err := api.GetSpec()
	if err != nil {
		panic("failed to load embedded spec: " + err.Error())
	}
	swagger.Servers = nil // accept any host
	router.Use(ginmiddleware.OapiRequestValidatorWithOptions(swagger, &ginmiddleware.Options{
		ErrorHandler: validationErrorHandler,
		Options: openapi3filter.Options{
			AuthenticationFunc: func(_ context.Context, _ *openapi3filter.AuthenticationInput) error {
				return nil
			},
		},
	}))

	// Auth (path-aware), rate limit (login + verify), idempotency (create txn).
	publicRoutes := publicRouteSet()
	router.Use(pathAwareAuth(sessions, users, log, cfg, publicRoutes))
	loginRL := middleware.NewFailureRateLimiter(cfg.FailureRateLimit.MaxAttempts, cfg.FailureRateLimit.LockoutDuration)
	verifyRL := middleware.NewFailureRateLimiter(cfg.FailureRateLimit.MaxAttempts, cfg.FailureRateLimit.LockoutDuration)
	router.Use(pathAwareRateLimit(map[string]*middleware.FailureRateLimiter{
		"POST:/api/auth/login":        loginRL,
		"POST:/api/auth/verify-email": verifyRL,
	}))
	router.Use(pathAwareIdempotency(idempotency, log))

	// Strict handlers return (ResponseObject, error); on error the central
	// domain-error -> HTTP mapper writes the response (see writeDomainError).
	strictHandler := api.NewStrictHandlerWithOptions(ssi, nil, api.StrictGinServerOptions{
		HandlerErrorFunc: func(c *gin.Context, err error) { writeDomainError(c, log, err) },
	})
	api.RegisterHandlers(router, strictHandler)

	return router
}

// validationErrorHandler maps the spec validator's failures to the project's
// VALIDATION_FAILED response shape.
func validationErrorHandler(c *gin.Context, message string, statusCode int) {
	httperr.Write(c, statusCode, httperr.ErrCodeValidationFailed, message)
}

// publicRouteSet returns the routes callable WITHOUT a valid session cookie
// (security: [] plus logout, which is idempotent and clears the cookie).
func publicRouteSet() map[string]bool {
	return map[string]bool{
		"POST:/api/auth/register":               true,
		"POST:/api/auth/login":                  true,
		"POST:/api/auth/logout":                 true,
		"POST:/api/auth/password-reset/request": true,
		"POST:/api/auth/password-reset/confirm": true,
	}
}

func pathAwareAuth(
	sessions repository.SessionRepository,
	users repository.UserRepository,
	log *slog.Logger,
	cfg *config.HTTPServer,
	publicRoutes map[string]bool,
) gin.HandlerFunc {
	inner := middleware.AuthRequired(sessions, users, log, cfg)
	return func(c *gin.Context) {
		if isPublic(c, publicRoutes) || !strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.Next()
			return
		}
		inner(c)
	}
}

func isPublic(c *gin.Context, publicRoutes map[string]bool) bool {
	return publicRoutes[c.Request.Method+":"+c.Request.URL.Path]
}

func pathAwareRateLimit(limiters map[string]*middleware.FailureRateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		rl, ok := limiters[c.Request.Method+":"+c.Request.URL.Path]
		if !ok {
			c.Next()
			return
		}
		middleware.RateLimit(rl)(c)
	}
}

func pathAwareIdempotency(repo repository.IdempotencyRepository, log *slog.Logger) gin.HandlerFunc {
	inner := middleware.Idempotency(repo, log)
	return func(c *gin.Context) {
		if c.Request.Method+":"+c.Request.URL.Path != "POST:/api/transactions" {
			c.Next()
			return
		}
		inner(c)
	}
}

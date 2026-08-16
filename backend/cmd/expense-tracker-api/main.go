package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/yurifa/expense-tracker-api/internal/config"
	"github.com/yurifa/expense-tracker-api/internal/jobs/cleanup"
	"github.com/yurifa/expense-tracker-api/internal/jobs/retention"
	"github.com/yurifa/expense-tracker-api/internal/logger"
	"github.com/yurifa/expense-tracker-api/internal/repository/postgres"
	"github.com/yurifa/expense-tracker-api/internal/service"
	httptransport "github.com/yurifa/expense-tracker-api/internal/transport/http"
)

func main() {
	cfg := config.MustLoad()
	log := logger.New(logger.Options{Environment: cfg.Env, AppName: "expense-tracker-api"})

	if err := run(cfg, log); err != nil {
		log.Error("fatal error", logger.Error(err))
		os.Exit(1)
	}
}

func run(cfg *config.Config, log *slog.Logger) error {
	log.Info("logger initialized", slog.String("env", cfg.Env))

	ctx := context.Background()

	if err := postgres.RunMigrations(cfg.DatabaseURL); err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}
	log.Info("migrations applied")

	pool, err := postgres.New(ctx, cfg.DatabaseURL, cfg.Database)
	if err != nil {
		return fmt.Errorf("initialize db pool: %w", err)
	}
	defer func() {
		pool.Close()
	}()

	repo := postgres.NewRepository(pool)
	log.Info("database initialized")

	srv := newHTTPServer(cfg, repo, log)
	log.Info("starting server", slog.String("address", cfg.Address))

	serverErr := make(chan error, 1)
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
			return
		}
		serverErr <- nil
	}()

	bgCtx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cleanupJob := cleanup.New(repo, log, cfg.SessionConfig.CleanupInterval)
	jobDone := make(chan struct{})
	go func() {
		defer close(jobDone)
		_ = cleanupJob.Run(bgCtx)
	}()

	retentionJob := retention.New(repo, log, cfg.Retention.TombstoneWindow, cfg.Retention.Interval)
	retentionDone := make(chan struct{})
	go func() {
		defer close(retentionDone)
		_ = retentionJob.Run(bgCtx)
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	var runErr error
	select {
	case sig := <-quit:
		log.Info("shutting down server", slog.String("signal", sig.String()))
	case err := <-serverErr:
		runErr = fmt.Errorf("listen and serve: %w", err)
	}

	cancel()
	<-jobDone
	<-retentionDone

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), cfg.WriteTimeout)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		if runErr != nil {
			log.Error("server shutdown failed", logger.Error(err))
		} else {
			runErr = fmt.Errorf("server shutdown: %w", err)
		}
	}

	if runErr != nil {
		return runErr
	}

	log.Info("server exiting")
	return nil
}

// newHTTPServer wires every service to the single *postgres.Repository, builds
// the gin engine, and returns a configured *[http.Server] ready to serve.
func newHTTPServer(cfg *config.Config, repo *postgres.Repository, log *slog.Logger) *http.Server {
	accountSvc := service.NewAccountService(repo)
	categorySvc := service.NewCategoryService(repo)
	txnSvc := service.NewTransactionService(repo, repo, repo)
	authSvc := service.NewAuthService(repo, repo, repo, repo, service.NewLogMailer(log), service.AuthConfig{
		SessionTTL: cfg.SessionConfig.TTL,
	})
	sessionSvc := service.NewSessionService(repo)
	syncSvc := service.NewSyncService(repo)

	server := httptransport.NewServer(
		&cfg.HTTPServer,
		log,
		accountSvc,
		categorySvc,
		txnSvc,
		authSvc,
		sessionSvc,
		syncSvc,
	)
	router := httptransport.NewEngine(&cfg.HTTPServer, log, server, repo, repo, repo)

	return &http.Server{
		Addr:         cfg.Address,
		Handler:      router,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}
}

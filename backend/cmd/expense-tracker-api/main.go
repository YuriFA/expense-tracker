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
	httpserver "github.com/yurifa/expense-tracker-api/internal/http-server"
	"github.com/yurifa/expense-tracker-api/internal/http-server/handlers"
	"github.com/yurifa/expense-tracker-api/internal/jobs/cleanup"
	"github.com/yurifa/expense-tracker-api/internal/logger"
	"github.com/yurifa/expense-tracker-api/internal/storage/sqlite"
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
	log.Info("Logger initialized", slog.String("env", cfg.Env))
	log.Debug("Debug message: Logger is set to debug level")

	db, err := sqlite.New(cfg.StoragePath)
	if err != nil {
		return fmt.Errorf("initialize storage: %w", err)
	}
	defer func() {
		if cerr := db.Close(); cerr != nil {
			log.Error("failed to close database", logger.Error(cerr))
		}
	}()

	if err := db.RunMigrations(); err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}

	log.Info("Storage initialized")

	h := handlers.NewHandler(log, db, &cfg.HTTPServer)
	router := httpserver.NewRouter(log, db, h, &cfg.HTTPServer)

	log.Info("Starting server", slog.String("address", cfg.Address))

	srv := &http.Server{
		Addr:         cfg.Address,
		Handler:      router,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}

	serverErr := make(chan error, 1)
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
			return
		}
		serverErr <- nil
	}()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cleanupJob := cleanup.New(db, log, cfg.SessionConfig.CleanupInterval)
	jobDone := make(chan struct{})
	go func() {
		defer close(jobDone)
		_ = cleanupJob.Run(ctx)
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

	log.Info("Server exiting")
	return nil
}

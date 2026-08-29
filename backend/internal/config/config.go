package config

import (
	"fmt"
	"os"
	"time"

	"github.com/ilyakaznacheev/cleanenv"
)

type Config struct {
	HTTPServer `yaml:"http_server"`

	Env            string               `yaml:"env"             env:"ENV"          env-required:"true"`
	DatabaseURL    string               `yaml:"database_url"    env:"DATABASE_URL" env-required:"true"`
	Database       DatabaseConfig       `yaml:"database"`
	Retention      RetentionConfig      `yaml:"retention"`
	PlannedConfirm PlannedConfirmConfig `yaml:"planned_confirm"`
	Household      HouseholdConfig      `yaml:"household"`
}

// RetentionConfig tunes the tombstone retention job: soft-deleted rows older
// than TombstoneWindow are hard-deleted; the change_log is never pruned.
type RetentionConfig struct {
	TombstoneWindow time.Duration `yaml:"tombstone_window" env:"RETENTION_TOMBSTONE_WINDOW" env-default:"2160h"` // 90 days
	Interval        time.Duration `yaml:"interval"         env:"RETENTION_INTERVAL"         env-default:"1h"`
}

// PlannedConfirmConfig tunes the automatic planned-payment executor: how
// often the job sweeps for due auto plans.
type PlannedConfirmConfig struct {
	Interval time.Duration `yaml:"interval" env:"PLANNED_CONFIRM_INTERVAL" env-default:"1h"`
}

// HouseholdConfig tunes the join lifecycle (household-join change): the
// invitation token TTL, the per-household/day send budget, and the web app
// base URL used to build emailed accept links.
type HouseholdConfig struct {
	InvitationTTL            time.Duration `yaml:"invitation_ttl"               env:"HOUSEHOLD_INVITATION_TTL"               env-default:"168h"` // 7 days
	MaxInvitationSendsPerDay int           `yaml:"max_invitation_sends_per_day" env:"HOUSEHOLD_MAX_INVITATION_SENDS_PER_DAY" env-default:"20"`
	WebAppBaseURL            string        `yaml:"web_app_base_url"             env:"HOUSEHOLD_WEB_APP_BASE_URL"             env-default:""`
}

// DatabaseConfig tunes the pgxpool connection pool.
type DatabaseConfig struct {
	MaxConns        int32         `yaml:"max_conns"          env:"DB_MAX_CONNS"          env-default:"10"`
	MinConns        int32         `yaml:"min_conns"          env:"DB_MIN_CONNS"          env-default:"2"`
	MaxConnIdleTime time.Duration `yaml:"max_conn_idle_time" env:"DB_MAX_CONN_IDLE_TIME" env-default:"30m"`
	MaxConnLifetime time.Duration `yaml:"max_conn_lifetime"  env:"DB_MAX_CONN_LIFETIME"  env-default:"1h"`
}

type HTTPServer struct {
	FailureRateLimit  `yaml:"failure_rate_limit"`
	RegisterRateLimit `yaml:"register_rate_limit"`

	Address        string        `yaml:"address"         env-default:"localhost:8080"`
	ReadTimeout    time.Duration `yaml:"read_timeout"    env-default:"5s"`
	WriteTimeout   time.Duration `yaml:"write_timeout"   env-default:"30s"`
	IdleTimeout    time.Duration `yaml:"idle_timeout"    env-default:"60s"`
	CorsConfig     CORSConfig    `yaml:"cors"`
	SessionConfig  SessionConfig `yaml:"session"`
	TrustedProxies []string      `yaml:"trusted_proxies" env-default:""               env:"TRUSTED_PROXIES" env-separator:","`
}

type FailureRateLimit struct {
	MaxAttempts     int           `yaml:"max_attempts"     env:"FAILURE_RATE_LIMIT_MAX_ATTEMPTS"     env-default:"5"`
	LockoutDuration time.Duration `yaml:"lockout_duration" env:"FAILURE_RATE_LIMIT_LOCKOUT_DURATION" env-default:"15m"`
}

// RegisterRateLimit throttles POST /api/auth/register per client IP. Unlike
// FailureRateLimit, every attempt counts (success or failure): account
// creation is the abuse, not the failure.
type RegisterRateLimit struct {
	MaxAttempts     int           `yaml:"max_attempts"     env:"REGISTER_RATE_LIMIT_MAX_ATTEMPTS"     env-default:"10"`
	LockoutDuration time.Duration `yaml:"lockout_duration" env:"REGISTER_RATE_LIMIT_LOCKOUT_DURATION" env-default:"1h"`
}

type SessionConfig struct {
	TTL        time.Duration `yaml:"ttl"         env:"SESSION_TTL"         env-default:"24h"`
	CookieName string        `yaml:"cookie_name" env:"SESSION_COOKIE_NAME" env-default:"session_id"`
	// No env-default on purpose: cleanenv applies env-default to any
	// zero-value field, so `secure: false` in a yaml file (e.g. the plain-HTTP
	// local config) would be silently overridden back to true. Environments
	// MUST set `secure` explicitly (prod.yaml: true; local.yaml: false).
	Secure            bool          `yaml:"secure"             env:"SESSION_SECURE"`
	SameSite          string        `yaml:"same_site"          env:"SESSION_SAME_SITE"          env-default:"Lax"`
	SlidingExpiration bool          `yaml:"sliding_expiration" env:"SESSION_SLIDING_EXPIRATION" env-default:"true"`
	CleanupInterval   time.Duration `yaml:"cleanup_interval"   env:"SESSION_CLEANUP_INTERVAL"   env-default:"6h"`
}

type CORSConfig struct {
	// No env-default on purpose (ADR-0001): the origin allowlist is the CSRF
	// correctness dependency — it must be set explicitly (yaml or env).
	AllowedOrigins []string `yaml:"allowed_origins" env:"CORS_ALLOWED_ORIGINS" env-separator:","`
	AllowedMethods []string `yaml:"allowed_methods" env:"CORS_ALLOWED_METHODS" env-separator:"," env-default:"GET,POST,PUT,DELETE,OPTIONS"`
	AllowedHeaders []string `yaml:"allowed_headers" env:"CORS_ALLOWED_HEADERS" env-separator:"," env-default:"Content-Type,Authorization"`
}

//nolint:gosec // G703: config path is operator-controlled (env var), not user input
func loadConfig(path string) (*Config, error) {
	if path == "" {
		return nil, fmt.Errorf("CONFIG_PATH environment variable is not set")
	}

	if _, err := os.Stat(path); os.IsNotExist(err) {
		return nil, fmt.Errorf("config file does not exist at path: %s", path)
	}

	var cfg Config

	if err := cleanenv.ReadConfig(path, &cfg); err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	return &cfg, nil
}

func MustLoad() *Config {
	configPath := os.Getenv("CONFIG_PATH")

	cfg, err := loadConfig(configPath)
	if err != nil {
		panic(fmt.Sprintf("failed to load config: %v", err))
	}

	return cfg
}

package config

import (
	"fmt"
	"os"
	"time"

	"github.com/ilyakaznacheev/cleanenv"
)

type Config struct {
	HTTPServer `yaml:"http_server"`

	Env         string         `yaml:"env"          env:"ENV"          env-required:"true"`
	DatabaseURL string         `yaml:"database_url" env:"DATABASE_URL" env-required:"true"`
	Database    DatabaseConfig `yaml:"database"`
}

// DatabaseConfig tunes the pgxpool connection pool.
type DatabaseConfig struct {
	MaxConns        int32         `yaml:"max_conns"          env:"DB_MAX_CONNS"          env-default:"10"`
	MinConns        int32         `yaml:"min_conns"          env:"DB_MIN_CONNS"          env-default:"2"`
	MaxConnIdleTime time.Duration `yaml:"max_conn_idle_time" env:"DB_MAX_CONN_IDLE_TIME" env-default:"30m"`
	MaxConnLifetime time.Duration `yaml:"max_conn_lifetime"  env:"DB_MAX_CONN_LIFETIME"  env-default:"1h"`
}

type HTTPServer struct {
	FailureRateLimit `yaml:"failure_rate_limit"`

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

type SessionConfig struct {
	TTL               time.Duration `yaml:"ttl"                env:"SESSION_TTL"                env-default:"24h"`
	CookieName        string        `yaml:"cookie_name"        env:"SESSION_COOKIE_NAME"        env-default:"session_id"`
	Secure            bool          `yaml:"secure"             env:"SESSION_SECURE"             env-default:"true"`
	SameSite          string        `yaml:"same_site"          env:"SESSION_SAME_SITE"          env-default:"Lax"`
	SlidingExpiration bool          `yaml:"sliding_expiration" env:"SESSION_SLIDING_EXPIRATION" env-default:"true"`
	CleanupInterval   time.Duration `yaml:"cleanup_interval"   env:"SESSION_CLEANUP_INTERVAL"   env-default:"6h"`
}

type CORSConfig struct {
	AllowedOrigins []string `yaml:"allowed_origins" env:"CORS_ALLOWED_ORIGINS" env-default:"*"                           env-separator:","`
	AllowedMethods []string `yaml:"allowed_methods" env:"CORS_ALLOWED_METHODS" env-default:"GET,POST,PUT,DELETE,OPTIONS" env-separator:","`
	AllowedHeaders []string `yaml:"allowed_headers" env:"CORS_ALLOWED_HEADERS" env-default:"Content-Type,Authorization"  env-separator:","`
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

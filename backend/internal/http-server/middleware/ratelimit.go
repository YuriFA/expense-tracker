package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/yurifa/expense-tracker-api/internal/http-server/httperr"

	"github.com/gin-gonic/gin"
)

type attemptInfo struct {
	count       int
	lockedUntil time.Time
}

type FailureRateLimiter struct {
	mu              sync.Mutex
	attempts        map[string]*attemptInfo
	maxAttempts     int
	lockoutDuration time.Duration
}

func NewFailureRateLimiter(maxAttempts int, lockoutDuration time.Duration) *FailureRateLimiter {
	return &FailureRateLimiter{
		attempts:        make(map[string]*attemptInfo),
		maxAttempts:     maxAttempts,
		lockoutDuration: lockoutDuration,
	}
}

func (rl *FailureRateLimiter) IsLocked(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	attempt, exists := rl.attempts[key]
	if !exists {
		return false
	}

	return time.Now().Before(attempt.lockedUntil)
}

// RetryAfter returns the number of seconds until the lockout for key expires,
// or 0 if the key is not locked. Used for the Retry-After header on 429.
func (rl *FailureRateLimiter) RetryAfter(key string) int {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	attempt, exists := rl.attempts[key]
	if !exists {
		return 0
	}
	remaining := time.Until(attempt.lockedUntil)
	if remaining <= 0 {
		return 0
	}
	return int(remaining.Seconds())
}

func (rl *FailureRateLimiter) RecordFailure(key string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	attempt, exists := rl.attempts[key]
	if !exists {
		attempt = &attemptInfo{}
		rl.attempts[key] = attempt
	}

	attempt.count++
	if attempt.count >= rl.maxAttempts {
		attempt.lockedUntil = time.Now().Add(rl.lockoutDuration)
		attempt.count = 0
	}
}

func (rl *FailureRateLimiter) RecordSuccess(key string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	delete(rl.attempts, key)
}

// RateLimit returns a gin middleware that throttles failed attempts per client
// IP. After maxAttempts failures (401/403) the IP is locked for lockoutDuration.
// A subsequent 2xx response resets the counter for that IP — callers must ensure
// the middleware is only attached to routes where 2xx genuinely means the
// client succeeded at a sensitive action (e.g. /login), not e.g. /logout.
func RateLimit(rl *FailureRateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.ClientIP()
		if rl.IsLocked(key) {
			if retry := rl.RetryAfter(key); retry > 0 {
				c.Header("Retry-After", strconv.Itoa(retry))
			}
			httperr.Write(
				c,
				http.StatusTooManyRequests,
				httperr.ErrCodeTooManyRequests,
				"too many failed attempts, please try again later",
			)
			return
		}

		c.Next()

		status := c.Writer.Status()
		switch {
		case status == http.StatusUnauthorized || status == http.StatusForbidden:
			rl.RecordFailure(key)
		case status >= http.StatusOK && status < http.StatusMultipleChoices:
			rl.RecordSuccess(key)
		}
	}
}

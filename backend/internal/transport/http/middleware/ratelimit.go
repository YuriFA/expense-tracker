package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/yurifa/expense-tracker-api/internal/transport/http/httperr"
)

type attemptInfo struct {
	count       int
	lockedUntil time.Time
}

// FailureRateLimiter throttles failed attempts per key (ClientIP). After
// maxAttempts failures the key is locked for lockoutDuration; a success resets
// the counter.
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
	a, exists := rl.attempts[key]
	if !exists {
		return false
	}
	return time.Now().Before(a.lockedUntil)
}

func (rl *FailureRateLimiter) RetryAfter(key string) int {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	a, exists := rl.attempts[key]
	if !exists {
		return 0
	}
	remaining := time.Until(a.lockedUntil)
	if remaining <= 0 {
		return 0
	}
	return int(remaining.Seconds())
}

func (rl *FailureRateLimiter) RecordFailure(key string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	a, exists := rl.attempts[key]
	if !exists {
		a = &attemptInfo{}
		rl.attempts[key] = a
	}
	a.count++
	if a.count >= rl.maxAttempts {
		a.lockedUntil = time.Now().Add(rl.lockoutDuration)
		a.count = 0
	}
}

func (rl *FailureRateLimiter) RecordSuccess(key string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	delete(rl.attempts, key)
}

// RateLimit throttles failed attempts per client IP. Attach only to routes
// where 2xx genuinely means the client succeeded at a sensitive action.
func RateLimit(rl *FailureRateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.ClientIP()
		if rl.IsLocked(key) {
			if retry := rl.RetryAfter(key); retry > 0 {
				c.Header("Retry-After", strconv.Itoa(retry))
			}
			httperr.Write(c, http.StatusTooManyRequests, httperr.ErrCodeTooManyRequests,
				"too many failed attempts, please try again later")
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

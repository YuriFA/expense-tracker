package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/yurifa/expense-tracker-api/internal/http-server/middleware"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestFailureRateLimiter(t *testing.T) {
	t.Parallel()
	t.Run("TestFailureRateLimiter", func(t *testing.T) {
		t.Parallel()
		rl := middleware.NewFailureRateLimiter(3, time.Hour)

		key := "test-key"

		require.False(t, rl.IsLocked(key), "expected key to be unlocked initially")

		// Record failures and check if the key gets locked
		for range 3 {
			rl.RecordFailure(key)
		}

		require.True(t, rl.IsLocked(key), "expected key to be locked after 3 failures")

		// Record success and check if the key gets unlocked
		rl.RecordSuccess(key)
		require.False(t, rl.IsLocked(key), "expected key to be unlocked after success")
	})

	t.Run("LockoutExpires", func(t *testing.T) {
		t.Parallel()
		rl := middleware.NewFailureRateLimiter(2, 50*time.Millisecond)

		rl.RecordFailure("k")
		rl.RecordFailure("k")
		require.True(t, rl.IsLocked("k"))

		time.Sleep(60 * time.Millisecond)
		require.False(t, rl.IsLocked("k"), "expected lock to expire after lockoutDuration")
	})

	t.Run("RetryAfter", func(t *testing.T) {
		t.Parallel()
		rl := middleware.NewFailureRateLimiter(1, time.Minute)

		require.Equal(t, 0, rl.RetryAfter("absent"))

		rl.RecordFailure("k")
		// maxAttempts=1 → first failure locks immediately.
		retry := rl.RetryAfter("k")
		require.Greater(t, retry, 0)
		require.LessOrEqual(t, retry, 60)
	})
}

// newRLRouter builds a tiny gin engine with RateLimit middleware and a handler
// whose response status is controlled by `respondStatus`. Used to exercise the
// middleware through httptest.
func newRLRouter(t *testing.T, rl *middleware.FailureRateLimiter, respondStatus *int) *gin.Engine {
	t.Helper()
	router := gin.New()
	router.Use(middleware.RateLimit(rl))
	router.GET("/", func(c *gin.Context) {
		c.Status(*respondStatus)
	})
	return router
}

func TestRateLimit_Lockout(t *testing.T) {
	t.Parallel()
	rl := middleware.NewFailureRateLimiter(3, time.Hour)
	status := http.StatusUnauthorized
	router := newRLRouter(t, rl, &status)

	addr := "1.2.3.4:1234"
	for i := 1; i <= 3; i++ {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = addr
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		require.Equal(t, http.StatusUnauthorized, w.Code, "attempt %d should pass through", i)
	}

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = addr
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusTooManyRequests, w.Code)
	require.NotEmpty(t, w.Header().Get("Retry-After"), "Retry-After header should be set on 429")
}

func TestRateLimit_ResetOn2xx(t *testing.T) {
	t.Parallel()
	rl := middleware.NewFailureRateLimiter(3, time.Hour)
	status := http.StatusUnauthorized
	router := newRLRouter(t, rl, &status)
	addr := "1.2.3.4:1234"

	doReq := func() *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = addr
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		return w
	}

	// Two failures do not lock.
	doReq()
	doReq()
	require.False(t, rl.IsLocked("1.2.3.4"))

	// Success resets the counter.
	status = http.StatusOK
	doReq()
	require.False(t, rl.IsLocked("1.2.3.4"))

	// Now three more failures are needed to lock.
	status = http.StatusUnauthorized
	doReq()
	doReq()
	require.False(t, rl.IsLocked("1.2.3.4"))
	doReq()
	require.True(t, rl.IsLocked("1.2.3.4"))
}

func TestRateLimit_PerIPIsolated(t *testing.T) {
	t.Parallel()
	rl := middleware.NewFailureRateLimiter(2, time.Hour)
	status := http.StatusUnauthorized
	router := newRLRouter(t, rl, &status)

	for range 2 {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = "1.1.1.1:1"
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}
	require.True(t, rl.IsLocked("1.1.1.1"))

	// Different IP is unaffected.
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "2.2.2.2:2"
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusUnauthorized, w.Code)
	require.False(t, rl.IsLocked("2.2.2.2"))
}

func TestRateLimit_OtherStatusesIgnored(t *testing.T) {
	t.Parallel()
	rl := middleware.NewFailureRateLimiter(2, time.Hour)
	status := http.StatusBadRequest // not in failure/success set
	router := newRLRouter(t, rl, &status)
	addr := "1.1.1.1:1"

	for i := 1; i <= 5; i++ {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = addr
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		require.Equal(t, http.StatusBadRequest, w.Code)
	}
	// Neither counted as failure nor reset.
	require.False(t, rl.IsLocked("1.1.1.1"))
}

func TestRateLimit_TrustedProxiesOff_IgnoresForwardedHeader(t *testing.T) {
	t.Parallel()
	rl := middleware.NewFailureRateLimiter(2, time.Hour)
	router := gin.New()
	// No trusted proxies → ClientIP returns RemoteAddr, X-Forwarded-For is ignored.
	require.NoError(t, router.SetTrustedProxies(nil))
	router.Use(middleware.RateLimit(rl))
	router.GET("/", func(c *gin.Context) {
		c.Status(http.StatusUnauthorized)
	})

	// Two failures from the same RemoteAddr but with rotating X-Forwarded-For.
	for _, xff := range []string{"10.0.0.1", "10.0.0.2"} {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = "1.1.1.1:1"
		req.Header.Set("X-Forwarded-For", xff)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}
	// Keyed by RemoteAddr → locked despite rotating XFF (this is the chi-style
	// spoofing attack, mitigated).
	require.True(t, rl.IsLocked("1.1.1.1"))
}

func TestRateLimit_TrustedProxiesOn_HonorsForwardedHeader(t *testing.T) {
	t.Parallel()
	rl := middleware.NewFailureRateLimiter(2, time.Hour)
	router := gin.New()
	// Trust the immediate peer so XFF from it is honored.
	require.NoError(t, router.SetTrustedProxies([]string{"127.0.0.1"}))
	router.Use(middleware.RateLimit(rl))
	router.GET("/", func(c *gin.Context) {
		c.Status(http.StatusUnauthorized)
	})

	// Two requests from trusted proxy with different XFF → two distinct client IPs.
	for _, xff := range []string{"10.0.0.1", "10.0.0.2"} {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = "127.0.0.1:1"
		req.Header.Set("X-Forwarded-For", xff)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}
	// Neither forwarded IP should be locked (each only has one failure).
	require.False(t, rl.IsLocked("10.0.0.1"))
	require.False(t, rl.IsLocked("10.0.0.2"))
}

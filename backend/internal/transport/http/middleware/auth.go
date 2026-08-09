package middleware

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/yurifa/expense-tracker-api/internal/config"
	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/repository"
	"github.com/yurifa/expense-tracker-api/internal/transport/http/cookie"
	"github.com/yurifa/expense-tracker-api/internal/transport/http/httpctx"
	"github.com/yurifa/expense-tracker-api/internal/transport/http/httperr"
	"github.com/yurifa/expense-tracker-api/internal/transport/http/keys"
)

// AuthRequired validates the session_id cookie against the SessionRepository,
// loads the user, applies sliding expiration, and stores the user + session id
// in the gin context for handlers.
func AuthRequired(
	sessions repository.SessionRepository,
	users repository.UserRepository,
	log *slog.Logger,
	cfg *config.HTTPServer,
) gin.HandlerFunc {
	op := "transport.http.middleware.AuthRequired"

	return func(c *gin.Context) {
		log := log.With(
			slog.String("op", op),
			slog.String("request_id", httpctx.RequestID(c)),
		)

		cookieVal, err := c.Request.Cookie(cfg.SessionConfig.CookieName)
		if err != nil {
			httperr.Write(c, http.StatusUnauthorized, httperr.ErrCodeUnauthorized, "missing session cookie")
			return
		}

		session, err := sessions.GetSessionByID(c.Request.Context(), cookieVal.Value)
		if err != nil {
			if errors.Is(err, domain.ErrSessionNotFound) {
				log.Info("invalid or expired session")
				httperr.Write(c, http.StatusUnauthorized, httperr.ErrCodeUnauthorized, "invalid or expired session")
				return
			}
			log.Error("failed to get session by id", slog.String("error", err.Error()))
			httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "internal server error")
			return
		}

		user, err := users.GetUserByID(c.Request.Context(), session.UserID)
		if err != nil {
			log.Error("failed to get user by id", slog.String("error", err.Error()))
			httperr.Write(c, http.StatusUnauthorized, httperr.ErrCodeUnauthorized, "invalid or expired session")
			return
		}

		// Sliding expiration: extend if < 25% of the TTL remains.
		if cfg.SessionConfig.SlidingExpiration && time.Until(session.ExpiresAt) < cfg.SessionConfig.TTL/4 {
			newExpiresAt := time.Now().UTC().Add(cfg.SessionConfig.TTL)
			if err := sessions.ExtendSession(c.Request.Context(), session.ID, newExpiresAt); err != nil {
				log.Error("failed to extend session", slog.String("error", err.Error()))
				httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "internal server error")
				return
			}
			c.SetCookieData(cookie.BuildSession(cfg.SessionConfig, session.ID, int(cfg.SessionConfig.TTL.Seconds())))
		}

		c.Set(keys.CurrentUserKey, user)
		c.Set(keys.CurrentSessionIDKey, session.ID)
		c.Next()
	}
}

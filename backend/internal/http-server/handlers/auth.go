package handlers

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/yurifa/expense-tracker-api/internal/auth"
	"github.com/yurifa/expense-tracker-api/internal/http-server/cookie"
	"github.com/yurifa/expense-tracker-api/internal/http-server/httpctx"
	"github.com/yurifa/expense-tracker-api/internal/http-server/httperr"
	"github.com/yurifa/expense-tracker-api/internal/logger"
	"github.com/yurifa/expense-tracker-api/internal/storage"

	"github.com/gin-gonic/gin"
)

type RegisterUserParams struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required,min=8,max=72"`
}

type LoginUserParams struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *Handler) startUserSession(c *gin.Context, userID string) error {
	sessionID, err := auth.GenerateSessionToken()
	if err != nil {
		return err
	}

	session, err := h.DB.CreateSession(c.Request.Context(), storage.CreateSessionParams{
		SessionID: sessionID,
		UserID:    userID,
		ExpiresAt: time.Now().UTC().Add(h.Config.SessionConfig.TTL),
	})
	if err != nil {
		return err
	}

	c.SetCookieData(
		cookie.BuildSession(
			h.Config.SessionConfig,
			session.ID,
			int(h.Config.SessionConfig.TTL.Seconds()),
		),
	)
	return nil
}

func (h *Handler) Register(c *gin.Context) {
	op := "handlers.auth.Register"

	log := h.loggerFor(c, op)

	var req RegisterUserParams
	if !bindAndValidateJSON(c, log, &req) {
		return
	}

	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		log.Error("failed to hash password", logger.Error(err))
		httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to hash password")
		return
	}

	user, err := h.DB.RegisterUser(c.Request.Context(), storage.RegisterUserParams{
		Email:        req.Email,
		PasswordHash: passwordHash,
	})
	if err != nil {
		if errors.Is(err, storage.ErrUserAlreadyExists) {
			log.Info("user already exists", logger.Error(err))
			httperr.Write(c, http.StatusConflict, httperr.ErrCodeUserAlreadyExists, "user already exists")
			return
		}
		log.Error("failed to register user", logger.Error(err))
		httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to register user")
		return
	}

	if code, codeErr := auth.GenerateOTPCode(); codeErr != nil {
		log.Error("failed to generate verification code", logger.Error(codeErr))
	} else if createErr := h.DB.CreateEmailVerificationCode(
		c.Request.Context(),
		user.ID,
		code,
		time.Now().UTC().Add(storage.VerificationCodeTTL),
	); createErr != nil {
		log.Error("failed to create verification code", logger.Error(createErr))
	} else {
		log.Info("verification code issued", slog.String("email", user.Email), slog.String("code", code))
	}

	if err := h.startUserSession(c, user.ID); err != nil {
		log.Error("failed to create session", logger.Error(err))
		httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to create session")
		return
	}

	c.JSON(http.StatusCreated, user)
}

func (h *Handler) Login(c *gin.Context) {
	op := "handlers.auth.Login"

	log := h.loggerFor(c, op)

	var req LoginUserParams
	if !bindAndValidateJSON(c, log, &req) {
		return
	}

	user, err := h.DB.GetUserByEmail(c.Request.Context(), req.Email)
	if err != nil {
		log.Error("failed to get user by email", logger.Error(err))
		httperr.Write(
			c,
			http.StatusUnauthorized,
			httperr.ErrCodeInvalidCredentials,
			"invalid credentials",
		)
		return
	}
	err = auth.VerifyPassword(user.PasswordHash, req.Password)
	if err != nil {
		log.Info("invalid credentials", logger.Error(err))
		httperr.Write(c, http.StatusUnauthorized, httperr.ErrCodeInvalidCredentials, "invalid credentials")
		return
	}

	if err := h.startUserSession(c, user.ID); err != nil {
		log.Error("failed to create session", logger.Error(err))
		httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to create session")
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *Handler) Logout(c *gin.Context) {
	op := "handlers.auth.Logout"

	log := h.loggerFor(c, op)

	sessionCookie, err := c.Request.Cookie(h.Config.SessionConfig.CookieName)
	if err != nil {
		c.Status(http.StatusNoContent)
		return
	}

	err = h.DB.DeleteSession(c.Request.Context(), sessionCookie.Value)
	if err != nil && !errors.Is(err, storage.ErrSessionNotFound) {
		log.Error("failed to delete session", logger.Error(err))
		httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to logout")
		return
	}

	c.SetCookieData(
		cookie.BuildSession(
			h.Config.SessionConfig,
			"",
			-1,
		),
	)

	c.Status(http.StatusNoContent)
}

func (h *Handler) Me(c *gin.Context) {
	op := "handlers.auth.Me"

	log := h.loggerFor(c, op)

	user := httpctx.CurrentUser(c)
	if user == nil {
		log.Info("no current user found")
		httperr.Write(c, http.StatusUnauthorized, httperr.ErrCodeUnauthorized, "unauthorized")
		return
	}

	c.JSON(http.StatusOK, user)
}

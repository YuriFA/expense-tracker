package handlers

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/yurifa/expense-tracker-api/internal/auth"
	"github.com/yurifa/expense-tracker-api/internal/http-server/httperr"
	"github.com/yurifa/expense-tracker-api/internal/logger"
	"github.com/yurifa/expense-tracker-api/internal/storage"

	"github.com/gin-gonic/gin"
)

type RequestPasswordResetRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ConfirmPasswordResetRequest struct {
	Token       string `json:"token"       binding:"required"`
	NewPassword string `json:"newPassword" binding:"required,min=8,max=72"`
}

func (h *Handler) RequestPasswordReset(c *gin.Context) {
	op := "handlers.password_reset.RequestPasswordReset"
	log := h.loggerFor(c, op)

	var req RequestPasswordResetRequest
	if !bindAndValidateJSON(c, log, &req) {
		return
	}

	user, err := h.DB.GetUserByEmail(c.Request.Context(), req.Email)
	if err != nil {
		if errors.Is(err, storage.ErrUserNotFound) {
			c.Status(http.StatusNoContent)
			return
		}
		log.Error("failed to get user by email", logger.Error(err))
		httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to request password reset")
		return
	}

	ageSeconds, exists, err := h.DB.LatestPasswordResetTokenAgeSeconds(c.Request.Context(), user.ID)
	if err != nil {
		log.Error("failed to get latest reset token age", logger.Error(err))
		httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to request password reset")
		return
	}
	if exists && ageSeconds < int(storage.PasswordResetRequestThrottle.Seconds()) {
		c.Status(http.StatusNoContent)
		return
	}

	token, err := auth.GenerateSessionToken()
	if err != nil {
		log.Error("failed to generate reset token", logger.Error(err))
		httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to request password reset")
		return
	}
	if err := h.DB.CreatePasswordResetToken(
		c.Request.Context(),
		user.ID,
		auth.HashToken(token),
		time.Now().UTC().Add(storage.PasswordResetTokenTTL),
	); err != nil {
		log.Error("failed to create reset token", logger.Error(err))
		httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to request password reset")
		return
	}

	log.Info("password reset token issued", slog.String("email", user.Email), slog.String("reset_token", token))

	c.Status(http.StatusNoContent)
}

func (h *Handler) ConfirmPasswordReset(c *gin.Context) {
	op := "handlers.password_reset.ConfirmPasswordReset"
	log := h.loggerFor(c, op)

	var req ConfirmPasswordResetRequest
	if !bindAndValidateJSON(c, log, &req) {
		return
	}

	passwordHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		log.Error("failed to hash password", logger.Error(err))
		httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to reset password")
		return
	}

	err = h.DB.ResetPassword(c.Request.Context(), auth.HashToken(req.Token), passwordHash)
	if err != nil {
		if errors.Is(err, storage.ErrPasswordResetTokenNotFound) {
			httperr.Write(
				c,
				http.StatusBadRequest,
				httperr.ErrCodeInvalidPasswordResetToken,
				"invalid or expired reset token",
			)
			return
		}
		log.Error("failed to reset password", logger.Error(err))
		httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to reset password")
		return
	}

	c.Status(http.StatusNoContent)
}

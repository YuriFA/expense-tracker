package handlers

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/yurifa/expense-tracker-api/internal/auth"
	"github.com/yurifa/expense-tracker-api/internal/http-server/httpctx"
	"github.com/yurifa/expense-tracker-api/internal/http-server/httperr"
	"github.com/yurifa/expense-tracker-api/internal/logger"
	"github.com/yurifa/expense-tracker-api/internal/storage"

	"github.com/gin-gonic/gin"
)

type VerifyEmailRequest struct {
	Code string `json:"code" binding:"required,len=6"`
}

func (h *Handler) VerifyEmail(c *gin.Context) {
	op := "handlers.verify_email.VerifyEmail"
	log := h.loggerFor(c, op)

	user := httpctx.CurrentUser(c)
	if user.EmailVerified {
		httperr.Write(c, http.StatusConflict, httperr.ErrCodeEmailAlreadyVerified, "email already verified")
		return
	}

	var req VerifyEmailRequest
	if !bindAndValidateJSON(c, log, &req) {
		return
	}

	err := h.DB.VerifyEmailCode(c.Request.Context(), user.ID, req.Code)
	if err != nil {
		switch {
		case errors.Is(err, storage.ErrInvalidVerificationCode):
			httperr.Write(c, http.StatusForbidden, httperr.ErrCodeInvalidVerificationCode, "invalid verification code")
		case errors.Is(err, storage.ErrVerificationCodeExpired):
			httperr.Write(
				c,
				http.StatusBadRequest,
				httperr.ErrCodeVerificationCodeExpired,
				"verification code expired, request a new one",
			)
		case errors.Is(err, storage.ErrVerificationCodeNotFound):
			httperr.Write(
				c,
				http.StatusBadRequest,
				httperr.ErrCodeVerificationCodeNotFound,
				"no active verification code, request a new one",
			)
		default:
			log.Error("failed to verify email code", logger.Error(err))
			httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to verify email")
		}
		return
	}

	c.Status(http.StatusNoContent)
}

func (h *Handler) ResendVerification(c *gin.Context) {
	op := "handlers.verify_email.ResendVerification"
	log := h.loggerFor(c, op)

	user := httpctx.CurrentUser(c)
	if user.EmailVerified {
		httperr.Write(c, http.StatusConflict, httperr.ErrCodeEmailAlreadyVerified, "email already verified")
		return
	}

	ageSeconds, exists, err := h.DB.LatestVerificationCodeAgeSeconds(c.Request.Context(), user.ID)
	if err != nil {
		log.Error("failed to get latest verification code age", logger.Error(err))
		httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to resend verification code")
		return
	}
	if exists {
		throttleSeconds := int(storage.VerificationResendThrottle.Seconds())
		if ageSeconds < throttleSeconds {
			retryAfter := max(throttleSeconds-ageSeconds, 1)
			c.Header("Retry-After", strconv.Itoa(retryAfter))
			httperr.Write(
				c,
				http.StatusTooManyRequests,
				httperr.ErrCodeTooManyRequests,
				"please wait before requesting a new code",
			)
			return
		}
	}

	code, err := auth.GenerateOTPCode()
	if err != nil {
		log.Error("failed to generate verification code", logger.Error(err))
		httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to resend verification code")
		return
	}
	if err := h.DB.CreateEmailVerificationCode(
		c.Request.Context(),
		user.ID,
		code,
		time.Now().UTC().Add(storage.VerificationCodeTTL),
	); err != nil {
		log.Error("failed to create verification code", logger.Error(err))
		httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to resend verification code")
		return
	}

	log.Info("verification code issued", slog.String("email", user.Email), slog.String("code", code))

	c.Status(http.StatusNoContent)
}

package handlers

import (
	"log/slog"
	"net/http"

	"github.com/yurifa/expense-tracker-api/internal/http-server/httpctx"
	"github.com/yurifa/expense-tracker-api/internal/http-server/httperr"
	"github.com/yurifa/expense-tracker-api/internal/logger"

	"github.com/gin-gonic/gin"
)

type SessionResponse struct {
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
	ExpiresAt string `json:"expiresAt"`
	IsCurrent bool   `json:"isCurrent"`
}

func (h *Handler) ListSessions(c *gin.Context) {
	op := "handlers.sessions.ListSessions"
	log := h.loggerFor(c, op)

	user := httpctx.CurrentUser(c)

	sessions, err := h.DB.GetSessionsByUser(c.Request.Context(), user.ID)
	if err != nil {
		log.Error("failed to get sessions", logger.Error(err))
		httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to get sessions")
		return
	}

	currentSessionID := httpctx.CurrentSessionID(c)
	response := make([]SessionResponse, 0, len(sessions))
	for _, s := range sessions {
		response = append(response, SessionResponse{
			CreatedAt: s.CreatedAt,
			UpdatedAt: s.UpdatedAt,
			ExpiresAt: s.ExpiresAt,
			IsCurrent: s.ID == currentSessionID,
		})
	}

	c.JSON(http.StatusOK, response)
}

func (h *Handler) DeleteAllSessions(c *gin.Context) {
	op := "handlers.sessions.DeleteAllSessions"
	log := h.loggerFor(c, op)

	user := httpctx.CurrentUser(c)
	currentSessionID := httpctx.CurrentSessionID(c)

	count, err := h.DB.DeleteSessionsByUserExcept(c.Request.Context(), user.ID, currentSessionID)
	if err != nil {
		log.Error("failed to delete sessions", logger.Error(err))
		httperr.Write(c, http.StatusInternalServerError, httperr.ErrCodeInternal, "failed to delete sessions")
		return
	}

	log.Info("revoked sessions", slog.Int("count", int(count)))

	c.Status(http.StatusNoContent)
}

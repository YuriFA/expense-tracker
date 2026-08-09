package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/repository"
)

// SessionListItem is a session in the /auth/sessions list (no token).
type SessionListItem struct {
	CreatedAt string
	UpdatedAt string
	ExpiresAt string
	IsCurrent bool
}

// SessionService owns active-session listing and bulk revocation.
type SessionService struct {
	sessions repository.SessionRepository
}

func NewSessionService(sessions repository.SessionRepository) *SessionService {
	return &SessionService{sessions: sessions}
}

// List returns the user's active sessions, marking the current one.
func (s *SessionService) List(ctx context.Context, userID uuid.UUID, currentSessionID string) ([]SessionListItem, error) {
	const op = "service.session.List"
	sessions, err := s.sessions.GetSessionsByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	out := make([]SessionListItem, 0, len(sessions))
	for _, sess := range sessions {
		out = append(out, SessionListItem{
			CreatedAt: sess.CreatedAt.UTC().Format(time.RFC3339Nano),
			UpdatedAt: sess.UpdatedAt.UTC().Format(time.RFC3339Nano),
			ExpiresAt: sess.ExpiresAt.UTC().Format(time.RFC3339Nano),
			IsCurrent: sess.ID == currentSessionID,
		})
	}
	return out, nil
}

// DeleteAllExcept revokes every session for the user except the current one.
func (s *SessionService) DeleteAllExcept(ctx context.Context, userID uuid.UUID, currentSessionID string) (int64, error) {
	const op = "service.session.DeleteAllExcept"
	n, err := s.sessions.DeleteSessionsByUserExcept(ctx, userID, currentSessionID)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", op, err)
	}
	return n, nil
}

package http

import (
	"context"

	"github.com/yurifa/expense-tracker-api/internal/api"
	"github.com/yurifa/expense-tracker-api/internal/transport/http/httpctx"
)

func (s *Server) ListSessions(ctx context.Context, _ api.ListSessionsRequestObject) (api.ListSessionsResponseObject, error) {
	user := s.currentUser(ctx)
	sessions, err := s.sessions.List(ctx, user.ID)
	if err != nil {
		writeDomainError(ginCtx(ctx), s.log, err)
		return nil, nil
	}
	current := httpctx.CurrentSessionID(ginCtx(ctx))
	out := make([]api.SessionResponse, 0, len(sessions))
	for _, sess := range sessions {
		out = append(out, api.SessionResponse{
			CreatedAt: sess.CreatedAt,
			UpdatedAt: sess.UpdatedAt,
			ExpiresAt: sess.ExpiresAt,
			IsCurrent: sess.ID == current,
		})
	}
	return api.ListSessions200JSONResponse(out), nil
}

func (s *Server) DeleteAllSessions(ctx context.Context, _ api.DeleteAllSessionsRequestObject) (api.DeleteAllSessionsResponseObject, error) {
	user := s.currentUser(ctx)
	current := httpctx.CurrentSessionID(ginCtx(ctx))
	if _, err := s.sessions.DeleteAllExcept(ctx, user.ID, current); err != nil {
		writeDomainError(ginCtx(ctx), s.log, err)
		return nil, nil
	}
	return api.DeleteAllSessions204Response{}, nil
}

package http

import (
	"context"

	"github.com/yurifa/expense-tracker-api/internal/api"
)

// GetHealth is the liveness probe for deployment healthchecks: it proves the
// process is serving requests and nothing else — no session, no DB, no
// business logic (the DB has its own container healthcheck; a readiness
// variant would bounce the API on blips local-first clients tolerate).
func (s *Server) GetHealth(_ context.Context, _ api.GetHealthRequestObject) (api.GetHealthResponseObject, error) {
	return api.GetHealth200JSONResponse{Status: api.Ok}, nil
}

package http

import (
	"context"

	"github.com/yurifa/expense-tracker-api/internal/api"
)

// GetHousehold returns the requester's household with its members (email,
// display name, role, joined date). The household id comes from the auth
// middleware's membership resolution, so the listing is the requester's own
// household by construction.
func (s *Server) GetHousehold(
	ctx context.Context,
	_ api.GetHouseholdRequestObject,
) (api.GetHouseholdResponseObject, error) {
	householdID := s.currentHouseholdID(ctx)
	h, err := s.households.Get(ctx, householdID)
	if err != nil {
		return nil, err
	}
	return api.GetHousehold200JSONResponse(toAPIHousehold(*h)), nil
}

// UpdateCurrentUser sets the requester's display name (profile edit).
func (s *Server) UpdateCurrentUser(
	ctx context.Context,
	req api.UpdateCurrentUserRequestObject,
) (api.UpdateCurrentUserResponseObject, error) {
	user := s.currentUser(ctx)
	u, err := s.auth.UpdateDisplayName(ctx, user.ID, req.Body.DisplayName)
	if err != nil {
		return nil, err
	}
	return api.UpdateCurrentUser200JSONResponse(toAPIUser(*u)), nil
}

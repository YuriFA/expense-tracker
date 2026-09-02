package http

import (
	"context"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/api"
	"github.com/yurifa/expense-tracker-api/internal/domain"
)

func (s *Server) ListCategories(
	ctx context.Context,
	req api.ListCategoriesRequestObject,
) (api.ListCategoriesResponseObject, error) {
	householdID := s.currentHouseholdID(ctx)
	var typ *domain.TransactionType
	if req.Params.Type != nil {
		t := domain.TransactionType(*req.Params.Type)
		typ = &t
	}
	includeArchived := false
	if req.Params.IncludeArchived != nil {
		includeArchived = *req.Params.IncludeArchived
	}
	cats, err := s.categories.List(
		ctx,
		householdID,
		domain.GetCategoriesParams{Type: typ, IncludeArchived: includeArchived},
	)
	if err != nil {
		return nil, err
	}
	out := make([]api.Category, 0, len(cats))
	for _, c := range cats {
		out = append(out, toAPICategory(c))
	}
	return api.ListCategories200JSONResponse(out), nil
}

func (s *Server) CreateCategory(
	ctx context.Context,
	req api.CreateCategoryRequestObject,
) (api.CreateCategoryResponseObject, error) {
	user := s.currentUser(ctx)
	householdID := s.currentHouseholdID(ctx)
	var id uuid.UUID
	if req.Body.Id != nil {
		id = *req.Body.Id
	}
	c, err := s.categories.Create(ctx, householdID, user.ID, domain.CreateCategoryParams{
		ID:    id,
		Name:  req.Body.Name,
		Type:  domain.TransactionType(req.Body.Type),
		Icon:  req.Body.Icon,
		Color: req.Body.Color,
	})
	if err != nil {
		return nil, err
	}
	return api.CreateCategory201JSONResponse(toAPICategory(*c)), nil
}

func (s *Server) GetCategory(
	ctx context.Context,
	req api.GetCategoryRequestObject,
) (api.GetCategoryResponseObject, error) {
	householdID := s.currentHouseholdID(ctx)
	c, err := s.categories.Get(ctx, householdID, req.Id)
	if err != nil {
		return nil, err
	}
	return api.GetCategory200JSONResponse(toAPICategory(*c)), nil
}

func (s *Server) UpdateCategory(
	ctx context.Context,
	req api.UpdateCategoryRequestObject,
) (api.UpdateCategoryResponseObject, error) {
	user := s.currentUser(ctx)
	var name, icon, color *string
	var typ *domain.TransactionType
	if req.Body.Name != nil {
		v := *req.Body.Name
		name = &v
	}
	if req.Body.Icon != nil {
		v := *req.Body.Icon
		icon = &v
	}
	if req.Body.Color != nil {
		v := *req.Body.Color
		color = &v
	}
	if req.Body.Type != nil {
		t := domain.TransactionType(*req.Body.Type)
		typ = &t
	}
	var archive *bool
	if req.Body.Archived != nil {
		v := *req.Body.Archived
		archive = &v
	}
	c, err := s.categories.Update(ctx, s.currentHouseholdID(ctx), user.ID, req.Id, domain.UpdateCategoryParams{
		Name: name, Type: typ, Icon: icon, Color: color, Archive: archive, Version: req.Body.Version,
	})
	if err != nil {
		return nil, err
	}
	return api.UpdateCategory200JSONResponse(toAPICategory(*c)), nil
}

func (s *Server) DeleteCategory(
	ctx context.Context,
	req api.DeleteCategoryRequestObject,
) (api.DeleteCategoryResponseObject, error) {
	user := s.currentUser(ctx)
	cascade := false
	if req.Params.Cascade != nil {
		cascade = *req.Params.Cascade
	}
	if err := s.categories.Delete(ctx, s.currentHouseholdID(ctx), user.ID, req.Id, cascade); err != nil {
		return nil, err
	}
	return api.DeleteCategory204Response{}, nil
}

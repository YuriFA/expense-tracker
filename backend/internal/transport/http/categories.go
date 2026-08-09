package http

import (
	"context"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/api"
	"github.com/yurifa/expense-tracker-api/internal/domain"
)

func (s *Server) ListCategories(ctx context.Context, req api.ListCategoriesRequestObject) (api.ListCategoriesResponseObject, error) {
	user := s.currentUser(ctx)
	var typ *domain.TransactionType
	if req.Params.Type != nil {
		t := domain.TransactionType(*req.Params.Type)
		typ = &t
	}
	cats, err := s.categories.List(ctx, user.ID, domain.GetCategoriesParams{Type: typ})
	if err != nil {
		writeDomainError(ginCtx(ctx), s.log, err)
		return nil, nil
	}
	out := make([]api.Category, 0, len(cats))
	for _, c := range cats {
		out = append(out, toAPICategory(c))
	}
	return api.ListCategories200JSONResponse(out), nil
}

func (s *Server) CreateCategory(ctx context.Context, req api.CreateCategoryRequestObject) (api.CreateCategoryResponseObject, error) {
	user := s.currentUser(ctx)
	c, err := s.categories.Create(ctx, user.ID, domain.CreateCategoryParams{
		Name:  req.Body.Name,
		Type:  domain.TransactionType(req.Body.Type),
		Icon:  req.Body.Icon,
		Color: req.Body.Color,
	})
	if err != nil {
		writeDomainError(ginCtx(ctx), s.log, err)
		return nil, nil
	}
	return api.CreateCategory201JSONResponse(toAPICategory(*c)), nil
}

func (s *Server) GetCategory(ctx context.Context, req api.GetCategoryRequestObject) (api.GetCategoryResponseObject, error) {
	user := s.currentUser(ctx)
	c, err := s.categories.Get(ctx, user.ID, uuid.UUID(req.Id))
	if err != nil {
		writeDomainError(ginCtx(ctx), s.log, err)
		return nil, nil
	}
	return api.GetCategory200JSONResponse(toAPICategory(*c)), nil
}

func (s *Server) UpdateCategory(ctx context.Context, req api.UpdateCategoryRequestObject) (api.UpdateCategoryResponseObject, error) {
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
	c, err := s.categories.Update(ctx, user.ID, uuid.UUID(req.Id), domain.UpdateCategoryParams{
		Name: name, Type: typ, Icon: icon, Color: color,
	})
	if err != nil {
		writeDomainError(ginCtx(ctx), s.log, err)
		return nil, nil
	}
	return api.UpdateCategory200JSONResponse(toAPICategory(*c)), nil
}

func (s *Server) DeleteCategory(ctx context.Context, req api.DeleteCategoryRequestObject) (api.DeleteCategoryResponseObject, error) {
	user := s.currentUser(ctx)
	if err := s.categories.Delete(ctx, user.ID, uuid.UUID(req.Id)); err != nil {
		writeDomainError(ginCtx(ctx), s.log, err)
		return nil, nil
	}
	return api.DeleteCategory204Response{}, nil
}

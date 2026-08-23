package http

import (
	"context"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/api"
	"github.com/yurifa/expense-tracker-api/internal/domain"
)

func (s *Server) ListDebtors(
	ctx context.Context,
	_ api.ListDebtorsRequestObject,
) (api.ListDebtorsResponseObject, error) {
	user := s.currentUser(ctx)
	debtors, err := s.debtors.List(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	out := make([]api.Debtor, 0, len(debtors))
	for _, d := range debtors {
		out = append(out, toAPIDebtor(d))
	}
	return api.ListDebtors200JSONResponse(out), nil
}

func (s *Server) CreateDebtor(
	ctx context.Context,
	req api.CreateDebtorRequestObject,
) (api.CreateDebtorResponseObject, error) {
	user := s.currentUser(ctx)
	var id uuid.UUID
	if req.Body.Id != nil {
		id = *req.Body.Id
	}
	note := ""
	if req.Body.Note != nil {
		note = *req.Body.Note
	}
	d, err := s.debtors.Create(ctx, user.ID, domain.CreateDebtorParams{
		ID:   id,
		Name: req.Body.Name,
		Note: note,
	})
	if err != nil {
		return nil, err
	}
	return api.CreateDebtor201JSONResponse(toAPIDebtor(*d)), nil
}

func (s *Server) GetDebtor(
	ctx context.Context,
	req api.GetDebtorRequestObject,
) (api.GetDebtorResponseObject, error) {
	user := s.currentUser(ctx)
	d, err := s.debtors.Get(ctx, user.ID, req.Id)
	if err != nil {
		return nil, err
	}
	return api.GetDebtor200JSONResponse(toAPIDebtor(*d)), nil
}

func (s *Server) UpdateDebtor(
	ctx context.Context,
	req api.UpdateDebtorRequestObject,
) (api.UpdateDebtorResponseObject, error) {
	user := s.currentUser(ctx)
	var name, note *string
	if req.Body.Name != nil {
		v := *req.Body.Name
		name = &v
	}
	if req.Body.Note != nil {
		v := *req.Body.Note
		note = &v
	}
	d, err := s.debtors.Update(ctx, user.ID, req.Id, domain.UpdateDebtorParams{
		Name: name, Note: note, Version: req.Body.Version,
	})
	if err != nil {
		return nil, err
	}
	return api.UpdateDebtor200JSONResponse(toAPIDebtor(*d)), nil
}

func (s *Server) DeleteDebtor(
	ctx context.Context,
	req api.DeleteDebtorRequestObject,
) (api.DeleteDebtorResponseObject, error) {
	user := s.currentUser(ctx)
	if err := s.debtors.Delete(ctx, user.ID, req.Id); err != nil {
		return nil, err
	}
	return api.DeleteDebtor204Response{}, nil
}

package http

import (
	"context"

	"github.com/google/uuid"

	"github.com/yurifa/expense-tracker-api/internal/api"
	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/service"
)

func (s *Server) ListTransactions(ctx context.Context, req api.ListTransactionsRequestObject) (api.ListTransactionsResponseObject, error) {
	user := s.currentUser(ctx)

	q := service.TransactionListQuery{
		AccountID:  req.Params.AccountId,
		CategoryID: req.Params.CategoryId,
		Limit:      req.Params.Limit,
		Cursor:     req.Params.Cursor,
	}
	if req.Params.Type != nil {
		t := domain.TransactionType(*req.Params.Type)
		q.Type = &t
	}
	if req.Params.FromDate != nil {
		from := req.Params.FromDate.Time
		q.FromDate = &from
	}
	if req.Params.ToDate != nil {
		to := endOfDay(*req.Params.ToDate)
		q.ToDate = &to
	}

	page, err := s.txn.List(ctx, user.ID, q)
	if err != nil {
		writeDomainError(ginCtx(ctx), s.log, err)
		return nil, nil
	}
	out := make([]api.Transaction, 0, len(page.Transactions))
	for _, t := range page.Transactions {
		out = append(out, toAPITransaction(t))
	}
	return api.ListTransactions200JSONResponse(api.ListTransactions200JSONResponse{
		Transactions: out,
		NextCursor:   page.NextCursor,
	}), nil
}

func (s *Server) CreateTransaction(ctx context.Context, req api.CreateTransactionRequestObject) (api.CreateTransactionResponseObject, error) {
	user := s.currentUser(ctx)

	params := domain.CreateTransactionParams{
		UserID:      user.ID,
		Type:        domain.TransactionType(req.Body.Type),
		Amount:      req.Body.Amount,
		OccurredAt:  req.Body.OccurredAt,
		AccountID:   fromUUIDPtr(req.Body.AccountId),
		CategoryID:  fromUUIDPtr(req.Body.CategoryId),
		FromAccountID: fromUUIDPtr(req.Body.FromAccountId),
		ToAccountID:   fromUUIDPtr(req.Body.ToAccountId),
	}
	if req.Body.Description != nil {
		params.Description = *req.Body.Description
	}

	tx, err := s.txn.Create(ctx, user.ID, params)
	if err != nil {
		writeDomainError(ginCtx(ctx), s.log, err)
		return nil, nil
	}
	return api.CreateTransaction201JSONResponse(toAPITransaction(*tx)), nil
}

func (s *Server) GetTransaction(ctx context.Context, req api.GetTransactionRequestObject) (api.GetTransactionResponseObject, error) {
	user := s.currentUser(ctx)
	tx, err := s.txn.Get(ctx, user.ID, uuid.UUID(req.Id))
	if err != nil {
		writeDomainError(ginCtx(ctx), s.log, err)
		return nil, nil
	}
	return api.GetTransaction200JSONResponse(toAPITransaction(*tx)), nil
}

func (s *Server) UpdateTransaction(ctx context.Context, req api.UpdateTransactionRequestObject) (api.UpdateTransactionResponseObject, error) {
	user := s.currentUser(ctx)

	params := domain.UpdateTransactionParams{
		Version:       req.Body.Version,
		Amount:        req.Body.Amount,
		Description:   req.Body.Description,
		OccurredAt:    req.Body.OccurredAt,
		AccountID:     fromUUIDPtr(req.Body.AccountId),
		CategoryID:    fromUUIDPtr(req.Body.CategoryId),
		FromAccountID: fromUUIDPtr(req.Body.FromAccountId),
		ToAccountID:   fromUUIDPtr(req.Body.ToAccountId),
	}
	tx, err := s.txn.Update(ctx, user.ID, uuid.UUID(req.Id), params)
	if err != nil {
		writeDomainError(ginCtx(ctx), s.log, err)
		return nil, nil
	}
	return api.UpdateTransaction200JSONResponse(toAPITransaction(*tx)), nil
}

func (s *Server) DeleteTransaction(ctx context.Context, req api.DeleteTransactionRequestObject) (api.DeleteTransactionResponseObject, error) {
	user := s.currentUser(ctx)
	if err := s.txn.Delete(ctx, user.ID, uuid.UUID(req.Id)); err != nil {
		writeDomainError(ginCtx(ctx), s.log, err)
		return nil, nil
	}
	return api.DeleteTransaction204Response{}, nil
}


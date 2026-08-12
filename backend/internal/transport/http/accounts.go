package http

import (
	"context"

	"github.com/yurifa/expense-tracker-api/internal/api"
	"github.com/yurifa/expense-tracker-api/internal/domain"
)

func (s *Server) ListAccounts(
	ctx context.Context,
	_ api.ListAccountsRequestObject,
) (api.ListAccountsResponseObject, error) {
	user := s.currentUser(ctx)
	accounts, err := s.accounts.List(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	out := make([]api.Account, 0, len(accounts))
	for _, a := range accounts {
		out = append(out, toAPIAccount(a))
	}
	return api.ListAccounts200JSONResponse(out), nil
}

func (s *Server) CreateAccount(
	ctx context.Context,
	req api.CreateAccountRequestObject,
) (api.CreateAccountResponseObject, error) {
	user := s.currentUser(ctx)
	a, err := s.accounts.Create(ctx, user.ID, domain.CreateAccountParams{
		Name:           req.Body.Name,
		Currency:       string(req.Body.Currency),
		OpeningBalance: req.Body.OpeningBalance,
	})
	if err != nil {
		return nil, err
	}
	return api.CreateAccount201JSONResponse(toAPIAccount(*a)), nil
}

func (s *Server) GetAccountBalances(
	ctx context.Context,
	_ api.GetAccountBalancesRequestObject,
) (api.GetAccountBalancesResponseObject, error) {
	user := s.currentUser(ctx)
	res, err := s.accounts.Balances(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	balances := make([]api.AccountBalance, 0, len(res.Balances))
	for _, b := range res.Balances {
		balances = append(balances, api.AccountBalance{
			Id:       toUUID(b.ID),
			UserId:   toUUID(b.UserID),
			Name:     b.Name,
			Currency: api.AccountBalanceCurrency(b.Currency),
			Balance:  b.Balance,
		})
	}
	return api.GetAccountBalances200JSONResponse(api.AccountBalancesResponse{
		Balances: balances,
		NetWorth: res.NetWorth,
	}), nil
}

func (s *Server) GetAccount(
	ctx context.Context,
	req api.GetAccountRequestObject,
) (api.GetAccountResponseObject, error) {
	user := s.currentUser(ctx)
	a, err := s.accounts.Get(ctx, user.ID, req.Id)
	if err != nil {
		return nil, err
	}
	return api.GetAccount200JSONResponse(toAPIAccount(*a)), nil
}

func (s *Server) UpdateAccount(
	ctx context.Context,
	req api.UpdateAccountRequestObject,
) (api.UpdateAccountResponseObject, error) {
	user := s.currentUser(ctx)
	var name *string
	var manual *int64
	if req.Body.Name != nil {
		n := *req.Body.Name
		name = &n
	}
	if req.Body.ManualAdjustment != nil {
		m := *req.Body.ManualAdjustment
		manual = &m
	}
	a, err := s.accounts.Update(ctx, user.ID, req.Id, domain.UpdateAccountParams{
		Name:             name,
		ManualAdjustment: manual,
	})
	if err != nil {
		return nil, err
	}
	return api.UpdateAccount200JSONResponse(toAPIAccount(*a)), nil
}

func (s *Server) DeleteAccount(
	ctx context.Context,
	req api.DeleteAccountRequestObject,
) (api.DeleteAccountResponseObject, error) {
	user := s.currentUser(ctx)
	if err := s.accounts.Delete(ctx, user.ID, req.Id); err != nil {
		return nil, err
	}
	return api.DeleteAccount204Response{}, nil
}

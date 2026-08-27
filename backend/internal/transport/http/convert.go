package http

import (
	"time"

	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"

	"github.com/yurifa/expense-tracker-api/internal/api"
	"github.com/yurifa/expense-tracker-api/internal/domain"
)

// toUUID converts a domain uuid.UUID to the generated openapi_types.UUID.
// openapi_types.UUID is a type alias for uuid.UUID, so this is effectively an
// identity kept for readability at the call sites.
func toUUID(u uuid.UUID) openapi_types.UUID { return u }

func toUUIDPtr(u *uuid.UUID) *openapi_types.UUID {
	if u == nil {
		return nil
	}
	x := *u
	return &x
}

func fromUUIDPtr(u *openapi_types.UUID) *uuid.UUID {
	if u == nil {
		return nil
	}
	x := *u
	return &x
}

func endOfDay(d openapi_types.Date) time.Time {
	return time.Date(d.Year(), d.Month(), d.Day(), 23, 59, 59, 999999999, time.UTC)
}

func toAPIUser(u domain.User) api.User {
	return api.User{
		Id:            toUUID(u.ID),
		Email:         openapi_types.Email(u.Email),
		DisplayName:   u.DisplayName,
		EmailVerified: u.EmailVerified,
		CreatedAt:     u.CreatedAt,
		UpdatedAt:     u.UpdatedAt,
	}
}

func toAPIHousehold(h domain.Household) api.Household {
	members := make([]api.HouseholdMember, 0, len(h.Members))
	for _, m := range h.Members {
		members = append(members, api.HouseholdMember{
			UserId:      toUUID(m.UserID),
			Email:       openapi_types.Email(m.Email),
			DisplayName: m.DisplayName,
			Role:        api.HouseholdMemberRole(m.Role),
			JoinedAt:    m.JoinedAt,
		})
	}
	return api.Household{
		Id:        toUUID(h.ID),
		CreatedAt: h.CreatedAt,
		Members:   members,
	}
}

func toAPIAccount(a domain.Account) api.Account {
	return api.Account{
		Id:               toUUID(a.ID),
		UserId:           toUUID(a.UserID),
		Name:             a.Name,
		Currency:         api.AccountCurrency(a.Currency),
		OpeningBalance:   a.OpeningBalance,
		ManualAdjustment: a.ManualAdjustment,
		Balance:          a.Balance,
		CreatedAt:        a.CreatedAt,
		UpdatedAt:        a.UpdatedAt,
		Version:          a.Version,
	}
}

func toAPICategory(c domain.Category) api.Category {
	return api.Category{
		Id:        toUUID(c.ID),
		UserId:    toUUID(c.UserID),
		Name:      c.Name,
		Type:      api.CategoryType(c.Type),
		Icon:      c.Icon,
		Color:     c.Color,
		CreatedAt: c.CreatedAt,
		UpdatedAt: c.UpdatedAt,
		Version:   c.Version,
	}
}

func toAPITransaction(t domain.Transaction) api.Transaction {
	return api.Transaction{
		Id:            toUUID(t.ID),
		UserId:        toUUID(t.UserID),
		Type:          api.TransactionType(t.Type),
		Amount:        t.Amount,
		Description:   t.Description,
		OccurredAt:    t.OccurredAt,
		CreatedAt:     t.CreatedAt,
		UpdatedAt:     t.UpdatedAt,
		Version:       t.Version,
		AccountId:     toUUIDPtr(t.AccountID),
		CategoryId:    toUUIDPtr(t.CategoryID),
		FromAccountId: toUUIDPtr(t.FromAccountID),
		ToAccountId:   toUUIDPtr(t.ToAccountID),
	}
}

func toAPIDebtor(d domain.Debtor) api.Debtor {
	return api.Debtor{
		Id:        toUUID(d.ID),
		UserId:    toUUID(d.UserID),
		Name:      d.Name,
		Note:      d.Note,
		CreatedAt: d.CreatedAt,
		UpdatedAt: d.UpdatedAt,
		Version:   d.Version,
	}
}

func toAPIDebtOperation(o domain.DebtOperation) api.DebtOperation {
	return api.DebtOperation{
		Id:         toUUID(o.ID),
		UserId:     toUUID(o.UserID),
		DebtorId:   toUUID(o.DebtorID),
		Direction:  api.DebtOperationDirection(o.Direction),
		Kind:       api.DebtOperationKind(o.Kind),
		Amount:     o.Amount,
		Note:       o.Note,
		OccurredAt: o.OccurredAt,
		CreatedAt:  o.CreatedAt,
		UpdatedAt:  o.UpdatedAt,
		Version:    o.Version,
	}
}

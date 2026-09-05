package service_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"github.com/yurifa/expense-tracker-api/internal/domain"
	"github.com/yurifa/expense-tracker-api/internal/service"
)

// Table tests for the delete guards (ADR-0005): the canonical statement the
// sync batch tx executes; the postgres deletes enforce the identical rule
// under their locked transactions (covered by the service and e2e suites).

type stubAccountDeleteReads struct {
	transactions, plans bool
}

func (s stubAccountDeleteReads) HasLiveTransactionsForAccount(
	_ context.Context, _, _ uuid.UUID,
) (bool, error) {
	return s.transactions, nil
}

func (s stubAccountDeleteReads) HasLivePlannedPaymentsForAccount(
	_ context.Context, _, _ uuid.UUID,
) (bool, error) {
	return s.plans, nil
}

func TestValidateAccountDelete(t *testing.T) {
	t.Parallel()

	hh, id := uuid.New(), uuid.New()
	cases := []struct {
		name    string
		reads   stubAccountDeleteReads
		wantErr error
	}{
		{"no dependants ok", stubAccountDeleteReads{}, nil},
		{
			"live transactions block",
			stubAccountDeleteReads{transactions: true, plans: true},
			domain.ErrAccountHasTransactions,
		},
		{
			"live planned payments block",
			stubAccountDeleteReads{plans: true},
			domain.ErrAccountHasPlannedPayments,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := service.ValidateAccountDelete(context.Background(), tc.reads, hh, id)
			if tc.wantErr == nil {
				require.NoError(t, err)
				return
			}
			require.ErrorIs(t, err, tc.wantErr)
		})
	}
}

type stubCategoryDeleteReads struct {
	transactions, plans bool
}

func (s stubCategoryDeleteReads) HasLiveTransactionsForCategory(
	_ context.Context, _, _ uuid.UUID,
) (bool, error) {
	return s.transactions, nil
}

func (s stubCategoryDeleteReads) HasLivePlannedPaymentsForCategory(
	_ context.Context, _, _ uuid.UUID,
) (bool, error) {
	return s.plans, nil
}

func TestValidateCategoryDelete(t *testing.T) {
	t.Parallel()

	hh, id := uuid.New(), uuid.New()

	t.Run("plain delete follows the account order: transactions, then plans", func(t *testing.T) {
		t.Parallel()
		require.ErrorIs(t, service.ValidateCategoryDelete(
			context.Background(), stubCategoryDeleteReads{transactions: true, plans: true}, hh, id),
			domain.ErrCategoryHasTransactions)
		require.ErrorIs(t, service.ValidateCategoryDelete(
			context.Background(), stubCategoryDeleteReads{plans: true}, hh, id),
			domain.ErrCategoryHasPlannedPayments)
		require.NoError(t, service.ValidateCategoryDelete(
			context.Background(), stubCategoryDeleteReads{}, hh, id))
	})

	t.Run("cascaded delete is blocked only by live planned payments", func(t *testing.T) {
		t.Parallel()
		require.NoError(t, service.ValidateCategoryDeleteUnderCascade(
			context.Background(), stubCategoryDeleteReads{transactions: true}, hh, id))
		require.ErrorIs(t, service.ValidateCategoryDeleteUnderCascade(
			context.Background(), stubCategoryDeleteReads{plans: true}, hh, id),
			domain.ErrCategoryHasPlannedPayments)
	})
}

type stubDebtorDeleteReads struct {
	operations bool
}

func (s stubDebtorDeleteReads) HasLiveDebtOperationsForDebtor(
	_ context.Context, _, _ uuid.UUID,
) (bool, error) {
	return s.operations, nil
}

func TestValidateDebtorDelete(t *testing.T) {
	t.Parallel()

	hh, id := uuid.New(), uuid.New()
	require.NoError(t, service.ValidateDebtorDelete(
		context.Background(), stubDebtorDeleteReads{}, hh, id))
	require.ErrorIs(t, service.ValidateDebtorDelete(
		context.Background(), stubDebtorDeleteReads{operations: true}, hh, id),
		domain.ErrDebtorHasOperations)
}

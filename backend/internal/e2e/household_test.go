package e2e_test

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Household endpoints + registration auto-household (household-scoping
// change): every new registration creates a personal household with the user
// as owner; GET /api/household lists it; PATCH /api/me edits the display name
// which the listing reflects.
func TestE2E_HouseholdAndProfile(t *testing.T) {
	if testing.Short() {
		t.Skip("requires Docker for testcontainers")
	}

	email := uniqueEmail()
	c := &client{t: t, jar: map[string]string{}}
	r := c.do("POST", "/api/auth/register", map[string]string{"email": email, "password": "supersecret1"})
	require.Equal(t, 201, r["__status"], "%v", r["__body"])

	// The registration response carries no display name yet.
	assert.Nil(t, r["displayName"], "displayName absent before it is set")

	// The personal household exists immediately: one member, the owner.
	r = c.do("GET", "/api/household", nil)
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	householdID, ok := r["id"].(string)
	require.True(t, ok, "household id: %v", r["__body"])
	assert.NotEmpty(t, householdID)
	createdAt, ok := r["createdAt"].(string)
	require.True(t, ok, "household createdAt")
	assert.NotEmpty(t, createdAt)
	members, ok := r["members"].([]any)
	require.True(t, ok, "members array")
	require.Len(t, members, 1)
	member := members[0].(map[string]any)
	assert.Equal(t, email, member["email"])
	assert.Equal(t, "owner", member["role"])
	assert.Nil(t, member["displayName"], "display name absent before it is set")
	assert.NotEmpty(t, member["joinedAt"])

	// Profile edit: display-name validation.
	r = c.do("PATCH", "/api/me", map[string]string{"displayName": "   "})
	require.Equal(t, 400, r["__status"], "%v", r["__body"])
	assert.Equal(t, "VALIDATION_FAILED", r["code"])
	r = c.do("PATCH", "/api/me", map[string]string{"displayName": strings.Repeat("x", 101)})
	require.Equal(t, 400, r["__status"], "%v", r["__body"])

	// Set + change the display name.
	r = c.do("PATCH", "/api/me", map[string]string{"displayName": "  Юрий  "})
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	assert.Equal(t, "Юрий", r["displayName"], "the trimmed value is stored")
	r = c.do("PATCH", "/api/me", map[string]string{"displayName": "Юра"})
	require.Equal(t, 200, r["__status"], "%v", r["__body"])

	// GET /api/auth/me reflects it too.
	r = c.do("GET", "/api/auth/me", nil)
	require.Equal(t, 200, r["__status"])
	assert.Equal(t, "Юра", r["displayName"])

	// The household listing reflects the current value.
	r = c.do("GET", "/api/household", nil)
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	member = r["members"].([]any)[0].(map[string]any)
	assert.Equal(t, "Юра", member["displayName"])

	// The household endpoints require a session.
	anonymous := &client{t: t, jar: map[string]string{}}
	r = anonymous.do("GET", "/api/household", nil)
	assert.Equal(t, 401, r["__status"])
	r = anonymous.do("PATCH", "/api/me", map[string]string{"displayName": "X"})
	assert.Equal(t, 401, r["__status"])
}

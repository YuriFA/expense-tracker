package e2e_test

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Household join lifecycle (household-join change): email invitations
// (preview/accept with matching-email auth), the home join code, membership
// swap + orphaning, leave/remove/dissolve, and the household display name.

// registerAndJoin prepares a two-member household: an owner and a joiner who
// enters via the home code. Returns the owner's and joiner's clients.
func registerAndJoin(t *testing.T) (owner, joiner *client, householdID, joinerOldHouseholdID string) {
	t.Helper()
	owner = &client{t: t, jar: map[string]string{}}
	r := owner.do("POST", "/api/auth/register", map[string]string{"email": uniqueEmail(), "password": "supersecret1"})
	require.Equal(t, 201, r["__status"], "%v", r["__body"])
	joiner = &client{t: t, jar: map[string]string{}}
	r = joiner.do("POST", "/api/auth/register", map[string]string{"email": uniqueEmail(), "password": "supersecret1"})
	require.Equal(t, 201, r["__status"], "%v", r["__body"])

	// The joiner's pre-join personal household (to verify orphaning).
	r = joiner.do("GET", "/api/household", nil)
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	joinerOldHouseholdID = r["id"].(string)

	r = owner.do("POST", "/api/household/code", nil)
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	code := r["code"].(string)

	r = joiner.do("POST", "/api/household/join", map[string]string{"code": code})
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	householdID = r["id"].(string)

	r = owner.do("GET", "/api/household", nil)
	require.Equal(t, 200, r["__status"])
	assert.Equal(t, householdID, r["id"], "the owner sees the joined household")
	return owner, joiner, householdID, joinerOldHouseholdID
}

// pushCreate pushes one baseVersion-0 upsert via /api/sync/push and asserts
// it applied. Returns the new server version.
func pushCreate(t *testing.T, c *client, opID, id string) float64 {
	t.Helper()
	r := c.do("POST", "/api/sync/push", map[string]any{
		"operations": []any{map[string]any{
			"opId": opID, "entity": "account", "action": "upsert", "id": id, "baseVersion": 0,
			"data": map[string]any{
				"name": "Acc " + id[:8], "currency": "USD",
				"openingBalance": 1000, "manualAdjustment": 0,
			},
		}},
	})
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	results := r["results"].([]any)
	require.Len(t, results, 1)
	result := results[0].(map[string]any)
	require.Equal(t, "applied", result["status"], "%v", r["__body"])
	version, ok := result["version"].(float64)
	require.True(t, ok, "applied version: %v", r["__body"])
	return version
}

func pullFromZero(t *testing.T, c *client) []map[string]any {
	t.Helper()
	changes, _ := pullAll(t, c, 0)
	return changes
}

// TestE2E_InvitationLifecycle: create (refresh-not-duplicate), preview auth
// states, accept happy path, idempotent re-accept, already-member rejection,
// revoke, and owner-only guards.
func TestE2E_InvitationLifecycle(t *testing.T) {
	if testing.Short() {
		t.Skip("requires Docker for testcontainers")
	}

	ownerEmail := uniqueEmail()
	owner := &client{t: t, jar: map[string]string{}}
	r := owner.do("POST", "/api/auth/register", map[string]string{"email": ownerEmail, "password": "supersecret1"})
	require.Equal(t, 201, r["__status"], "%v", r["__body"])

	// Name the household so the preview presents it by name.
	r = owner.do("PATCH", "/api/household", map[string]any{"name": "Семья"})
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	assert.Equal(t, "Семья", r["name"])

	inviteeEmail := uniqueEmail()

	// --- create: the invitation email carries the accept link ---
	r = owner.do("POST", "/api/household/invitations", map[string]string{"email": inviteeEmail})
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	assert.Equal(t, "pending", r["status"])
	invitationID := r["id"].(string)
	link := mailer.invitationLink(inviteeEmail)
	require.NotEmpty(t, link, "invitation email was sent")
	assert.Contains(t, link, "https://test-app.example.com/invite/")
	token1 := link[strings.LastIndex(link, "/")+1:]

	// --- refresh-not-duplicate: re-invite refreshes token/expiry in place ---
	r = owner.do("POST", "/api/household/invitations", map[string]string{"email": inviteeEmail})
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	assert.Equal(t, invitationID, r["id"], "the same invitation row is refreshed, not duplicated")
	link2 := mailer.invitationLink(inviteeEmail)
	token2 := link2[strings.LastIndex(link2, "/")+1:]
	assert.NotEqual(t, token1, token2, "the accept token rotates on refresh")

	r = owner.do("GET", "/api/household/invitations", nil)
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	invitations := r["invitations"].([]any)
	require.Len(t, invitations, 1, "still exactly one invitation for the email")
	assert.Equal(t, invitationID, invitations[0].(map[string]any)["id"])

	// --- preview: unauthenticated -> 401 (client routes to login) ---
	anonymous := &client{t: t, jar: map[string]string{}}
	r = anonymous.do("GET", "/api/invitations/"+token2, nil)
	assert.Equal(t, 401, r["__status"])

	// --- preview: wrong account -> clear error, invitation stays pending ---
	otherEmail := uniqueEmail()
	other := &client{t: t, jar: map[string]string{}}
	r = other.do("POST", "/api/auth/register", map[string]string{"email": otherEmail, "password": "supersecret1"})
	require.Equal(t, 201, r["__status"])
	r = other.do("GET", "/api/invitations/"+token2, nil)
	require.Equal(t, 403, r["__status"], "%v", r["__body"])
	assert.Equal(t, "HOUSEHOLD_INVITATION_EMAIL_MISMATCH", r["code"])
	r = other.do("POST", "/api/invitations/"+token2+"/accept", nil)
	require.Equal(t, 403, r["__status"], "%v", r["__body"])
	assert.Equal(t, "HOUSEHOLD_INVITATION_EMAIL_MISMATCH", r["code"])

	// The invitation is untouched by the mismatched attempts.
	r = owner.do("GET", "/api/household/invitations", nil)
	require.Equal(t, 200, r["__status"])
	assert.Equal(t, "pending", r["invitations"].([]any)[0].(map[string]any)["status"])

	// --- preview: unknown token -> 404 ---
	r = other.do("GET", "/api/invitations/00000000-0000-4000-8000-000000000000", nil)
	require.Equal(t, 404, r["__status"], "%v", r["__body"])
	assert.Equal(t, "HOUSEHOLD_INVITATION_NOT_FOUND", r["code"])

	// --- accept: unregistered invitee registers first, then accepts ---
	invitee := &client{t: t, jar: map[string]string{}}
	r = invitee.do("POST", "/api/auth/register", map[string]string{"email": inviteeEmail, "password": "supersecret1"})
	require.Equal(t, 201, r["__status"])

	r = invitee.do("GET", "/api/invitations/"+token2, nil)
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	assert.Equal(t, "Семья", r["householdName"])
	assert.EqualValues(t, 1, r["membersCount"])
	assert.Equal(t, ownerEmail, r["inviterEmail"])
	assert.NotEmpty(t, r["expiresAt"])

	// The joiner's pre-accept personal household gets orphaned: they hold a
	// record there which must become inaccessible after the swap.
	oldRecordID := "aaaaaaaa-0000-4000-8000-000000000001"
	pushCreate(t, invitee, "aaaaaaaa-0000-4000-8000-000000000002", oldRecordID)
	r = invitee.do("GET", "/api/accounts/"+oldRecordID, nil)
	require.Equal(t, 200, r["__status"], "%v", r["__body"])

	r = invitee.do("POST", "/api/invitations/"+token2+"/accept", nil)
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	joinedID := r["id"].(string)
	assert.Equal(t, "Семья", r["name"])
	members := r["members"].([]any)
	require.Len(t, members, 2)

	// The joiner's household view is the joined one, as a member.
	r = invitee.do("GET", "/api/household", nil)
	require.Equal(t, 200, r["__status"])
	assert.Equal(t, joinedID, r["id"])
	for _, m := range r["members"].([]any) {
		mm := m.(map[string]any)
		if mm["email"] == inviteeEmail {
			assert.Equal(t, "member", mm["role"])
		}
	}

	// --- orphaning: the old household's record is out of the joiner's scope ---
	r = invitee.do("GET", "/api/accounts/"+oldRecordID, nil)
	assert.Equal(t, 404, r["__status"], "the orphaned household's data is inaccessible")

	// The invitation is consumed in the owner's listing.
	r = owner.do("GET", "/api/household/invitations", nil)
	require.Equal(t, 200, r["__status"])
	assert.Equal(t, "accepted", r["invitations"].([]any)[0].(map[string]any)["status"])

	// --- idempotent re-accept: joining the current household is a no-op ---
	r = invitee.do("POST", "/api/invitations/"+token2+"/accept", nil)
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	assert.Equal(t, joinedID, r["id"], "re-accepting the consumed invitation is a no-op success")
	assert.Len(t, r["members"].([]any), 2, "nothing changed")

	// --- already-member invitation is rejected ---
	r = owner.do("POST", "/api/household/invitations", map[string]string{"email": inviteeEmail})
	require.Equal(t, 409, r["__status"], "%v", r["__body"])
	assert.Equal(t, "HOUSEHOLD_INVITATION_ALREADY_MEMBER", r["code"])

	// --- revoke: pending invitation becomes unacceptable, idempotently ---
	thirdEmail := uniqueEmail()
	r = owner.do("POST", "/api/household/invitations", map[string]string{"email": thirdEmail})
	require.Equal(t, 200, r["__status"])
	revLink := mailer.invitationLink(thirdEmail)
	revToken := revLink[strings.LastIndex(revLink, "/")+1:]
	revID := r["id"].(string)

	third := &client{t: t, jar: map[string]string{}}
	r = third.do("POST", "/api/auth/register", map[string]string{"email": thirdEmail, "password": "supersecret1"})
	require.Equal(t, 201, r["__status"])

	r = owner.do("DELETE", "/api/household/invitations/"+revID, nil)
	require.Equal(t, 204, r["__status"])
	r = owner.do("DELETE", "/api/household/invitations/"+revID, nil)
	assert.Equal(t, 204, r["__status"], "revoke is idempotent")

	r = third.do("GET", "/api/invitations/"+revToken, nil)
	require.Equal(t, 400, r["__status"], "%v", r["__body"])
	assert.Equal(t, "HOUSEHOLD_INVITATION_REVOKED", r["code"])
	r = third.do("POST", "/api/invitations/"+revToken+"/accept", nil)
	require.Equal(t, 400, r["__status"])
	assert.Equal(t, "HOUSEHOLD_INVITATION_REVOKED", r["code"])

	// Revoking an unknown invitation is a 404.
	r = owner.do("DELETE", "/api/household/invitations/00000000-0000-4000-8000-000000000000", nil)
	assert.Equal(t, 404, r["__status"])

	// --- owner-only guards: a member cannot invite/list/rename ---
	r = invitee.do("POST", "/api/household/invitations", map[string]string{"email": uniqueEmail()})
	assert.Equal(t, 403, r["__status"])
	r = invitee.do("GET", "/api/household/invitations", nil)
	assert.Equal(t, 403, r["__status"])
	r = invitee.do("PATCH", "/api/household", map[string]any{"name": "Захват"})
	assert.Equal(t, 403, r["__status"])

	// --- household name validation + reset ---
	r = owner.do("PATCH", "/api/household", map[string]any{"name": strings.Repeat("x", 101)})
	assert.Equal(t, 400, r["__status"])
	r = owner.do("PATCH", "/api/household", map[string]any{"name": nil})
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	assert.Nil(t, r["name"], "null resets the name")
}

// TestE2E_HomeCodeLifecycle: generate/rotate/revoke + join-by-code semantics.
func TestE2E_HomeCodeLifecycle(t *testing.T) {
	if testing.Short() {
		t.Skip("requires Docker for testcontainers")
	}

	owner, joiner, householdID, _ := registerAndJoin(t)

	// The active code joins; joining the current household is a no-op.
	r := owner.do("POST", "/api/household/code", nil)
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	code := r["code"].(string)
	assert.Len(t, code, 8)
	assert.NotContains(t, code, "0", "unambiguous alphabet")
	assert.NotContains(t, code, "O")
	assert.NotContains(t, code, "1")
	assert.NotContains(t, code, "I")

	r = joiner.do("POST", "/api/household/join", map[string]string{"code": code})
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	assert.Equal(t, householdID, r["id"], "re-joining the current household is a no-op success")
	assert.Len(t, r["members"].([]any), 2, "no membership duplication")

	// Rotation invalidates the previous code.
	r = owner.do("POST", "/api/household/code", nil)
	require.Equal(t, 200, r["__status"])
	code2 := r["code"].(string)
	assert.NotEqual(t, code, code2, "rotate replaces the code")

	outsider := &client{t: t, jar: map[string]string{}}
	r = outsider.do("POST", "/api/auth/register", map[string]string{"email": uniqueEmail(), "password": "supersecret1"})
	require.Equal(t, 201, r["__status"])
	r = outsider.do("POST", "/api/household/join", map[string]string{"code": code})
	require.Equal(t, 400, r["__status"], "%v", r["__body"])
	assert.Equal(t, "HOUSEHOLD_CODE_INVALID", r["code"])

	// The rotated code works; revocation then kills it.
	r = outsider.do("POST", "/api/household/join", map[string]string{"code": code2})
	require.Equal(t, 200, r["__status"], "%v", r["__body"])

	r = owner.do("DELETE", "/api/household/code", nil)
	require.Equal(t, 204, r["__status"])
	r = owner.do("DELETE", "/api/household/code", nil)
	assert.Equal(t, 204, r["__status"], "code revoke is idempotent")

	latecomer := &client{t: t, jar: map[string]string{}}
	r = latecomer.do("POST", "/api/auth/register", map[string]string{"email": uniqueEmail(), "password": "supersecret1"})
	require.Equal(t, 201, r["__status"])
	r = latecomer.do("POST", "/api/household/join", map[string]string{"code": code2})
	require.Equal(t, 400, r["__status"])
	assert.Equal(t, "HOUSEHOLD_CODE_INVALID", r["code"])

	// Owner-only guards.
	r = joiner.do("POST", "/api/household/code", nil)
	assert.Equal(t, 403, r["__status"])
	r = joiner.do("DELETE", "/api/household/code", nil)
	assert.Equal(t, 403, r["__status"])
}

// TestE2E_LeaveRemoveDissolve: membership exits and their guards.
func TestE2E_LeaveRemoveDissolve(t *testing.T) {
	if testing.Short() {
		t.Skip("requires Docker for testcontainers")
	}

	t.Run("member leaves", func(t *testing.T) {
		owner, joiner, householdID, _ := registerAndJoin(t)

		// Owner cannot leave while members remain.
		r := owner.do("POST", "/api/household/leave", nil)
		require.Equal(t, 409, r["__status"], "%v", r["__body"])
		assert.Equal(t, "HOUSEHOLD_OWNER_WITH_MEMBERS", r["code"])

		// A shared record stays with the household after the member leaves.
		sharedID := "bbbbbbbb-0000-4000-8000-000000000001"
		pushCreate(t, joiner, "bbbbbbbb-0000-4000-8000-000000000002", sharedID)

		r = joiner.do("POST", "/api/household/leave", nil)
		require.Equal(t, 200, r["__status"], "%v", r["__body"])
		freshID := r["id"].(string)
		assert.NotEqual(t, householdID, freshID)
		members := r["members"].([]any)
		require.Len(t, members, 1)
		assert.Equal(t, "owner", members[0].(map[string]any)["role"])

		// The leaver lost access to the household's data (incl. their own push).
		r = joiner.do("GET", "/api/accounts/"+sharedID, nil)
		assert.Equal(t, 404, r["__status"])

		// The household keeps the record for the remaining members.
		r = owner.do("GET", "/api/accounts/"+sharedID, nil)
		assert.Equal(t, 200, r["__status"])

		// The leaver's fresh household starts empty.
		r = joiner.do("GET", "/api/household", nil)
		require.Equal(t, 200, r["__status"])
		assert.Equal(t, freshID, r["id"])
		assert.Len(t, r["members"].([]any), 1)
	})

	t.Run("owner removes member", func(t *testing.T) {
		owner, joiner, householdID, _ := registerAndJoin(t)
		r := owner.do("GET", "/api/household", nil)
		require.Equal(t, 200, r["__status"])
		var joinerID string
		for _, m := range r["members"].([]any) {
			mm := m.(map[string]any)
			if mm["role"] == "member" {
				joinerID = mm["userId"].(string)
			}
		}
		require.NotEmpty(t, joinerID)

		// Removing the owner is refused.
		ownerID := r["members"].([]any)[0].(map[string]any)["userId"].(string)
		for _, m := range r["members"].([]any) {
			if m.(map[string]any)["role"] == "owner" {
				ownerID = m.(map[string]any)["userId"].(string)
			}
		}
		r = owner.do("DELETE", "/api/household/members/"+ownerID, nil)
		require.Equal(t, 409, r["__status"], "%v", r["__body"])
		assert.Equal(t, "HOUSEHOLD_MEMBER_IS_OWNER", r["code"])

		// Unknown member is a 404; members cannot remove.
		r = owner.do("DELETE", "/api/household/members/00000000-0000-4000-8000-000000000000", nil)
		assert.Equal(t, 404, r["__status"])
		r = joiner.do("DELETE", "/api/household/members/"+joinerID, nil)
		assert.Equal(t, 403, r["__status"])

		r = owner.do("DELETE", "/api/household/members/"+joinerID, nil)
		require.Equal(t, 204, r["__status"])

		// The removed member lands in a fresh personal household.
		r = joiner.do("GET", "/api/household", nil)
		require.Equal(t, 200, r["__status"])
		assert.NotEqual(t, householdID, r["id"])
		assert.Len(t, r["members"].([]any), 1)

		// The household is back to one member with its data intact.
		r = owner.do("GET", "/api/household", nil)
		require.Equal(t, 200, r["__status"])
		assert.Equal(t, householdID, r["id"])
		assert.Len(t, r["members"].([]any), 1)

		// A lone owner may leave (orphaning their household like a join).
		r = owner.do("POST", "/api/household/leave", nil)
		require.Equal(t, 200, r["__status"], "%v", r["__body"])
		assert.NotEqual(t, householdID, r["id"])
	})

	t.Run("dissolve", func(t *testing.T) {
		owner, joiner, householdID, _ := registerAndJoin(t)
		sharedID := "cccccccc-0000-4000-8000-000000000001"
		pushCreate(t, owner, "cccccccc-0000-4000-8000-000000000002", sharedID)

		// Explicit confirm is part of the contract.
		r := owner.do("POST", "/api/household/dissolve", map[string]any{"confirm": false})
		require.Equal(t, 400, r["__status"], "%v", r["__body"])
		assert.Equal(t, "HOUSEHOLD_DISSOLVE_CONFIRM_REQUIRED", r["code"])

		// Members cannot dissolve.
		r = joiner.do("POST", "/api/household/dissolve", map[string]any{"confirm": true})
		assert.Equal(t, 403, r["__status"])

		r = owner.do("POST", "/api/household/dissolve", map[string]any{"confirm": true})
		require.Equal(t, 204, r["__status"], "%v", r["__body"])

		// Every member lands in a fresh personal household; the data is gone.
		for _, c := range []*client{owner, joiner} {
			r = c.do("GET", "/api/household", nil)
			require.Equal(t, 200, r["__status"])
			assert.NotEqual(t, householdID, r["id"])
			assert.Len(t, r["members"].([]any), 1)
			assert.Equal(t, "owner", r["members"].([]any)[0].(map[string]any)["role"])

			changes := pullFromZero(t, c)
			assert.Empty(t, changes, "the fresh household has an empty change stream")
		}
	})
}

// TestE2E_SyncAuthorshipRoundTrip: pull changes carry the author's user id,
// stamped by the server from the pushing session.
func TestE2E_SyncAuthorshipRoundTrip(t *testing.T) {
	if testing.Short() {
		t.Skip("requires Docker for testcontainers")
	}

	owner, joiner, _, _ := registerAndJoin(t)

	r := owner.do("GET", "/api/auth/me", nil)
	require.Equal(t, 200, r["__status"])
	ownerID := r["id"].(string)
	r = joiner.do("GET", "/api/auth/me", nil)
	require.Equal(t, 200, r["__status"])
	joinerID := r["id"].(string)

	pushCreate(t, owner, "dddddddd-0000-4000-8000-000000000001", "dddddddd-0000-4000-8000-000000000002")
	pushCreate(t, joiner, "dddddddd-0000-4000-8000-000000000003", "dddddddd-0000-4000-8000-000000000004")

	authors := map[string]string{}
	for _, change := range pullFromZero(t, joiner) {
		id := change["id"].(string)
		userID, _ := change["userId"].(string)
		authors[id] = userID
	}
	assert.Equal(t, ownerID, authors["dddddddd-0000-4000-8000-000000000002"], "owner's record carries the owner's id")
	assert.Equal(t, joinerID, authors["dddddddd-0000-4000-8000-000000000004"], "joiner's record carries the joiner's id")

	// The push direction ignores client-sent authorship: pushing with an
	// author field still stamps the session user.
	r = joiner.do("POST", "/api/sync/push", map[string]any{
		"operations": []any{map[string]any{
			"opId": "dddddddd-0000-4000-8000-000000000005", "entity": "account", "action": "upsert",
			"id": "dddddddd-0000-4000-8000-000000000006", "baseVersion": 0,
			"userId": ownerID, // spoofed author - must be ignored
			"data": map[string]any{
				"name": "Spoofed", "currency": "USD", "openingBalance": 0, "manualAdjustment": 0,
			},
		}},
	})
	require.Equal(t, 200, r["__status"], "%v", r["__body"])
	require.Equal(t, "applied", r["results"].([]any)[0].(map[string]any)["status"])

	for _, change := range pullFromZero(t, owner) {
		if change["id"] == "dddddddd-0000-4000-8000-000000000006" {
			assert.Equal(t, joinerID, change["userId"], "the server stamps the pusher, not the client-sent author")
		}
	}
}

package domain

import "github.com/google/uuid"

// Scope is the household-scoped actor of a write: which household the record
// belongs to (IDOR scope) and who authored the change (authorship stamp).
//
// It exists so the two UUIDs cannot transpose: every household-scoped
// repository/service method takes this one value instead of a positional
// (householdID, actorID) pair, which compiled fine when handler code passed
// user.ID where householdID belonged (finding A16 - empty listings for every
// fresh registration). The transport layer builds it once per request from
// the auth middleware's session/membership resolution; the auto-confirm job
// synthesizes it per plan (the plan's author - the job acts on their behalf).
type Scope struct {
	HouseholdID uuid.UUID
	ActorID     uuid.UUID
}

// Package keys defines context keys shared between auth middleware and handlers.
package keys

const (
	CurrentUserKey          = "currentUser"
	CurrentSessionIDKey     = "currentSessionID"
	CurrentHouseholdKey     = "currentHouseholdID"
	CurrentHouseholdRoleKey = "currentHouseholdRole"
	RequestIDHeader         = "X-Request-ID"
)

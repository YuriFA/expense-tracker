// Package keys defines context keys shared between auth middleware and handlers.
package keys

const (
	CurrentUserKey      = "currentUser"
	CurrentSessionIDKey = "currentSessionID"
	RequestIDHeader     = "X-Request-ID"
)

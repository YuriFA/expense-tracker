package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Sync entity kinds (matches the OpenAPI SyncEntity enum).
const (
	SyncEntityAccount     = "account"
	SyncEntityCategory    = "category"
	SyncEntityTransaction = "transaction"
)

// Sync action kinds (matches the OpenAPI SyncOperation.action enum).
const (
	SyncActionUpsert = "upsert"
	SyncActionDelete = "delete"
)

// Per-item push result statuses (matches the OpenAPI SyncPushResult.status
// enum).
const (
	SyncStatusApplied  = "applied"
	SyncStatusConflict = "conflict"
	SyncStatusError    = "error"
)

// Machine codes carried by per-item push results (NOT endpoint-level
// ErrorResponse codes; the push endpoint itself always returns 200).
const (
	SyncCodeVersionConflict = "SYNC_VERSION_CONFLICT"
	SyncCodeAlreadyExists   = "SYNC_ALREADY_EXISTS"
	SyncCodeDeletedConflict = "SYNC_DELETED_CONFLICT"
)

// Pull change actions (matches the OpenAPI SyncChange.action enum).
const (
	SyncChangeUpsert    = "upsert"
	SyncChangeTombstone = "tombstone"
)

// SyncOperation is one client operation from a push batch.
type SyncOperation struct {
	OpID        uuid.UUID
	Entity      string
	Action      string
	ID          uuid.UUID
	BaseVersion int
	Data        json.RawMessage
}

// SyncServerState is the server's current view of a record, returned with
// conflict results. Data is the full record state in wire JSON (see the
// *FullState json tags), nil for a tombstoned record. The json tags mirror
// the OpenAPI wire format so a stored result replays verbatim.
type SyncServerState struct {
	Version int             `json:"version"`
	Deleted bool            `json:"deleted"`
	Data    json.RawMessage `json:"data,omitempty"`
}

// SyncPushResult is the per-item outcome of a push operation.
type SyncPushResult struct {
	OpID        uuid.UUID        `json:"opId"`
	Status      string           `json:"status"`
	Version     int              `json:"version,omitempty"`
	Code        string           `json:"code,omitempty"`
	Message     string           `json:"message,omitempty"`
	ServerState *SyncServerState `json:"serverState,omitempty"`
}

// AppliedOperation is the durable opId idempotency record; Result replays
// verbatim on redelivery of the same opId.
type AppliedOperation struct {
	OpID      uuid.UUID
	UserID    uuid.UUID
	Entity    string
	EntityID  uuid.UUID
	Result    SyncPushResult
	AppliedAt time.Time
}

// SyncChange is one change-log entry delivered by a pull. Data is one of
// *AccountFullState / *CategoryFullState / *TransactionFullState, nil for
// tombstones.
type SyncChange struct {
	Seq     int64
	Entity  string
	ID      uuid.UUID
	Action  string
	Version int
	Data    any
}

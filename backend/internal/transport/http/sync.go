package http

import (
	"context"
	"encoding/json"

	"github.com/yurifa/expense-tracker-api/internal/api"
	"github.com/yurifa/expense-tracker-api/internal/domain"
)

// SyncPush applies a batch of client operations; the endpoint always answers
// 200 with per-item results (applied / conflict / error). Only infrastructure
// failures surface as endpoint-level errors.
func (s *Server) SyncPush(
	ctx context.Context,
	req api.SyncPushRequestObject,
) (api.SyncPushResponseObject, error) {
	user := s.currentUser(ctx)

	ops := make([]domain.SyncOperation, 0, len(req.Body.Operations))
	for _, o := range req.Body.Operations {
		var data json.RawMessage
		if o.Data != nil {
			raw, err := json.Marshal(o.Data)
			if err != nil {
				return nil, err
			}
			data = raw
		}
		ops = append(ops, domain.SyncOperation{
			OpID:        o.OpId,
			Entity:      string(o.Entity),
			Action:      string(o.Action),
			ID:          o.Id,
			BaseVersion: o.BaseVersion,
			Data:        data,
		})
	}

	results, err := s.sync.Push(ctx, user.ID, ops)
	if err != nil {
		return nil, err
	}

	out := make([]api.SyncPushResult, 0, len(results))
	for _, r := range results {
		out = append(out, toAPISyncPushResult(r))
	}
	return api.SyncPush200JSONResponse{Results: out}, nil
}

// SyncPull returns the change-log page after the client's cursor.
func (s *Server) SyncPull(
	ctx context.Context,
	req api.SyncPullRequestObject,
) (api.SyncPullResponseObject, error) {
	user := s.currentUser(ctx)

	var afterSeq int64
	if req.Params.Cursor != nil {
		afterSeq = *req.Params.Cursor
	}

	page, err := s.sync.Pull(ctx, user.ID, afterSeq, req.Params.Limit)
	if err != nil {
		return nil, err
	}

	changes := make([]api.SyncChange, 0, len(page.Changes))
	for _, c := range page.Changes {
		change := api.SyncChange{
			Seq:     c.Seq,
			Entity:  api.SyncEntity(c.Entity),
			Id:      toUUID(c.ID),
			Action:  api.SyncChangeAction(c.Action),
			Version: c.Version,
		}
		if c.Data != nil {
			raw, err := json.Marshal(c.Data)
			if err != nil {
				return nil, err
			}
			var data api.SyncChange_Data
			if err := json.Unmarshal(raw, &data); err != nil {
				return nil, err
			}
			change.Data = &data
		}
		changes = append(changes, change)
	}
	return api.SyncPull200JSONResponse{Changes: changes, NextCursor: page.NextCursor}, nil
}

func toAPISyncPushResult(r domain.SyncPushResult) api.SyncPushResult {
	out := api.SyncPushResult{
		OpId:   toUUID(r.OpID),
		Status: api.SyncPushResultStatus(r.Status),
	}
	if r.Version != 0 {
		v := r.Version
		out.Version = &v
	}
	if r.Code != "" {
		code := r.Code
		out.Code = &code
	}
	if r.Message != "" {
		message := r.Message
		out.Message = &message
	}
	if r.ServerState != nil {
		state := &api.SyncServerState{
			Version: r.ServerState.Version,
			Deleted: r.ServerState.Deleted,
		}
		if len(r.ServerState.Data) > 0 {
			var data api.SyncServerState_Data
			if err := json.Unmarshal(r.ServerState.Data, &data); err == nil {
				state.Data = &data
			}
		}
		out.ServerState = state
	}
	return out
}

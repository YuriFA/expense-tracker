# Design: surface-sync-operation-failures

## Context

The sync engine already records why an operation is not progressing: push
per-item `error` results are written to `syncOutbox.lastError`
(`<code>: <message>`), and payloads that fail local wire validation are parked
with `INVALID_PAYLOAD: ...` before ever being sent. Nothing reads that column
- `readSyncStatus` counts outbox rows wholesale, and both clients render the
count as a plain "pending upload" state. The failure mode observed in the
wild: 49 ops rejected with `INVALID_REFS` on every cycle (client/server
version skew) looked identical to "waiting to send".

## Goals / Non-Goals

- Goal: make rejected operations visibly distinct from merely queued ones, on
  web and mobile, with the last error message one hover/tap away.
- Goal: keep the read cheap - the status snapshot is refreshed after every
  sync cycle.
- Non-goal: a per-operation management surface (retry/discard individual
  ops). The outbox is coalesced per record; per-op actions would need a new
  seam and UX. Revisit when a real need appears.
- Non-goal: changing push semantics, backoff, or the wire protocol.

## Decisions

### D1. Snapshot fields `failingOperations` + `lastError` (additive)

`readSyncStatus` returns two extra fields: the count of outbox rows with
`lastError IS NOT NULL` and the `lastError` string of the newest such row
(by `createdAt DESC` - the outbox has no error timestamp; ops are created
monotonically and the newest failing op is the best single sample). Both
fields are additive; the worker RPC surface needs no changes. `lastError`
stays a raw `"<code>: <message>"` string - the code is the actionable part
and messages are server English; no parsing at the seam.

An operation that failed once but is re-sent and applied disappears with its
row (confirmation deletes it), so the failing count recovers automatically.
While a previously-failed op is in flight the badge still shows failing -
honest, since the last completed attempt failed.

### D2. Badge priority: conflicts > failing > paused > running > pending

Failing is an error state the user cannot out-wait, so it sits directly under
conflicts. The pending state keeps meaning "queued, nothing rejected". Web:
the full pill gets the warning tint (same wash as conflicts) and a
`title` tooltip with `lastError`; the compact variant gets the warning
accent. Mobile mirrors the states with an alert icon. Label:
«Ошибка отправки: {count}» / "Upload error: {count}".

### D3. Settings sync card reports rejected ops alongside pending

The mobile settings sync card lists pending and conflicts; it gains a line
for the failing count (destructive text), same source query. The web has no
equivalent card - the badge is the only surface there.

## Risks / Trade-offs

- `lastError` is the newest failing op's error, not a grouped summary; with
  mixed failure codes only one sample shows. Acceptable for a badge tooltip;
  a full problem list belongs to the non-goal surface.
- Parked `INVALID_PAYLOAD` ops (never sent) count as failing too - intended:
  they are the most stuck class of all.

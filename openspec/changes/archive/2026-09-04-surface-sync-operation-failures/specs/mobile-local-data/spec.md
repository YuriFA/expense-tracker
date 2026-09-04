# mobile-local-data delta

## ADDED Requirements

### Requirement: Sync status visibility

The app SHALL display the current synchronization state while signed in:
unresolved conflicts first, then operations the server is rejecting, the
paused (auth expired) state, the in-flight cycle, the pending outbox count,
and the settled synced state. Operations whose last push attempt produced a
per-item error result SHALL be shown as a distinct failing state - not as
plain pending.

#### Scenario: Server-rejected operations visible as failing

- **WHEN** queued operations are being rejected by the server on every push
  attempt (per-item error results, e.g. a domain-rule violation)
- **THEN** the sync status indicator shows a failing state with the count of
  rejected operations, distinct from the pending state

#### Scenario: Settings sync card distinguishes rejected operations

- **WHEN** the settings sync card is visible and some queued operations are
  being rejected by the server
- **THEN** the card reports the rejected count as an error alongside the
  pending outbox state

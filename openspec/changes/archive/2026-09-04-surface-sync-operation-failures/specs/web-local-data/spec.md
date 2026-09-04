# web-local-data delta

## MODIFIED Requirements

### Requirement: Sync status visibility and conflict surfacing

The app SHALL display the current synchronization state (including pending
operations, operations the server is rejecting, running state, and
paused-due-to-auth state) on every screen where data is visible. Unresolved
sync conflicts SHALL be surfaced from any screen and resolvable there (keep
local / take server flows per `sync-protocol`).

Operations whose last push attempt produced a per-item error result (or that
failed local wire validation before being sent) SHALL be shown as a distinct
failing state - not as plain pending - and the last recorded error SHALL be
discoverable from the status surface without developer tooling.

#### Scenario: Pending operations visible

- **WHEN** local changes are queued but not yet synchronized
- **THEN** the sync status indicator shows the pending state

#### Scenario: Server-rejected operations visible as failing

- **WHEN** queued operations are being rejected by the server on every push
  attempt (per-item error results, e.g. a domain-rule violation)
- **THEN** the sync status indicator shows a failing state with the count of
  rejected operations, distinct from the pending state
- **AND** the last recorded operation error is shown as the indicator's
  tooltip/title

#### Scenario: Rejected operation recovers

- **WHEN** a previously rejected operation is pushed again and the server
  applies it
- **THEN** the failing indicator disappears and the indicator reflects the
  remaining outbox state

#### Scenario: Conflict resolution from any screen

- **WHEN** unresolved conflicts exist
- **THEN** the user can open the conflict view and resolve each conflict
  without navigating away from the current workflow context

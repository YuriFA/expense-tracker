## MODIFIED Requirements

### Requirement: Joining device chooses what happens to local data

When the user accepts a join on a device holding local data, the client
SHALL offer an explicit choice before any synchronization as the new
household: carry this device's local data into the household, or start
clean (drop local data and pull the household's). Carrying data over
SHALL preserve the local records and merge them with the household's by
the sync protocol's union semantics.

Household currency SHALL be established at session boundaries — app start,
app foreground, regained connectivity, and authentication — before any sync
run is triggered: at each boundary the client SHALL verify that the local
household marker matches the user's current household and, on mismatch,
offer the carry/clean choice before synchronization proceeds. Runs
triggered within a session (for example, the debounced run after local
mutations or a manual refresh) need not re-check household currency. If the
household check cannot complete (for example, the device is offline), the
client SHALL skip the pending run rather than synchronize without the
check.

#### Scenario: Carry local data over

- **WHEN** the user accepts the join and chooses to carry this device's
  data
- **THEN** the device's local records appear in the household alongside
  the household's existing records, without duplicates by record id

#### Scenario: Start clean

- **WHEN** the user accepts the join and chooses to start clean
- **THEN** the device's prior local data is removed and the household's
  data is pulled onto the device

#### Scenario: Household changed on another device

- **WHEN** the user's household changed elsewhere and this device returns
  to the foreground (or reconnects, or re-authenticates)
- **THEN** the client detects the mismatch at that session boundary and
  offers the carry/clean choice before any sync run as the new household
  is triggered

#### Scenario: Runs within a session do not re-check

- **WHEN** the user is actively using the device in one session and local
  mutations trigger debounced sync runs or a manual refresh
- **THEN** those runs proceed without repeating the household-currency
  check

#### Scenario: Household check cannot complete

- **WHEN** a session-boundary sync run is due but the household check
  cannot complete (for example, no connectivity)
- **THEN** the run is skipped and retried at a later boundary; no
  synchronization happens without the check

# Delta: web-local-data (new capability)

## Purpose

Browser-side local-first behavior of the web app: all data operations work
against durable local storage without a network, anonymous usage is the
default, and account login binds local data to a server account through an
explicit ownership gate and initial sync.

## ADDED Requirements

### Requirement: Local-first data operation

The web app SHALL serve every read and write of accounts, categories, and
transactions from durable local browser storage, without contacting the
backend. Local writes SHALL be recorded with their pending sync operations
atomically. Local data SHALL survive page reloads and browser restarts.

#### Scenario: Offline mutation

- **WHEN** the network is unavailable and the user creates, edits, or deletes
  an account, category, or transaction
- **THEN** the operation succeeds locally and is reflected immediately in the
  UI, with its sync operation queued for later delivery

#### Scenario: Persistence across reload

- **WHEN** the user reloads the page after local changes
- **THEN** all previously written data is present without any network access

### Requirement: Anonymous-first application

The app SHALL be fully usable without signing in: navigation SHALL NOT
redirect unauthenticated users away from data screens, and login/register
SHALL remain reachable as standalone pages from an always-available entry
point. The app SHALL display an indicator distinguishing the local
(anonymous) mode from the signed-in mode.

#### Scenario: Direct visit without session

- **WHEN** an unauthenticated user opens any data screen URL directly
- **THEN** the screen renders and operates on local data instead of
  redirecting to login

#### Scenario: Backend unavailable at startup

- **WHEN** the app starts while the backend is unreachable and no session can
  be restored
- **THEN** the app continues in anonymous mode on local data instead of
  showing a blocking error screen

### Requirement: Ownership gate and initial sync

On the first login over unowned local data, the app SHALL bind the local
data to the authenticated account and run the initial sync defined by
`sync-protocol` (push all local records as creates, pull server records). On
a login as a different account than the local owner, the app SHALL require
an explicit choice between clearing all local data and cancelling the login;
cancelling SHALL sign the just-authenticated session back out and keep local
data untouched.

#### Scenario: First login migrates anonymous data

- **WHEN** a user with anonymous local data signs in
- **THEN** the local data is bound to the account and the initial sync pushes
  local records as creates and pulls server records

#### Scenario: Different owner blocks login

- **WHEN** the local data is owned by account A and account B signs in
- **THEN** the user must choose between deleting the local data and cancelling
  the login, and choosing cancel signs B back out leaving the data intact

### Requirement: Logout preserves local data

Signing out SHALL keep all local data on the device and return the app to
anonymous mode; queued sync operations SHALL wait until the next
authentication.

#### Scenario: Logout then continued anonymous use

- **WHEN** a signed-in user signs out
- **THEN** the app switches to anonymous mode and all local data remains
  usable and intact

### Requirement: Sync status visibility and conflict surfacing

The app SHALL display the current synchronization state (including pending
operations, running state, and paused-due-to-auth state) on every screen
where data is visible. Unresolved sync conflicts SHALL be surfaced from any
screen and resolvable there (keep local / take server flows per
`sync-protocol`).

#### Scenario: Pending operations visible

- **WHEN** local changes are queued but not yet synchronized
- **THEN** the sync status indicator shows the pending state

#### Scenario: Conflict resolution from any screen

- **WHEN** unresolved conflicts exist
- **THEN** the user can open the conflict view and resolve each conflict
  without navigating away from the current workflow context

### Requirement: Single-tab storage exclusivity

The local database SHALL be opened by at most one browser tab at a time.
When another tab already holds the database, the app SHALL present a clear
"already open in another tab" state offering to retry, and SHALL NOT corrupt
or overwrite the data of the holding tab.

#### Scenario: Second tab blocked

- **WHEN** the app is already open in one tab and a second tab loads
- **THEN** the second tab shows the already-open state and does not open the
  database, while the first tab keeps working

### Requirement: Persistent storage request

The app SHALL request persistent browser storage for its local database
early in the application lifecycle.

#### Scenario: Storage persistence requested

- **WHEN** the application starts
- **THEN** a persistent-storage request is issued for the origin

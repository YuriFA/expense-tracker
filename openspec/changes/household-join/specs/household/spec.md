# Delta: household (join lifecycle)

## ADDED Requirements

### Requirement: Email invitations

The household owner SHALL be able to invite a member by email address.
An invitation SHALL carry a single-use accept token delivered by email
as a link, an expiry, and a revocation control for the owner. Accepting
SHALL require an authenticated session whose account email matches the
invitation; an unregistered inviteee SHALL be taken to registration
first and then accept. Invitations to an already-member email SHALL be
rejected, and re-sending a pending invitation to the same email SHALL
refresh it rather than duplicate it.

#### Scenario: Invite and accept by the matching account

- **WHEN** the owner invites wife@example.com and the user of that
  account opens the accept link while signed in
- **THEN** the invitation can be accepted and the account joins the
  household as a member

#### Scenario: Wrong account cannot accept

- **WHEN** a signed-in user whose email differs from the invitation
  opens the accept link
- **THEN** acceptance is refused with a clear error and the invitation
  remains pending

#### Scenario: Expired or revoked invitation

- **WHEN** the accept link is opened after expiry or revocation
- **THEN** acceptance is refused with a clear error

### Requirement: Home join code

The household owner SHALL be able to issue a join code for the
household. The code SHALL be multi-use, revocable, and rotatable (a new
code invalidates the previous one). Any authenticated user SHALL be able
to join the household by presenting an active code. A code SHALL not
identify or bind to a particular person.

#### Scenario: Joining with the code

- **WHEN** an authenticated user enters the household's active code
- **THEN** the user joins the household as a member

#### Scenario: Revoked code

- **WHEN** a user presents a revoked or rotated-out code
- **THEN** joining is refused with a clear error

### Requirement: Joining swaps membership and orphans the personal household

Accepting an invitation or code SHALL move the joiner's single
membership to the target household as a member. The joiner's former
personal household SHALL be retained server-side with access lost
(orphaned). Joining a household the user already belongs to SHALL be a
no-op.

#### Scenario: First join moves the membership

- **WHEN** a user with a personal household accepts an invitation
- **THEN** the user becomes a member of the inviting household and no
  longer has access to the personal household's data

#### Scenario: Repeated accept is idempotent

- **WHEN** the user accepts an invitation to their current household
  again
- **THEN** nothing changes

### Requirement: Joining device chooses what happens to local data

When the user accepts a join on a device holding local data, the client
SHALL offer an explicit choice before any synchronization as the new
household: carry this device's local data into the household, or start
clean (drop local data and pull the household's). Carrying data over
SHALL preserve the local records and merge them with the household's by
the sync protocol's union semantics.

#### Scenario: Carry local data over

- **WHEN** the user accepts the join and chooses to carry this device's
  data
- **THEN** the device's local records appear in the household alongside
  the household's existing records, without duplicates by record id

#### Scenario: Start clean

- **WHEN** the user accepts the join and chooses to start clean
- **THEN** the device's prior local data is removed and the household's
  data is pulled onto the device

### Requirement: Leaving, removal, and dissolution

A member SHALL be able to leave the household; the owner SHALL be able
to remove members. Leaving or removal revokes access only — the
household and its data remain. The owner SHALL be able to dissolve the
household as an explicit destructive action removing it with its data.
The owner SHALL NOT be able to leave a household that still has other
members.

#### Scenario: Member leaves

- **WHEN** a member leaves the household
- **THEN** their access to the household data ends and the remaining
  members' data is untouched

#### Scenario: Owner cannot abandon members

- **WHEN** the owner attempts to leave while other members exist
- **THEN** the leave is rejected with a clear error pointing to removal
  or dissolution instead

### Requirement: Household display name

A household SHALL have an optional display name, editable by the owner,
shown by invitation, join, and member interfaces. When absent,
interfaces fall back to a derived label from the owner's account.

#### Scenario: Named household in the accept flow

- **WHEN** an invited user opens the accept screen of a household named
  «Семья»
- **THEN** the screen presents the household by that name

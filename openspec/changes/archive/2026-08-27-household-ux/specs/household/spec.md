# Delta: household (membership surfaces and authorship labels)

## ADDED Requirements

### Requirement: Household management surface

Both clients SHALL provide a household section in settings showing the
current household's display name, and its members with display name (or
email fallback), role, and joined date. The owner SHALL manage
invitations (create by email, list with status, revoke, resend), the
home code (show, copy, rotate, revoke), member removal, household
rename, and dissolution (explicit destructive confirm). Members SHALL
have leave (with confirm) and the join-by-code entry. Actions the role
does not permit SHALL be hidden, not merely disabled.

#### Scenario: Owner manages the household

- **WHEN** the owner opens the household section
- **THEN** invitations, the home code, member removal, rename, and
  dissolution are available and functional

#### Scenario: Member's view

- **WHEN** a non-owner member opens the household section
- **THEN** the member list and leave are available, and owner-only
  actions are not shown

### Requirement: Authorship labels in shared data

Records carrying an author SHALL display who created them: always in the
record's detail view, and as a compact marker in lists/rows. Markers
SHALL appear only when the household has more than one member; records
authored by the current user and records without a known author SHALL
show no marker. Labels SHALL use the author's display name with the
email fallback.

#### Scenario: Sibling-created record in a shared household

- **WHEN** a multi-member household's member views a transaction created
  by another member
- **THEN** the detail view and the list row show that member's display
  name as the author

#### Scenario: Single-member household stays clean

- **WHEN** a user alone in their household views their data
- **THEN** no authorship markers are rendered

### Requirement: Display name editing

Both clients SHALL offer editing of the user's display name in settings
with an immediate preview of how household members will see them, and
the email fallback when the name is cleared.

#### Scenario: Edit and see the effect

- **WHEN** the user changes their display name and returns to the
  household section
- **THEN** the member list and authorship labels reflect the new name

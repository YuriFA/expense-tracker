# Delta: accounts (household scoping)

## MODIFIED Requirements

### Requirement: Account ownership and scoping

Every account SHALL belong to exactly one household. Reading, updating, or
deleting an account of a household the requester does not belong to SHALL
behave as if the account does not exist (not-found), never revealing its
data.

#### Scenario: Accessing another user's account

- **WHEN** a user requests an account id that belongs to a household they
  are not a member of
- **THEN** the response is not-found, with no account data revealed

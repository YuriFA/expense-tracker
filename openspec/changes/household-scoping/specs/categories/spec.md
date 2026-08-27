# Delta: categories (household scoping)

## MODIFIED Requirements

### Requirement: Category ownership and scoping

Every category SHALL belong to exactly one household. Reading, updating,
or deleting a category of a household the requester does not belong to
SHALL behave as if it does not exist (not-found). Category names are
unique per household among non-deleted categories; a duplicate name within
the same household SHALL be rejected with an already-exists error.

#### Scenario: Duplicate name for the same user

- **WHEN** any member creates a category named "Food" and the household
  already has a non-deleted category named "Food"
- **THEN** the request is rejected with an already-exists error

#### Scenario: Same name for different users

- **WHEN** two users from different households each create a category
  named "Food"
- **THEN** both categories are created independently

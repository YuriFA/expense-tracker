# web-screens Delta

## MODIFIED Requirements

### Requirement: Category management screen

The category management screen at `/settings/categories` SHALL list the
household's non-deleted categories grouped by type (expense, income),
each row showing the category's icon, color, name, and its transaction
count computed from the local data, with actions to edit, archive
(unarchive for archived ones), and delete. Archived categories SHALL be
shown in a separate collapsible archive section of the same screen. The
screen SHALL offer category creation through a «Создать» button in its
page header. The create dialog SHALL offer the type (expense or income,
chosen in the dialog and defaulting to expense), the name, and the icon;
the color SHALL be auto-assigned from the pre-paired icon-color set and
SHALL NOT be user-chosen. The edit dialog SHALL allow changing the name,
icon, and color only - the type SHALL NOT be editable after creation.
Creation from the transaction form dialog and the command palette SHALL
remain available.

#### Scenario: Browse categories

- **WHEN** the user opens `/settings/categories`
- **THEN** active categories are listed grouped by type with icon, color, name, and transaction count, the archive section is available, and a «Создать» button is present in the page header

#### Scenario: Create a category

- **WHEN** the user activates the header «Создать» button and submits the dialog with a type, a name, and a picked icon
- **THEN** a category of the chosen type is created with an auto-assigned color and appears in its type group

#### Scenario: Edit a category

- **WHEN** the user edits a category from the list
- **THEN** a dialog offers name, icon, and color; the type is shown read-only

#### Scenario: Archived section

- **WHEN** archived categories exist
- **THEN** the archive section lists them with an unarchive action, and they are absent from the active groups

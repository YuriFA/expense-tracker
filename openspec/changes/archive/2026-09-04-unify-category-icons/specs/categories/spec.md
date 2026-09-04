## REMOVED Requirements

### Requirement: Seed categories on registration

**Reason**: registration seeding is dead in the live product: both clients
register with seeding disabled and new users start from an empty category
list by design. The seed data also carries duplicate colors that break the
chart-distinctness goal of the paired icon-color model. Removal aligns the
specification with the from-scratch start every client already uses.

**Migration**: none. Existing users keep any seeded categories they already
have (stored records are untouched). New registrations always start empty;
no registration flow may request seeding anymore.

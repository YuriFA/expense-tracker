## MODIFIED Requirements

### Requirement: Health endpoint

The API SHALL expose `GET /api/health`, unauthenticated, returning success
when the process is serving requests. It SHALL NOT require a session,
execute business logic, or touch household-scoped data. The response SHALL
carry a machine-readable status and the API's build version string (the
deployed image tag, or `dev` for unversioned builds).

#### Scenario: Unauthenticated liveness probe succeeds

- **WHEN** any client sends `GET /api/health` with no session cookie
- **THEN** the server responds with success and a machine-readable
  `status: ok` payload

#### Scenario: Health reports the build version

- **WHEN** `GET /api/health` is served by a build produced with the
  version build argument
- **THEN** the payload carries that version string

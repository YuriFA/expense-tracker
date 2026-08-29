## Purpose

How the product is built into images and served in production: edge routing
behind the shared Traefik gateway on the VPS, CI-driven deployment from
GHCR, environment-based production configuration, and the operational
runbook.

## ADDED Requirements

### Requirement: Edge routing behind the shared gateway

The production stack SHALL join the VPS's shared Docker network and be
routed by its Traefik gateway on the project's subdomain: requests to
`/api/*` SHALL reach the API service, all other paths SHALL reach the web
static service. TLS termination and certificates SHALL remain the gateway's
responsibility; the stack SHALL NOT publish host ports.

#### Scenario: API path reaches the backend

- **WHEN** a client sends `GET https://<subdomain>/api/health`
- **THEN** the response comes from the API service

#### Scenario: Non-API paths serve the web app

- **WHEN** a client opens `https://<subdomain>/`
- **THEN** the web static service answers with the app shell

#### Scenario: Certificate is issued by the gateway

- **WHEN** the subdomain is first requested over HTTPS
- **THEN** the shared gateway provisions the certificate and the stack's
  own services never terminate TLS

### Requirement: Web image serves the built PWA

The web image SHALL be built from source in CI (install → build → copy
`dist`) and serve the result through a static server with SPA fallback:
unknown non-asset paths SHALL return the app shell; fingerprinted assets
SHALL be served with long-lived immutable caching.

#### Scenario: SPA fallback

- **WHEN** a client navigates to a client-side route path with no matching
  file
- **THEN** the server responds with the app shell (HTTP 200), not 404

#### Scenario: Hashed assets are immutable

- **WHEN** a client fetches a fingerprinted asset under `/assets/`
- **THEN** the response carries a long-lived immutable cache header

### Requirement: CI builds and deploys on demand

On a manual workflow dispatch, CI SHALL build the API and web images, push
them to the registry tagged with both the commit short SHA and the branch
name, then deploy to the VPS over SSH by pulling the images and recreating
the stack. Deploys SHALL NOT fire automatically on pushes — the operator
triggers each one. A dispatch with an explicit image tag SHALL deploy that
tag instead of building (rollback path).

#### Scenario: Manual dispatch deploys the new images

- **WHEN** an operator runs the deploy workflow from the default branch
- **THEN** CI builds and pushes both images and the VPS stack is recreated
  from them without manual server access

#### Scenario: Push alone deploys nothing

- **WHEN** a commit lands on the default branch without a manual dispatch
- **THEN** no images are built and the VPS stack is left untouched

#### Scenario: Pinned tag rollback

- **WHEN** a manual deploy runs with a previous commit's image tag
- **THEN** the VPS stack is recreated from that pinned tag

### Requirement: Production configuration is environment-driven

All deployment-specific values (subdomain, database URL and credentials,
allowed origins, trusted proxies, session flags, registry refs) SHALL come
from the VPS environment file; the repository SHALL contain only an example
file with placeholders. The API SHALL reach its database over the stack's
internal network.

#### Scenario: No secrets in the repository

- **WHEN** the deployment files are inspected
- **THEN** every secret is referenced as an environment variable and only
  placeholder examples are committed

#### Scenario: API connects to the database internally

- **WHEN** the stack starts
- **THEN** the API resolves the database by service name over the internal
  network without any published database port

### Requirement: Stack self-healing and deploy documentation

Services SHALL restart automatically and expose container health (database
readiness probe, API liveness via `/api/health`); the repository SHALL
document first-boot bring-up (gateway/network order), DNS, deployment,
rollback, and log inspection in a runbook.

#### Scenario: Unhealthy API is restarted

- **WHEN** the API container's liveness probe stops succeeding
- **THEN** the container is restarted by the runtime

#### Scenario: Runbook covers the lifecycle

- **WHEN** an operator follows the runbook on a fresh VPS with the gateway
  present
- **THEN** first boot, redeploy, rollback, and log inspection are all
  described steps

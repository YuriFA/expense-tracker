# Root Makefile — workstation deploy path.
#
# Mirrors .github/workflows/deploy.yml with the same images, tags, and
# stack definition, so the CI path and this one are interchangeable:
# whatever deployed last wins; GHCR keeps the shared tag history.
#
# One-time local setup:
#   1) echo 'SSH_TARGET=deploy@203.0.113.10' > .deploy.env   # gitignored
#      (or use an ~/.ssh/config alias: SSH_TARGET=vps)
#   2) docker login ghcr.io -u <github-user>   # PAT with write:packages
#
# Usage:
#   make deploy                     # build + push + deploy current HEAD
#   make rollback TAG=sha-03aad8d   # redeploy an already-pushed tag

-include .deploy.env

SSH_TARGET ?= $(error SSH_TARGET is not set: put SSH_TARGET=user@host into .deploy.env (see the header of this Makefile) or pass SSH_TARGET=... on the command line)
GHCR_REPO  ?= $(shell git remote get-url origin 2>/dev/null | sed -E 's,.*github.com[:/],,; s,\.git$$,,' | tr '[:upper:]' '[:lower:]')
DEPLOY_DIR ?= ~/expense-tracker
# The VPS is amd64; a workstation build (e.g. Apple Silicon) must
# cross-build for it or the containers crash-loop with exec format
# error (exit 255). Docker Desktop emulates the target platform.
PLATFORM  ?= linux/amd64

SHORT_SHA  := $(shell git rev-parse --short HEAD)
API_IMAGE  := ghcr.io/$(GHCR_REPO)
WEB_IMAGE  := ghcr.io/$(GHCR_REPO)-web

.PHONY: deploy rollback deploy-remote deploy-check

deploy-check:
	@test -n "$(GHCR_REPO)" || { echo "ERROR: cannot derive GHCR_REPO from 'git remote get-url origin'"; exit 1; }
	@test -n "$(SHORT_SHA)" || { echo "ERROR: not a git checkout"; exit 1; }

## deploy: build both images from HEAD, push (sha-<short> + main), deploy.
deploy: deploy-check
	docker build --platform $(PLATFORM) --build-arg VERSION=sha-$(SHORT_SHA) -t $(API_IMAGE):sha-$(SHORT_SHA) -t $(API_IMAGE):main backend
	docker build --platform $(PLATFORM) --build-arg VERSION=sha-$(SHORT_SHA) -t $(WEB_IMAGE):sha-$(SHORT_SHA) -t $(WEB_IMAGE):main -f apps/web/Dockerfile .
	docker push $(API_IMAGE):sha-$(SHORT_SHA)
	docker push $(API_IMAGE):main
	docker push $(WEB_IMAGE):sha-$(SHORT_SHA)
	docker push $(WEB_IMAGE):main
	@echo ">> images pushed, deploying sha-$(SHORT_SHA)"
	$(MAKE) deploy-remote IMAGE_TAG=sha-$(SHORT_SHA)

## rollback: redeploy an existing tag without building (e.g. make rollback TAG=sha-03aad8d).
rollback: deploy-check
	@test -n "$(TAG)" || { echo "Usage: make rollback TAG=sha-<short-sha>"; exit 1; }
	$(MAKE) deploy-remote IMAGE_TAG=$(TAG)

## deploy-remote: ship the compose file and recreate the stack with IMAGE_TAG.
deploy-remote: deploy-check
	scp docker-compose.prod.yml "$(SSH_TARGET):$(DEPLOY_DIR)/"
	ssh $(SSH_TARGET) 'set -e; cd $(DEPLOY_DIR); \
		docker network create web 2>/dev/null || true; \
		set -a; . ./.env; set +a; \
		echo "$$GHCR_TOKEN" | docker login ghcr.io -u "$$GHCR_USER" --password-stdin; \
		IMAGE_TAG=$(IMAGE_TAG) docker compose -f docker-compose.prod.yml pull; \
		IMAGE_TAG=$(IMAGE_TAG) docker compose -f docker-compose.prod.yml up -d --remove-orphans; \
		docker images --format "{{.Repository}}:{{.Tag}} {{.ID}}" \
			| grep -E "^ghcr\.io/$(GHCR_REPO)(:|-web:|-backup:)" \
			| grep -v ":$(IMAGE_TAG) " \
			| cut -d" " -f1 \
			| xargs -r docker rmi || true'

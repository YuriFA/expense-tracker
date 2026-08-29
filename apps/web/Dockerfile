# syntax=docker/dockerfile:1
#
# Multi-stage web image. Build context is the REPO ROOT (not apps/web):
# the Vite build compiles the workspace TS packages (packages/*) from
# source, so the whole pnpm workspace must be present.
#   docker build -f apps/web/Dockerfile .

FROM node:22-alpine AS builder

# pnpm comes from the root package.json `packageManager` pin via corepack.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /repo

# Workspace manifests first: `pnpm install` layer stays cached across
# source-only changes. Every workspace package.json must exist for pnpm
# to resolve the workspace graph (deps are only installed for `web`).
# .npmrc (node-linker=hoisted) is repo install config — the image must
# install exactly like the host, or undeclared-at-root transitive
# imports (e.g. workbox-window via vite-plugin-pwa's virtual module)
# stop resolving on a clean install.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/dates/package.json packages/dates/package.json
COPY packages/i18n/package.json packages/i18n/package.json
COPY packages/local-data/package.json packages/local-data/package.json
COPY packages/money/package.json packages/money/package.json
COPY packages/tokens/package.json packages/tokens/package.json
RUN pnpm install --frozen-lockfile --filter web...

COPY . .
RUN pnpm -C apps/web build

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80

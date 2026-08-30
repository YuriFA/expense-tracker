# syntax=docker/dockerfile:1
#
# CGO-free build: Postgres needs no cgo, so the image drops gcc/musl entirely
# and builds a static binary with CGO_ENABLED=0.

FROM golang:1.26-alpine AS builder

# Build version reported by GET /api/health: the deployed image tag
# (sha-<short>) from the deploy pipeline, or `dev` for local builds.
ARG VERSION=dev

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .

RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X main.version=$VERSION" -o /out/expense-tracker-api ./cmd/expense-tracker-api

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /out/expense-tracker-api /app/expense-tracker-api
COPY config/prod.yaml /app/prod.yaml
EXPOSE 8080
ENV ENV=prod
ENV TZ=UTC
ENV CONFIG_PATH=/app/prod.yaml
ENV DATABASE_URL=postgres://expense:expense@localhost:5432/expense?sslmode=disable
ENTRYPOINT [ "/app/expense-tracker-api" ]

FROM golang:1.24.9-alpine3.22 AS builder

ARG MINIO_VERSION=RELEASE.2025-10-15T17-29-55Z
RUN apk add --no-cache ca-certificates git && \
    CGO_ENABLED=0 go install -trimpath github.com/minio/minio@${MINIO_VERSION}

FROM alpine:3.22.2

RUN apk add --no-cache ca-certificates wget && \
    addgroup -S -g 10001 minio && \
    adduser -S -D -H -u 10001 -G minio minio && \
    mkdir -p /data && \
    chown -R minio:minio /data

COPY --from=builder /go/bin/minio /usr/local/bin/minio

USER minio
VOLUME ["/data"]
EXPOSE 9000 9001
ENTRYPOINT ["minio"]

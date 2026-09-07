# Build stage
FROM rust:bookworm AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/cluanote-sync-server
COPY Cargo.toml Cargo.lock* ./
COPY src ./src

RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /usr/src/cluanote-sync-server/target/release/cluanote-sync-server /app/cluanote-sync-server

ENV CLUANOTE_SYNC_HOST=0.0.0.0
ENV CLUANOTE_SYNC_PORT=7842

EXPOSE 7842

CMD ["/app/cluanote-sync-server"]

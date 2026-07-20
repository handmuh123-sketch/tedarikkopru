FROM node:24.18.0-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@11.15.0 --activate

FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN set -eu; \
    export NODE_ENV=production \
      APP_URL=http://127.0.0.1:3000 \
      APP_TIMEZONE=Europe/Istanbul \
      DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
      DIRECT_URL=postgresql://build:build@127.0.0.1:5432/build \
      AUTH_SECRET=build-only-auth-secret-with-at-least-thirty-two-characters \
      DATA_ENCRYPTION_KEY=build-only-data-key-with-at-least-thirty-two-characters \
      S3_ENDPOINT=http://127.0.0.1:9000 \
      S3_REGION=auto \
      S3_BUCKET_PRIVATE=build-private \
      S3_BUCKET_PUBLIC=build-public \
      S3_ACCESS_KEY=build-access \
      S3_SECRET_KEY=build-only-s3-value \
      EMAIL_FROM=noreply@localhost \
      EMAIL_SMTP_HOST=127.0.0.1 \
      EMAIL_SMTP_PORT=1025; \
    pnpm db:generate; \
    pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

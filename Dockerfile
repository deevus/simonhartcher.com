# Install dependencies only when needed
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

FROM base AS build

ENV NEXT_TELEMETRY_DISABLED 1
ARG NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
ARG NEXT_PUBLIC_POSTHOG_ID
ARG REDIS_HOST
ARG REDIS_PASSWORD

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --shamefully-hoist
RUN pnpm run build

FROM base

COPY --from=build /app /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

CMD ["pnpm", "start"]

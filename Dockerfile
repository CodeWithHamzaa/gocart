# Images for the Next.js + Payload app.
#   dev        (M5)  : the development image — `npm run dev` with the source baked in.
#   migrate    (M52a): a one-shot runner for `npm run deploy:migrate` (payload migrate + verifier).
#   production (M49) : a minimal, non-root image running the standalone server.
#
# The LAST stage is the default target, so a plain `docker build .` produces the production
# image. Build the development image with `docker build --target dev .`.
#
#   docker build --target production \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://shop.example.com .
#
# See docs/DECISIONS.md (ADR-031) for the decisions behind the production stage.

FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci


# ---------------------------------------------------------------- development (M5)
FROM deps AS dev

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]


# ---------------------------------------------------------------- build (M49)
FROM deps AS builder

# NEXT_PUBLIC_* values are inlined into the JavaScript at build time, so changing either one
# means rebuilding the image — they cannot be set when the container starts.
#   NEXT_PUBLIC_SITE_URL         the public origin: canonical URLs, sitemap, robots, Open Graph.
#                                Unset, it falls back to http://localhost:3000, which would
#                                publish localhost URLs — always pass the real one for a deploy.
#   NEXT_PUBLIC_CURRENCY_SYMBOL  the currency symbol shown on prices.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_CURRENCY_SYMBOL="Rs."
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_CURRENCY_SYMBOL=$NEXT_PUBLIC_CURRENCY_SYMBOL \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT=standalone

# The build runs WITHOUT a database. Payload still needs *some* secret and connection string to
# initialise, so `npm run build` below gets placeholders for just that one command (inline, not
# ENV: they are not stored in any image layer or its metadata, and the app reads the real values
# at runtime). The closed port makes any build-time query fail immediately instead of hanging;
# the app tolerates that (see app/(public)/category/[slug]/page.tsx and ADR-031).

RUN case "$NEXT_PUBLIC_SITE_URL" in \
      http://localhost*) echo "WARNING: building with NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL — canonical URLs and the sitemap will point at localhost. Pass --build-arg NEXT_PUBLIC_SITE_URL=<public origin> for a real deployment." ;; \
    esac

COPY . .
RUN PAYLOAD_SECRET=build-time-placeholder-not-the-runtime-secret \
    DATABASE_URI=postgresql://build:build@127.0.0.1:1/build \
    npm run build


# ---------------------------------------------------------------- migrations (M52a)
# The standalone `production` image cannot run the Payload CLI (no payload bin, no tsx, no
# drizzle-kit — ADR-031/ADR-032), so migrations run from this target: the full dependency tree
# plus the source. It is used only as the one-shot `migrate` service in docker-compose.prod.yml
# and is never exposed or deployed on its own. It MUST stay before `production`, which has to
# remain the last stage (the default target of a plain `docker build .`).
FROM deps AS migrate

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# /app itself must be writable by the unprivileged user (tools write caches next to the project);
# node_modules stays root-owned and read-only. .dockerignore keeps .env*, docs and e2e out.
RUN chown node:node /app
COPY --chown=node:node . .

USER node

# Bounded and non-interactive on purpose. `payload migrate` waits for a confirmation prompt when
# it finds rows pushed by `next dev`; with no terminal that would hang forever, so stdin is
# closed and the whole step is capped at 5 minutes (then killed). timeout exits non-zero when it
# fires, which makes the compose service fail and keeps `app` from starting.
CMD ["sh", "-c", "exec timeout -k 10 300 npm run deploy:migrate </dev/null"]


# ---------------------------------------------------------------- production (M49)
FROM node:22-alpine AS production

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

# Only what the standalone server needs: its traced dependencies, then the static assets (which
# the server does not copy itself). No source, no devDependencies, no build tools, no .claude.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Uploaded product images are written to /app/media (collections/Media.ts). It is created here
# so a named volume mounted on it inherits the right owner; persisting it is M54's job.
RUN mkdir -p /app/media && chown node:node /app/media

# Never run as root (the node image's built-in unprivileged user, uid 1000).
USER node

EXPOSE 3000

# Runtime configuration (nothing is baked in): DATABASE_URI and PAYLOAD_SECRET are required.
# The schema must already exist — Payload does not push it in production; the `migrate` target
# (M52a) creates it before this container starts.
#
# Without these the app would start but answer every request with a 500; checking up front makes
# the container exit at once with a message, so a restart policy and `docker ps` show it.
# `exec` keeps node as PID 1, so SIGTERM from `docker stop` reaches it.
CMD ["sh", "-c", "[ -n \"$PAYLOAD_SECRET\" ] || { echo 'FATAL: PAYLOAD_SECRET must be set' >&2; exit 1; }; [ -n \"$DATABASE_URI\" ] || { echo 'FATAL: DATABASE_URI must be set' >&2; exit 1; }; exec node server.js"]

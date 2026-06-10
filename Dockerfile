# ══════════════════════════════════════════════════════════
# Window World Assistant — Production Dockerfile
# Single container: Vite frontend + Express API
# Deploy: Railway, Cloud Run, Render, or any Docker host
# ══════════════════════════════════════════════════════════

FROM node:20-alpine AS base
WORKDIR /app

# ── Stage 1: Install ALL workspace deps ───────────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY server/package.json ./server/
COPY apps/desktop/package.json ./apps/desktop/
RUN npm ci

# ── Stage 2: Generate Prisma Client ───────────────────────
FROM deps AS prisma
COPY server/prisma ./server/prisma
RUN cd server && npx prisma generate

# ── Stage 3: Build the frontend ──────────────────────────
FROM prisma AS frontend-build
COPY apps/web ./apps/web
ENV VITE_API_URL=/api

# Accept Vite public env vars as build args.
# Railway passes ALL service variables as Docker build args automatically.
# Vite bakes VITE_* vars into the JS bundle at build time.
ARG VITE_MAPBOX_PUBLIC_TOKEN
# BUILD_DATE forces Docker to re-run this stage on every Railway deploy (no stale cache).
ARG BUILD_DATE
ENV VITE_MAPBOX_PUBLIC_TOKEN=${VITE_MAPBOX_PUBLIC_TOKEN}

RUN cd apps/web && npx vite build

# ── Stage 4: Build the server ────────────────────────────
FROM prisma AS server-build
COPY server ./server
RUN cd server && npx tsc

# ── Stage 5: Production runtime ──────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Install fonts for canvas text rendering
RUN apk add --no-cache fontconfig ttf-freefont ttf-liberation

# To properly install only production dependencies in a workspace environment,
# we need the root package.json and package-lock.json, and the workspace packages.
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY apps/web/package.json ./apps/web/
COPY apps/desktop/package.json ./apps/desktop/

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts

# Copy Prisma client (generated during prisma stage)
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prisma /app/node_modules/@prisma ./node_modules/@prisma

# Copy built server
COPY --from=server-build /app/server/dist ./server/dist

# Copy built frontend into server's public dir
COPY --from=frontend-build /app/apps/web/dist ./server/dist/public

# Copy prisma schema (needed at runtime for some Prisma features)
COPY server/prisma ./server/prisma

# Copy reference documents (warranty, lead disclosure, finance)
COPY reference-documents ./reference-documents

# Copy reference data rules
COPY server/reference ./server/reference

# Copy Excel templates (BTR workbook)
COPY server/templates ./server/templates

# Copy startup cleanup script
COPY server/scripts ./server/scripts

ENV NODE_ENV=production
ENV PORT=8080

# ── Runtime server-side env vars ─────────────────────────
# Declared as ARG so Railway bakes them into the image at build time.
# Also available at container runtime via Railway's env injection.
# MAPBOX_PUBLIC_TOKEN  → served via /api/config/public to the frontend
ARG MAPBOX_PUBLIC_TOKEN
ENV MAPBOX_PUBLIC_TOKEN=${MAPBOX_PUBLIC_TOKEN}

EXPOSE 8080

CMD ["sh", "-c", "export DIRECT_URL=\"${DIRECT_URL:-$DATABASE_URL}\" && node server/scripts/production-start.cjs && node server/dist/index.js"]

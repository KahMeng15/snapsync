FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache curl python3 make g++

COPY shared ./shared
COPY photobooth-server/package*.json ./photobooth-server/

WORKDIR /app/shared
RUN npm ci

WORKDIR /app/photobooth-server
RUN npm ci

COPY photobooth-server ./
ARG VITE_SHARE_BASE_URL
ENV VITE_SHARE_BASE_URL=$VITE_SHARE_BASE_URL

RUN npm run build

# Prune dev dependencies before copying to final image
WORKDIR /app/shared
RUN npm prune --omit=dev

WORKDIR /app/photobooth-server
RUN npm prune --omit=dev

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl

# Copy pruned shared directory (includes production node_modules)
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/photobooth-server/package*.json ./photobooth-server/
# Copy pruned server node_modules
COPY --from=builder /app/photobooth-server/node_modules ./photobooth-server/node_modules

WORKDIR /app/photobooth-server

COPY --from=builder /app/photobooth-server/dist ./dist
COPY --from=builder /app/photobooth-server/public ./public

RUN mkdir -p storage/{photos,frames,logs}

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "dist/src/server.js"]

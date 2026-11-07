FROM node:20-alpine AS builder

WORKDIR /app
RUN apk add --no-cache curl python3 make g++
COPY shared ./shared
COPY snapsync-share ./snapsync-share
COPY docs ./docs

WORKDIR /app/shared
RUN npm ci
RUN npm run build

WORKDIR /app/snapsync-share
RUN npm ci
RUN npm run build

# Prune dev dependencies before copying to final image
WORKDIR /app/shared
RUN npm prune --omit=dev

WORKDIR /app/snapsync-share
RUN npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app

# Upgrade OS packages to patch vulnerabilities and remove npm/yarn not needed in production
RUN apk upgrade --no-cache && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn*

# Copy pruned shared directory (includes production node_modules)
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/snapsync-share/package*.json ./snapsync-share/
# Copy pruned share node_modules
COPY --from=builder /app/snapsync-share/node_modules ./snapsync-share/node_modules
COPY --from=builder /app/docs ./docs

WORKDIR /app/snapsync-share

COPY --from=builder /app/snapsync-share/dist ./dist
COPY --from=builder /app/snapsync-share/public ./public

EXPOSE 3001
CMD ["node", "dist/src/server.js"]

FROM node:20-alpine AS builder

WORKDIR /app
RUN apk add --no-cache curl python3 make g++
COPY shared ./shared
COPY snapsync-share ./snapsync-share

WORKDIR /app/shared
RUN npm ci

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

# Copy pruned shared directory (includes production node_modules)
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/snapsync-share/package*.json ./snapsync-share/
# Copy pruned share node_modules
COPY --from=builder /app/snapsync-share/node_modules ./snapsync-share/node_modules

WORKDIR /app/snapsync-share

COPY --from=builder /app/snapsync-share/dist ./dist
COPY --from=builder /app/snapsync-share/public ./public

EXPOSE 3001
CMD ["node", "dist/src/server.js"]

FROM node:20-alpine AS builder

WORKDIR /app
RUN apk add --no-cache curl python3 make g++
COPY shared ./shared
COPY photobooth-share ./photobooth-share

WORKDIR /app/shared
RUN npm ci

WORKDIR /app/photobooth-share
RUN npm ci
RUN npm run build

# Prune dev dependencies before copying to final image
WORKDIR /app/shared
RUN npm prune --omit=dev

WORKDIR /app/photobooth-share
RUN npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app

# Copy pruned shared directory (includes production node_modules)
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/photobooth-share/package*.json ./photobooth-share/
# Copy pruned share node_modules
COPY --from=builder /app/photobooth-share/node_modules ./photobooth-share/node_modules

WORKDIR /app/photobooth-share

COPY --from=builder /app/photobooth-share/dist ./dist
COPY --from=builder /app/photobooth-share/public ./public

EXPOSE 3001
CMD ["node", "dist/src/server.js"]

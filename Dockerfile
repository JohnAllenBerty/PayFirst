# Multi-stage build for PayFirst (React + Vite)

# 1) Build static assets
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --no-audit --no-fund
COPY . .
# Build with TypeScript typecheck + Vite
RUN npm run build

# 2) Runtime image using Nginx to serve SPA and reverse-proxy /api
FROM nginx:1.27-alpine AS runner

# Copy static build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx template with ${API_TARGET} placeholder for reverse proxy
COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Simple entrypoint to envsubst API_TARGET then start nginx
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Default backend target; can be overridden at runtime
ENV API_TARGET="http://host.docker.internal:8000/"

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]

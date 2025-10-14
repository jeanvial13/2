# ---- BUILD ----
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache git openssl

# Instalar deps con cache correcto
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund || (echo "npm ci failed, trying npm install" && npm install --no-audit --no-fund --legacy-peer-deps); \
    else \
      npm install --no-audit --no-fund --legacy-peer-deps; \
    fi

# Copiar el resto del código
COPY . .

# Más memoria y desactivar modo CI estricto
ENV NODE_OPTIONS=--max_old_space_size=4096 \
    CI=false
RUN npm run build --if-present

# ---- RUNTIME ----
FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN printf 'server { \
  listen 80; \
  server_name _; \
  root /usr/share/nginx/html; \
  location / { try_files $uri /index.html; } \
} ' > /etc/nginx/conf.d/default.conf
HEALTHCHECK CMD wget -qO- http://localhost || exit 1

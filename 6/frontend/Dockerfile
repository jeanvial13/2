# Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund; \
    else \
      npm install --no-audit --no-fund; \
    fi
COPY . .
# Vite: genera /dist
RUN npm run build

# Servir estáticos con nginx
FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# opcional: healthcheck simple
HEALTHCHECK CMD wget -qO- http://localhost || exit 1

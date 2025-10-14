# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# Sistema base necesario para Prisma en Alpine
RUN apk add --no-cache openssl

# Copiamos manifiestos primero para cachear instalación
COPY package.json package-lock.json* ./
RUN npm ci

# Copiamos el resto del código
COPY prisma ./prisma
COPY src ./src

# Genera el cliente de Prisma (no requiere DB)
RUN npx prisma generate

# --- Runtime stage ---
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl

# Copia dependencias y código desde builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY package.json ./

# Script de arranque que hace migrate deploy + seed condicional + levanta API
COPY src/start.mjs ./src/start.mjs

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/start.mjs"]

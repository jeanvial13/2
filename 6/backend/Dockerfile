# Etapa de runtime (no necesitamos multistage si no transpila)
FROM node:20-alpine

WORKDIR /app

# Toolchain por si hay dependencias nativas (bcrypt, sharp, etc.)
RUN apk add --no-cache python3 make g++ openssl

# Copiamos manifest primero para cache eficiente
COPY package.json package-lock.json* ./

# Si existe lock -> npm ci, si no -> npm install
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --no-audit --no-fund; \
    else \
      npm install --omit=dev --no-audit --no-fund; \
    fi

# Resto del código
COPY . .

# Si usas Prisma, no falla si no está:
RUN npx prisma generate || true

ENV PORT=3000
EXPOSE 3000

CMD ["node","server.js"]

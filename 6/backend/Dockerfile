FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --no-audit --no-fund || (echo "npm ci failed, trying npm install" && npm install --omit=dev --no-audit --no-fund --legacy-peer-deps); \
    else \
      npm install --omit=dev --no-audit --no-fund --legacy-peer-deps; \
    fi
COPY . .
# Si usas Prisma:
# RUN npx prisma generate || true
ENV PORT=3000
EXPOSE 3000
CMD ["node","server.js"]    # o el entrypoint que tengas

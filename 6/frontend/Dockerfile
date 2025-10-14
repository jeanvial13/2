FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . ./
RUN npm run build

FROM busybox
WORKDIR /dist
COPY --from=builder /app/dist ./
CMD ["sh","-c","ls -la /dist"]
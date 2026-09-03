FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

COPY . .

# Build Vite frontend and bundled backend
RUN npm run build

# Production Runner Image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /app/dist ./dist

# Create persistent data directory
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 3000

CMD ["node", "dist/server.cjs"]

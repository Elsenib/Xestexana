FROM node:20-alpine
WORKDIR /app

# Copy root workspace files
COPY package*.json ./
COPY packages/ ./packages/

# Copy web package files
COPY apps/web/package*.json ./apps/web/
COPY apps/web/tsconfig*.json ./apps/web/
COPY apps/web/next.config.* ./apps/web/

# Install dependencies
RUN npm ci --workspace=web

# Copy source code
COPY apps/web/ ./apps/web/

# Build
RUN npm run build --workspace=web

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=web"]
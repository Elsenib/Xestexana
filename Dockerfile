FROM node:20-alpine
WORKDIR /app

# Copy root workspace files
COPY package*.json ./
COPY packages/ ./packages/
COPY prisma/ ./prisma/

# Copy api package files  
COPY apps/api/package*.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/

# Install ALL dependencies (dev də daxil - prisma generate üçün lazım)
RUN npm ci --workspace=api

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY apps/api/src/ ./apps/api/src/

# Build
RUN npm run build --workspace=api

# Remove dev dependencies after build
RUN npm prune --omit=dev

EXPOSE 4000

CMD ["node", "./apps/api/dist/server.js"]
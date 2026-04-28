FROM node:20-alpine
WORKDIR /app

# Copy root workspace files
COPY ../../package*.json ./
COPY ../../packages/ ./packages/

# Copy prisma
COPY ../../prisma/ ./prisma/

# Copy api package files  
COPY package*.json ./apps/api/
COPY tsconfig.json ./apps/api/

# Install dependencies
RUN npm ci --workspace=api --omit=dev

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src/ ./apps/api/src/

# Build
RUN npm run build --workspace=api

EXPOSE 4000

CMD ["node", "./apps/api/dist/server.js"]
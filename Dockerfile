FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY prisma/ ./prisma/

COPY apps/api/package*.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/

RUN npm ci --workspace=api

RUN npx prisma generate

COPY apps/api/src/ ./apps/api/src/
COPY apps/api/updates/ ./apps/api/updates/

RUN npm run build --workspace=api

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node ./apps/api/dist/server.js"]

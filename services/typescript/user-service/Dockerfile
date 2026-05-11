# Build stage — context is the REPO ROOT so proto/ is accessible
FROM node:18-alpine AS builder

WORKDIR /app

COPY services/typescript/user-service/package.json services/typescript/user-service/package-lock.json ./
RUN npm install --legacy-peer-deps

COPY services/typescript/user-service/ .
RUN touch .env
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/ormconfig.ts ./

# Copy proto files from repo root — loaded at runtime
COPY proto /proto

EXPOSE 3080
CMD ["node", "dist/src/main"]

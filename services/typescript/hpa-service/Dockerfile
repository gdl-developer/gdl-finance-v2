# Build stage — context is the REPO ROOT so proto/ is accessible
FROM node:20 AS builder

WORKDIR /app

# Install dependencies from the service folder
COPY services/typescript/hpa-service/package*.json ./
RUN npm install

# Copy service source
COPY services/typescript/hpa-service/ .
RUN touch .env

# Build the application
RUN npm run build

# Run stage
FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env .

# Copy proto files from repo root — loaded at runtime
COPY proto /proto

EXPOSE 3000

CMD ["npm", "run", "start:prod"]

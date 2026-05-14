# Use a consistent Node version for build and runtime
FROM node:19.5.0 AS builder

WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Clean cache and install dependencies with legacy-peer-deps
RUN npm cache clean --force
RUN npm install --legacy-peer-deps

# Copy app source and build
COPY . .
RUN npm run build

# Runtime image
FROM node:19.5.0-alpine

WORKDIR /app

# Copy built app from builder
COPY --from=builder /app ./

EXPOSE 3010

CMD ["npm", "run", "start:prod"]

# GDL V2: Staging Deployment Guide (DigitalOcean)

This guide explains how to deploy the GDL Fintech V2 backend to a DigitalOcean Droplet using the Container Registry.

## 1. Prerequisites
- `doctl` installed and authenticated (`doctl auth init`)
- Access to the DigitalOcean Container Registry (DOCR)
- Docker installed on your local machine

## 2. Build and Push Images
Navigate to the `GDL-Fintech-V2/infrastructure` directory and run:

```bash
# Build all images defined in the compose file
docker-compose -f docker-compose.staging.yml build --no-cache

# Push all images to the registry
docker-compose -f docker-compose.staging.yml push
```

This will build and push all 17 services to `registry.digitalocean.com/gdlfinancev2/`.

## 3. Setup the Droplet
SSH into your DigitalOcean Droplet and ensure Docker is installed.

### 3.1 Login to DOCR
On the droplet:
```bash
doctl registry login
```

### 3.2 Prepare Deployment Files
Copy `docker-compose.staging.yml` and `.env.staging.example` to the droplet:

```bash
scp docker-compose.staging.yml user@droplet_ip:~/gdl-v2/
scp .env.staging.example user@droplet_ip:~/gdl-v2/.env.staging
```

### 3.3 Configure Environment
Edit `.env.staging` on the droplet and replace placeholder values with real staging credentials.

## 4. Launch the Stack
On the droplet, inside the `~/gdl-v2/` directory:

```bash
docker-compose -f docker-compose.staging.yml pull
docker-compose -f docker-compose.staging.yml up -d
```

## 5. Verify
- Check logs: `docker-compose -f docker-compose.staging.yml logs -f`
- Verify endpoints via the Gateway (Port 3000).

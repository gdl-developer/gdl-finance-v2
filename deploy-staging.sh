#!/bin/bash

# Configuration
DROPLET_IP="YOUR_DROPLET_IP"
DROPLET_USER="root"
REMOTE_DIR="/home/root/gdl-v2"

echo "---------------------------------------------------"
echo "Starting Remote Deployment to GDL Staging Droplet"
echo "---------------------------------------------------"

# 1. Transfer configuration files
echo "Syncing docker-compose and environment files..."
scp docker-compose.staging.yml .env.staging ${DROPLET_USER}@${DROPLET_IP}:${REMOTE_DIR}/

# 2. Trigger remote pull and restart
echo "Pulling latest images and restarting services on droplet..."
ssh ${DROPLET_USER}@${DROPLET_IP} << EOF
  cd ${REMOTE_DIR}
  # Ensure we are logged in to the registry
  doctl registry login --expiry-seconds 600
  # Pull and restart stack
  docker compose -f docker-compose.staging.yml down --remove-orphans
  docker compose -f docker-compose.staging.yml pull
  docker compose -f docker-compose.staging.yml up -d --build
  # Cleanup old images to save space
  docker image prune -f
EOF

echo "---------------------------------------------------"
echo "Deployment Complete!"
echo "Gateway available at: http://${DROPLET_IP}:3000"
echo "---------------------------------------------------"

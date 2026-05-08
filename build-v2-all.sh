#!/bin/bash

# Configuration
export PATH="/usr/local/bin:/opt/homebrew/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"
REGISTRY="registry.digitalocean.com/gdlfinancev2"
PLATFORM="linux/amd64"
TAG="staging"
LOG_FILE="v2_build.log"

GO_SERVICES=(
  "identity-service:identity-service"
  "account-service:account-service"
  "audit-service:audit-service"
  "bankone-connector:bankone-connector"
  "compliance-service:compliance-service"
  "notification-service:notification-service"
  "reporting-service:reporting-service"
  "symplus-connector:symplus-connector"
  "symplus-service:symplus-service"
  "transaction-service:transaction-service"
)

TS_SERVICES=(
  "api-gateway:./services/typescript/api-gateway"
  "dms-service:./services/typescript/dms-service"
  "flexi-service:./services/typescript/flexi-service"
  "hpa-service:./services/typescript/hpa-service"
  "investment-service:./services/typescript/investment-service"
  "loan-service:./services/typescript/loan-service"
  "saveinvest-service:./services/typescript/saveinvest-service"
  "user-service:./services/typescript/user-service"
)

echo "Starting build process at $(date)" | tee $LOG_FILE
echo "Logging in to DigitalOcean Container Registry..." | tee -a $LOG_FILE
doctl registry login --expiry-seconds 1200 | tee -a $LOG_FILE

FAILED_SERVICES=()

build_and_push() {
  local name=$1
  local path=$2
  local build_arg=$3
  local full_tag="${REGISTRY}/${name}:${TAG}"

  echo "---------------------------------------------------" | tee -a $LOG_FILE
  echo "Building ${name} from ${path}..." | tee -a $LOG_FILE
  [ -n "$build_arg" ] && echo "With build-arg SERVICE_DIR=${build_arg}" | tee -a $LOG_FILE
  echo "---------------------------------------------------" | tee -a $LOG_FILE

  if [ -n "$build_arg" ]; then
    docker build --no-cache --platform ${PLATFORM} -t ${full_tag} --build-arg SERVICE_DIR=${build_arg} -f ${path}/${build_arg}/Dockerfile ${path} 2>&1 | tee -a $LOG_FILE
  else
    docker build --no-cache --platform ${PLATFORM} -t ${full_tag} ${path} 2>&1 | tee -a $LOG_FILE
  fi
  
  if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo "Error: Build failed for ${name}" | tee -a $LOG_FILE
    FAILED_SERVICES+=("${name} (Build)")
    return 1
  fi

  echo "Pushing ${full_tag}..." | tee -a $LOG_FILE
  docker push ${full_tag} 2>&1 | tee -a $LOG_FILE
  
  if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo "Error: Push failed for ${name}. Retrying in 10s..." | tee -a $LOG_FILE
    sleep 10
    docker push ${full_tag} 2>&1 | tee -a $LOG_FILE
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
      echo "Error: Final push failed for ${name}" | tee -a $LOG_FILE
      FAILED_SERVICES+=("${name} (Push)")
      return 1
    fi
  fi
  return 0
}

# Build Go Services
for service in "${GO_SERVICES[@]}"; do
  IFS=":" read -r name dir <<< "${service}"
  build_and_push "${name}" "./services/go" "${dir}"
done

# Build TS Services
for service in "${TS_SERVICES[@]}"; do
  IFS=":" read -r name path <<< "${service}"
  build_and_push "${name}" "${path}" ""
done

echo "---------------------------------------------------" | tee -a $LOG_FILE
if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
  echo "All V2 services processed successfully!" | tee -a $LOG_FILE
else
  echo "Finished with failures in: ${FAILED_SERVICES[*]}" | tee -a $LOG_FILE
fi
echo "Finished at $(date)" | tee -a $LOG_FILE

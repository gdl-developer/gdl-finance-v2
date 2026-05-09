#!/bin/bash
# GDL V2 Comprehensive Key Synchronization Script
# [ignoring loop detection]

V2_ENV=".env.staging"
V1_DIR=".."

echo "--- GDL V1 to V2 Comprehensive Key Sync ---"

# Function to safely pull keys from V1 files
sync_key() {
    local KEY_NAME=$1
    local SOURCE_FILE=$2
    
    # Extract the value, handling potential spaces and special characters
    local VALUE=$(grep "^${KEY_NAME}=" "$V1_DIR/$SOURCE_FILE" | head -1 | cut -d'=' -f2-)
    
    if [ -z "$VALUE" ]; then
        return
    fi

    # Append or update in V2 env
    if grep -q "^${KEY_NAME}=" "$V2_ENV"; then
        # Use a different delimiter for sed to avoid issues with slashes in values
        sed -i '' "s|^${KEY_NAME}=.*|${KEY_NAME}=${VALUE}|" "$V2_ENV"
    else
        echo "${KEY_NAME}=${VALUE}" >> "$V2_ENV"
    fi
    echo "[+] Synced: $KEY_NAME (from $SOURCE_FILE)"
}

# --- 1. IDENTITY & AUTH ---
sync_key "JWT_SECRET" "User-Service/.env"
sync_key "JWT_REFRESH_SECRET" "User-Service/.env"
sync_key "PAYLOAD_ENCRYPTION_SECRET" "User-Service/.env"
sync_key "XMobileAppKey" "User-Service/.env"
sync_key "XMLocalAppKey" "User-Service/.env"

# --- 2. PAYMENT GATEWAYS ---
sync_key "PSTK_SECRET_KEY" "Accounts-Service/.env"
sync_key "FLWSECK" "Accounts-Service/.env"
sync_key "RMB_TOKEN" "Accounts-Service/.env"
sync_key "UBA_MERCHANT_PRIVATE_KEY" "Accounts-Service/.env"
sync_key "UBA_MERCHANT_PUBLIC_KEY" "Accounts-Service/.env"

# --- 3. THIRD PARTY APIS ---
sync_key "QUOREID_SECRETKEY" "User-Service/.env"
sync_key "QUOREID_CLIENTID" "User-Service/.env"
sync_key "YOU_VERIFY_KEY" "User-Service/.env"
sync_key "BANKONE_API_KEY" "CBA-BankOne-Integration-Service/.env"
sync_key "SYMPLUS_API_KEY" "CBA-Symplus-Integration-Service/.env"

# --- 4. MESSAGING ---
sync_key "DRISSLE_SECKEY" "Notifications-Service/.env"
sync_key "DRISSLE_PUBKEY" "Notifications-Service/.env"
sync_key "BREVO_API_KEY" "Notifications-Service/.env"

# --- 5. INFRASTRUCTURE ---
sync_key "INTERNAL_SECURITY_KEY" "User-Service/.env"
sync_key "SYS_AUTH" "User-Service/.env"
sync_key "DB_PASSWORD" "User-Service/.env"
sync_key "REDIS_PASSWORD" "User-Service/.env"

echo "---------------------------------------------------"
echo "Comprehensive Sync Complete."
echo "Final Check: Ensure YOUR_DROPLET_IP is updated in deploy scripts."

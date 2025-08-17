#!/bin/bash

# Royal Equips Edge Functions Deployment Script
# Deploys all edge functions to Cloudflare Workers

set -e

echo "🚀 Royal Equips Edge Functions Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI not found. Please install it first:${NC}"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Cloudflare. Please login first:${NC}"
    echo "wrangler login"
    exit 1
fi

# Get environment argument
ENVIRONMENT=${1:-production}

echo -e "${BLUE}📋 Deploying to environment: ${ENVIRONMENT}${NC}"

# Edge functions to deploy
declare -a FUNCTIONS=(
    "auth-hook-react-email-resend"
    "background-upload-storage" 
    "connect-supabase"
    "openai"
    "discord-bot"
    "stripe-webhooks"
    "elevenlabs-text-to-speech"
    "elevenlabs-speech-to-text"
    "image-manipulation"
    "cloudflare-turnstile"
    "file-upload-storage"
    "send-email-resend"
)

# Track deployment results
SUCCESSFUL=0
FAILED=0
declare -a FAILED_FUNCTIONS=()

echo -e "${BLUE}📦 Deploying ${#FUNCTIONS[@]} edge functions...${NC}"

# Deploy each function
for func in "${FUNCTIONS[@]}"; do
    echo ""
    echo -e "${YELLOW}🔧 Deploying ${func}...${NC}"
    
    if [ -d "edge-functions/${func}" ]; then
        cd "edge-functions/${func}"
        
        # Create wrangler.toml if it doesn't exist
        if [ ! -f "wrangler.toml" ]; then
            echo "Creating wrangler.toml for ${func}..."
            cat > wrangler.toml << EOF
name = "${func}"
main = "index.js"
compatibility_date = "2024-08-17"

[env.${ENVIRONMENT}]
name = "${func}-${ENVIRONMENT}"
EOF
        fi

        # Deploy function
        if wrangler deploy --env "${ENVIRONMENT}"; then
            echo -e "${GREEN}✅ ${func} deployed successfully${NC}"
            ((SUCCESSFUL++))
        else
            echo -e "${RED}❌ ${func} deployment failed${NC}"
            ((FAILED++))
            FAILED_FUNCTIONS+=("${func}")
        fi
        
        cd "../.."
    else
        echo -e "${RED}❌ Directory edge-functions/${func} not found${NC}"
        ((FAILED++))
        FAILED_FUNCTIONS+=("${func}")
    fi
done

echo ""
echo "=========================================="
echo -e "${BLUE}📊 DEPLOYMENT SUMMARY${NC}"
echo "=========================================="
echo -e "${GREEN}✅ Successful: ${SUCCESSFUL}${NC}"
echo -e "${RED}❌ Failed: ${FAILED}${NC}"

if [ ${FAILED} -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed functions:${NC}"
    for failed_func in "${FAILED_FUNCTIONS[@]}"; do
        echo -e "${RED}  - ${failed_func}${NC}"
    done
fi

echo ""

# Create deployment manifest
MANIFEST_FILE="edge-functions-deployment-${ENVIRONMENT}-$(date +%Y%m%d_%H%M%S).json"
cat > "${MANIFEST_FILE}" << EOF
{
  "deployment": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "${ENVIRONMENT}",
    "total_functions": ${#FUNCTIONS[@]},
    "successful": ${SUCCESSFUL},
    "failed": ${FAILED},
    "functions": [
EOF

# Add function details to manifest
for i in "${!FUNCTIONS[@]}"; do
    func="${FUNCTIONS[$i]}"
    status="success"
    
    # Check if function failed
    for failed_func in "${FAILED_FUNCTIONS[@]}"; do
        if [ "$func" = "$failed_func" ]; then
            status="failed"
            break
        fi
    done
    
    echo "      {" >> "${MANIFEST_FILE}"
    echo "        \"name\": \"${func}\"," >> "${MANIFEST_FILE}"
    echo "        \"status\": \"${status}\"," >> "${MANIFEST_FILE}"
    echo "        \"url\": \"https://${func}-${ENVIRONMENT}.royalequips.workers.dev\"" >> "${MANIFEST_FILE}"
    
    if [ $i -eq $((${#FUNCTIONS[@]} - 1)) ]; then
        echo "      }" >> "${MANIFEST_FILE}"
    else
        echo "      }," >> "${MANIFEST_FILE}"
    fi
done

cat >> "${MANIFEST_FILE}" << EOF
    ]
  }
}
EOF

echo -e "${GREEN}📄 Deployment manifest saved: ${MANIFEST_FILE}${NC}"

# Update command center with deployment info
if [ -f "app/routes/edge_functions.py" ]; then
    echo -e "${BLUE}🔄 Updating command center with deployment info...${NC}"
    
    # This would update the edge functions configuration with the new URLs
    # For now, just show the URLs
    echo ""
    echo -e "${BLUE}🌐 Edge Function URLs (${ENVIRONMENT}):${NC}"
    for func in "${FUNCTIONS[@]}"; do
        echo -e "${GREEN}  ${func}: https://${func}-${ENVIRONMENT}.royalequips.workers.dev${NC}"
    done
fi

echo ""

if [ ${FAILED} -eq 0 ]; then
    echo -e "${GREEN}🎉 All edge functions deployed successfully!${NC}"
    echo -e "${GREEN}🎯 Command center integration ready${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some deployments failed. Check the logs above.${NC}"
    exit 1
fi
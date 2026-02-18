#!/bin/bash

# GRUBBRR Visual Testing Dashboard - Netlify Deployment Script
# Usage: ./deploy.sh [environment]
# Environment: prod (default) | dev

set -e

# Configuration
NETLIFY_TOKEN="nfp_wC4vRjjL4bV23BHqxht8AjMurCYw5BgA8ef4"
PROD_SITE_ID="grubbrr-visual-testing"
DEV_SITE_ID="grubbrr-visual-testing-dev"

# Default to prod environment
ENVIRONMENT=${1:-prod}

# Determine site ID based on environment
if [ "$ENVIRONMENT" = "prod" ]; then
    SITE_ID="$PROD_SITE_ID"
    SITE_NAME="GRUBBRR Visual Testing Dashboard"
    SITE_URL="https://grubbrr-visual-testing.netlify.app"
else
    SITE_ID="$DEV_SITE_ID"
    SITE_NAME="GRUBBRR Visual Testing Dashboard (Dev)"
    SITE_URL="https://grubbrr-visual-testing-dev.netlify.app"
fi

echo "🚀 Deploying $SITE_NAME to Netlify..."
echo "   Environment: $ENVIRONMENT"
echo "   Site ID: $SITE_ID"
echo "   Expected URL: $SITE_URL"

# Create deployment package
echo "📦 Creating deployment package..."
rm -rf deploy/
mkdir -p deploy/

# Copy files to deploy directory
cp index.html deploy/
cp -r css/ deploy/
cp -r js/ deploy/
cp bugs-data.json deploy/

# Create placeholder screenshots if they don't exist
echo "📸 Setting up screenshot placeholders..."
mkdir -p deploy/screenshots/{pending,in-progress,fixed,failed}

# Create sample screenshot files for demo
for status in pending in-progress fixed failed; do
    for i in {001..020}; do
        if [ ! -f "deploy/screenshots/$status/NGE-$i-before.png" ]; then
            # Create a simple placeholder image using ImageMagick if available
            if command -v convert &> /dev/null; then
                convert -size 800x500 xc:darkslategray \
                    -pointsize 24 -fill white \
                    -gravity center \
                    -annotate 0 "Screenshot Placeholder\nNGE-$i $status" \
                    "deploy/screenshots/$status/NGE-$i-before.png" 2>/dev/null || true
            fi
        fi
        if [ ! -f "deploy/screenshots/$status/NGE-$i-after.png" ]; then
            if command -v convert &> /dev/null; then
                convert -size 800x500 xc:darkgreen \
                    -pointsize 24 -fill white \
                    -gravity center \
                    -annotate 0 "Screenshot Placeholder\nNGE-$i $status (After)" \
                    "deploy/screenshots/$status/NGE-$i-after.png" 2>/dev/null || true
            fi
        fi
    done
done

# Update timestamp in bugs-data.json
echo "⏰ Updating timestamp..."
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
if command -v jq &> /dev/null; then
    jq --arg ts "$TIMESTAMP" '.metadata.lastUpdated = $ts' deploy/bugs-data.json > deploy/bugs-data.tmp.json
    mv deploy/bugs-data.tmp.json deploy/bugs-data.json
else
    # Fallback: use sed to update timestamp (less reliable)
    sed -i.bak "s/\"lastUpdated\":.*/\"lastUpdated\": \"$TIMESTAMP\",/" deploy/bugs-data.json
    rm -f deploy/bugs-data.json.bak
fi

# Create deployment manifest
cat > deploy/deploy-manifest.json << EOF
{
  "deployment": {
    "timestamp": "$TIMESTAMP",
    "environment": "$ENVIRONMENT",
    "site_name": "$SITE_NAME",
    "version": "$(date +%Y%m%d-%H%M%S)",
    "files": [
      "index.html",
      "css/styles.css",
      "js/dashboard.js",
      "bugs-data.json"
    ],
    "screenshots_directory": "screenshots/",
    "total_bugs": 55,
    "auto_refresh": 30
  }
}
EOF

# Create ZIP file for deployment
echo "🗜️ Creating deployment archive..."
cd deploy
zip -r ../grubbrr-dashboard-deploy.zip . -x "*.DS_Store" "*.git*" "node_modules/*"
cd ..

# Check if site exists, create if it doesn't
echo "🔍 Checking Netlify site..."
SITE_CHECK=$(curl -s -H "Authorization: Bearer $NETLIFY_TOKEN" \
    "https://api.netlify.com/api/v1/sites/$SITE_ID" | jq -r .id 2>/dev/null || echo "")

if [ "$SITE_CHECK" != "$SITE_ID" ]; then
    echo "🏗️ Creating new Netlify site..."
    SITE_CREATE_RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer $NETLIFY_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$SITE_ID\",
            \"custom_domain\": \"\",
            \"repo\": null
        }" \
        "https://api.netlify.com/api/v1/sites")
    
    ACTUAL_SITE_ID=$(echo "$SITE_CREATE_RESPONSE" | jq -r .id 2>/dev/null || echo "")
    if [ "$ACTUAL_SITE_ID" != "$SITE_ID" ]; then
        echo "⚠️ Warning: Site ID mismatch. Using actual ID: $ACTUAL_SITE_ID"
        SITE_ID="$ACTUAL_SITE_ID"
    fi
fi

# Deploy to Netlify
echo "🚀 Deploying to Netlify..."
DEPLOY_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $NETLIFY_TOKEN" \
    -H "Content-Type: application/zip" \
    --data-binary @grubbrr-dashboard-deploy.zip \
    "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys")

# Extract deployment information
DEPLOY_ID=$(echo "$DEPLOY_RESPONSE" | jq -r .id 2>/dev/null || echo "")
DEPLOY_URL=$(echo "$DEPLOY_RESPONSE" | jq -r .deploy_url 2>/dev/null || echo "")
SITE_URL=$(echo "$DEPLOY_RESPONSE" | jq -r .site_url 2>/dev/null || echo "")

if [ -n "$DEPLOY_ID" ] && [ "$DEPLOY_ID" != "null" ]; then
    echo "✅ Deployment successful!"
    echo "📊 Deployment ID: $DEPLOY_ID"
    echo "🌐 Site URL: $SITE_URL"
    echo "🚀 Deploy URL: $DEPLOY_URL"
    echo ""
    echo "🎉 Dashboard is live at: $SITE_URL"
    echo ""
    echo "Features:"
    echo "   • 55 bugs with visual screenshots"
    echo "   • Real-time status tracking"
    echo "   • Automation status monitoring"
    echo "   • Searchable bug gallery"
    echo "   • Auto-refresh every 30 seconds"
    echo ""
    echo "Test Environment: https://test.kiosk.nge.grubbrr.com/"
    echo "Access Code: shaky.hers.clock"
    
    # Save deployment info
    cat > deploy-info.json << EOF
{
  "deployment": {
    "id": "$DEPLOY_ID",
    "url": "$SITE_URL",
    "deploy_url": "$DEPLOY_URL",
    "timestamp": "$TIMESTAMP",
    "environment": "$ENVIRONMENT",
    "site_name": "$SITE_NAME"
  }
}
EOF
    
else
    echo "❌ Deployment failed!"
    echo "Response: $DEPLOY_RESPONSE"
    exit 1
fi

# Cleanup
echo "🧹 Cleaning up..."
rm -rf deploy/
rm -f grubbrr-dashboard-deploy.zip

echo "🎊 Deployment complete!"
echo "🔗 Dashboard URL: $SITE_URL"
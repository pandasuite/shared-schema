#!/bin/bash

# Download latest SSL certificates from GitHub Releases
# Works on any system with curl (no jq required)
set -e

echo "🔐 Downloading latest SSL certificates..."

mkdir -p certs

# Get latest release JSON (without jq dependency)
RELEASES_JSON=$(curl -s https://api.github.com/repos/pandasuite/shared-schema/releases)

# Extract download URLs using grep/sed (cross-platform)
PRIVKEY_URL=$(echo "$RELEASES_JSON" | grep -o '"browser_download_url": "[^"]*privkey\.pem"' | head -1 | sed 's/.*: "//' | sed 's/"//')
FULLCHAIN_URL=$(echo "$RELEASES_JSON" | grep -o '"browser_download_url": "[^"]*fullchain\.pem"' | head -1 | sed 's/.*: "//' | sed 's/"//')

if [ -z "$PRIVKEY_URL" ]; then
  echo "❌ privkey.pem not found in releases"
  exit 1
fi

if [ -z "$FULLCHAIN_URL" ]; then
  echo "❌ fullchain.pem not found in releases"
  exit 1
fi

# Download certificates
echo "📥 Downloading from GitHub Releases..."
curl -f -L "$PRIVKEY_URL" -o certs/privkey.pem
echo "✅ Downloaded privkey.pem"

curl -f -L "$FULLCHAIN_URL" -o certs/fullchain.pem  
echo "✅ Downloaded fullchain.pem"

echo "🎉 Certificates ready!"

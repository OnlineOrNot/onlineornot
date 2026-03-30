#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "📦 Building SEA bundle..."
mkdir -p sea
node -r esbuild-register scripts/bundle-sea.ts

echo "🔨 Building single executable..."
node --build-sea sea-config.json

# Sign on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
	echo "🔏 Signing binary (macOS)..."
	codesign --sign - onlineornot
fi

SIZE=$(du -h onlineornot | cut -f1)
echo "✅ Built: ./onlineornot ($SIZE)"

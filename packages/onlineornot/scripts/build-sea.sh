#!/bin/bash
set -e

cd "$(dirname "$0")/.."

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if (( NODE_MAJOR < 25 )); then
	echo "Error: SEA builds require Node.js 25 or newer (current: $(node --version))" >&2
	exit 1
fi

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

#!/bin/bash
set -e

echo "🧹 Cleaning up OE Toolkit..."
cd /home/ubuntu/mce-tools/tools/oe-toolkit

# Remove all caches and node_modules
rm -rf node_modules pnpm-lock.yaml
rm -rf .vite
rm -rf dist
rm -rf client/dist

echo "✅ Cleanup complete"
echo ""
echo "📦 Reinstalling dependencies..."
pnpm install

echo "✅ Dependencies installed"
echo ""
echo "🚀 Ready to start dev server with: pnpm dev"

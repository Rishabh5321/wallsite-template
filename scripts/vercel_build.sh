#!/usr/bin/env bash
set -euo pipefail

# Create cache directory if it doesn't exist
mkdir -p .vercel/cache/public
mkdir -p .vercel/cache/scripts

# Ensure target directories exist in public/
mkdir -p public/webp public/lqip

# Restore cached webp, lqip images, and metadata
if [ -d ".vercel/cache/public/webp" ]; then
  cp -r .vercel/cache/public/webp/. public/webp/
fi
if [ -d ".vercel/cache/public/lqip" ]; then
  cp -r .vercel/cache/public/lqip/. public/lqip/
fi

# Run the actual build command
pnpm install --ignore-scripts && pnpm run build:ci

# Save generated webp images and metadata to cache
rm -rf .vercel/cache/public/webp .vercel/cache/public/lqip
cp -r public/webp .vercel/cache/public/
cp -r public/lqip .vercel/cache/public/
if [ -f "public/webp/gallery-cache.json" ]; then
  cp public/webp/gallery-cache.json .vercel/cache/public/webp/
fi

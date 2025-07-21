#!/usr/bin/env bash
set -euo pipefail

# Define cache directories and file paths
CACHE_DIR_PUBLIC=".vercel/cache/public"
CACHE_DIR_DATA=".vercel/cache/data"
GALLERY_DATA_FILE="gallery-data.json"
PUBLIC_GALLERY_DATA_PATH="public/$GALLERY_DATA_FILE"

# Create cache directories if they don't exist
mkdir -p "$CACHE_DIR_PUBLIC/webp"
mkdir -p "$CACHE_DIR_PUBLIC/lqip"
mkdir -p "$CACHE_DIR_DATA"
mkdir -p "public" # Ensure public directory exists

# Restore cached assets from the previous build
echo "Restoring cached assets..."
if [ -d "$CACHE_DIR_PUBLIC/webp" ]; then
  cp -r "$CACHE_DIR_PUBLIC/webp/." "public/webp/"
fi
if [ -d "$CACHE_DIR_PUBLIC/lqip" ]; then
  cp -r "$CACHE_DIR_PUBLIC/lqip/." "public/lqip/"
fi
if [ -f "$CACHE_DIR_DATA/$GALLERY_DATA_FILE" ]; then
  cp "$CACHE_DIR_DATA/$GALLERY_DATA_FILE" "$PUBLIC_GALLERY_DATA_PATH"
fi

# Run the actual build command
pnpm install --ignore-scripts
pnpm run build

# Save generated assets to the cache for the next build
echo "Saving assets to cache..."
rm -rf "$CACHE_DIR_PUBLIC/webp" "$CACHE_DIR_PUBLIC/lqip" "$CACHE_DIR_DATA/$GALLERY_DATA_FILE"
cp -r "public/webp" "$CACHE_DIR_PUBLIC/"
cp -r "public/lqip" "$CACHE_DIR_PUBLIC/"
if [ -f "$PUBLIC_GALLERY_DATA_PATH" ]; then
  cp "$PUBLIC_GALLERY_DATA_PATH" "$CACHE_DIR_DATA/"
fi

echo "Vercel build script finished."

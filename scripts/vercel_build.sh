#!/usr/bin/env bash
set -euo pipefail

echo "=== Starting Vercel build with caching ==="

# Create cache directory structure
echo "Creating cache directories..."
mkdir -p .vercel/cache/public/{webp,lqip}
mkdir -p public/{webp,lqip}

# Function to safely copy with logging
safe_copy() {
    local src="$1"
    local dest="$2"
    local desc="$3"

    if [ -e "$src" ]; then
        echo "Restoring $desc from cache..."
        cp -r "$src" "$dest"
        echo "✓ $desc restored successfully"
    else
        echo "⚠ No cached $desc found"
    fi
}

# Restore cached data
echo "=== Restoring from cache ==="
safe_copy ".vercel/cache/public/webp/." "public/webp/" "WebP images"
safe_copy ".vercel/cache/public/lqip/." "public/lqip/" "LQIP images"
safe_copy ".vercel/cache/public/gallery-data.json" "public/gallery-data.json" "gallery metadata"

# Show cache status
echo "=== Cache Status ==="
echo "WebP files: $(find public/webp -name "*.webp" 2>/dev/null | wc -l || echo 0)"
echo "LQIP files: $(find public/lqip -name "*.webp" 2>/dev/null | wc -l || echo 0)"
echo "Gallery data: $([ -f "public/gallery-data.json" ] && echo "exists" || echo "missing")"

# Install dependencies and build
echo "=== Installing dependencies ==="
pnpm install --frozen-lockfile

echo "=== Running build ==="
pnpm run build

# Save to cache with verification
echo "=== Saving to cache ==="
rm -rf .vercel/cache/public/{webp,lqip,gallery-data.json}

if [ -d "public/webp" ] && [ "$(find public/webp -name "*.webp" 2>/dev/null | wc -l)" -gt 0 ]; then
    cp -r public/webp .vercel/cache/public/
    echo "✓ WebP images cached ($(find .vercel/cache/public/webp -name "*.webp" | wc -l) files)"
else
    echo "⚠ No WebP images to cache"
fi

if [ -d "public/lqip" ] && [ "$(find public/lqip -name "*.webp" 2>/dev/null | wc -l)" -gt 0 ]; then
    cp -r public/lqip .vercel/cache/public/
    echo "✓ LQIP images cached ($(find .vercel/cache/public/lqip -name "*.webp" | wc -l) files)"
else
    echo "⚠ No LQIP images to cache"
fi

if [ -f "public/gallery-data.json" ]; then
    cp public/gallery-data.json .vercel/cache/public/
    echo "✓ Gallery metadata cached"
else
    echo "⚠ No gallery metadata to cache"
fi

echo "=== Build completed successfully ==="

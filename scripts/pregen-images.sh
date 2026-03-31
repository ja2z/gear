#!/bin/bash

# Pre-generate WebP and LQIP images from source PNGs in frontend/public/images/.
# Run when images are added or changed, then commit the output.

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT/frontend"

echo "Running image pre-generation..."
npm run pregen

echo ""
echo "Done. Commit the new .webp and .lqip.webp files in frontend/public/images/."

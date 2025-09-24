# Home Page Background Images

This directory contains background images for the home page that will be randomly rotated.

## Adding New Images

**Simply drop your image files into this directory!** 

The system automatically discovers all image files (PNG, JPG, JPEG, GIF, WebP, SVG) and includes them in the rotation. No code changes needed!

## Image Requirements

- Images should be optimized for web use
- Supported formats: PNG, JPG, JPEG, GIF, WebP, SVG
- Recommended size: 1920x1080 or similar aspect ratio for best mobile and desktop display
- Images will be displayed as background with `background-size: cover` and `background-position: center`

## How It Works

1. A build-time script (`scripts/generateImageList.js`) automatically scans this directory
2. It generates a list of all image files found
3. The home page randomly selects from this auto-generated list
4. The script runs automatically before each build via the `prebuild` npm script

## Current Images

- `bwca_home.png` - Boundary Waters Canoe Area image
- `bwca2_home.png` - Alternative Boundary Waters Canoe Area image

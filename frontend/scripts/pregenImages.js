/**
 * Pre-generate WebP and LQIP images from source PNGs.
 * Run manually when images are added or changed, then commit the output.
 * Usage: npm run pregen (from frontend/)
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, '../public/images');

const files = fs.readdirSync(imagesDir);
const pngFiles = files.filter(f => path.extname(f).toLowerCase() === '.png');

console.log(`Found ${pngFiles.length} PNG files`);

for (const file of pngFiles) {
  const inputPath = path.join(imagesDir, file);
  const baseName = path.parse(file).name;
  const webpPath = path.join(imagesDir, `${baseName}.webp`);
  const lqipPath = path.join(imagesDir, `${baseName}.lqip.webp`);

  const srcMtime = fs.statSync(inputPath).mtimeMs;
  if (fs.existsSync(webpPath) && fs.statSync(webpPath).mtimeMs > srcMtime) {
    console.log(`Skipping (up to date): ${file}`);
    continue;
  }

  try {
    await sharp(inputPath).webp({ quality: 85, effort: 6 }).toFile(webpPath);
    await sharp(inputPath)
      .resize(20, null, { withoutEnlargement: true, fit: 'inside' })
      .webp({ quality: 20, effort: 1 })
      .blur(0.5)
      .toFile(lqipPath);
    console.log(`Generated: ${baseName}.webp + ${baseName}.lqip.webp`);
  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
  }
}

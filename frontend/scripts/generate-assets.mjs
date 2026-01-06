import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// Favicon SVG content
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#38bdf8"/>
      <stop offset="100%" style="stop-color:#818cf8"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <text x="256" y="340" font-family="Arial, sans-serif" font-size="280" font-weight="800" fill="url(#accent)" text-anchor="middle">L</text>
  <circle cx="400" cy="120" r="48" fill="#22c55e"/>
  <circle cx="400" cy="120" r="24" fill="#4ade80"/>
</svg>`;

// OG Image SVG (1200x630)
const ogImageSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="ogbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="50%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
    <linearGradient id="ogaccent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#38bdf8"/>
      <stop offset="100%" style="stop-color:#818cf8"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#ogbg)"/>

  <!-- Decorative circles -->
  <circle cx="100" cy="100" r="200" fill="#38bdf8" opacity="0.1"/>
  <circle cx="1100" cy="530" r="250" fill="#818cf8" opacity="0.1"/>

  <!-- Logo -->
  <rect x="80" y="200" width="140" height="140" rx="28" fill="#1e293b" stroke="#38bdf8" stroke-width="3"/>
  <text x="150" y="300" font-family="Arial, sans-serif" font-size="90" font-weight="800" fill="#38bdf8" text-anchor="middle">L</text>
  <circle cx="185" cy="225" r="15" fill="#22c55e"/>

  <!-- Title -->
  <text x="260" y="260" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="#ffffff">LatBot</text>
  <text x="485" y="260" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="#38bdf8">.news</text>

  <!-- Subtitle -->
  <text x="260" y="320" font-family="Arial, sans-serif" font-size="28" fill="#94a3b8">Noticias LATAM con Inteligencia Artificial</text>

  <!-- Features -->
  <rect x="80" y="400" width="320" height="80" rx="12" fill="#1e293b"/>
  <text x="240" y="450" font-family="Arial, sans-serif" font-size="22" fill="#38bdf8" text-anchor="middle">Analisis de Sesgo</text>

  <rect x="440" y="400" width="320" height="80" rx="12" fill="#1e293b"/>
  <text x="600" y="450" font-family="Arial, sans-serif" font-size="22" fill="#22c55e" text-anchor="middle">Extraccion de Entidades</text>

  <rect x="800" y="400" width="320" height="80" rx="12" fill="#1e293b"/>
  <text x="960" y="450" font-family="Arial, sans-serif" font-size="22" fill="#a78bfa" text-anchor="middle">Hechos Verificados</text>

  <!-- Bottom accent line -->
  <rect x="0" y="620" width="1200" height="10" fill="url(#ogaccent)"/>
</svg>`;

async function generateAssets() {
  console.log('Generating assets...');

  // Generate favicon PNGs
  const faviconBuffer = Buffer.from(faviconSvg);

  // 16x16
  await sharp(faviconBuffer)
    .resize(16, 16)
    .png()
    .toFile(join(publicDir, 'favicon-16x16.png'));
  console.log('Created favicon-16x16.png');

  // 32x32
  await sharp(faviconBuffer)
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon-32x32.png'));
  console.log('Created favicon-32x32.png');

  // 192x192 (Android)
  await sharp(faviconBuffer)
    .resize(192, 192)
    .png()
    .toFile(join(publicDir, 'android-chrome-192x192.png'));
  console.log('Created android-chrome-192x192.png');

  // 512x512 (Android)
  await sharp(faviconBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, 'android-chrome-512x512.png'));
  console.log('Created android-chrome-512x512.png');

  // Apple touch icon (180x180)
  await sharp(faviconBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // Generate OG Image
  const ogBuffer = Buffer.from(ogImageSvg);
  await sharp(ogBuffer)
    .resize(1200, 630)
    .png()
    .toFile(join(publicDir, 'og-image.png'));
  console.log('Created og-image.png');

  // Create site.webmanifest
  const manifest = {
    name: 'LatBot News',
    short_name: 'LatBot',
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    theme_color: '#0f172a',
    background_color: '#0f172a',
    display: 'standalone'
  };
  writeFileSync(join(publicDir, 'site.webmanifest'), JSON.stringify(manifest, null, 2));
  console.log('Created site.webmanifest');

  console.log('All assets generated!');
}

generateAssets().catch(console.error);

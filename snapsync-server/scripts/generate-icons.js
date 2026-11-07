const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, '../frontend/public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Standard icon SVG (with gentle rounded corners for standalone image viewers)
const createSvg = (isMaskable = false) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b" />
      <stop offset="100%" stop-color="#09090b" />
    </linearGradient>
    <linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#27272a" />
      <stop offset="100%" stop-color="#141416" />
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#818cf8" />
    </linearGradient>
  </defs>

  <!-- Background -->
  ${isMaskable
    ? `<rect width="512" height="512" fill="url(#bgGrad)" />`
    : `<rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
       <rect x="2" y="2" width="508" height="508" rx="110" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2" />`
  }

  <!-- Camera Body -->
  <g transform="${isMaskable ? 'translate(25.6, 25.6) scale(0.9)' : 'translate(0, 0)'}">
    <!-- Top bridge & body -->
    <path d="M128 180 C128 156 148 136 172 136 L208 136 L232 104 L280 104 L304 136 L340 136 C364 136 384 156 384 180 L384 360 C384 384 364 404 340 404 L172 404 C148 404 128 384 128 360 Z"
          fill="none"
          stroke="#f4f4f5"
          stroke-width="20"
          stroke-linejoin="round"
          stroke-linecap="round" />

    <!-- Flash / Viewfinder dot -->
    <circle cx="342" cy="182" r="14" fill="#38bdf8" />

    <!-- Lens Outer Ring -->
    <circle cx="256" cy="270" r="76" fill="url(#lensGrad)" stroke="#f4f4f5" stroke-width="18" />

    <!-- Inner Aperture / Sync circle -->
    <circle cx="256" cy="270" r="42" fill="none" stroke="url(#glowGrad)" stroke-width="12" stroke-dasharray="140 40" stroke-linecap="round" />

    <!-- Center optical core -->
    <circle cx="256" cy="270" r="18" fill="#f4f4f5" />
  </g>
</svg>
`;

async function generate() {
  const standardSvg = Buffer.from(createSvg(false));
  const maskableSvg = Buffer.from(createSvg(true));

  // Write favicon.svg
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), standardSvg);
  console.log('Saved favicon.svg');

  // Generate PNG icons
  const icons = [
    { name: 'favicon-16x16.png', size: 16, svg: standardSvg },
    { name: 'favicon-32x32.png', size: 32, svg: standardSvg },
    { name: 'apple-touch-icon.png', size: 180, svg: standardSvg },
    { name: 'pwa-192x192.png', size: 192, svg: standardSvg },
    { name: 'pwa-512x512.png', size: 512, svg: standardSvg },
    { name: 'pwa-maskable-192x192.png', size: 192, svg: maskableSvg },
    { name: 'pwa-maskable-512x512.png', size: 512, svg: maskableSvg },
  ];

  for (const icon of icons) {
    await sharp(icon.svg)
      .resize(icon.size, icon.size)
      .png()
      .toFile(path.join(publicDir, icon.name));
    console.log(`Generated ${icon.name} (${icon.size}x${icon.size})`);
  }
}

generate().catch(console.error);


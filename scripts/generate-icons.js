const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const iconsDir = path.join(__dirname, '..', 'public', 'icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

const svgIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#7c3aed" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#grad)" />
  
  <!-- Cake / Box Symbol -->
  <g transform="translate(${size * 0.2}, ${size * 0.2}) scale(${size * 0.6 / 24})">
    <path fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </g>
</svg>
`

const badgeSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
  <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
</svg>
`

async function generate() {
  await sharp(Buffer.from(svgIcon(192))).png().toFile(path.join(iconsDir, 'icon-192.png'))
  await sharp(Buffer.from(svgIcon(512))).png().toFile(path.join(iconsDir, 'icon-512.png'))
  await sharp(Buffer.from(svgIcon(180))).png().toFile(path.join(iconsDir, 'apple-touch-icon.png'))
  await sharp(Buffer.from(badgeSvg(72))).png().toFile(path.join(iconsDir, 'badge-72.png'))
  console.log('PWA icons generated successfully!')
}

generate().catch(console.error)

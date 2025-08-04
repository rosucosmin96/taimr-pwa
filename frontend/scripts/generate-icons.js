const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 }
];

async function generateIcons() {
  const svgPath = path.join(__dirname, '../public/masked-icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  for (const { name, size } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, '../public', name));

    console.log(`Generated ${name}`);
  }

  // Create favicon.png (16x16)
  await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toFile(path.join(__dirname, '../public/favicon.png'));

  console.log('Generated favicon.png');
}

generateIcons().catch(console.error);

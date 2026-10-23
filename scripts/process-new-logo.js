import sharp from 'sharp';
import path from 'path';

async function processLogo() {
  const sourcePath = path.resolve('public/assets/aistudio/launchericon-512x512_b7a42316.png');
  const publicDir = path.resolve('public');

  console.log('Processing new logo from:', sourcePath);

  // 1. icon-512.png (512x512 full resolution)
  await sharp(sourcePath)
    .resize(512, 512, { fit: 'contain', background: { r: 245, g: 239, b: 227, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Created icon-512.png');

  // 2. icon-192.png (192x192)
  await sharp(sourcePath)
    .resize(192, 192, { fit: 'contain', background: { r: 245, g: 239, b: 227, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Created icon-192.png');

  // 3. icon-maskable-512.png (Safe zone scaled to 80% with warm background #F6EFE3)
  // Maskable icons require 10-15% padding so Android squircles do not clip the logo edges
  const innerSize = Math.round(512 * 0.82); // 420px
  const innerEmblemBuffer = await sharp(sourcePath)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 246, g: 239, b: 227, alpha: 1 } })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 246, g: 239, b: 227, alpha: 1 }, // warm background matching the logo's outer circle
    },
  })
    .composite([
      {
        input: innerEmblemBuffer,
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(publicDir, 'icon-maskable-512.png'));
  console.log('Created icon-maskable-512.png');

  // 4. apple-touch-icon.png (180x180)
  await sharp(sourcePath)
    .resize(180, 180, { fit: 'contain', background: { r: 246, g: 239, b: 227, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // 5. favicon-32.png (32x32)
  await sharp(sourcePath)
    .resize(32, 32, { fit: 'contain', background: { r: 245, g: 239, b: 227, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'favicon-32.png'));
  console.log('Created favicon-32.png');

  // 6. Also create launcher-icon copies
  await sharp(sourcePath)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'launchericon-512.png'));

  await sharp(sourcePath)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'launchericon-192.png'));

  console.log('All logo sizes generated successfully!');
}

processLogo().catch((err) => {
  console.error('Failed to process logo:', err);
  process.exit(1);
});

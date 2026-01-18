const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicons() {
  const svgPath = path.join(__dirname, '..', 'logo.svg');
  const publicDir = path.join(__dirname, '..', 'public');
  
  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log('Generating favicons from logo.svg...');

  try {
    // Generate 32x32 icon.png
    await sharp(svgPath)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'icon.png'));
    console.log('✓ Generated icon.png (32x32)');

    // Generate 180x180 apple-icon.png
    await sharp(svgPath)
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-icon.png'));
    console.log('✓ Generated apple-icon.png (180x180)');

    // Generate 16x16 for favicon.ico (we'll create a simple PNG and rename)
    await sharp(svgPath)
      .resize(16, 16)
      .png()
      .toFile(path.join(publicDir, 'favicon-16.png'));
    
    // Generate 32x32 for favicon.ico
    await sharp(svgPath)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon-32.png'));
    
    console.log('✓ Generated favicon PNGs (16x16, 32x32)');
    console.log('\nNote: For a proper .ico file, you may want to use an online converter or ImageMagick.');
    console.log('For now, browsers will use icon.png as fallback.');

    console.log('\n✅ All favicons generated successfully!');
  } catch (error) {
    console.error('Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();

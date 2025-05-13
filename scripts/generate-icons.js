const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const iconPath = path.join(__dirname, '../assets/icon.png');
const iconBuffer = fs.readFileSync(iconPath);

async function generateIcons() {
    for (const size of sizes) {
        await sharp(iconBuffer)
            .resize(size, size)
            .png()
            .toFile(path.join(__dirname, `../public/icons/icon${size}.png`));

        console.log(`Generated icon${size}.png`);
    }
}

generateIcons().catch(console.error);
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const sourceIconDir = path.join(__dirname, '../public/icons');
const distIconDir = path.join(__dirname, '../dist/icons');

async function convertIcons() {
    // Create dist/icons directory if it doesn't exist
    if (!fs.existsSync(distIconDir)) {
        fs.mkdirSync(distIconDir, { recursive: true });
    }

    for (const size of sizes) {
        const svgPath = path.join(sourceIconDir, `icon${size}.svg`);
        const pngPath = path.join(distIconDir, `icon${size}.png`);

        if (!fs.existsSync(svgPath)) {
            console.error(`SVG icon not found: ${svgPath}`);
            continue;
        }

        try {
            await sharp(svgPath)
                .resize(size, size)
                .png()
                .toFile(pngPath);
            
            // Also save to public/icons for development
            await sharp(svgPath)
                .resize(size, size)
                .png()
                .toFile(path.join(sourceIconDir, `icon${size}.png`));
            
            console.log(`Converted ${svgPath} to PNG`);
        } catch (error) {
            console.error(`Error converting ${svgPath}:`, error);
        }
    }
}

convertIcons(); 
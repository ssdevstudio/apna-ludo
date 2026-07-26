const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

const clientPublicPath = path.join(__dirname, 'client', 'public');

async function removeWhiteBackground(filepath) {
  try {
    const image = await Jimp.read(filepath);
    
    // Define distance function (RGB color distance)
    const colorDistance = (r1, g1, b1, r2, g2, b2) => {
      return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
    };

    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      const alpha = this.bitmap.data[idx + 3];

      // Pure white is 255,255,255
      const dist = colorDistance(red, green, blue, 255, 255, 255);
      
      if (dist < 30) { // If very close to white
        // Make it transparent
        this.bitmap.data[idx + 3] = 0; 
      } else if (dist < 80) {
        // Semi-transparent for shadow/fringe (anti-aliasing)
        const factor = (dist - 30) / 50; 
        this.bitmap.data[idx + 3] = Math.min(255, Math.max(0, Math.floor(255 * factor)));
      }
    });

    await image.write(filepath);
    console.log(`Processed: ${filepath}`);
  } catch (err) {
    console.error(`Error processing ${filepath}:`, err);
  }
}

async function run() {
  const colors = ['red', 'blue', 'green', 'yellow'];
  
  for (const color of colors) {
    const clientFile = path.join(clientPublicPath, `token-${color}.png`);
    if (fs.existsSync(clientFile)) {
      await removeWhiteBackground(clientFile);
    }
  }
}

run();

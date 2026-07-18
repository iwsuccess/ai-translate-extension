/**
 * Icon Generator - Creates simple PNG icons for the Chrome extension
 * Uses only Node.js built-in modules (no dependencies required)
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function createPNG(width, height, pixels) {
  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);    // bit depth
  ihdrData.writeUInt8(6, 9);    // color type: RGBA
  ihdrData.writeUInt8(0, 10);   // compression
  ihdrData.writeUInt8(0, 11);   // filter
  ihdrData.writeUInt8(0, 12);   // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT Chunk - pixel data
  // Each row: filter byte(0) + RGBA * width
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData.writeUInt8(0, rowOffset); // filter: none
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const idx = (y * width + x) * 4;
      rawData.writeUInt8(pixels[idx], pixelOffset);     // R
      rawData.writeUInt8(pixels[idx + 1], pixelOffset + 1); // G
      rawData.writeUInt8(pixels[idx + 2], pixelOffset + 2); // B
      rawData.writeUInt8(pixels[idx + 3], pixelOffset + 3); // A
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);

  // IEND Chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate icon pixels
// Creates a rounded-square icon with a "T" letter and a globe-like element
// Colors: Indigo (#4F46E5) background, white foreground
function generateIconPixels(size) {
  const pixels = new Uint8Array(size * size * 4);
  const bgR = 79, bgG = 70, bgE = 229; // #4F46E5
  const fgR = 255, fgG = 255, fgB = 255; // White

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded square background (with corner smoothing)
      const cornerRadius = size * 0.12;
      const halfSize = size * 0.48;
      const inSquare = Math.abs(dx) < halfSize && Math.abs(dy) < halfSize;
      
      // Simple rounded rect: circle for corners, square for rest
      let inBg = false;
      if (Math.abs(dx) < halfSize - cornerRadius || Math.abs(dy) < halfSize - cornerRadius) {
        inBg = Math.abs(dx) < halfSize && Math.abs(dy) < halfSize;
      } else {
        const cx2 = Math.abs(dx) - (halfSize - cornerRadius);
        const cy2 = Math.abs(dy) - (halfSize - cornerRadius);
        inBg = (cx2 * cx2 + cy2 * cy2) < cornerRadius * cornerRadius;
      }

      if (inBg) {
        pixels[idx] = bgR;
        pixels[idx + 1] = bgG;
        pixels[idx + 2] = bgE;
        pixels[idx + 3] = 255;
      } else {
        pixels[idx + 3] = 0; // transparent
      }
    }
  }

  // Draw "T" letter (simplified for small sizes)
  const scale = size / 128;
  const barH = Math.max(2, Math.round(10 * scale));
  const barW = Math.max(2, Math.round(8 * scale));
  const stemW = Math.max(2, Math.round(8 * scale));
  
  // Top bar of T
  const topBarY = Math.round(size * 0.28);
  const topBarX1 = Math.round(size * 0.32);
  const topBarX2 = Math.round(size * 0.68);
  
  for (let y = topBarY; y < topBarY + barH; y++) {
    for (let x = topBarX1; x < topBarX2; x++) {
      if (y < 0 || y >= size || x < 0 || x >= size) continue;
      const idx = (y * size + x) * 4;
      pixels[idx] = fgR;
      pixels[idx + 1] = fgG;
      pixels[idx + 2] = fgB;
      pixels[idx + 3] = 255;
    }
  }

  // Stem of T
  const stemX1 = Math.round(size * 0.46);
  const stemX2 = Math.round(size * 0.54);
  const stemY1 = topBarY + barH;
  const stemY2 = Math.round(size * 0.70);
  
  for (let y = stemY1; y < stemY2; y++) {
    for (let x = stemX1; x < stemX2; x++) {
      if (y < 0 || y >= size || x < 0 || x >= size) continue;
      const idx = (y * size + x) * 4;
      pixels[idx] = fgR;
      pixels[idx + 1] = fgG;
      pixels[idx + 2] = fgB;
      pixels[idx + 3] = 255;
    }
  }

  // Small globe arc below
  const arcY = Math.round(size * 0.72);
  const arcRadius = Math.round(size * 0.1);
  const arcThick = Math.max(1, Math.round(3 * scale));
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const r = Math.sqrt((x - cx) * (x - cx) + (y - arcY) * (y - arcY));
      if (r > arcRadius - arcThick && r < arcRadius + arcThick && pixels[idx + 3] === 0) {
        pixels[idx] = fgR;
        pixels[idx + 1] = fgG;
        pixels[idx + 2] = fgB;
        pixels[idx + 3] = 255;
      }
    }
  }

  return pixels;
}

// Generate icons
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [16, 48, 128];
for (const size of sizes) {
  const pixels = generateIconPixels(size);
  const png = createPNG(size, size, pixels);
  const filename = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filename, png);
  console.log(`Created ${filename} (${png.length} bytes)`);
}

console.log('All icons generated successfully!');

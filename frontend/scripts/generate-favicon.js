const fs = require('fs');
const path = require('path');

// ICO file format builder - no dependencies needed
// Creates a 32x32 ICO with blue rounded square and white V

function createIco() {
  const size = 32;
  const pixels = new Uint8Array(size * size * 4); // RGBA

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const r = 7; // corner radius

      // Check if inside rounded rectangle
      const inCornerTL = x < r && y < r && Math.sqrt((x-r)**2 + (y-r)**2) > r;
      const inCornerTR = x >= size-r && y < r && Math.sqrt((x-(size-r))**2 + (y-r)**2) > r;
      const inCornerBL = x < r && y >= size-r && Math.sqrt((x-r)**2 + (y-(size-r))**2) > r;
      const inCornerBR = x >= size-r && y >= size-r && Math.sqrt((x-(size-r))**2 + (y-(size-r))**2) > r;
      const outside = inCornerTL || inCornerTR || inCornerBL || inCornerBR;

      if (outside) {
        // Transparent
        pixels[idx] = 0; pixels[idx+1] = 0; pixels[idx+2] = 0; pixels[idx+3] = 0;
      } else {
        // Blue background #3B82F6
        pixels[idx] = 0x3B; pixels[idx+1] = 0x82; pixels[idx+2] = 0xF6; pixels[idx+3] = 255;
      }
    }
  }

  // Draw white "V" on top — pixel art style for 32x32
  const vPixels = [
    // Left stroke of V (going down-right)
    [7,8],[8,9],[8,10],[9,11],[9,12],[10,13],[10,14],[11,15],[11,16],[12,17],[12,18],
    // Right stroke of V (going down-left)
    [25,8],[24,9],[24,10],[23,11],[23,12],[22,13],[22,14],[21,15],[21,16],[20,17],[20,18],
    // Bottom point
    [13,19],[14,19],[15,20],[16,20],[17,20],[18,19],[19,19],
    [14,20],[15,21],[16,21],[17,21],[18,20],
    [15,22],[16,22],[17,22],
  ];

  for (const [x, y] of vPixels) {
    // Make strokes 2px wide
    for (let dx = -1; dx <= 1; dx++) {
      const px = x + dx;
      if (px >= 0 && px < size) {
        const idx = (y * size + px) * 4;
        pixels[idx] = 255; pixels[idx+1] = 255; pixels[idx+2] = 255; pixels[idx+3] = 255;
      }
    }
  }

  // Build BMP data (ICO uses BMP format internally)
  // BITMAPINFOHEADER - 40 bytes
  const dibHeader = Buffer.alloc(40);
  dibHeader.writeUInt32LE(40, 0);       // header size
  dibHeader.writeInt32LE(size, 4);      // width
  dibHeader.writeInt32LE(size * 2, 8);  // height * 2 (ICO convention)
  dibHeader.writeUInt16LE(1, 12);       // color planes
  dibHeader.writeUInt16LE(32, 14);      // bits per pixel
  dibHeader.writeUInt32LE(0, 16);       // compression (none)
  dibHeader.writeUInt32LE(size * size * 4, 20); // image size
  dibHeader.writeInt32LE(0, 24);
  dibHeader.writeInt32LE(0, 28);
  dibHeader.writeUInt32LE(0, 32);
  dibHeader.writeUInt32LE(0, 36);

  // Pixel data — ICO BMP is bottom-up and uses BGRA
  const pixelData = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const srcIdx = (y * size + x) * 4;
      const dstIdx = ((size - 1 - y) * size + x) * 4; // flip vertically
      pixelData[dstIdx] = pixels[srcIdx + 2];   // B
      pixelData[dstIdx+1] = pixels[srcIdx + 1]; // G
      pixelData[dstIdx+2] = pixels[srcIdx];     // R
      pixelData[dstIdx+3] = pixels[srcIdx + 3]; // A
    }
  }

  // AND mask (1-bit transparency mask) — all zeros = fully visible
  const maskSize = size * (size / 8);
  const andMask = Buffer.alloc(maskSize, 0);

  // ICO file header — 6 bytes
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0);  // reserved
  icoHeader.writeUInt16LE(1, 2);  // type: ICO
  icoHeader.writeUInt16LE(1, 4);  // 1 image

  // Image directory entry — 16 bytes
  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(size, 0);   // width
  dirEntry.writeUInt8(size, 1);   // height
  dirEntry.writeUInt8(0, 2);      // color count
  dirEntry.writeUInt8(0, 3);      // reserved
  dirEntry.writeUInt16LE(1, 4);   // color planes
  dirEntry.writeUInt16LE(32, 6);  // bits per pixel
  const imageDataSize = dibHeader.length + pixelData.length + andMask.length;
  dirEntry.writeUInt32LE(imageDataSize, 8);
  dirEntry.writeUInt32LE(6 + 16, 12); // offset to image data

  const ico = Buffer.concat([icoHeader, dirEntry, dibHeader, pixelData, andMask]);
  const outPath = path.join(__dirname, '../public/favicon.ico');
  fs.writeFileSync(outPath, ico);
  console.log('✅ favicon.ico created at frontend/public/favicon.ico');
}

createIco();

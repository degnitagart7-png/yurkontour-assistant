/**
 * Generates placeholder PNG icons from SVG files.
 * Run: node scripts/generate-icons.mjs
 *
 * For production, replace with proper designed icons.
 * This script creates simple solid-color placeholder PNGs.
 */

import { writeFileSync } from "fs";

// Minimal PNG encoder (no external deps)
// Creates a solid blue rounded-rect with a white shield checkmark

function createPNG(size) {
  // Create raw RGBA pixel data
  const pixels = new Uint8Array(size * size * 4);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.15; // corner radius ratio
  const blue = [37, 99, 235]; // #2563EB
  const white = [255, 255, 255];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Rounded rectangle
      const inRect = isInRoundedRect(x, y, 0, 0, size, size, radius);

      if (inRect) {
        // Check if in shield area
        const inShield = isInShield(x, y, cx, cy, size);
        const color = inShield ? white : blue;

        pixels[idx] = color[0];
        pixels[idx + 1] = color[1];
        pixels[idx + 2] = color[2];
        pixels[idx + 3] = 255;
      } else {
        // Transparent
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }

  return encodePNG(pixels, size, size);
}

function isInRoundedRect(x, y, rx, ry, w, h, r) {
  if (x < rx || x >= rx + w || y < ry || y >= ry + h) return false;

  // Check corners
  const corners = [
    [rx + r, ry + r],
    [rx + w - r, ry + r],
    [rx + r, ry + h - r],
    [rx + w - r, ry + h - r],
  ];

  for (const [cx, cy] of corners) {
    const dx = Math.abs(x - cx);
    const dy = Math.abs(y - cy);
    if (dx > r || dy > r) continue;
    if (x >= cx - r && x <= cx + r && y >= cy - r && y <= cy + r) {
      if (dx * dx + dy * dy > r * r) {
        // Check which corner
        if (
          (x < cx && y < cy) ||
          (x > cx && y < cy) ||
          (x < cx && y > cy) ||
          (x > cx && y > cy)
        ) {
          if (
            (x < rx + r && y < ry + r) ||
            (x >= rx + w - r && y < ry + r) ||
            (x < rx + r && y >= ry + h - r) ||
            (x >= rx + w - r && y >= ry + h - r)
          ) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

function isInShield(x, y, cx, cy, size) {
  // Simplified shield shape - a pentagon-like area
  const scale = size / 48; // Normalize to 48px reference
  const sx = (x - cx) / scale;
  const sy = (y - cy) / scale;

  // Shield boundary (approx)
  const shieldTop = -15;
  const shieldBottom = 16;
  const halfWidth = 12;

  if (sy < shieldTop || sy > shieldBottom) return false;

  let maxX;
  if (sy < 2) {
    // Upper part - straight sides
    maxX = halfWidth;
  } else {
    // Lower part - narrows to point
    const t = (sy - 2) / (shieldBottom - 2);
    maxX = halfWidth * (1 - t);
  }

  return Math.abs(sx) <= maxX;
}

// Minimal PNG encoder
function encodePNG(pixels, width, height) {
  // PNG signature
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = new Uint8Array(13);
  writeUint32(ihdr, 0, width);
  writeUint32(ihdr, 4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createChunk("IHDR", ihdr);

  // IDAT chunk - raw pixel data with filter bytes
  const rawData = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // filter: none
    for (let x = 0; x < width * 4; x++) {
      rawData[y * (1 + width * 4) + 1 + x] = pixels[y * width * 4 + x];
    }
  }

  const compressed = deflateRaw(rawData);
  const idatChunk = createChunk("IDAT", compressed);

  // IEND chunk
  const iendChunk = createChunk("IEND", new Uint8Array(0));

  // Concatenate
  const totalLen =
    signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
  const png = new Uint8Array(totalLen);
  let offset = 0;
  png.set(signature, offset);
  offset += signature.length;
  png.set(ihdrChunk, offset);
  offset += ihdrChunk.length;
  png.set(idatChunk, offset);
  offset += idatChunk.length;
  png.set(iendChunk, offset);

  return Buffer.from(png);
}

function createChunk(type, data) {
  const chunk = new Uint8Array(4 + 4 + data.length + 4);
  writeUint32(chunk, 0, data.length);
  chunk[4] = type.charCodeAt(0);
  chunk[5] = type.charCodeAt(1);
  chunk[6] = type.charCodeAt(2);
  chunk[7] = type.charCodeAt(3);
  chunk.set(data, 8);

  // CRC32 over type + data
  const crcData = new Uint8Array(4 + data.length);
  crcData.set(chunk.subarray(4, 8), 0);
  crcData.set(data, 4);
  const crc = crc32(crcData);
  writeUint32(chunk, 8 + data.length, crc);

  return chunk;
}

function writeUint32(arr, offset, value) {
  arr[offset] = (value >> 24) & 0xff;
  arr[offset + 1] = (value >> 16) & 0xff;
  arr[offset + 2] = (value >> 8) & 0xff;
  arr[offset + 3] = value & 0xff;
}

// Simple CRC32
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Simple deflate (store-only, no compression - valid but large)
function deflateRaw(data) {
  // Zlib header (deflate, no compression preset)
  const blocks = [];
  const BLOCK_SIZE = 65535;

  // Zlib header: CMF=0x78, FLG=0x01 (no dict, level 0)
  blocks.push(new Uint8Array([0x78, 0x01]));

  for (let i = 0; i < data.length; i += BLOCK_SIZE) {
    const end = Math.min(i + BLOCK_SIZE, data.length);
    const len = end - i;
    const isLast = end >= data.length;

    const header = new Uint8Array(5);
    header[0] = isLast ? 0x01 : 0x00; // BFINAL
    header[1] = len & 0xff;
    header[2] = (len >> 8) & 0xff;
    header[3] = ~len & 0xff;
    header[4] = (~len >> 8) & 0xff;

    blocks.push(header);
    blocks.push(data.subarray(i, end));
  }

  // Adler-32 checksum
  let a = 1,
    b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  const adler = ((b << 16) | a) >>> 0;
  const adlerBytes = new Uint8Array(4);
  writeUint32(adlerBytes, 0, adler);
  blocks.push(adlerBytes);

  // Concatenate
  const totalLen = blocks.reduce((s, b) => s + b.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const block of blocks) {
    result.set(block, offset);
    offset += block.length;
  }

  return result;
}

// Generate icons
const sizes = [16, 48, 128];
for (const size of sizes) {
  const png = createPNG(size);
  const path = `extension/public/icons/icon${size}.png`;
  writeFileSync(path, png);
  console.log(`Generated ${path} (${png.length} bytes)`);
}

console.log("Done! Icons generated.");

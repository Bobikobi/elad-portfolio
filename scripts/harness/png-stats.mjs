/**
 * Minimal PNG reader — enough to measure a screenshot, with no dependency.
 *
 * Why this exists: the obvious liveness check (drawImage the WebGL canvas into a 2D
 * canvas and read it back) reports ALL ZEROS on this site, because three.js runs with
 * preserveDrawingBuffer:false and the buffer is gone by the time script can read it.
 * That produced a confident "CANVAS DEAD" on a page that renders a full galaxy. The
 * screenshot is the honest instrument: it is what the visitor actually sees.
 *
 * Handles 8-bit non-interlaced RGB/RGBA/grey, which is what Chrome emits.
 */
import zlib from 'zlib';

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
    pos += 12 + len;
  }

  if (bitDepth !== 8) throw new Error('unsupported bit depth ' + bitDepth);
  if (interlace !== 0) throw new Error('interlaced PNG unsupported');
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error('unsupported colour type ' + colorType);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);

  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    const line = raw.subarray(rp, rp + stride);
    rp += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      const v = line[x];
      let val;
      switch (filter) {
        case 0: val = v; break;
        case 1: val = v + a; break;
        case 2: val = v + b; break;
        case 3: val = v + ((a + b) >> 1); break;
        case 4: val = v + paeth(a, b, c); break;
        default: throw new Error('bad filter ' + filter);
      }
      cur[x] = val & 0xff;
    }
  }

  return { width, height, channels, data: out };
}

/**
 * Luminance statistics over a screenshot, optionally restricted to a rectangle.
 * `distinct` counts quantised luminance buckets — a flat colour fill scores 1-2,
 * a rendered scene scores dozens. That is the difference between "the page loaded"
 * and "the page drew something".
 */
export function imageStats(png, rect) {
  const { width, height, channels, data } = png;
  const x0 = Math.max(0, Math.floor(rect?.x ?? 0));
  const y0 = Math.max(0, Math.floor(rect?.y ?? 0));
  const x1 = Math.min(width, Math.ceil(rect ? rect.x + rect.width : width));
  const y1 = Math.min(height, Math.ceil(rect ? rect.y + rect.height : height));

  let min = 255, max = 0, sum = 0, n = 0;
  const buckets = new Set();
  const step = Math.max(1, Math.floor(Math.min(x1 - x0, y1 - y0) / 300));

  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const i = y * width * channels + x * channels;
      const lum = channels === 1
        ? data[i]
        : data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      if (lum < min) min = lum;
      if (lum > max) max = lum;
      sum += lum;
      buckets.add(lum >> 2);
      n++;
    }
  }

  return {
    min: +min.toFixed(1),
    max: +max.toFixed(1),
    mean: +(sum / n).toFixed(1),
    spread: +(max - min).toFixed(1),
    distinct: buckets.size,
    sampled: n,
  };
}

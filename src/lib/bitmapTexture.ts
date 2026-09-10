import * as THREE from 'three';

export interface BitmapTextureOptions {
  colorSpace?: THREE.ColorSpace;
  anisotropy?: number;
  wrapS?: THREE.Wrapping;
  wrapT?: THREE.Wrapping;
}

export interface BitmapTextureLoad {
  /** Stable shell that can be handed to a material immediately, like TextureLoader.load(). */
  texture: THREE.Texture;
  /** Resolves after decode and the deliberately frame-spaced GPU pre-upload. */
  ready: Promise<THREE.Texture | null>;
  dispose: () => void;
}

// A renderer gets at most one texture upload in a frame. In particular, a group of image
// decodes resolving together must not turn back into the same long frame at the GPU boundary.
const uploadQueues = new WeakMap<THREE.WebGLRenderer, Promise<void>>();

function applyOptions(texture: THREE.Texture, options: BitmapTextureOptions) {
  if (options.colorSpace !== undefined) texture.colorSpace = options.colorSpace;
  if (options.anisotropy !== undefined) texture.anisotropy = options.anisotropy;
  if (options.wrapS !== undefined) texture.wrapS = options.wrapS;
  if (options.wrapT !== undefined) texture.wrapT = options.wrapT;
}

function uploadOnNextFreeFrame(
  gl: THREE.WebGLRenderer,
  upload: () => void,
  cancelled: () => boolean
): Promise<void> {
  const previous = uploadQueues.get(gl) ?? Promise.resolve();
  const next = previous.then(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          if (!cancelled()) upload();
          resolve();
        });
      })
  );
  // Keep a failed upload from poisoning every later item in this renderer's queue.
  uploadQueues.set(gl, next.catch(() => undefined));
  return next;
}

function decodeImageElement(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  return image.decode().then(() => image);
}

/**
 * TextureLoader-compatible shell backed by off-main-thread bitmap decode.
 *
 * ImageBitmap ignores Texture.flipY during upload, so the pixels are flipped while decoding
 * and flipY stays false. That is the exact equivalent of TextureLoader's unflipped image plus
 * flipY=true, and is the orientation contract that keeps the project artwork upright.
 */
export function loadBitmapTexture(
  url: string,
  gl: THREE.WebGLRenderer,
  options: BitmapTextureOptions = {}
): BitmapTextureLoad {
  const texture = new THREE.Texture();
  texture.flipY = false;
  applyOptions(texture, options);

  const controller = new AbortController();
  let disposed = false;
  let bitmap: ImageBitmap | null = null;

  const ready = (async (): Promise<THREE.Texture | null> => {
    let image: ImageBitmap | HTMLImageElement;
    let bitmapOrientation = false;

    if (typeof createImageBitmap === 'function') {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      // premultiplyAlpha MUST be 'none'. Its default premultiplies, while the
      // HTMLImageElement path TextureLoader used does not - so every semi-transparent
      // texel arrives different. Measured 2026-09-10: with the default, five of six views
      // failed the byte-identical check while the opaque planets were untouched and only
      // the nebulae and backdrops moved, which is exactly the signature of an alpha
      // convention change.
      bitmap = await createImageBitmap(await response.blob(), {
        imageOrientation: 'flipY',
        premultiplyAlpha: 'none',
        // TextureLoader's HTMLImageElement upload disables browser colour-space
        // conversion for sRGB textures in this renderer. ImageBitmap ignores that
        // WebGL pixel-store flag, so the equivalent must happen during decode. Without
        // it, the browser-converted base pixels produce a different generated mip chain,
        // which is most visible on the distant planets in the overview.
        colorSpaceConversion: 'none',
      });
      image = bitmap;
      bitmapOrientation = true;
    } else {
      // Older engines still avoid decoding inside R3F's frame callback. Unlike ImageBitmap,
      // this image is not pre-flipped, so Three must retain TextureLoader's flipY=true.
      image = await decodeImageElement(url);
    }

    if (disposed) {
      bitmap?.close();
      bitmap = null;
      return null;
    }

    await uploadOnNextFreeFrame(
      gl,
      () => {
        // Assign into the shell the materials already hold, rather than building a second
        // Texture and copying it in. copy() also carries version counters and mipmap state
        // from the throwaway object, and the materials are pointing at THIS instance.
        texture.image = image;
        texture.flipY = !bitmapOrientation;
        applyOptions(texture, options);
        texture.needsUpdate = true;
        gl.initTexture(texture);
      },
      () => disposed
    );
    return disposed ? null : texture;
  })().catch((error: unknown) => {
    if (!disposed && !(error instanceof DOMException && error.name === 'AbortError')) {
      console.error(`[bitmapTexture] Failed to load ${url}`, error);
    }
    return null;
  });

  return {
    texture,
    ready,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      controller.abort();
      texture.dispose();
      bitmap?.close();
      bitmap = null;
    },
  };
}

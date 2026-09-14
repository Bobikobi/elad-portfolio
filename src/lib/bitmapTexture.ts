import * as THREE from 'three';

export interface BitmapTextureOptions {
  colorSpace?: THREE.ColorSpace;
  anisotropy?: number;
  wrapS?: THREE.Wrapping;
  wrapT?: THREE.Wrapping;
  /**
   * Force the GPU upload as soon as the decode lands, instead of letting three do it at
   * first bind. Default OFF, and it has to stay off for anything on the startup path -
   * see the note at the upload site.
   *
   * The one caller that wants it is the hi-res world map, which is swapped into a live
   * material mid-flight and must not stall when it is first drawn. That call pre-uploaded
   * before this module existed; every base map did not.
   */
  preupload?: boolean;
}

export interface BitmapTextureLoad {
  /** Stable shell that can be handed to a material immediately, like TextureLoader.load(). */
  texture: THREE.Texture;
  /** Resolves after decode and the deliberately frame-spaced GPU pre-upload. */
  ready: Promise<THREE.Texture | null>;
  /**
   * Frees the GPU copy. NOT terminal, and it must never become terminal - see the note on
   * `loadBitmapTexture`. A shell that has been disposed and is then drawn again simply
   * re-uploads, exactly as a `TextureLoader` texture does.
   */
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

function uploadOnNextFreeFrame(gl: THREE.WebGLRenderer, upload: () => void): Promise<void> {
  const previous = uploadQueues.get(gl) ?? Promise.resolve();
  const next = previous.then(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          upload();
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
 *
 * THE LOAD MUST NOT BE CANCELLABLE. Measured 2026-09-11, and it is the whole reason the
 * overview failed M3 while all five worlds passed.
 *
 * The shell is built in a `useMemo` and released in a `useEffect` cleanup, and React does
 * not promise those pair up one-for-one. In the dev build it runs a component body twice
 * and then mount -> cleanup -> mount, so a cleanup lands on a shell that is still the one
 * the material holds. Traced on the overview: two shells exist per URL, `Planet.useEffect`'s
 * cleanup disposes the live one, and the surviving material is left pointing at a texture
 * whose image is still null. `texture2D(map, uv)` then returns black and every planet
 * renders as an unlit sphere - Saturn's globe black inside intact rings, Earth a black disc
 * behind its atmosphere rim. The five focused worlds passed only because `uHiMix` crossfades
 * the hi-res map over the base one and hid it.
 *
 * An earlier version made `dispose()` terminal: it aborted the fetch, closed the bitmap and
 * gated the upload behind a `disposed` flag, so nothing could ever bring the shell back. The
 * `TextureLoader.load()` it replaced has the opposite property - `Texture.dispose()` frees
 * the GPU copy and nothing else, and the very next draw re-uploads from `texture.image`.
 * That property is what let the old code survive React's scheduling, so this file keeps it:
 * the fetch always finishes, the decode always lands in the shell, and `dispose()` frees the
 * GPU copy without making the shell unusable.
 *
 * The cost of not cancelling is one already-started fetch finishing after its component has
 * gone - which is exactly what `TextureLoader` did here before, so it is not a regression.
 * The decoded bitmap stays referenced by `texture.image` for as long as an HTMLImageElement
 * used to; calling `close()` on it is what would make the shell un-re-uploadable.
 */
export function loadBitmapTexture(
  url: string,
  gl: THREE.WebGLRenderer,
  options: BitmapTextureOptions = {}
): BitmapTextureLoad {
  const texture = new THREE.Texture();
  texture.flipY = false;
  applyOptions(texture, options);

  const ready = (async (): Promise<THREE.Texture | null> => {
    let image: ImageBitmap | HTMLImageElement;
    let bitmapOrientation = false;

    if (typeof createImageBitmap === 'function') {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      // premultiplyAlpha MUST be 'none'. Its default premultiplies, while the
      // HTMLImageElement path TextureLoader used does not - so every semi-transparent
      // texel arrives different. Measured 2026-09-10: with the default, five of six views
      // failed the byte-identical check while the opaque planets were untouched and only
      // the nebulae and backdrops moved, which is exactly the signature of an alpha
      // convention change.
      image = await createImageBitmap(await response.blob(), {
        imageOrientation: 'flipY',
        premultiplyAlpha: 'none',
        // TextureLoader's HTMLImageElement upload disables browser colour-space
        // conversion for sRGB textures in this renderer. ImageBitmap ignores that
        // WebGL pixel-store flag, so the equivalent must happen during decode. Without
        // it, the browser-converted base pixels produce a different generated mip chain,
        // which is most visible on the distant planets in the overview.
        colorSpaceConversion: 'none',
      });
      bitmapOrientation = true;
    } else {
      // Older engines still avoid decoding inside R3F's frame callback. Unlike ImageBitmap,
      // this image is not pre-flipped, so Three must retain TextureLoader's flipY=true.
      image = await decodeImageElement(url);
    }

    await uploadOnNextFreeFrame(gl, () => {
      // Assign into the shell the materials already hold, rather than building a second
      // Texture and copying it in. copy() also carries version counters and mipmap state
      // from the throwaway object, and the materials are pointing at THIS instance.
      texture.image = image;
      texture.flipY = !bitmapOrientation;
      applyOptions(texture, options);
      texture.needsUpdate = true;
      // NOT pre-uploaded by default. gl.initTexture forces the GPU upload synchronously on
      // the main thread for every texture, whether or not anything is about to draw it, and
      // measured 2026-09-14 that is a net LOSS at startup: with it on for every map, all
      // three runs of the longest main-thread task (1,942 / 1,943 / 2,007 ms) sat above all
      // three baseline runs (1,642 / 1,773 / 1,896). Three uploads lazily at first bind,
      // which is what TextureLoader did here before. This stage's allowance is moving the
      // DECODE off the main thread, and the decode is already off it by the time this runs.
      if (options.preupload) gl.initTexture(texture);
    });
    return texture;
  })().catch((error: unknown) => {
    console.error(`[bitmapTexture] Failed to load ${url}`, error);
    return null;
  });

  return {
    texture,
    ready,
    // Frees the GPU copy only - see the note above on why this is not allowed to do more.
    dispose: () => texture.dispose(),
  };
}

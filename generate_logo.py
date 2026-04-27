"""Generate E.S logo using Glamora font."""
from PIL import Image, ImageDraw, ImageFont
import os

FONT_PATH = os.path.join(os.path.dirname(__file__), "glamora_font", "GLAMORA.otf")
OUT_DIR = os.path.join(os.path.dirname(__file__), "public")

# ── Logo for navbar (transparent bg, white text) ──────────────────────────────
def make_logo():
    font_size = 160
    font = ImageFont.truetype(FONT_PATH, font_size)

    # Measure "E.S"
    tmp = Image.new("RGBA", (1, 1))
    d = ImageDraw.Draw(tmp)
    bbox = d.textbbox((0, 0), "E.S", font=font)
    w = bbox[2] - bbox[0] + 20
    h = bbox[3] - bbox[1] + 20
    pad_x = 10
    pad_y = 10

    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.text((pad_x - bbox[0], pad_y - bbox[1]), "E.S", font=font, fill=(250, 250, 250, 255))

    out = os.path.join(OUT_DIR, "logo.png")
    img.save(out, "PNG")
    print(f"Saved logo: {out}  ({w}×{h})")


# ── Favicon assets (Google-friendly sizes) ───────────────────────────────────
def make_favicon():
    size = 512
    font_size = 300
    font = ImageFont.truetype(FONT_PATH, font_size)

    tmp = Image.new("RGBA", (1, 1))
    d = ImageDraw.Draw(tmp)
    bbox = d.textbbox((0, 0), "E", font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]

    # Dark bg matching portfolio #09090B
    img = Image.new("RGBA", (size, size), (9, 9, 11, 255))
    draw = ImageDraw.Draw(img)
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1]
    draw.text((x, y), "E", font=font, fill=(250, 250, 250, 255))

    # Save source favicon (512x512)
    out_png = os.path.join(OUT_DIR, "favicon.png")
    img.save(out_png, "PNG")
    print(f"Saved favicon.png: {out_png}")

    # Save app icon (used by Next.js app dir)
    app_icon = os.path.join(os.path.dirname(__file__), "src", "app", "icon.png")
    img.resize((512, 512)).save(app_icon, "PNG")
    print(f"Saved icon.png: {app_icon}")

    # Save Apple touch icon (180x180)
    app_apple_icon = os.path.join(os.path.dirname(__file__), "src", "app", "apple-icon.png")
    img.resize((180, 180), Image.LANCZOS).save(app_apple_icon, "PNG")
    print(f"Saved apple-icon.png: {app_apple_icon}")

    # Save Google-friendly PNG favicon (192x192)
    out_png_192 = os.path.join(OUT_DIR, "favicon-192.png")
    img.resize((192, 192), Image.LANCZOS).save(out_png_192, "PNG")
    print(f"Saved favicon-192.png: {out_png_192}")

    # Multi-size ICO (includes 48x48 for Google compatibility)
    icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    out_ico = os.path.join(OUT_DIR, "favicon.ico")
    img.save(out_ico, "ICO", sizes=icon_sizes)
    print(f"Saved favicon.ico: {out_ico}")

    # Keep app favicon in sync with public/favicon.ico
    app_favicon = os.path.join(os.path.dirname(__file__), "src", "app", "favicon.ico")
    img.save(app_favicon, "ICO", sizes=icon_sizes)
    print(f"Saved app favicon.ico: {app_favicon}")


if __name__ == "__main__":
    make_logo()
    make_favicon()

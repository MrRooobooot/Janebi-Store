#!/usr/bin/env python3
"""Regenerate OG images (1200x630) for Janebi Arena + Novin Khodro with CORRECT
Persian text shaping (arabic_reshaper + bidi). Fixes the broken-glyph previews
seen in iMessage. Fonts: Vazirmatn (self-hosted, OFL)."""
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

def fa(text: str) -> str:
    """Shape + bidi-reorder Persian text for correct raster rendering."""
    return get_display(arabic_reshaper.reshape(text))

def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)

BOLD = "/Users/aidin/Desktop/Janebi-Store/public/fonts/Vazirmatn-Bold.woff2"
BLACK = "/Users/aidin/Desktop/Janebi-Store/public/fonts/Vazirmatn-Black.woff2"
REG = "/Users/aidin/Desktop/Janebi-Store/public/fonts/Vazirmatn-Regular.woff2"

# woff2 not loadable by PIL — need TTF. Convert with fonttools if available.
import os, subprocess, sys
def ensure_ttf(src: str, out_dir: str) -> str:
    os.makedirs(out_dir, exist_ok=True)
    name = os.path.basename(src).replace(".woff2", ".ttf")
    out = os.path.join(out_dir, name)
    if not os.path.exists(out):
        from fontTools.ttLib import TTFont
        f = TTFont(src)
        f.flavor = None
        f.save(out)
    return out

TMP = "/tmp/ogfonts"
try:
    import fontTools  # noqa
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "--quiet", "fonttools", "brotli"], check=True)

T_BOLD = ensure_ttf(BOLD, TMP)
T_BLACK = ensure_ttf(BLACK, TMP)
T_REG = ensure_ttf(REG, TMP)

W, H = 1200, 630

def center(d: ImageDraw.ImageDraw, y: int, text: str, f: ImageFont.FreeTypeFont, fill):
    bb = d.textbbox((0, 0), text, font=f)
    d.text(((W - (bb[2] - bb[0])) / 2 - bb[0], y), text, font=f, fill=fill)

def gradient_bg(c1, c2, accent_bottom=None):
    img = Image.new("RGB", (W, H), c1)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        col = tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))
        d.line([(0, y), (W, y)], fill=col)
    if accent_bottom:
        for i, col in enumerate(accent_bottom):
            d.line([(0, H - 8 + i), (W, H - 8 + i)], fill=col)
    return img

# ---------- NOVIN KHODRO (titanium dark + red accent, matches site theme #0B1220) ----------
img = gradient_bg((11, 18, 32), (24, 33, 54), accent_bottom=[(220, 38, 38)])
d = ImageDraw.Draw(img)
center(d, 90, fa("نوین خودرو | خرید از شما، اقساط از ما"), font(T_BOLD, 40), (148, 163, 184))
center(d, 180, fa("هم امروز بخر، اقساط از دیماه"), font(T_BLACK, 72), (255, 255, 255))
# red underline accent
d.rounded_rectangle([(W-160)/2, 300, (W+160)/2, 312], radius=6, fill=(220, 38, 38))
center(d, 350, fa("اقساط ۶ تا ۲۴ ماهه • کارشناسی ۱۰۰٪ تخصصی"), font(T_BOLD, 44), (226, 232, 240))
center(d, 440, fa("خرید نقد و اقساطی | فروش خودروی شما | مشاوره تخصصی"), font(T_REG, 32), (148, 163, 184))
center(d, 510, fa("۰۲۱ - ۶۶۱۲۰۳۳۲ • تهران"), font(T_BOLD, 34), (96, 165, 250))
img.save("/tmp/og-novin.jpg", quality=90)

# ---------- JANEBI ARENA (brand #F47C20 orange on deep navy #0B1536) ----------
img = gradient_bg((11, 21, 54), (20, 32, 66), accent_bottom=[(244, 124, 32)])
d = ImageDraw.Draw(img)
center(d, 100, fa("جانبی آرنا"), font(T_BLACK, 84), (255, 255, 255))
center(d, 230, fa("فروشگاه آنلاین لوازم جانبی موبایل"), font(T_BOLD, 46), (244, 124, 32))
d.rounded_rectangle([(W-140)/2, 330, (W+140)/2, 341], radius=5, fill=(244, 124, 32))
center(d, 380, fa("کاور • گلس • شارژر اورجینال • پاوربانک"), font(T_BOLD, 40), (226, 232, 240))
center(d, 460, fa("ضمانت اصالت کالا | ارسال سریع | گارانتی معتبر"), font(T_REG, 32), (148, 163, 184))
center(d, 530, fa("janebiarena.ir"), font(T_BOLD, 36), (96, 165, 250))
img.save("/tmp/og-janebi.jpg", quality=90)
print("OK: /tmp/og-novin.jpg /tmp/og-janebi.jpg")

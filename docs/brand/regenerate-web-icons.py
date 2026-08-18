"""Cut the white background off the Gemini logo render and emit the web icon set.

Why thresh=30 and not higher: the aeroplane and the swoosh are white too, and at
the top-left the swoosh touches the image border colour. Measuring surviving
foreground pixels across thresholds, the count is flat (<=0.04% drift) up to 30
and then drops 1.58% at 34 — that jump IS the flood fill bursting through the
swoosh and eating part of the logo. 30 is the last safe value.
"""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

SRC = r"C:\Users\10ban\Downloads\Gemini_Generated_Image_c42fnyc42fnyc42f.jpg"
THRESH = 30

im = Image.open(SRC).convert('RGB')
W, H = im.size

work = im.copy()
KEY = (255, 0, 255)
for xy in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1), (W // 2, 2), (2, H // 2),
           (W - 3, H // 2), (W // 2, H - 3)]:
    ImageDraw.floodfill(work, xy, KEY, thresh=THRESH)

a = np.array(work)
bg = (a[:, :, 0] == 255) & (a[:, :, 1] == 0) & (a[:, :, 2] == 255)
alpha = np.where(bg, 0, 255).astype(np.uint8)

# Pull the edge in by ~1px. The render was anti-aliased against white, so the
# outermost ring of pixels is part logo / part white — left in, it reads as a
# pale halo on a dark browser tab.
am = Image.fromarray(alpha).filter(ImageFilter.MinFilter(3))
alpha = np.array(am)

cut = Image.fromarray(np.dstack([np.array(im), alpha]), 'RGBA')
bbox = cut.getbbox()
logo = cut.crop(bbox)
print("logo bbox:", bbox, "size:", logo.size)

def square(fit, size, bg_colour=None):
    lw, lh = logo.size
    scale = (size * fit) / max(lw, lh)
    new = (max(1, round(lw * scale)), max(1, round(lh * scale)))
    small = logo.resize(new, Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0) if bg_colour is None else bg_colour)
    canvas.paste(small, ((size - new[0]) // 2, (size - new[1]) // 2), small)
    return canvas.convert('RGB') if bg_colour else canvas

WHITE = (255, 255, 255, 255)
square(0.94, 1024).save("icons/jetmeaway-icon-1024-transparent.png")
square(0.94, 1024, WHITE).save("icons/jetmeaway-icon-1024-white.png")
square(0.94, 128).save("icons/icon.png")                  # src/app/icon.png
square(0.86, 180, WHITE).save("icons/apple-icon.png")     # iOS rejects alpha
# 🔴 192 and 512 must stay OPAQUE. src/app/layout.tsx wires them up as
# <link rel="apple-touch-icon">, and iOS composites any alpha channel to BLACK.
# They double as the PWA manifest "any" icons, where an opaque square is fine.
square(0.86, 192, WHITE).save("icons/icon-192x192.png")
square(0.86, 512, WHITE).save("icons/icon-512x512.png")
square(0.62, 512, WHITE).save("icons/icon-maskable-512x512.png")  # Android 80% safe circle

ic = Image.open("icons/jetmeaway-icon-1024-transparent.png")
sheet = Image.new('RGB', (1100, 560), (15, 17, 25))
d = ImageDraw.Draw(sheet)
for i, (col, label) in enumerate([((15,17,25),'dark tab'), ((255,255,255),'light tab'), ((0,102,255),'brand blue')]):
    panel = Image.new('RGB', (340, 440), col)
    big = ic.resize((300, 300), Image.LANCZOS)
    panel.paste(big, (20, 20), big)
    for j, s in enumerate([32, 48, 64]):
        t = ic.resize((s, s), Image.LANCZOS)
        panel.paste(t, (20 + j * 90, 350), t)
    sheet.paste(panel, (20 + i * 355, 40))
    d.text((20 + i * 355, 12), label, fill=(200, 205, 215))
sheet.save("icons/_background-check.png")

sizes = [16, 32, 48, 64, 128]
sw = 48 + sum(sizes) + 28 * (len(sizes) - 1)
st = Image.new('RGB', (sw, 172), (245, 247, 250))
d2 = ImageDraw.Draw(st)
x = 24
for s in sizes:
    t = ic.resize((s, s), Image.LANCZOS)
    st.paste(t, (x, 24 + (128 - s)), t)
    d2.text((x, 158), f"{s}px", fill=(90, 99, 120))
    x += s + 28
st.save("icons/_size-test.png")
print("done")

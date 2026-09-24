#!/usr/bin/env python3
"""Generate the home hero art set (3 slides) with Gemini via 9router, one art direction.

Slides must read as one hand: identical studio, light, palette and framing — only the
subject changes. Subject stays inside a ~15% margin so the ken-burns / object-cover crop
(2.5:1 desktop) never eats it. Run: python3 scripts/oneoff/hero-art.py [slide…]
"""
import base64, json, re, subprocess, sys, urllib.request, pathlib

GATEWAY = "http://127.0.0.1:20128/v1/chat/completions"
MODEL = "ag/gemini-3.1-flash-image"
OUT = pathlib.Path("public/images/hero")
W, H, Q = 1536, 1024, 84

STYLE = (
    "Luxury dark studio product photography for a premium mobile-accessories e-commerce hero banner. "
    "Seamless charcoal-black gradient backdrop, glossy black reflective floor, single soft key light from the "
    "upper left with a warm amber rim light, subtle cool fill from the right, shallow depth of field, crisp "
    "macro detail, deep blacks, cinematic contrast, colour palette limited to black, graphite, warm amber and "
    "a hint of white. ONE single hero object, centred, occupying only the central 40% of the frame: the upper "
    "30% of the image is completely empty background and the lower 20% is empty reflective floor, so the art "
    "survives an aggressive centre crop and nothing is cut at the edges. Any phone screen in the picture is "
    "switched off and pure black with no interface, no icons, no clock and no text. No brand logos, no trademark "
    "marks, no text, no letters, no numbers, no watermark, no people, no hands, wide 3:2 landscape framing."
)

SUBJECTS = {
    1: "A single matte-black magnetic car air-vent phone holder with a modern smartphone docked in it, tilted "
       "slightly towards the camera, floating in the centre of the frame.",
    2: "A single modern smartphone in a transparent clear MagSafe case with a visible magnetic ring, standing "
       "upright in the centre of the frame.",
    3: "A coiled braided fast-charge lightning cable in black and orange with a reinforced metal connector, the "
       "connector facing the camera.",
}


def gen(slide: int) -> pathlib.Path:
    prompt = f"{SUBJECTS[slide]} {STYLE}"
    body = json.dumps({"model": MODEL, "stream": False,
                       "messages": [{"role": "user", "content": prompt}]}).encode()
    req = urllib.request.Request(GATEWAY, data=body, headers={"Content-Type": "application/json"})
    res = json.loads(urllib.request.urlopen(req, timeout=420).read())
    text = res["choices"][0]["message"]["content"]
    m = re.search(r"data:image/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)", text)
    assert m, f"slide {slide}: no image in the reply ({text[:120]!r})"
    png = pathlib.Path(f"/tmp/hero-{slide}.png")
    png.write_bytes(base64.b64decode(m.group(1)))
    return png


def main(slides):
    OUT.mkdir(parents=True, exist_ok=True)
    for s in slides:
        png = gen(s)
        webp = OUT / f"slide-{s}.webp"
        # Fit the whole generated frame onto the 3:2 canvas over the artwork's own background — never
        # cover-crop here: the hero itself cover-crops (2.5:1 on desktop), so keeping the model's own
        # headroom is what stops the subject being eaten by that crop.
        subprocess.run(["magick", str(png), "-resize", f"{W}x{H}", "-background", "#0b0b0d",
                        "-gravity", "center", "-extent", f"{W}x{H}", "-strip", "-quality", str(Q),
                        str(webp)], check=True)
        dim = subprocess.run(["magick", "identify", "-format", "%wx%h %b", str(webp)],
                             capture_output=True, text=True).stdout
        print(f"✔ slide-{s}.webp  {dim}  (src {png.stat().st_size // 1024} kB)")


if __name__ == "__main__":
    main([int(a) for a in sys.argv[1:]] or [1, 2, 3])

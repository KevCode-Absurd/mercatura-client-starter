#!/usr/bin/env python3
"""
Render the Zack D Films caption layer as an RGBA frame sequence.

Why a frame sequence and not libass: many ffmpeg builds (including Homebrew's
default on macOS) ship without the ass / subtitles / drawtext filters. Rendering
the layer ourselves removes that dependency entirely and guarantees the exact
measured spec every time.

Usage:
  render_captions.py --words words.json --cards cards.json --out caplayer/ \
                     --duration 39.0 [--foot-on 34.9] [--footer "..."]

words.json : [{"w": "What", "s": 0.0, "e": 0.24}, ...]   (whisper word timestamps)
cards.json : {"ranges": [[0,2],[2,4],...], "gold": [0,1,...], "star": {"44":1}}
             ranges are [startWordIdx, endWordIdxExclusive]
             gold[i] = index WITHIN card i of the word to highlight
             star maps card index -> word index that gets a trailing asterisk
"""
import argparse, json, os, shutil, sys
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
CY = 1160                 # caption vertical centre = 60.4% of frame height
GOLD = (242, 181, 33)     # #F2B521, sampled off the reference ad
WHITE = (255, 255, 255)
STROKE, SHADOW = 7, 5
FONT_SIZE = 69            # yields a 48px cap height = 2.50% of frame height
FOOT_SIZE = 21

DEFAULT_FOOTER = ""


def wrap(text, font, maxw, draw):
    out, line = [], ""
    for word in text.split():
        trial = (line + " " + word).strip()
        if draw.textlength(trial, font=font) <= maxw:
            line = trial
        else:
            out.append(line)
            line = word
    if line:
        out.append(line)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--words", required=True)
    ap.add_argument("--cards", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--duration", type=float, required=True)
    ap.add_argument("--font", default=os.path.join(
        os.path.dirname(__file__), "..", "reference", "Montserrat-ExtraBold.ttf"))
    ap.add_argument("--foot-on", type=float, default=None,
                    help="seconds after which the legal footer appears")
    ap.add_argument("--footer", default=DEFAULT_FOOTER)
    a = ap.parse_args()

    words = json.load(open(a.words))
    spec = json.load(open(a.cards))
    ranges = [tuple(r) for r in spec["ranges"]]
    gold = spec["gold"]
    star = {int(k): v for k, v in spec.get("star", {}).items()}

    if len(ranges) != len(gold):
        sys.exit(f"ranges ({len(ranges)}) and gold ({len(gold)}) must be the same length")
    if ranges[-1][1] != len(words):
        sys.exit(f"ranges must cover all {len(words)} words, last range ends at {ranges[-1][1]}")

    f = ImageFont.truetype(a.font, FONT_SIZE)
    foot_f = ImageFont.truetype(a.font, FOOT_SIZE)

    def render(card_i, with_foot):
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        if card_i is not None:
            lo, hi = ranges[card_i]
            toks = []
            for j, w in enumerate(words[lo:hi]):
                t = w["w"].upper()
                if star.get(card_i) == j:
                    t += "*"
                toks.append((t, GOLD if gold[card_i] == j else WHITE))
            sp = d.textlength(" ", font=f)
            widths = [d.textlength(t, font=f) for t, _ in toks]
            x = (W - (sum(widths) + sp * (len(toks) - 1))) / 2
            for pas in ("shadow", "main"):
                xx, dy = x, (SHADOW if pas == "shadow" else 0)
                for (t, col), wd in zip(toks, widths):
                    d.text((xx, CY + dy), t, font=f, anchor="lm",
                           fill=(0, 0, 0, 255) if pas == "shadow" else col + (255,),
                           stroke_width=STROKE, stroke_fill=(0, 0, 0, 255))
                    xx += wd + sp
        if with_foot and a.footer:
            y = H - 120
            for ln in wrap(a.footer, foot_f, W - 140, d):
                d.text((W / 2, y), ln, font=foot_f, anchor="mm",
                       fill=(255, 255, 255, 180), stroke_width=3,
                       stroke_fill=(0, 0, 0, 200))
                y += 28
        return img

    os.makedirs(a.out, exist_ok=True)
    for p in os.listdir(a.out):
        os.remove(os.path.join(a.out, p))

    cache = {}

    def get(card_i, foot):
        key = (card_i, foot)
        if key not in cache:
            p = os.path.join(a.out, f"_src_{card_i}_{int(foot)}.png")
            render(card_i, foot).save(p)
            cache[key] = p
        return cache[key]

    # a card is on screen from its first word's onset until the next card's onset
    bounds = []
    for i, (lo, hi) in enumerate(ranges):
        s = words[lo]["s"]
        e = words[ranges[i + 1][0]]["s"] if i + 1 < len(ranges) else words[hi - 1]["e"] + 0.34
        bounds.append((s, e))

    n = int(a.duration * FPS)
    for k in range(n):
        t = k / FPS
        active = next((i for i, (s, e) in enumerate(bounds) if s <= t < e), None)
        foot = a.foot_on is not None and t >= a.foot_on
        shutil.copyfile(get(active, foot), os.path.join(a.out, f"f_{k:04d}.png"))

    print(f"rendered {n} frames, {len(cache)} unique cards, into {a.out}")


if __name__ == "__main__":
    main()

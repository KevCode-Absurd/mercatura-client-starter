#!/usr/bin/env python3
"""Tooling for the clone-from-screenshot skill.
Needs Python 3 + Pillow (`pip install pillow`) and, for `capture`, a local Chrome/Chromium.
All X Y W H are page pixels — read them off the magenta grid on the strips.

  capture   URL|file.html out.png [--width 1440] [--height 12000]
                full-page screenshot via headless Chrome, trailing blank viewport trimmed
                (retries once at 16000px, Chrome's ceiling, if the page fills the window)
  slice     in.png outdir [--height 1100] [--overlap 100] [--grid 100]
                fixed-height overlapping strips with a labelled pixel grid (page coords)
  color     in.png X Y                     hex of one pixel
  palette   in.png X Y W H [--n 6] [--dark|--light]
                dominant flat colours of a region with % share; --dark keeps only dark pixels
                (text on a light bg), --light only light pixels (text on a dark bg)
  bbox      in.png X Y W H --color #hex [--tol 14]
                bounding box of everything near that colour inside the region — measures a
                button, card, band or image edge exactly
  edges     in.png --col X | --row Y [--from A --to B] [--min 60]
                where the colour changes along one column or row: section boundaries,
                padding, gaps
  crop      in.png X Y W H out.png         cut one region out (photos, badges, logos)
  patch     in.png X Y W H [--blur 40]     blur a region in place — for text baked into a
                photo, so DOM copy can sit on a clean image
  compare   source.png render.png outdir [--height 1100] [--zoom X Y W H]
                side-by-side strips, source left / render right; --zoom writes one region
                at 1:1 instead
  lint      page.html                       colours, fonts, radii, shadows or widths written
                outside :root; <img> without data-swap; <section> without sNN- id
  leftovers clone.html branded.html         source copy (4+ words) and assets/source/ files
                still in the branded page
"""
import argparse, os, re, shutil, subprocess, sys, tempfile, time
from html.parser import HTMLParser
from PIL import Image, ImageDraw, ImageChops, ImageFilter

CHROME_CANDIDATES = [
    os.environ.get("CHROME_BIN", ""),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    shutil.which("google-chrome") or "", shutil.which("chromium") or "",
    shutil.which("chromium-browser") or "", shutil.which("chrome") or "",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
]


def find_chrome():
    for c in CHROME_CANDIDATES:
        if c and os.path.exists(c):
            return c
    sys.exit("No Chrome/Chromium found. Install Chrome or set CHROME_BIN=/path/to/chrome")


def hexof(px):
    return "#%02x%02x%02x" % px[:3]


def parse_hex(s):
    s = s.lstrip("#")
    if len(s) == 3:
        s = "".join(c * 2 for c in s)
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def region(im, a):
    return im.crop((a.x, a.y, a.x + a.w, a.y + a.h))


# ---------------------------------------------------------------- capture

def page_bottom(im):
    """Last row that still holds page content. Fixed widgets (chat bubbles, cookie buttons)
    sit in the bottom corners, so only the central 60% of the width is inspected."""
    w, h = im.size
    band = im.crop((int(w * 0.2), 0, int(w * 0.8), h)).convert("RGB")
    bg = band.getpixel((band.width // 2, band.height - 1))
    bbox = ImageChops.difference(band, Image.new("RGB", band.size, bg)).getbbox()
    return bbox[3] if bbox else 0


def run_chrome(chrome, url, out, width, height, timeout=90):
    """Chrome sometimes writes the screenshot and then never exits, so wait for the file
    to appear and stop growing instead of waiting for the process."""
    profile = os.path.join(tempfile.gettempdir(), "clone-tools-chrome-profile")
    if os.path.exists(out):
        os.remove(out)
    proc = subprocess.Popen([
        chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
        f"--window-size={width},{height}", "--virtual-time-budget=10000",
        f"--screenshot={os.path.abspath(out)}", f"--user-data-dir={profile}", url,
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    deadline, last = time.time() + timeout, -1
    while time.time() < deadline:
        time.sleep(0.5)
        size = os.path.getsize(out) if os.path.exists(out) else -1
        if size > 0 and size == last:
            break
        last = size
        if proc.poll() is not None and size > 0:
            break
    proc.kill()
    if not os.path.exists(out):
        sys.exit(f"capture failed: Chrome wrote nothing within {timeout}s for {url}")


def capture(args):
    chrome = find_chrome()
    url = args.url
    if not re.match(r"^[a-z]+://", url):
        url = "file://" + os.path.abspath(url)
    # Chrome caps the window at ~16384px; taller pages need a second capture (see --height).
    heights = [min(args.height, 16000)] + ([16000] if args.height < 16000 else [])
    for attempt, height in enumerate(heights):
        run_chrome(chrome, url, args.out, args.width, height)
        im = Image.open(args.out)
        bottom = page_bottom(im)
        if bottom < im.height - 40 or attempt == len(heights) - 1:
            if bottom >= im.height - 40:
                print(f"warning: page fills the whole {height}px window (Chrome's ceiling). "
                      f"Ask for a manual full-page screenshot of the rest, or clone what is here.")
            final = min(bottom + 8, im.height)
            im.crop((0, 0, im.width, final)).save(args.out)
            print(f"{args.out}: {im.width}x{final} (viewport {args.width}px)")
            return


# ---------------------------------------------------------------- reading the source

def slice_(args):
    im = Image.open(args.src).convert("RGB")
    os.makedirs(args.outdir, exist_ok=True)
    w, h = im.size
    step = args.height - args.overlap
    y, n, manifest = 0, 0, []
    while True:
        y1 = min(y + args.height, h)
        strip = im.crop((0, y, w, y1))
        if args.grid:
            d = ImageDraw.Draw(strip, "RGBA")
            for gx in range(0, w, args.grid):
                d.line([(gx, 0), (gx, strip.height)], fill=(255, 0, 255, 70), width=1)
                d.text((gx + 2, 2), str(gx), fill=(255, 0, 255, 200))
            for gy in range(0, strip.height, args.grid):
                d.line([(0, gy), (w, gy)], fill=(255, 0, 255, 70), width=1)
                d.text((2, gy + 2), str(y + gy), fill=(255, 0, 255, 200))
        name = f"strip_{n:02d}_y{y}-{y1}.png"
        strip.save(os.path.join(args.outdir, name))
        manifest.append(f"{name}\tpage y {y}–{y1}")
        n += 1
        if y1 >= h:
            break
        y += step
    with open(os.path.join(args.outdir, "strips.txt"), "w") as f:
        f.write(f"source {w}x{h}px, {n} strips, grid every {args.grid}px (labels are page coords)\n")
        f.write("\n".join(manifest) + "\n")
    print(f"{n} strips -> {args.outdir}/ (source {w}x{h}px). Read every one at full size.")


def color(args):
    print(hexof(Image.open(args.src).convert("RGB").getpixel((args.x, args.y))))


def palette(args):
    im = region(Image.open(args.src).convert("RGB"), args)
    px = list(getattr(im, "get_flattened_data", im.getdata)())
    if args.dark or args.light:
        lum = lambda p: 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]
        px = [p for p in px if (lum(p) < 128) == bool(args.dark)]
        if not px:
            sys.exit("no pixels on that side of mid-grey in the region")
    total = len(px)
    counts = {}
    for p in px:
        counts[p] = counts.get(p, 0) + 1
    for p, c in sorted(counts.items(), key=lambda kv: -kv[1])[: args.n]:
        print(f"{hexof(p)}  {100 * c / total:5.1f}%")
    print("(flat fills dominate; the long tail is anti-aliasing — ignore shares under ~2%)")


def bbox(args):
    im = region(Image.open(args.src).convert("RGB"), args)
    diff = ImageChops.difference(im, Image.new("RGB", im.size, parse_hex(args.color)))
    r, g, b = diff.split()
    mask = ImageChops.lighter(ImageChops.lighter(r, g), b).point(lambda v: 255 if v <= args.tol else 0)
    box = mask.getbbox()
    if not box:
        sys.exit(f"nothing within ±{args.tol} of {args.color} in that region")
    x0, y0, x1, y1 = box[0] + args.x, box[1] + args.y, box[2] + args.x, box[3] + args.y
    print(f"x {x0}–{x1}  y {y0}–{y1}   w {x1 - x0}  h {y1 - y0}   (X Y W H: {x0} {y0} {x1 - x0} {y1 - y0})")


def edges(args):
    im = Image.open(args.src).convert("RGB")
    along_col = args.col is not None
    length = im.height if along_col else im.width
    a, b = args.frm or 0, args.to or length
    get = (lambda i: im.getpixel((args.col, i))) if along_col else (lambda i: im.getpixel((i, args.row)))
    prev, out = get(a), []
    for i in range(a + 1, b):
        cur = get(i)
        if sum(abs(cur[k] - prev[k]) for k in range(3)) >= args.min:
            if out and i - out[-1][0] <= 2:      # anti-aliased edge: keep first row only
                out[-1] = (out[-1][0], out[-1][1], cur)
            else:
                out.append((i, prev, cur))
        prev = cur
    axis = f"column x={args.col}" if along_col else f"row y={args.row}"
    print(f"{len(out)} colour changes along {axis} ({a}–{b}):")
    out = [t for t in out if t[1] != t[2]]          # 1px hairlines merge back to no change
    for i, p, c in out[:120]:
        print(f"  {'y' if along_col else 'x'}={i:<6} {hexof(p)} → {hexof(c)}")
    if len(out) > 120:
        print(f"  … {len(out) - 120} more (text-heavy area — narrow the range with --from/--to)")


# ---------------------------------------------------------------- assets

def crop(args):
    im = Image.open(args.src)
    region(im, args).save(args.out)
    print(f"{args.out}: {args.w}x{args.h} @ ({args.x},{args.y})  aspect-ratio: {args.w}/{args.h} ({args.w / args.h:.3f})")


def patch(args):
    im = Image.open(args.src).convert("RGB")
    soft = im.filter(ImageFilter.GaussianBlur(args.blur))
    im.paste(region(soft, args), (args.x, args.y))
    im.save(args.src)
    print(f"{args.src}: blurred {args.w}x{args.h} @ ({args.x},{args.y}) in place")


# ---------------------------------------------------------------- verifying

def compare(args):
    a = Image.open(args.source).convert("RGB")
    b = Image.open(args.render).convert("RGB")
    if b.width != a.width:
        b = b.resize((a.width, round(b.height * a.width / b.width)))
        print(f"note: render width != source width; scaled to {a.width}px. "
              f"Capture the render at the source viewport width for a faithful compare.")
    os.makedirs(args.outdir, exist_ok=True)
    gutter = 24
    if args.zoom:
        x, y, w, h = args.zoom
        canvas = Image.new("RGB", (w * 2 + gutter, h), (255, 0, 255))
        canvas.paste(a.crop((x, y, x + w, y + h)), (0, 0))
        canvas.paste(b.crop((x, y, x + w, y + h)), (w + gutter, 0))
        out = os.path.join(args.outdir, f"zoom_x{x}_y{y}_{w}x{h}.png")
        canvas.save(out)
        print(f"{out}  (left = source, right = render, 1:1)")
        return
    h = max(a.height, b.height)
    print(f"source {a.height}px tall, render {b.height}px tall (Δ {b.height - a.height:+d}px, "
          f"{100 * (b.height - a.height) / a.height:+.1f}%)")
    for n, y in enumerate(range(0, h, args.height)):
        y1 = min(y + args.height, h)
        canvas = Image.new("RGB", (a.width * 2 + gutter, y1 - y), (255, 0, 255))
        for i, im in enumerate((a, b)):
            if y < im.height:
                canvas.paste(im.crop((0, y, im.width, min(y1, im.height))), (i * (a.width + gutter), 0))
        canvas.save(os.path.join(args.outdir, f"compare_{n:02d}_y{y}-{y1}.png"))
    print(f"{n + 1} side-by-side strips -> {args.outdir}/  (left = source, right = render). Read every one.")


VALUE_RULES = [
    (r"#[0-9a-fA-F]{3,8}\b", "colour literal"),
    (r"\brgba?\(|\bhsla?\(", "colour function"),
    (r"\bfont-family\s*:\s*(?!var\()\S", "font-family literal"),
    (r"\bbox-shadow\s*:\s*(?!var\()\S", "box-shadow literal"),
    (r"\bborder-radius\s*:\s*\d+px", "border-radius literal"),      # 50% circles are structure
    (r"\bmax-width\s*:\s*\d{3,}px", "max-width literal"),
]


def lint(args):
    src = open(args.page, encoding="utf-8").read()
    lines = src.splitlines()
    issues = []
    # css outside :root
    for m in re.finditer(r"<style[^>]*>(.*?)</style>", src, re.S):
        css = m.group(1)
        css_wo_root = re.sub(r":root\s*\{[^}]*\}", lambda r: " " * len(r.group()), css)
        base = src[: m.start(1)].count("\n")
        for i, line in enumerate(css_wo_root.splitlines()):
            if line.lstrip().startswith("@media"):      # breakpoints cannot use var()
                continue
            for pat, what in VALUE_RULES:
                if re.search(pat, line):
                    issues.append((base + i + 1, f"{what} outside :root", line.strip()))
    # inline styles and markup
    for i, line in enumerate(lines, 1):
        for st in re.findall(r'style="([^"]*)"', line):
            for pat, what in VALUE_RULES:
                if re.search(pat, st):
                    issues.append((i, f"{what} in inline style", st))
        for tag in re.findall(r"<img\b[^>]*>", line):
            if "data-swap=" not in tag:
                issues.append((i, "<img> without data-swap", tag[:90]))
        for tag in re.findall(r"<section\b[^>]*>", line):
            if not re.search(r'id="s\d{2}-', tag):
                issues.append((i, "<section> without sNN- id", tag[:90]))
    seen = set()
    for ln, what, ctx in issues:
        if (ln, what) in seen:
            continue
        seen.add((ln, what))
        print(f"{args.page}:{ln}: {what}: {ctx[:100]}")
    print(f"{len(seen)} issue(s)" if seen else "clean: every colour, font, radius, shadow and width lives in :root; images and sections are tagged.")
    sys.exit(1 if seen else 0)


class _Text(HTMLParser):
    SKIP = {"script", "style", "noscript"}

    def __init__(self):
        super().__init__()
        self.texts, self.imgs, self._skip = [], [], 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self._skip += 1
        if tag == "img":
            self.imgs.append(dict(attrs).get("src", ""))

    def handle_endtag(self, tag):
        if tag in self.SKIP:
            self._skip -= 1

    def handle_data(self, data):
        if not self._skip:
            t = " ".join(data.split())
            if t:
                self.texts.append(t)


def _parse(path):
    p = _Text()
    with open(path, encoding="utf-8") as f:
        p.feed(f.read())
    return p


def leftovers(args):
    src, out = _parse(args.clone), _parse(args.branded)
    out_text = " ".join(out.texts).lower()
    copy = [t for t in dict.fromkeys(src.texts) if len(t.split()) >= 4 and t.lower() in out_text]
    assets = [s for s in out.imgs if "assets/source/" in s or "source-" in s]
    if copy:
        print(f"{len(copy)} source copy string(s) still in {args.branded}:")
        for t in copy:
            print(f"  • {t[:110]}{'…' if len(t) > 110 else ''}")
    if assets:
        print(f"{len(assets)} source asset(s) still referenced:")
        for s in assets:
            print(f"  • {s}")
    if not copy and not assets:
        print("clean: no source copy (4+ words) and no assets/source/ files remain.")
    sys.exit(1 if (copy or assets) else 0)


# ---------------------------------------------------------------- cli

def xywh(sp):
    for v in ("x", "y", "w", "h"):
        sp.add_argument(v, type=int)


p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
sp = p.add_subparsers(dest="cmd", required=True)
c = sp.add_parser("capture"); c.add_argument("url"); c.add_argument("out"); c.add_argument("--width", type=int, default=1440); c.add_argument("--height", type=int, default=12000); c.set_defaults(fn=capture)
s = sp.add_parser("slice"); s.add_argument("src"); s.add_argument("outdir"); s.add_argument("--height", type=int, default=1100); s.add_argument("--overlap", type=int, default=100); s.add_argument("--grid", type=int, default=100); s.set_defaults(fn=slice_)
k = sp.add_parser("color"); k.add_argument("src"); k.add_argument("x", type=int); k.add_argument("y", type=int); k.set_defaults(fn=color)
q = sp.add_parser("palette"); q.add_argument("src"); xywh(q); q.add_argument("--n", type=int, default=6); g = q.add_mutually_exclusive_group(); g.add_argument("--dark", action="store_true"); g.add_argument("--light", action="store_true"); q.set_defaults(fn=palette)
bb = sp.add_parser("bbox"); bb.add_argument("src"); xywh(bb); bb.add_argument("--color", required=True); bb.add_argument("--tol", type=int, default=14); bb.set_defaults(fn=bbox)
e = sp.add_parser("edges"); e.add_argument("src"); ge = e.add_mutually_exclusive_group(required=True); ge.add_argument("--col", type=int); ge.add_argument("--row", type=int); e.add_argument("--from", dest="frm", type=int); e.add_argument("--to", type=int); e.add_argument("--min", type=int, default=60); e.set_defaults(fn=edges)
r = sp.add_parser("crop"); r.add_argument("src"); xywh(r); r.add_argument("out"); r.set_defaults(fn=crop)
pa = sp.add_parser("patch"); pa.add_argument("src"); xywh(pa); pa.add_argument("--blur", type=int, default=40); pa.set_defaults(fn=patch)
m = sp.add_parser("compare"); m.add_argument("source"); m.add_argument("render"); m.add_argument("outdir"); m.add_argument("--height", type=int, default=1100); m.add_argument("--zoom", type=int, nargs=4, metavar=("X", "Y", "W", "H")); m.set_defaults(fn=compare)
li = sp.add_parser("lint"); li.add_argument("page"); li.set_defaults(fn=lint)
l = sp.add_parser("leftovers"); l.add_argument("clone"); l.add_argument("branded"); l.set_defaults(fn=leftovers)
a = p.parse_args(); a.fn(a)

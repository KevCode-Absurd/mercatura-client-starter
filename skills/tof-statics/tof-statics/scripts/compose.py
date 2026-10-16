# tof-statics composition renderer
# Usage: python compose.py <ad.html> <out.png> [--crop45 <out-4x5.png>]
# Renders the 1080x1920 master; optionally also exports the centred 4:5 crop for QA.
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

args = sys.argv[1:]
if len(args) < 2:
    sys.exit("Usage: python compose.py <ad.html> <out.png> [--crop45 <out-4x5.png>]")
html_path, out_path = args[0], args[1]
crop_path = args[args.index("--crop45") + 1] if "--crop45" in args else None

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1080, "height": 1920}, device_scale_factor=1)
    page.goto(Path(html_path).resolve().as_uri(), wait_until="networkidle")
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(200)  # settle after fonts swap in
    page.screenshot(path=out_path)
    print("master  ->", out_path)
    if crop_path:
        page.screenshot(path=crop_path, clip={"x": 0, "y": 285, "width": 1080, "height": 1350})
        print("4:5 QA  ->", crop_path)
    browser.close()

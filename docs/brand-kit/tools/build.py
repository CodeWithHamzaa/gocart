"""Build the Mirza Cart brand kit: PDF, PNG boards and editable PPTX from one layout source.

    python3 docs/brand-kit/tools/build.py                  # the full kit, from the screenshots already saved
    python3 docs/brand-kit/tools/build.py --refresh        # first take new screenshots and product photos
    python3 docs/brand-kit/tools/build.py --list           # show the page numbers and titles
    python3 docs/brand-kit/tools/build.py --pages 1,5-8,15 # only these pages
    python3 docs/brand-kit/tools/build.py --skip 11,25     # every page except these
    python3 docs/brand-kit/tools/build.py --pptx           # PowerPoint only

Options can be combined, for example: --refresh --skip 4,11

--refresh      Captures the storefront again (capture.js, capture-elements.js) and downloads each product's
               first photo, so the kit shows the current design, products and images. The site is the test
               site unless --site <url> names another one (for example http://localhost:3000).
--pages/--skip Build a selection. The pages are renumbered (01 / N), and the Contents page is left out
               because it lists every page. The result goes to exports/custom/ (or --out <folder name>), so
               the full kit in exports/ is never overwritten by a selection.

Needs: Python 3 with Pillow and python-pptx; Node with Playwright (Chromium).
"""
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
import kit  # noqa: E402
from kit import BUILD, ROOT, Text, book_html, build_pptx  # noqa: E402

TOOLS = os.path.dirname(__file__)
EXPORTS = os.path.join(ROOT, 'exports')
DEFAULT_SITE = 'https://gocart-test-inky.vercel.app'
PHOTOS = os.path.join(BUILD, 'photos')


def option(name):
    """The value after a flag such as --pages, or None."""
    if name in sys.argv:
        i = sys.argv.index(name)
        if i + 1 < len(sys.argv):
            return sys.argv[i + 1]
        sys.exit(f'{name} needs a value')
    return None


def parse_numbers(text, total):
    """'1,5-8,15' -> {1, 5, 6, 7, 8, 15}; rejects anything outside 1..total."""
    out = set()
    for part in text.split(','):
        part = part.strip()
        if not part:
            continue
        m = re.fullmatch(r'(\d+)(?:-(\d+))?', part)
        if not m:
            sys.exit(f'Cannot read "{part}". Use page numbers such as 1,5-8,15')
        a, b = int(m.group(1)), int(m.group(2) or m.group(1))
        if a > b or a < 1 or b > total:
            sys.exit(f'"{part}" is outside the pages 1 to {total}')
        out.update(range(a, b + 1))
    return out


def download_photos(site):
    """Each product's first photo, saved as <product-slug>-1.webp (the name the brand pages ask for)."""
    os.makedirs(PHOTOS, exist_ok=True)
    with urllib.request.urlopen(f'{site}/api/products?limit=200&depth=1') as r:
        products = json.load(r)['docs']
    saved = 0
    for product in products:
        images = product.get('images') or []
        if not images:
            continue
        image = images[0].get('image', images[0]) if isinstance(images[0], dict) else None
        if not isinstance(image, dict) or not image.get('url'):
            continue
        url = image['url'] if image['url'].startswith('http') else site + image['url']
        slug = re.sub(r'[^a-z0-9]+', '-', product['name'].lower()).strip('-')
        with urllib.request.urlopen(url) as r, open(os.path.join(PHOTOS, f'{slug}-1.webp'), 'wb') as f:
            f.write(r.read())
        saved += 1
    print(f'photos: {saved} product photos from {site}')


def refresh(site):
    for script in ('capture.js', 'capture-elements.js'):
        print(f'capturing with {script} from {site} ...')
        subprocess.run(['node', os.path.join(TOOLS, script), site], check=True)
    download_photos(site)


def select_pages(pages, keep):
    """Keep the chosen pages, drop Contents, and renumber the page marks (header "05 · Logo", footer "05 / 26")."""
    total_before = len(pages)
    chosen = [p for i, p in enumerate(pages, start=1) if i in keep and p.slug != 'contents']
    if not chosen:
        sys.exit('No pages left to build.')
    for new, page in enumerate(chosen, start=1):
        for el in page.items:
            if not isinstance(el, Text):
                continue
            if re.fullmatch(rf'\d\d / {total_before}', el.text):
                el.text = f'{new:02d} / {len(chosen)}'
            elif re.match(r'\d\d  ·  ', el.text):
                el.text = f'{new:02d}' + el.text[2:]
    return chosen


def main():
    site = (option('--site') or DEFAULT_SITE).rstrip('/')
    if '--refresh' in sys.argv:
        refresh(site)
    # Product photos: an explicit folder wins, then the photos a --refresh downloaded, then the local /media.
    if not os.environ.get('BRAND_KIT_MEDIA') and os.path.isdir(PHOTOS) and os.listdir(PHOTOS):
        kit.MEDIA = PHOTOS

    from pages import build_pages
    pages = build_pages()
    total = len(pages)

    if '--list' in sys.argv:
        for i, p in enumerate(pages, start=1):
            print(f'{i:2d}  {p.title}')
        return

    pages_opt, skip_opt = option('--pages'), option('--skip')
    custom = bool(pages_opt or skip_opt)
    if custom:
        keep = parse_numbers(pages_opt, total) if pages_opt else set(range(1, total + 1))
        if skip_opt:
            keep -= parse_numbers(skip_opt, total)
        pages = select_pages(pages, keep)
        print(f'building {len(pages)} of {total} pages: ' + ', '.join(p.title for p in pages))

    out_dir = os.path.join(EXPORTS, option('--out') or 'custom') if custom or option('--out') else EXPORTS
    os.makedirs(BUILD, exist_ok=True)
    os.makedirs(out_dir, exist_ok=True)

    if '--pptx' not in sys.argv:
        html_path = os.path.join(BUILD, 'book.html')
        with open(html_path, 'w') as f:
            f.write(book_html(pages))
        boards = os.path.join(out_dir, 'boards')
        if os.path.isdir(boards):
            shutil.rmtree(boards)
        subprocess.run(['node', os.path.join(TOOLS, 'render.js'), html_path,
                        os.path.join(out_dir, 'mirza-brand-kit.pdf'), boards, '1.5'], check=True)
        # Lossless recompression of the boards (about 5% smaller).
        from PIL import Image
        for d, _, files in os.walk(boards):
            for n in files:
                f = os.path.join(d, n)
                with Image.open(f) as im:
                    im.load()
                    im.save(f, 'PNG', optimize=True, compress_level=9)

    out = os.path.join(out_dir, 'mirza-brand-showcase.pptx')
    build_pptx(pages, out)
    print('pptx', out)
    print('done:', os.path.relpath(out_dir))


if __name__ == '__main__':
    main()

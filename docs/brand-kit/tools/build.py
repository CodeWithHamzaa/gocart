"""Build the Mirza brand kit: PDF, PNG boards and editable PPTX from one layout source.

    python3 docs/brand-kit/tools/build.py            # all outputs
    python3 docs/brand-kit/tools/build.py --pptx     # PowerPoint only

Needs: Python 3 with Pillow and python-pptx; Node with Playwright (Chromium).
Screenshots must exist first: node docs/brand-kit/tools/capture.js && node docs/brand-kit/tools/capture-elements.js
"""
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from kit import BUILD, ROOT, book_html, build_pptx  # noqa: E402
from pages import build_pages  # noqa: E402

EXPORTS = os.path.join(ROOT, 'exports')


def main():
    os.makedirs(BUILD, exist_ok=True)
    os.makedirs(EXPORTS, exist_ok=True)
    pages = build_pages()
    only_pptx = '--pptx' in sys.argv

    if not only_pptx:
        html_path = os.path.join(BUILD, 'book.html')
        with open(html_path, 'w') as f:
            f.write(book_html(pages))
        boards = os.path.join(EXPORTS, 'boards')
        if os.path.isdir(boards):
            shutil.rmtree(boards)
        subprocess.run(['node', os.path.join(os.path.dirname(__file__), 'render.js'), html_path,
                        os.path.join(EXPORTS, 'mirza-brand-kit.pdf'), boards, '1.5'], check=True)
        # Lossless recompression of the boards (about 5% smaller).
        from PIL import Image
        for d, _, files in os.walk(boards):
            for n in files:
                f = os.path.join(d, n)
                with Image.open(f) as im:
                    im.load()
                    im.save(f, 'PNG', optimize=True, compress_level=9)

    out = os.path.join(EXPORTS, 'mirza-brand-showcase.pptx')
    build_pptx(pages, out)
    print('pptx', out)


if __name__ == '__main__':
    main()

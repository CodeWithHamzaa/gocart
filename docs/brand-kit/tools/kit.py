"""Mirza Cart brand kit: shared layout primitives (development-time tooling, not part of the app).

Every page of the book is a list of primitives positioned on a 1920 x 1080 px canvas. The same list
is written out twice:
  * as absolutely positioned HTML (rendered by Chromium to the PDF and the PNG boards), and
  * as native PowerPoint shapes (python-pptx): text boxes, rounded rectangles, vector logo marks and
    cropped pictures, so headings, copy, swatches and layouts stay editable.

1 canvas px = 6350 EMU (1920 px = 13.333 in, the 16:9 slide width); 1 px of type = 0.5 pt.
"""
from __future__ import annotations

import hashlib
import html
import math
import os
from dataclasses import dataclass, field

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..'))
BUILD = os.path.join(ROOT, '.build')
SHOTS = os.path.join(ROOT, 'source-assets', 'screenshots')
# Product photos for the brand pages. BRAND_KIT_MEDIA points at a folder of the live catalogue's photos named
# <product-slug>-1.webp; without it the repository's local /media folder is used (which holds whatever the
# local database was seeded with, so set the variable when the local seed is the generated demo art).
MEDIA = os.environ.get('BRAND_KIT_MEDIA') or os.path.join(REPO, 'media')
FONT_FILE = os.path.join(REPO, 'app', 'fonts', 'PlusJakartaSans-Variable.ttf')
FONT = 'Plus Jakarta Sans'

W, H = 1920, 1080
EMU = 6350

# Design tokens, copied from app/tokens.css and app/globals.css (Architecture Decision Record 053). Never
# invent a colour here.
C = {
    'primary': '#5F42EC', 'primary-dark': '#4A2FD0', 'accent-soft': '#EEE9FF', 'accent': '#E2DAFF',
    'ink': '#242328', 'ink-2': '#424245', 'ink-3': '#515154', 'muted': '#636368', 'disabled': '#A1A1A6',
    'page': '#F8F8FA', 'surface': '#FFFFFF', 'surface-muted': '#F1F2F5', 'line': '#E9E9EE',
    'line-2': '#DEDEE5', 'line-3': '#C4C4CD', 'line-input': '#83838F', 'inverse': '#352746',
    'sale': '#A8144F', 'sale-soft': '#FFE4F0', 'sale-strong': '#CC1966', 'amber': '#FFC247',
    'success': '#0B6E4F', 'success-soft': '#E6F2EE', 'white': '#FFFFFF',
}
# Presentation-only neutrals (device hardware), not brand colours.
DEVICE = '#16161A'
CHROME_BAR = '#F1F0F5'


def col(c: str) -> str:
    return C.get(c, c)


# ---------------------------------------------------------------- image cache (JPEG for embedding)

_size_cache: dict[str, tuple[int, int]] = {}


def size_of(path: str) -> tuple[int, int]:
    if path not in _size_cache:
        with Image.open(path) as im:
            _size_cache[path] = im.size
    return _size_cache[path]


def jpeg(path: str, quality: int = 90) -> str:
    """Opaque sources are embedded as JPEG to keep the PDF and PPTX small; PNG originals stay the source."""
    os.makedirs(os.path.join(BUILD, 'jpg'), exist_ok=True)
    key = hashlib.sha1(f'{path}:{os.path.getmtime(path)}:{quality}'.encode()).hexdigest()[:16]
    out = os.path.join(BUILD, 'jpg', f'{key}.jpg')
    if not os.path.exists(out):
        with Image.open(path) as im:
            im.convert('RGB').save(out, 'JPEG', quality=quality, optimize=True, progressive=False, subsampling=0)
    return out


def shot(kind: str, name: str) -> str:
    return os.path.join(SHOTS, kind, f'{name}.png')


def photo(name: str) -> str:
    return os.path.join(MEDIA, f'{name}.webp')


_font_cache: dict = {}


def text_width(text: str, size: float, weight: int, ls: float = 0) -> float:
    """Width of a single line in the brand font, measured with the real variable font file."""
    from PIL import ImageFont
    key = (round(size * 4), weight)
    if key not in _font_cache:
        f = ImageFont.truetype(FONT_FILE, max(1, round(size * 4)))
        f.set_variation_by_axes([weight])
        _font_cache[key] = f
    return _font_cache[key].getlength(text) / (round(size * 4) / size) + ls * size * len(text)


def wordmark(x, y, size, color='ink', center_w=None, h=None):
    """The Mirza Cart wordmark: "Mirza" heavy and "Cart" medium, as in components/ui/BrandLogo.tsx.
    Returns two text elements. With center_w the pair is centred in a box of that width starting at x."""
    ls = -0.03
    w1 = text_width('Mirza', size, 800, ls)
    gap = size * 0.24
    w2 = text_width('Cart', size, 500, ls)
    if center_w is not None:
        x = x + (center_w - (w1 + gap + w2)) / 2
    h = h or size * 1.15
    return [
        Text(x, y, w1 + size * 0.2, h, 'Mirza', size=size, weight=800, color=color, lh=h, ls=ls, name='Wordmark: Mirza'),
        Text(x + w1 + gap, y, w2 + size * 0.2, h, 'Cart', size=size, weight=500, color=color, lh=h, ls=ls, name='Wordmark: Cart'),
    ]


def wordmark_width(size):
    return text_width('Mirza', size, 800, -0.03) + size * 0.24 + text_width('Cart', size, 500, -0.03)


# ---------------------------------------------------------------- primitives

SHADOWS = {
    # token shadows from globals.css
    'chip': (0, 1, 4, 0.10),
    'float-sm': (0, 8, 20, 0.08),
    'float': (0, 12, 32, 0.10),
    # presentation shadows for floating devices (same hue as the tokens: rgba(16,12,40,a))
    'device': (0, 34, 70, 0.20),
    'device-sm': (0, 20, 44, 0.16),
    'card': (0, 18, 40, 0.12),
}


@dataclass
class Rect:
    x: float; y: float; w: float; h: float
    fill: str | None = 'white'
    radius: float = 0
    stroke: str | None = None
    stroke_w: float = 1
    shadow: str | None = None
    grad: tuple | None = None          # (css_angle, color1, color2)
    radii: tuple | None = None          # (top, bottom) for top/bottom-only rounding
    dashed: bool = False
    name: str = ''


@dataclass
class Text:
    x: float; y: float; w: float; h: float
    text: str
    size: float = 16
    weight: int = 400
    color: str = 'ink'
    lh: float | None = None
    ls: float = 0                        # letter spacing in em
    align: str = 'left'
    upper: bool = False
    name: str = ''


@dataclass
class Img:
    x: float; y: float; w: float; h: float
    src: str
    crop: tuple | None = None           # (sx, sy, sw) in source px; sh follows the box aspect
    fit: str = 'cover'                   # cover (centre crop) when crop is None
    radius: float = 0
    radii: tuple | None = None
    shadow: str | None = None
    stroke: str | None = None
    opaque: bool = True
    name: str = ''


@dataclass
class Mark:
    x: float; y: float; size: float
    bg: str = 'primary'
    fg: str = 'white'


@dataclass
class Page:
    slug: str
    title: str
    group: str                           # brand | desktop | mobile | responsive
    bg: str | tuple = 'page'             # colour or (css_angle, c1, c2)
    items: list = field(default_factory=list)
    dark: bool = False

    def add(self, *els):
        for e in els:
            if isinstance(e, list):
                self.items.extend(e)
            else:
                self.items.append(e)
        return self


# ---------------------------------------------------------------- crop maths

def resolve_crop(el: Img):
    """Return (src_path, sx, sy, sw, sh, W, H) for an image element."""
    Wsrc, Hsrc = size_of(el.src)
    if el.crop:
        sx, sy, sw = el.crop
        sh = sw * el.h / el.w
    else:
        box = el.w / el.h
        if Wsrc / Hsrc > box:      # source wider: crop sides
            sh = Hsrc; sw = sh * box; sx = (Wsrc - sw) / 2; sy = 0
        else:
            sw = Wsrc; sh = sw / box; sx = 0; sy = (Hsrc - sh) / 2
    sh = min(sh, Hsrc - sy)
    return sx, sy, sw, sh, Wsrc, Hsrc


# ---------------------------------------------------------------- HTML writer

def _shadow_css(name):
    if not name:
        return ''
    x, y, b, a = SHADOWS[name]
    return f'box-shadow:{x}px {y}px {b}px rgba(16,12,40,{a});'


def _radius_css(radius, radii):
    if radii:
        t, b = radii
        return f'border-radius:{t}px {t}px {b}px {b}px;'
    return f'border-radius:{radius}px;' if radius else ''


def _bg_css(fill, grad):
    if grad:
        a, c1, c2 = grad
        return f'background:linear-gradient({a}deg,{col(c1)},{col(c2)});'
    return f'background:{col(fill)};' if fill else ''


def el_html(e) -> str:
    pos = f'left:{e.x:.2f}px;top:{e.y:.2f}px;'
    if isinstance(e, Rect):
        border = ''
        if e.stroke:
            border = f'border:{e.stroke_w}px {"dashed" if e.dashed else "solid"} {col(e.stroke)};box-sizing:border-box;'
        return (f'<div class="e" style="{pos}width:{e.w:.2f}px;height:{e.h:.2f}px;{_bg_css(e.fill, e.grad)}'
                f'{_radius_css(e.radius, e.radii)}{border}{_shadow_css(e.shadow)}"></div>')
    if isinstance(e, Text):
        lh = e.lh or round(e.size * 1.3)
        style = (f'{pos}width:{e.w:.2f}px;height:{e.h:.2f}px;font-size:{e.size}px;line-height:{lh}px;'
                 f'font-weight:{e.weight};color:{col(e.color)};letter-spacing:{e.ls}em;text-align:{e.align};'
                 f'{"text-transform:uppercase;" if e.upper else ""}')
        return f'<div class="e t" style="{style}">{html.escape(e.text)}</div>'
    if isinstance(e, Img):
        sx, sy, sw, sh, Wsrc, Hsrc = resolve_crop(e)
        k = e.w / sw
        src = jpeg(e.src) if e.opaque else e.src
        border = f'outline:1px solid {col(e.stroke)};outline-offset:-1px;' if e.stroke else ''
        inner = (f'<img src="file://{src}" style="position:absolute;left:{-sx * k:.2f}px;top:{-sy * k:.2f}px;'
                 f'width:{Wsrc * k:.2f}px;height:{Hsrc * k:.2f}px;">')
        return (f'<div class="e" style="{pos}width:{e.w:.2f}px;height:{e.h:.2f}px;overflow:hidden;'
                f'{_radius_css(e.radius, e.radii)}{_shadow_css(e.shadow)}{border}">{inner}</div>')
    if isinstance(e, Mark):
        s = e.size
        return (f'<svg class="e" style="{pos}" width="{s}" height="{s}" viewBox="0 0 32 32">'
                f'<rect width="32" height="32" rx="8" fill="{col(e.bg)}"/>'
                f'<g transform="translate(3.4 3.6) scale(.79)" fill="{col(e.fg)}">'
                f'<path d="M3.5 6.5h3.3a1.6 1.6 0 0 1 1.55 1.2L9 10" fill="none" stroke="{col(e.fg)}" stroke-width="2.6" '
                f'stroke-linecap="round" stroke-linejoin="round"/>'
                f'<path d="M8.2 9.6h19.2a1.2 1.2 0 0 1 1.15 1.55l-2.7 8.9a1.9 1.9 0 0 1-1.82 1.35H13.1a1.9 1.9 0 0 1-1.84-1.42z"/>'
                f'<circle cx="13.6" cy="26.3" r="2.2"/><circle cx="23.4" cy="26.3" r="2.2"/></g></svg>')
    raise TypeError(e)


def page_html(p: Page, idx: int) -> str:
    if isinstance(p.bg, tuple):
        bg = _bg_css(None, p.bg)
    else:
        bg = _bg_css(p.bg, None)
    body = '\n'.join(el_html(e) for e in p.items)
    return (f'<section class="page" id="p{idx:02d}" data-slug="{p.slug}" data-group="{p.group}" '
            f'style="{bg}">\n{body}\n</section>')


def book_html(pages: list[Page]) -> str:
    css = f"""
@font-face {{ font-family: 'Jakarta'; src: url('file://{FONT_FILE}') format('truetype'); font-weight: 400 800; }}
@page {{ size: {W}px {H}px; margin: 0; }}
* {{ margin: 0; padding: 0; }}
html, body {{ background: #888; }}
body {{ font-family: 'Jakarta', ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing: antialiased;
       font-feature-settings: 'ss01' 0; }}
.page {{ position: relative; width: {W}px; height: {H}px; overflow: hidden; page-break-after: always;
        break-after: page; }}
.e {{ position: absolute; }}
.t {{ white-space: pre-line; overflow: visible; }}
"""
    pages_html = '\n'.join(page_html(p, i + 1) for i, p in enumerate(pages))
    return f'<!doctype html><html><head><meta charset="utf-8"><title>Mirza Cart: Brand Identity &amp; Ecommerce Showcase</title><style>{css}</style></head><body>\n{pages_html}\n</body></html>'


# ---------------------------------------------------------------- PPTX writer

def build_pptx(pages: list[Page], out: str):
    from pptx import Presentation
    from pptx.util import Emu, Pt
    from pptx.dml.color import RGBColor
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE
    from pptx.oxml.ns import qn
    from lxml import etree

    def E(px):
        return Emu(int(round(px * EMU)))

    def rgb(c):
        h = col(c).lstrip('#')
        return RGBColor.from_string(h.upper())

    def plain(shape):
        # Drop python-pptx's default theme style (it carries an effect reference that some renderers
        # draw as a shadow); every fill, line and effect is then explicit on the shape.
        st = shape._element.find(qn('p:style'))
        if st is not None:
            shape._element.remove(st)

    def add_shadow(shape, name):
        spPr = shape._element.spPr
        for old in spPr.findall(qn('a:effectLst')):
            spPr.remove(old)
        if not name:
            return
        x, y, b, a = SHADOWS[name]
        eff = etree.SubElement(spPr, qn('a:effectLst'))
        sh = etree.SubElement(eff, qn('a:outerShdw'), blurRad=str(int(b * EMU)), dist=str(int(math.hypot(x, y) * EMU)),
                              dir='5400000', algn='t', rotWithShape='0')
        clr = etree.SubElement(sh, qn('a:srgbClr'), val='100C28')
        etree.SubElement(clr, qn('a:alpha'), val=str(int(a * 100000)))

    def set_geom(spPr, w, h, radius, radii):
        geom = spPr.find(qn('a:prstGeom'))
        m = min(w, h)
        if radii:
            t, b = radii
            geom.set('prst', 'round2SameRect')
            av = geom.find(qn('a:avLst'))
            if av is None:
                av = etree.SubElement(geom, qn('a:avLst'))
            for c in list(av):
                av.remove(c)
            etree.SubElement(av, qn('a:gd'), name='adj1', fmla=f'val {int(min(50000, t / m * 100000))}')
            etree.SubElement(av, qn('a:gd'), name='adj2', fmla=f'val {int(min(50000, b / m * 100000))}')
        elif radius:
            geom.set('prst', 'roundRect')
            av = geom.find(qn('a:avLst'))
            if av is None:
                av = etree.SubElement(geom, qn('a:avLst'))
            for c in list(av):
                av.remove(c)
            etree.SubElement(av, qn('a:gd'), name='adj', fmla=f'val {int(min(50000, radius / m * 100000))}')

    def fill_grad(fill, grad):
        a, c1, c2 = grad
        fill.gradient()
        fill.gradient_angle = (90 - a) % 360
        st = fill.gradient_stops
        st[0].color.rgb = rgb(c1); st[0].position = 0.0
        st[1].color.rgb = rgb(c2); st[1].position = 1.0

    prs = Presentation()
    prs.slide_width = E(W)
    prs.slide_height = E(H)
    blank = prs.slide_layouts[6]

    for p in pages:
        s = prs.slides.add_slide(blank)
        bgfill = s.background.fill
        if isinstance(p.bg, tuple):
            fill_grad(bgfill, p.bg)
        else:
            bgfill.solid(); bgfill.fore_color.rgb = rgb(p.bg)

        for e in p.items:
            if isinstance(e, Rect):
                shp = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, E(e.x), E(e.y), E(e.w), E(e.h))
                set_geom(shp._element.spPr, e.w, e.h, e.radius, e.radii)
                if e.grad:
                    fill_grad(shp.fill, e.grad)
                elif e.fill:
                    shp.fill.solid(); shp.fill.fore_color.rgb = rgb(e.fill)
                else:
                    shp.fill.background()
                if e.stroke:
                    shp.line.color.rgb = rgb(e.stroke); shp.line.width = E(e.stroke_w)
                    if e.dashed:
                        from pptx.enum.dml import MSO_LINE_DASH_STYLE
                        shp.line.dash_style = MSO_LINE_DASH_STYLE.DASH
                else:
                    shp.line.fill.background()
                plain(shp)
                add_shadow(shp, e.shadow)
                shp.text_frame.text = ''
                if e.name:
                    shp.name = e.name
            elif isinstance(e, Text):
                tb = s.shapes.add_textbox(E(e.x), E(e.y), E(e.w), E(max(e.h, 10)))
                tf = tb.text_frame
                tf.word_wrap = True
                tf.auto_size = MSO_AUTO_SIZE.NONE
                tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
                tf.vertical_anchor = MSO_ANCHOR.TOP
                lh = e.lh or round(e.size * 1.3)
                txt = e.text.upper() if e.upper else e.text
                for i, line in enumerate(txt.split('\n')):
                    para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
                    para.alignment = {'left': PP_ALIGN.LEFT, 'center': PP_ALIGN.CENTER, 'right': PP_ALIGN.RIGHT}[e.align]
                    para.line_spacing = Pt(lh * 0.5)
                    r = para.add_run()
                    r.text = line
                    f = r.font
                    f.name = FONT
                    f.size = Pt(e.size * 0.5)
                    f.bold = e.weight >= 600
                    f.color.rgb = rgb(e.color)
                    if e.ls:
                        r._r.get_or_add_rPr().set('spc', str(int(round(e.ls * e.size * 0.5 * 100))))
                if e.name:
                    tb.name = e.name
            elif isinstance(e, Img):
                sx, sy, sw, sh, Wsrc, Hsrc = resolve_crop(e)
                src = jpeg(e.src) if e.opaque else e.src
                pic = s.shapes.add_picture(src, E(e.x), E(e.y), E(e.w), E(e.h))
                pic.crop_left = sx / Wsrc
                pic.crop_top = sy / Hsrc
                pic.crop_right = max(0.0, 1 - (sx + sw) / Wsrc)
                pic.crop_bottom = max(0.0, 1 - (sy + sh) / Hsrc)
                set_geom(pic._element.spPr, e.w, e.h, e.radius, e.radii)
                if e.stroke:
                    pic.line.color.rgb = rgb(e.stroke); pic.line.width = E(1)
                add_shadow(pic, e.shadow)
                if e.name:
                    pic.name = e.name
            elif isinstance(e, Mark):
                k = e.size / 32
                box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, E(e.x), E(e.y), E(e.size), E(e.size))
                box.adjustments[0] = 8 / 32
                box.fill.solid(); box.fill.fore_color.rgb = rgb(e.bg)
                box.line.fill.background()
                plain(box)
                box.name = 'Mirza Cart mark (tile)'
                # The cart glyph of components/ui/BrandLogo.tsx, in its translate(3.4 3.6) scale(.79) frame.
                g = lambda px, py: (E(e.x + (3.4 + px * .79) * k), E(e.y + (3.6 + py * .79) * k))
                basket = [(8.4, 9.6), (27.4, 9.6), (28.3, 10), (28.55, 11.15), (25.85, 20.05), (25.2, 21), (24.03, 21.4),
                          (13.1, 21.4), (11.95, 21), (11.26, 19.98)]
                fb = s.shapes.build_freeform(*g(*basket[0]), scale=1.0)
                fb.add_line_segments([g(px, py) for px, py in basket[1:]], close=True)
                m = fb.convert_to_shape()
                m.fill.solid(); m.fill.fore_color.rgb = rgb(e.fg)
                m.line.fill.background()
                plain(m)
                m.name = 'Mirza Cart mark (basket)'
                handle = [(3.5, 6.5), (6.8, 6.5), (7.9, 6.95), (8.35, 7.7), (9, 10)]
                fb = s.shapes.build_freeform(*g(*handle[0]), scale=1.0)
                fb.add_line_segments([g(px, py) for px, py in handle[1:]], close=False)
                m = fb.convert_to_shape()
                m.fill.background()
                m.line.color.rgb = rgb(e.fg)
                m.line.width = E(2.6 * .79 * k)
                ln = m.line._get_or_add_ln()
                ln.set('cap', 'rnd')
                etree.SubElement(ln, qn('a:round'))
                plain(m)
                m.name = 'Mirza Cart mark (handle)'
                for cx in (13.6, 23.4):
                    x0, y0 = g(cx - 2.2, 26.3 - 2.2)
                    d = E(4.4 * .79 * k)
                    wheel = s.shapes.add_shape(MSO_SHAPE.OVAL, x0, y0, d, d)
                    wheel.fill.solid(); wheel.fill.fore_color.rgb = rgb(e.fg)
                    wheel.line.fill.background()
                    plain(wheel)
                    wheel.name = 'Mirza Cart mark (wheel)'
        # Speaker notes: the page title, so the deck is navigable in the outline.
        s.notes_slide.notes_text_frame.text = p.title
    cp = prs.core_properties
    cp.title = 'Mirza Cart: Brand Identity & Ecommerce Showcase'
    cp.author = 'Mirza Cart'
    cp.last_modified_by = 'Mirza Cart'
    cp.subject = 'Brand guidelines and storefront showcase'
    cp.keywords = ''
    cp.comments = ''
    import datetime
    now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0, tzinfo=None)
    cp.created = now
    cp.modified = now
    cp.revision = 1
    prs.save(out)


# ---------------------------------------------------------------- device mockups (composites of primitives)

def phone(x, y, w, src, scroll=0, shadow='device', time='9:41', dsf=3):
    """A frameless-looking modern phone: dark bezel, status bar, the real 390 x 844 capture below it."""
    b = w * 0.032
    ws = w - 2 * b
    k = ws / 390
    sb = 46 * k
    hs = sb + 844 * k
    R = w * 0.155
    Rs = R - b
    h = hs + 2 * b
    els = [
        Rect(x, y, w, h, fill=DEVICE, radius=R, shadow=shadow, name='Phone frame'),
        Rect(x + b, y + b, ws, hs, fill='white', radius=Rs, name='Screen'),
        Text(x + b + 30 * k, y + b + 14 * k, 70 * k, 20 * k, time, size=15 * k, weight=600, color='ink', lh=20 * k, align='center'),
        # signal / battery glyphs
        Rect(x + b + ws - 72 * k, y + b + 19 * k, 4 * k, 8 * k, fill='ink', radius=1),
        Rect(x + b + ws - 66 * k, y + b + 17 * k, 4 * k, 10 * k, fill='ink', radius=1),
        Rect(x + b + ws - 60 * k, y + b + 15 * k, 4 * k, 12 * k, fill='ink', radius=1),
        Rect(x + b + ws - 50 * k, y + b + 15 * k, 24 * k, 12 * k, fill=None, stroke='ink', stroke_w=max(1, 1.2 * k), radius=3.5 * k),
        Rect(x + b + ws - 48 * k, y + b + 17 * k, 17 * k, 8 * k, fill='ink', radius=2 * k),
        Img(x + b, y + b + sb, ws, 844 * k, src, crop=(0, scroll * dsf, 390 * dsf), radii=(0, Rs), name='Screenshot'),
        Rect(x + w / 2 - 54 * k, y + b + 10 * k, 108 * k, 30 * k, fill=DEVICE, radius=15 * k, name='Camera island'),
        Rect(x + w / 2 - 66 * k, y + b + hs - 12 * k, 132 * k, 5 * k, fill='ink', radius=2.5 * k, name='Home indicator'),
    ]
    return els, h


def phone_h(w):
    b = w * 0.032
    k = (w - 2 * b) / 390
    return (46 + 844) * k + 2 * b


def screen_card(x, y, w, src, scroll=0, h=None, dsf=3, shadow='card'):
    """A frameless rounded screen, as in floating UI-kit showcases."""
    k = w / 390
    h = h or 844 * k
    return [Img(x, y, w, h, src, crop=(0, scroll * dsf, 390 * dsf), radius=26 * k, shadow=shadow, stroke='line', name='Screen')]


def browser(x, y, w, src, scroll=0, h=None, vw=1440, dsf=2, shadow='device'):
    k = w / vw
    cb = 44 * k
    vh = (h - cb) / k if h else 900
    h = h or cb + 900 * k
    r = 14 * k
    els = [
        Rect(x, y, w, h, fill='white', radius=r, shadow=shadow, name='Browser window'),
        Rect(x, y, w, cb, fill=CHROME_BAR, radii=(r, 0), name='Browser bar'),
    ]
    for i, c in enumerate(['#FF5F57', '#FEBC2E', '#28C840']):
        d = 12 * k
        els.append(Rect(x + 20 * k + i * 20 * k, y + cb / 2 - d / 2, d, d, fill=c, radius=d / 2))
    pw = min(560 * k, w * 0.42)
    els.append(Rect(x + w / 2 - pw / 2, y + cb / 2 - 13 * k, pw, 26 * k, fill='white', radius=8 * k, name='Address bar'))
    els.append(Img(x, y + cb, w, h - cb, src, crop=(0, scroll * dsf, vw * dsf), radii=(0, r), name='Screenshot'))
    return els, h


def tablet(x, y, w, src, scroll=0, shadow='device', dsf=2):
    b = w * 0.035
    ws = w - 2 * b
    k = ws / 820
    hs = 1180 * k
    R = w * 0.06
    els = [
        Rect(x, y, w, hs + 2 * b, fill=DEVICE, radius=R, shadow=shadow, name='Tablet frame'),
        Img(x + b, y + b, ws, hs, src, crop=(0, scroll * dsf, 820 * dsf), radius=R - b * 0.9, name='Screenshot'),
    ]
    return els, hs + 2 * b

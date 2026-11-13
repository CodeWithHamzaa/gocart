"""Mirza Cart brand kit: the pages of the book (content + layout). See kit.py for the primitives.

Facts on these pages come from the repository and the live test storefront:
  colours, radii, shadows   app/globals.css (@theme tokens)
  typeface and type scale   app/(public)/layout.jsx, app/fonts, computed styles on the test site
  logo                      components/ui/BrandLogo.tsx, app/icon.svg
  badges                    components/ui/Badge.tsx
  photography direction     docs/assets/PHOTO_BRIEF.md
  copy quoted as "voice"    the storefront itself (hero, COD steps, footer tagline)
Anything that is guidance rather than an observed fact is worded as a recommendation.
"""
import json
import os

from kit import (SHOTS, C, Rect, Text, Img, Mark, Page, phone, phone_h, screen_card, browser, tablet,
                 shot, photo, wordmark, wordmark_width, W, H)

TOTAL = 26

with open(os.path.join(SHOTS, 'desktop', 'home-sections.json')) as _f:
    SECTIONS = json.load(_f)


def section_panel(x, y, w, key, css_h=None, pad=36, shadow='card'):
    """A floating crop of one homepage section, taken from the full-page desktop capture."""
    sec = SECTIONS[key]
    css_h = css_h or sec['h'] + 2 * pad
    return Img(x, y, w, w * css_h / 1440, shot('desktop', 'home-full'), crop=(0, (sec['y'] - pad) * 2, 2880),
               radius=20, shadow=shadow, stroke='line')
M = 120  # outer margin


def chrome(p: Page, n: int, section: str, dark=False):
    fg = 'white' if dark else 'ink'
    sub = '#B9B6C6' if dark else 'muted'
    p.add(
        Mark(M, 56, 28, bg='white' if dark else 'primary', fg='primary' if dark else 'white'),
        *wordmark(M + 38, 58, 20, color=fg, h=26),
        Text(W - M - 600, 62, 600, 20, f'{n:02d}  ·  {section}', size=13, weight=600, color=sub, lh=20, ls=0.12, upper=True, align='right'),
        Text(M, H - 64, 600, 20, 'Brand Identity & Ecommerce Showcase', size=13, weight=500, color=sub, lh=20),
        Text(W - M - 200, H - 64, 200, 20, f'{n:02d} / {TOTAL}', size=13, weight=500, color=sub, lh=20, align='right'),
    )


def heading(p, eyebrow, title, caption=None, x=M, y=150, w=760, size=56, dark=False):
    p.add(Text(x, y, w, 20, eyebrow, size=14, weight=600, color='#B9A9FF' if dark else 'primary', lh=20, ls=0.12, upper=True))
    lines = title.count('\n') + 1
    lh = round(size * 1.1)
    p.add(Text(x, y + 34, w, lh * lines, title, size=size, weight=600, color='white' if dark else 'ink', lh=lh, ls=-0.03))
    if caption:
        p.add(Text(x, y + 34 + lh * lines + 22, w, 90, caption, size=20, weight=400, color='#C9C6D4' if dark else 'ink-2', lh=30))


def label(x, y, w, text, color='muted', size=13):
    return Text(x, y, w, 18, text, size=size, weight=600, color=color, lh=18, ls=0.12, upper=True)


def body(x, y, w, h, text, size=18, color='ink-2', lh=None, weight=400):
    return Text(x, y, w, h, text, size=size, weight=weight, color=color, lh=lh or round(size * 1.55))


def hexrgb(hx):
    h = hx.lstrip('#')
    return f'RGB {int(h[0:2], 16)} {int(h[2:4], 16)} {int(h[4:6], 16)}'


def swatch(x, y, w, h, token, usage=None, big=False):
    hx = C[token]
    light = token in ('page', 'surface', 'surface-muted', 'line', 'line-2', 'accent-soft', 'accent', 'sale-soft', 'success-soft', 'amber', 'line-3')
    els = [Rect(x, y, w, h, fill='surface', radius=16, stroke='line', name=f'Swatch card {token}')]
    ch = h - (150 if big else 92)
    els.append(Rect(x + 8, y + 8, w - 16, ch - 8, fill=hx, radius=10, stroke='line' if light else None, name=f'Swatch {token}'))
    ty = y + ch + 14
    els.append(Text(x + 18, ty, w - 36, 22, token, size=17 if big else 15, weight=600, color='ink', lh=22))
    els.append(Text(x + 18, ty + 26, w - 36, 18, f'{hx}   {hexrgb(hx)}', size=13, weight=500, color='muted', lh=18))
    if usage:
        els.append(Text(x + 18, ty + 52, w - 36, 60, usage, size=14, weight=400, color='ink-2', lh=20))
    return els


def build_pages():
    pages = []

    # 01 Cover --------------------------------------------------------------------------------
    p = Page('cover', 'Cover', 'brand', bg=(135, 'accent-soft', 'page'))
    p.add(Mark(M, 120, 64))
    p.add(Text(M, 330, 700, 20, 'Brand identity & ecommerce showcase', size=16, weight=600, color='primary', lh=20, ls=0.12, upper=True))
    p.add(wordmark(M - 6, 376, 132, h=170))
    p.add(body(M, 580, 600, 120, 'Electronics, fashion, home and beauty, delivered across Pakistan. Pay in cash when your order arrives.', size=24, lh=36))
    p.add(Rect(M, 760, 600, 1, fill='line-3'))
    p.add(Text(M, 784, 640, 60, 'Responsive storefront  ·  Cash on Delivery  ·  Guest checkout\nNext.js  ·  Payload CMS  ·  PostgreSQL', size=16, weight=500, color='muted', lh=28))
    els, bh = browser(800, 170, 1000, shot('desktop', 'home-hero'))
    p.add(els)
    els, _ = phone(1560, 420, 290, shot('mobile', 'home-hero'))
    p.add(els)
    pages.append(p)

    # 02 Contents -----------------------------------------------------------------------------
    p = Page('contents', 'Contents', 'brand', bg='page')
    chrome(p, 2, 'Contents')
    heading(p, 'Inside', 'Contents', 'A brand guide and a visual tour of the live Mirza Cart storefront, on desktop, tablet and phone.', y=170, w=600)
    groups = [
        ('Brand', [('03', 'Introduction'), ('04', 'Positioning & personality'), ('05', 'Logo'), ('06', 'Logo usage'),
                   ('07', 'Colour: core palette'), ('08', 'Colour: supporting palette'), ('09', 'Typeface'), ('10', 'Type hierarchy')]),
        ('Visual identity', [('11', 'Photography'), ('12', 'Interface language'), ('13', 'Components'), ('14', 'Brand in use'),
                             ('25', "Do's and don'ts")]),
        ('Showcase', [('15', 'Desktop: homepage'), ('16', 'Desktop: homepage sections'), ('17', 'Desktop: shopping'),
                      ('18', 'Desktop: product detail'), ('19', 'Desktop: cart & wishlist'), ('20', 'Mobile: homepage'),
                      ('21', 'Mobile: shopping'), ('22', 'Mobile: product'), ('23', 'Mobile: shopping journey'), ('24', 'Responsive')]),
    ]
    gx = 720
    for title, items in groups:
        p.add(label(gx, 200, 300, title, color='primary'))
        for i, (num, name) in enumerate(items):
            yy = 244 + i * 64
            p.add(Rect(gx, yy, 300, 1, fill='line-2'))
            p.add(Text(gx, yy + 18, 40, 24, num, size=16, weight=600, color='muted', lh=24))
            p.add(Text(gx + 48, yy + 18, 260, 24, name, size=18, weight=500, color='ink', lh=24))
        gx += 360
    pages.append(p)

    # 03 Introduction -------------------------------------------------------------------------
    p = Page('introduction', 'Brand introduction', 'brand', bg='page')
    chrome(p, 3, 'Introduction')
    heading(p, 'Brand overview', 'Everyday shopping,\nmade calm and certain.', y=160, w=820, size=60)
    p.add(body(M, 370, 700, 170,
               'Mirza Cart is a single-store online shop for Pakistan. It sells a curated range of electronics, fashion, '
               'home and beauty products, delivers nationwide and lets every customer pay in cash when the parcel arrives. '
               'No account is needed to order.', size=20, lh=32))
    p.add(Rect(M, 570, 700, 150, fill='accent-soft', radius=24))
    p.add(label(M + 32, 598, 600, 'Short description', color='primary'))
    p.add(Text(M + 32, 630, 640, 80, 'Electronics, fashion, home and beauty, delivered across Pakistan. Pay in cash when your order arrives.',
               size=22, weight=600, color='ink', lh=32, ls=-0.01))
    p.add(label(M, 760, 700, 'Visual direction'))
    p.add(body(M, 790, 700, 120, 'Clean, neutral surfaces so product photography reads true; one confident violet for every action; a deep aubergine for depth; '
                                 'a single modern sans-serif; soft 16 to 24 px corners; hairlines instead of heavy borders.', size=18, lh=30))
    tiles = ['amber-oud-eau-de-parfum-1', 'aero-wave-wireless-headphones-1', 'everyday-faux-leather-tote-1',
             'pulse-active-smart-watch-1', 'arc-table-lamp-1', 'aloe-hydrating-gel-cream-1']
    tx, ty, ts = 940, 160, 270
    for i, t in enumerate(tiles):
        p.add(Img(tx + (i % 3) * (ts + 20), ty + (i // 3) * (ts + 20) + (40 if i % 3 == 1 else 0), ts, ts, photo(t), radius=20))
    p.add(Text(tx, 790, 850, 40, 'Real catalogue photography from the storefront.', size=14, weight=500, color='muted', lh=20))
    pages.append(p)

    # 04 Positioning & personality -------------------------------------------------------------
    p = Page('positioning', 'Positioning & personality', 'brand', bg='page')
    chrome(p, 4, 'Positioning & personality')
    p.add(Rect(M, 150, 820, 400, fill='inverse', radius=24))
    p.add(Text(M + 48, 196, 700, 20, 'Positioning', size=14, weight=600, color='#B9A9FF', lh=20, ls=0.12, upper=True))
    p.add(Text(M + 48, 236, 720, 200, 'For shoppers across Pakistan who want good everyday products without risk, Mirza Cart is the online store '
                                      'where you order in a minute and pay only when it arrives.', size=34, weight=600, color='white', lh=46, ls=-0.02))
    p.add(Text(M + 48, 470, 720, 60, 'Single store  ·  Curated catalogue  ·  Cash on Delivery  ·  Nationwide delivery', size=16, weight=500, color='#B9B6C6', lh=24))
    promises = [('Cash on delivery', 'Pay the courier in cash when the parcel arrives. No card needed.'),
                ('Delivery across Pakistan', 'Rs. 200 delivery, free on orders of Rs. 1,500 or more.'),
                ('No account needed', 'Order with your name, phone number and address. Track it with your order number.')]
    for i, (t, d) in enumerate(promises):
        x = M + i * 280
        p.add(Rect(x, 580, 260, 220, fill='surface', radius=20, stroke='line'))
        p.add(Rect(x + 24, 606, 40, 40, fill='accent-soft', radius=20))
        p.add(Text(x + 24, 616, 40, 20, str(i + 1), size=16, weight=700, color='primary', lh=20, align='center'))
        p.add(Text(x + 24, 664, 220, 26, t, size=19, weight=600, color='ink', lh=26))
        p.add(body(x + 24, 698, 216, 100, d, size=15, lh=23))
    p.add(Text(M, 824, 820, 40, 'The three promises shown in the storefront footer and order steps.', size=14, weight=500, color='muted', lh=20))
    px = 1010
    p.add(label(px, 156, 600, 'Personality', color='primary'))
    traits = [('Clear', 'Prices, delivery cost and stock are visible before you tap anything.'),
              ('Trustworthy', 'Cash on delivery, no account, honest discounts. Nothing hidden.'),
              ('Modern', 'A clean, photo-first interface with generous space and one accent colour.'),
              ('Warm', 'Plain, friendly words. The store talks like a helpful shopkeeper, not a bank.')]
    for i, (t, d) in enumerate(traits):
        y = 196 + i * 112
        p.add(Rect(px, y, 790, 1, fill='line-2'))
        p.add(Text(px, y + 24, 230, 40, t, size=32, weight=600, color='ink', lh=40, ls=-0.02))
        p.add(body(px + 250, y + 26, 540, 70, d, size=17, lh=26))
    p.add(label(px, 666, 600, 'Voice, in the store\'s own words', color='primary'))
    quotes = ['"Order now, pay when it arrives"', '"No account needed: just your name, phone number and address."',
              '"Pay the courier when your parcel arrives."']
    for i, q in enumerate(quotes):
        p.add(Text(px, 706 + i * 46, 790, 34, q, size=21, weight=500, color='ink', lh=30))
    pages.append(p)

    # 05 Logo ---------------------------------------------------------------------------------
    p = Page('logo', 'Logo', 'brand', bg='page')
    chrome(p, 5, 'Logo')
    heading(p, 'Primary logo', 'The Mirza Cart lockup', 'An abstract shopping cart (a filled, forward-leaning basket, a short handle, two wheels) on a violet tile, beside the name in Plus Jakarta Sans: "Mirza" heavy, "Cart" medium.', y=150, w=760)
    p.add(Rect(M, 400, 1040, 520, fill='surface', radius=24, stroke='line', name='Logo panel'))
    ms = 150
    lx = M + 520 - (ms + 30 + wordmark_width(118)) / 2
    p.add(Mark(lx, 660 - ms / 2, ms))
    p.add(wordmark(lx + ms + 30, 660 - 70, 118, h=140))
    vx = 1200
    cards = [('Icon only', 'Favicon, app icon, phone header', 'mark'), ('Lockup, inverse', 'Footer and dark surfaces', 'inverse'),
             ('Stacked', 'Square spaces, social avatars', 'tint')]
    for i, (t, d, kind) in enumerate(cards):
        y = 150 + i * 262
        bgc = {'mark': 'surface-muted', 'inverse': 'inverse', 'tint': 'surface'}[kind]
        p.add(Rect(vx, y, 600, 240, fill=bgc, radius=24, stroke='line' if kind != 'inverse' else None))
        if kind == 'mark':
            p.add(Mark(vx + 300 - 48, y + 54, 96))
        elif kind == 'inverse':
            lw = 64 + 18 + wordmark_width(50)
            p.add(Mark(vx + 300 - lw / 2, y + 64, 64, bg='white', fg='primary'))
            p.add(wordmark(vx + 300 - lw / 2 + 82, y + 64, 50, color='white', h=64))
        else:
            p.add(Mark(vx + 300 - 36, y + 34, 72))
            p.add(wordmark(vx, y + 114, 38, center_w=600, h=48))
        tc = 'white' if kind == 'inverse' else 'ink'
        p.add(Text(vx + 28, y + 178, 300, 22, t, size=16, weight=600, color=tc, lh=22))
        p.add(Text(vx + 28, y + 202, 400, 20, d, size=14, weight=400, color='#B9B6C6' if kind == 'inverse' else 'muted', lh=20))
    pages.append(p)

    # 06 Logo usage ---------------------------------------------------------------------------
    p = Page('logo-usage', 'Logo usage', 'brand', bg='page')
    chrome(p, 6, 'Logo usage')
    heading(p, 'Logo usage', 'Space, size and backgrounds', y=150, w=900)
    # clear space
    p.add(Rect(M, 300, 820, 470, fill='surface', radius=24, stroke='line'))
    p.add(label(M + 32, 328, 400, 'Clear space'))
    ms = 112
    cx0, cy0 = M + 100, 470
    pad = ms * 0.5
    lw = ms + 22 + wordmark_width(84) + 16
    p.add(Rect(cx0 - pad, cy0 - pad, lw + 2 * pad, ms + 2 * pad, fill='accent-soft', radius=0, stroke='primary', dashed=True, stroke_w=1.5))
    p.add(Rect(cx0, cy0, lw, ms, fill='surface', radius=0, stroke='line-3', dashed=True))
    p.add(Mark(cx0, cy0, ms))
    p.add(wordmark(cx0 + ms + 22, cy0 + 6, 84, h=100))
    p.add(Text(cx0 - pad, cy0 - pad - 26, 200, 18, '½ × mark', size=13, weight=600, color='primary', lh=18))
    p.add(body(M + 32, 690, 760, 60, 'Keep a margin of at least half the mark\'s height on every side. Nothing else (text, photos, edges) enters it.', size=16, lh=24))
    # min size
    x2 = 980
    p.add(Rect(x2, 300, 820, 220, fill='surface', radius=24, stroke='line'))
    p.add(label(x2 + 32, 328, 400, 'Minimum size'))
    p.add(Mark(x2 + 40, 380, 28)); p.add(wordmark(x2 + 78, 380, 22, h=28))
    p.add(Text(x2 + 40, 430, 300, 40, 'Lockup: 28 px mark\n(the storefront header uses 32 px)', size=13, weight=500, color='muted', lh=19))
    p.add(Mark(x2 + 400, 380, 16))
    p.add(Text(x2 + 400, 430, 360, 40, 'Mark alone: 16 px\n(the favicon size)', size=13, weight=500, color='muted', lh=19))
    # backgrounds
    p.add(Rect(x2, 540, 820, 230, fill='surface', radius=24, stroke='line'))
    p.add(label(x2 + 32, 568, 400, 'Approved backgrounds'))
    bgs = [('page', 'lock'), ('surface', 'lock'), ('surface-muted', 'lock'), ('inverse', 'word')]
    for i, (b, kind) in enumerate(bgs):
        bx = x2 + 32 + i * 192
        p.add(Rect(bx, 606, 176, 110, fill=b, radius=14, stroke='line' if b != 'inverse' else None))
        if kind == 'lock':
            p.add(Mark(bx + 16, 648, 26)); p.add(wordmark(bx + 50, 647, 19, h=28))
        else:
            p.add(Mark(bx + 16, 648, 26, bg='white', fg='primary')); p.add(wordmark(bx + 50, 647, 19, color='white', h=28))
        p.add(Text(bx, 724, 176, 18, C[b], size=12, weight=500, color='muted', lh=18, align='center'))
    p.add(body(M, 800, 1680, 60, 'On the aubergine surface the tile turns white and the cart violet, with a white wordmark, as the storefront footer does. '
                                 'The mark works alone wherever space is tight (favicon, app icon). The store name in the lockup comes from the admin Settings, so a renamed store renames the logo.', size=16, lh=26))
    pages.append(p)

    # 07 Colour core --------------------------------------------------------------------------
    p = Page('colour-core', 'Colour: core palette', 'brand', bg='page')
    chrome(p, 7, 'Colour')
    heading(p, 'Colour', 'Core palette', 'Every colour below is a design token in the storefront (app/tokens.css). Clean neutral surfaces let the photos speak; violet marks every action; aubergine adds depth.', y=150, w=1100)
    p.add(swatch(M, 360, 480, 270, 'primary', 'The one action colour: buttons, links, selected states, focus rings, the logo tile. White on it: 6.04:1.', big=True))
    p.add(swatch(M, 650, 480, 270, 'inverse', 'Deep aubergine: the one dark surface (footer). White on it: 13.73:1.', big=True))
    sx = M + 510
    for i, (t, u) in enumerate([('primary-dark', 'Hover and pressed states.'), ('accent', 'Soft fills, decorative tints.'), ('accent-soft', 'Soft buttons, selected chips, banner tint.')]):
        p.add(swatch(sx + i * 397, 360, 377, 270, t, u))
    for i, (t, u) in enumerate([('ink', 'Headings, prices, wordmark.'), ('ink-2', 'Body copy.'), ('ink-3', 'Secondary copy.'), ('muted', 'Captions, meta.'), ('disabled', 'Disabled controls.')]):
        p.add(swatch(sx + i * 238, 650, 222, 270, t, u))
    pages.append(p)

    # 08 Colour supporting ----------------------------------------------------------------------
    p = Page('colour-supporting', 'Colour: supporting palette', 'brand', bg='page')
    chrome(p, 8, 'Colour')
    heading(p, 'Colour', 'Surfaces, lines and status', y=150, w=1100)
    p.add(label(M, 290, 600, 'Surfaces and lines'))
    surf = [('page', 'Page'), ('surface', 'Cards'), ('surface-muted', 'Image wells'), ('line', 'Card hairline'), ('line-2', 'Dividers'), ('line-3', 'Hover line'), ('line-input', 'Form fields')]
    for i, (t, u) in enumerate(surf):
        p.add(swatch(M + i * 242, 318, 226, 230, t, u))
    p.add(label(M, 580, 600, 'Status'))
    st = [('sale', 'Discount text'), ('sale-strong', 'Sale label'), ('sale-soft', 'Discount chip'), ('amber', 'Limited edition'), ('success', 'In stock'), ('success-soft', 'Success tint')]
    for i, (t, u) in enumerate(st):
        p.add(swatch(M + i * 242, 608, 226, 230, t, u))
    # contrast
    cx = M + 6 * 242
    p.add(Rect(cx, 608, 226, 230, fill='surface', radius=16, stroke='line'))
    p.add(Text(cx + 18, 624, 200, 18, 'Contrast (WCAG)', size=13, weight=600, color='muted', lh=18, ls=0.12, upper=True))
    pairs = [('white', 'primary', '6.04:1'), ('white', 'inverse', '13.73:1'), ('ink', 'page', '14.71:1'), ('muted', 'surface-muted', '5.34:1'), ('sale', 'page', '6.88:1')]
    for i, (fg, bg, r) in enumerate(pairs):
        y = 656 + i * 34
        p.add(Rect(cx + 18, y, 54, 26, fill=bg, radius=6, stroke='line' if bg in ('accent-soft', 'surface-muted', 'sale-soft', 'page') else None))
        p.add(Text(cx + 18, y + 3, 54, 20, 'Aa', size=14, weight=600, color=fg, lh=20, align='center'))
        p.add(Text(cx + 84, y + 3, 130, 20, r, size=14, weight=600, color='ink', lh=20))
    p.add(body(M, 870, 1680, 60, 'Sale colours are for real discounts only, amber only for "Limited edition". Cards use a hairline, not a shadow.', size=16, lh=26))
    pages.append(p)

    # 09 Typeface -----------------------------------------------------------------------------
    p = Page('typeface', 'Typeface', 'brand', bg='page')
    chrome(p, 9, 'Typography')
    p.add(Rect(M, 150, 820, 770, fill='surface', radius=24, stroke='line'))
    p.add(Text(M + 48, 170, 700, 420, 'Aa', size=380, weight=600, color='ink', lh=420, ls=-0.04))
    p.add(Text(M + 48, 610, 700, 50, 'Plus Jakarta Sans', size=44, weight=600, color='ink', lh=50, ls=-0.03))
    p.add(body(M + 48, 676, 720, 100, 'The one typeface of the storefront: a geometric, friendly sans-serif with open shapes. '
                                     'Self-hosted variable font (weights 400 to 800), SIL Open Font License.', size=17, lh=27))
    p.add(Text(M + 48, 800, 720, 90, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz  0123456789  Rs. 4,499', size=22, weight=500, color='ink-3', lh=36))
    x2 = 980
    heading(p, 'Typography', 'One family,\nfour weights.', 'There is no secondary typeface. Hierarchy comes from size, weight and tight tracking on headings.', x=x2, y=150, w=820, size=56)
    weights = [(400, 'Regular', 'Body copy, descriptions'), (500, 'Medium', 'Announcement bar, small labels'),
               (600, 'SemiBold', 'Headings, buttons, prices, nav'), (800, 'ExtraBold', 'The wordmark ("Mirza")')]
    for i, (wt, n, u) in enumerate(weights):
        y = 520 + i * 100
        p.add(Rect(x2, y, 820, 1, fill='line-2'))
        p.add(Text(x2, y + 22, 300, 50, n, size=40, weight=wt, color='ink', lh=50, ls=-0.02))
        p.add(Text(x2 + 330, y + 26, 80, 20, str(wt), size=15, weight=600, color='primary', lh=20))
        p.add(Text(x2 + 420, y + 26, 400, 44, u, size=16, weight=400, color='ink-2', lh=22))
    pages.append(p)

    # 10 Type hierarchy -----------------------------------------------------------------------
    p = Page('type-hierarchy', 'Type hierarchy', 'brand', bg='page')
    chrome(p, 10, 'Typography')
    heading(p, 'Type hierarchy', 'Measured on the live storefront', y=150, w=1200, size=48)
    rows = [
        ('Hero heading', 'Deals on headphones and fragrances', 48, 52, 600, -0.03, 'ink', '48 / 52  SemiBold  −3%', 'Phone: 28 / 34'),
        ('Section heading', 'Limited-time deals', 36, 40, 600, -0.03, 'ink', '36 / 40  SemiBold  −3%', 'Phone: 24 / 30'),
        ('Price', 'Rs. 4,499', 28, 28, 600, -0.02, 'ink', '28 / 28  SemiBold  −2%', 'Product page'),
        ('Wordmark', 'Mirza Cart', 22, 30, 800, -0.03, 'ink', '22 / 30  ExtraBold + Medium  −3%', 'Header'),
        ('Lead', 'Up to 36% off. Pay cash on delivery.', 18, 26, 400, 0, 'ink-2', '18 / 26  Regular', 'Phone: 16 / 24'),
        ('Product name', 'Aero Wave Wireless Headphones', 16, 24, 600, 0, 'ink', '16 / 24  SemiBold', 'Phone: 14 / 20'),
        ('Body', 'Picked by the store, across every category.', 16, 24, 400, 0, 'muted', '16 / 24  Regular', 'Phone: 14 / 20'),
        ('Navigation', 'Headphones · Speakers · Power Banks · Watches', 14, 20, 600, 0, 'ink-2', '14 / 20  SemiBold', ''),
        ('Eyebrow', 'SAVE UP TO 36%', 12, 16, 600, 0.12, 'sale', '12 / 16  SemiBold  +12%  caps', ''),
    ]
    y = 282
    for name, sample, sz, lh, wt, ls, c, spec, note in rows:
        rh = max(lh, 24) + 34
        p.add(Rect(M, y, 1680, 1, fill='line-2'))
        p.add(Text(M, y + 18, 220, 20, name, size=14, weight=600, color='muted', lh=20, ls=0.06, upper=True))
        p.add(Text(M + 250, y + 16, 900, lh, sample, size=sz, weight=wt, color=c, lh=lh, ls=ls))
        p.add(Text(M + 1200, y + 18, 300, 20, spec, size=15, weight=600, color='ink', lh=20))
        p.add(Text(M + 1500, y + 18, 180, 20, note, size=14, weight=400, color='muted', lh=20))
        y += rh
    p.add(Text(M, y + 16, 1680, 20, 'Buttons: 16 / 24 SemiBold (hero), 14 / 20 SemiBold (product page). Body text never goes below 12 px.', size=15, weight=500, color='ink-2', lh=20))
    pages.append(p)

    # 11 Photography --------------------------------------------------------------------------
    p = Page('photography', 'Photography', 'brand', bg='page')
    chrome(p, 11, 'Visual identity')
    heading(p, 'Photography', 'One product,\none calm frame.', y=150, w=620, size=56)
    rules = [('Studio light', 'Soft, diffused side light with a gentle, natural shadow. No heavy filters or HDR.'),
             ('Neutral backdrop', 'Seamless white to warm light grey. Colour comes from the product, not the backdrop.'),
             ('Square and centred', 'One product per frame, filling 65 to 75% of a square, with a margin so nothing is cropped.'),
             ('Unbranded', 'No logos, readable labels or recognisable designs; no people or faces.')]
    for i, (t, d) in enumerate(rules):
        y = 360 + i * 120
        p.add(Rect(M, y, 560, 1, fill='line-2'))
        p.add(Text(M, y + 20, 560, 26, t, size=20, weight=600, color='ink', lh=26))
        p.add(body(M, y + 52, 560, 60, d, size=16, lh=24))
    grid = ['aero-wave-wireless-headphones-1', 'round-frame-sunglasses-1', 'amber-oud-eau-de-parfum-1', 'metro-canvas-backpack-1',
            'dome-desk-lamp-1', 'glass-storage-jar-set-1', 'pilot-frame-sunglasses-1', 'aloe-hydrating-gel-cream-1',
            'nonstick-frying-pan-1', 'pulse-active-smart-watch-1', 'everyday-faux-leather-tote-1', 'capsule-portable-bluetooth-speaker-1']
    gx, gy, gs, gg = 790, 150, 236, 18
    for i, t in enumerate(grid):
        p.add(Img(gx + (i % 4) * (gs + gg), gy + (i // 4) * (gs + gg), gs, gs, photo(t), radius=16))
    p.add(Text(gx, gy + 3 * (gs + gg) + 4, 1000, 20, 'Product photos are shown on a neutral well (#F1F2F5) inside cards. Category images are 4:3 and appear as circles in the home shortcuts.', size=14, weight=500, color='muted', lh=20))
    pages.append(p)

    # 12 Interface language -------------------------------------------------------------------
    p = Page('interface-language', 'Interface language', 'brand', bg='page')
    chrome(p, 12, 'Visual identity')
    heading(p, 'Interface language', 'Shape, depth, actions', y=150, w=1100, size=48)
    # shape
    col1 = M
    p.add(label(col1, 280, 400, 'Corner radius'))
    shapes = [(12, 'Controls & fields', 200, 52), (16, 'Cards & tiles', 140, 140), (24, 'Panels & hero', 200, 140)]
    yy = 316
    p.add(Rect(col1, yy, 200, 52, fill='surface', radius=12, stroke='line-input'))
    p.add(Text(col1 + 16, yy + 16, 180, 20, 'Search products', size=15, weight=400, color='muted', lh=20))
    p.add(Text(col1 + 220, yy + 8, 300, 40, '12 px\nControls and fields', size=14, weight=500, color='ink-2', lh=20))
    p.add(Rect(col1, 392, 140, 140, fill='surface', radius=16, stroke='line'))
    p.add(Text(col1 + 160, 440, 300, 40, '16 px\nCards and tiles', size=14, weight=500, color='ink-2', lh=20))
    p.add(Rect(col1, 556, 200, 140, fill='accent-soft', radius=24))
    p.add(Text(col1 + 220, 604, 300, 40, '24 px\nPanels and the hero', size=14, weight=500, color='ink-2', lh=20))
    p.add(Rect(col1, 720, 200, 48, fill='primary', radius=24))
    p.add(Text(col1, 734, 200, 20, 'Pill', size=15, weight=600, color='white', lh=20, align='center'))
    p.add(Text(col1 + 220, 724, 300, 40, 'Full\nEvery button', size=14, weight=500, color='ink-2', lh=20))
    # depth
    col2 = 640
    p.add(label(col2, 280, 400, 'Elevation'))
    p.add(Rect(col2, 316, 260, 120, fill='surface', radius=16, stroke='line'))
    p.add(Text(col2 + 20, 360, 220, 40, 'Cards: hairline, no shadow', size=15, weight=600, color='ink', lh=20))
    for i, (sh, n) in enumerate([('chip', 'Chip  0 1 4'), ('float-sm', 'Float small  0 8 20'), ('float', 'Float  0 12 32')]):
        y = 466 + i * 104
        p.add(Rect(col2, y, 260, 80, fill='surface', radius=16, shadow=sh))
        p.add(Text(col2 + 20, y + 30, 230, 20, n, size=15, weight=600, color='ink', lh=20))
    p.add(Text(col2, 780, 300, 40, 'Shadows only for floating controls and bars; colour rgba(16, 12, 40).', size=13, weight=500, color='muted', lh=19))
    # actions
    col3 = 1000
    p.add(label(col3, 280, 400, 'Buttons'))
    p.add(Rect(col3, 316, 220, 48, fill='primary', radius=24)); p.add(Text(col3, 330, 220, 20, 'Add to cart', size=15, weight=600, color='white', lh=20, align='center'))
    p.add(Rect(col3 + 236, 316, 200, 48, fill='accent-soft', radius=24)); p.add(Text(col3 + 236, 330, 200, 20, 'Buy now', size=15, weight=600, color='primary', lh=20, align='center'))
    p.add(Rect(col3 + 452, 316, 240, 48, fill='surface', radius=24, stroke='line-3')); p.add(Text(col3 + 452, 330, 240, 20, 'Load more products', size=15, weight=600, color='ink', lh=20, align='center'))
    p.add(Text(col3, 376, 700, 20, 'Primary  ·  Secondary (soft)  ·  Quiet (outlined)', size=13, weight=500, color='muted', lh=20))
    p.add(label(col3, 430, 400, 'Labels'))
    badges = [('New', 'primary', 'white', None), ('Limited edition', 'amber', 'ink', None), ('Out of stock', 'surface', 'ink-2', 'line-2'),
              ('−30%', 'sale-soft', 'sale', None), ('In stock', 'success-soft', 'success', None)]
    bx = col3
    for t, bgc, fgc, st in badges:
        bw = 30 + len(t) * 8.6
        p.add(Rect(bx, 466, bw, 30, fill=bgc, radius=15, stroke=st))
        p.add(Text(bx, 472, bw, 18, t, size=13, weight=600, color=fgc, lh=18, align='center'))
        bx += bw + 12
    p.add(Text(col3, 508, 700, 20, 'Status and offer labels sit on the photo as small pills (components/ui/Badge.tsx).', size=13, weight=500, color='muted', lh=20))
    p.add(label(col3, 560, 400, 'Spacing'))
    for i, s in enumerate([4, 8, 12, 16, 24, 32, 48]):
        sx = col3 + sum(max(v, 24) + 28 for v in [4, 8, 12, 16, 24, 32, 48][:i])
        p.add(Rect(sx, 596 + (48 - s), s, s, fill='accent', radius=2))
        p.add(Text(sx - 6, 654, max(s, 24) + 12, 18, str(s), size=13, weight=600, color='ink-2', lh=18, align='center'))
    p.add(Text(col3, 684, 700, 40, 'A 4 px grid. Card padding 10 to 12 px, product grid gaps 12 px (phone) and 24 px (desktop).', size=13, weight=500, color='muted', lh=20))
    p.add(label(col3, 740, 400, 'Iconography'))
    p.add(Img(col3, 772, 800, 800 * 228 / 2400, shot('elements', 'trust-strip'), crop=(0, 0, 2400), radius=10))
    p.add(Text(col3, 856, 800, 40, 'Lucide outline icons at 14 to 24 px, mostly 1.4 to 2 px strokes, in ink tones or white on dark.', size=13, weight=500, color='muted', lh=20))
    pages.append(p)

    # 13 Components (real captures) ------------------------------------------------------------
    p = Page('components', 'Components', 'brand', bg='surface-muted')
    chrome(p, 13, 'Visual identity')
    heading(p, 'Components', 'Captured from the live store', 'Product cards, the header and promotional elements, exactly as shoppers see them.', y=130, w=900, size=44)
    cw = 300; chh = cw * 1200 / 906
    for i, n in enumerate(['card-limited', 'card-new', 'card-sale', 'card-out-of-stock']):
        p.add(Img(M + i * (cw + 24), 340, cw, chh, shot('elements', n), radius=16, shadow='float-sm'))
    p.add(Text(M, 340 + chh + 16, 1300, 20, 'Listing cards: photo first, category, name, price with the was-price and discount, a round add-to-cart button.', size=14, weight=500, color='muted', lh=20))
    rx = 1440
    p.add(Img(rx, 340, 360, 360 * 663 / 1896, shot('elements', 'promo-card'), radius=20, shadow='float-sm'))
    p.add(Text(rx, 340 + 360 * 663 / 1896 + 12, 360, 20, 'Promotional card', size=14, weight=500, color='muted', lh=20))
    p.add(Img(M, 790, 1680, 1680 * 243 / 4320, shot('elements', 'header'), radius=16, shadow='float-sm'))
    p.add(Text(M, 790 + 1680 * 243 / 4320 + 12, 1000, 20, 'Header: lockup, search, Shop, Track order, wishlist and cart.', size=14, weight=500, color='muted', lh=20))
    p.add(Img(rx, 600, 360, 360 * 504 / 3000, shot('elements', 'category-shortcuts'), radius=12, shadow='float-sm'))
    p.add(Text(rx, 600 + 360 * 504 / 3000 + 12, 360, 20, 'Category circles', size=14, weight=500, color='muted', lh=20))
    pages.append(p)

    # 14 Brand in use -------------------------------------------------------------------------
    p = Page('applications', 'Brand in use', 'brand', bg=(160, 'accent-soft', 'page'))
    chrome(p, 14, 'Brand applications')
    heading(p, 'Brand in use', 'One identity across\nthe whole store', y=150, w=640, size=52)
    p.add(body(M, 340, 560, 200, 'The header lockup, the violet actions, the soft hero panel and the photo-first cards repeat on every page, '
                                 'so a shopper always knows where they are, on any screen.', size=18, lh=29))
    hw = 1100
    p.add(Img(700, 150, hw, hw * 243 / 4320, shot('elements', 'header'), radius=14, shadow='float-sm'))
    p.add(Img(700, 240, hw, hw * 1686 / 4176, shot('elements', 'hero'), radius=22, shadow='float'))
    for i, n in enumerate(['card-new', 'card-limited']):
        p.add(Img(M + i * 270, 560, 250, 250 * 1200 / 906, shot('elements', n), radius=16, shadow='float-sm'))
    els, _ = phone(1540, 490, 220, shot('mobile', 'product-9'), shadow='device-sm')
    p.add(els)
    p.add(Img(700, 792, 600, 600 * 663 / 1896, shot('elements', 'promo-card'), radius=20, shadow='float-sm'))
    pages.append(p)

    # 15 Desktop homepage ---------------------------------------------------------------------
    p = Page('desktop-homepage', 'Desktop homepage', 'desktop', bg=(160, 'surface-muted', 'accent-soft'))
    chrome(p, 15, 'Desktop showcase')
    heading(p, 'Desktop · Homepage', 'A storefront that\nleads with the product', 'A moving announcement bar, a search-first header with Track order, a product-led banner and category circles, all above the fold.', y=150, w=560, size=48)
    els, bh = browser(M, 520, 560, shot('desktop', 'home-hero-slide2'), shadow='device-sm')
    p.add(els)
    els, bh = browser(740, 150, 1060, shot('desktop', 'home-full'), h=840)
    p.add(els)
    pages.append(p)

    # 16 Desktop homepage sections ------------------------------------------------------------
    p = Page('desktop-home-sections', 'Desktop homepage sections', 'desktop', bg='page')
    chrome(p, 16, 'Desktop showcase')
    heading(p, 'Desktop · Homepage', 'Deals, featured picks\nand promotions', y=150, w=700, size=48)
    p.add(Text(M, 330, 560, 120, 'Limited-time deals with their end date, an admin-curated Featured grid with category tabs, and two promotional cards that link to sales.', size=18, weight=400, color='ink-2', lh=29))
    p.add(section_panel(740, 150, 1060, 'featured', css_h=600))
    p.add(section_panel(740, 150 + 1060 * 600 / 1440 + 26, 1060, 'promos', pad=28))
    p.add(section_panel(M, 520, 560, 'deals', pad=32, shadow='float'))
    p.add(Text(M, 520 + 560 * (SECTIONS['deals']['h'] + 64) / 1440 + 14, 560, 20, 'Limited-time deals, with the date the offer ends.', size=14, weight=500, color='muted', lh=20))
    pages.append(p)

    # 17 Desktop shopping ---------------------------------------------------------------------
    p = Page('desktop-shopping', 'Desktop shopping', 'desktop', bg=(150, 'accent-soft', 'surface-muted'))
    chrome(p, 17, 'Desktop showcase')
    heading(p, 'Desktop · Shopping', 'Browse by category,\nfilter, compare', y=150, w=620, size=48)
    p.add(Text(M, 330, 540, 140, 'Every category has its own page with sort, price and discount filters. Cards show stock, labels and discounts at a glance.', size=18, weight=400, color='ink-2', lh=29))
    els, _ = browser(M, 520, 560, shot('desktop', 'categories'), shadow='device-sm')
    p.add(els)
    els, _ = browser(740, 150, 1060, shot('desktop', 'shop'))
    p.add(els)
    els, _ = browser(1240, 610, 560, shot('desktop', 'category-watches'), shadow='device-sm')
    p.add(els)
    pages.append(p)

    # 18 Desktop product detail ---------------------------------------------------------------
    p = Page('desktop-product', 'Desktop product detail', 'desktop', bg='page')
    chrome(p, 18, 'Desktop showcase')
    els, _ = browser(M, 150, 1140, shot('desktop', 'product-headphones'))
    p.add(els)
    rx = 1300
    heading(p, 'Desktop · Product', 'Everything needed\nto decide', x=rx, y=150, w=500, size=44)
    p.add(Text(rx, 360, 500, 140, 'Gallery with thumbnails, price and saving, stock, delivery and payment promises, then two clear actions.', size=17, weight=400, color='ink-2', lh=27))
    els, _ = browser(rx, 440, 440, shot('desktop', 'product-5'), shadow='device-sm')
    p.add(els)
    els, _ = browser(rx + 60, 706, 440, shot('desktop', 'product-13'), shadow='device-sm')
    p.add(els)
    pages.append(p)

    # 19 Desktop cart & wishlist --------------------------------------------------------------
    p = Page('desktop-cart', 'Desktop cart & wishlist', 'desktop', bg=(160, 'surface-muted', 'accent-soft'))
    chrome(p, 19, 'Desktop showcase')
    heading(p, 'Desktop · Cart', 'A cart that shows\nthe full price', y=150, w=600, size=48)
    p.add(Text(M, 330, 540, 150, 'Quantities, item totals, savings and delivery are calculated in the order summary before the shopper adds an address. Payment is cash on delivery.', size=18, weight=400, color='ink-2', lh=29))
    els, _ = browser(M, 560, 560, shot('desktop', 'wishlist'), shadow='device-sm')
    p.add(els)
    els, _ = browser(740, 150, 1060, shot('desktop', 'cart'))
    p.add(els)
    p.add(Text(M, 560 + 44 * 560 / 1440 + 350 + 14, 560, 20, 'Wishlist, saved in the browser. No account needed.', size=14, weight=500, color='muted', lh=20))
    pages.append(p)

    # 20 Mobile homepage (reference style 1: a row of floating phones, the centre one raised) --
    p = Page('mobile-homepage', 'Mobile homepage', 'mobile', bg='surface-muted')
    chrome(p, 20, 'Mobile showcase')
    p.add(Text(0, 130, W, 20, 'Mobile · Homepage', size=14, weight=600, color='primary', lh=20, ls=0.12, upper=True, align='center'))
    p.add(Text(0, 160, W, 56, 'Built for the phone first', size=48, weight=600, color='ink', lh=56, ls=-0.03, align='center'))
    p.add(Text(0, 224, W, 24, 'The responsive website at 390 px, captured on a phone-sized screen. Nothing to install.', size=17, weight=400, color='ink-2', lh=24, align='center'))
    widths = [250, 290, 330, 290, 250]
    srcs = [('home-deals', 0), ('home-featured', 0), ('home-hero', 0), ('home-new-arrivals', 0), ('home-cod', 0)]
    gap = 44
    total = sum(widths) + gap * 4
    x = (W - total) / 2
    for i, (wv, (s, sc)) in enumerate(zip(widths, srcs)):
        y = {0: 380, 1: 320, 2: 270, 3: 320, 4: 380}[i]
        els, _ = phone(x, y, wv, shot('mobile', s), scroll=sc, shadow='device' if i == 2 else 'device-sm')
        p.add(els)
        x += wv + gap
    pages.append(p)

    # 21 Mobile shopping (reference style 2: a masonry wall of screens, cropped at the edges) ---
    p = Page('mobile-shopping', 'Mobile shopping', 'mobile', bg=(135, 'accent-soft', '#FFF8F3'))
    cw = 300; gapx = 34
    colsrc = [
        [('shop', 0), ('category-fragrances', 0)],
        [('categories', 0), ('home-featured', 0)],
        [None, ('category-watches', 0)],
        [('shop-scrolled', 0), ('wishlist', 0)],
        [('home-deals', 0), ('product-16', 0)],
    ]
    offsets = [-210, 90, -20, -330, 30]
    ch = 844 * cw / 390
    x0 = (W - (5 * cw + 4 * gapx)) / 2
    for ci, items in enumerate(colsrc):
        y = offsets[ci]
        for it in items:
            if it is None:
                # title card in the wall
                p.add(Rect(x0 + ci * (cw + gapx), y + 60, cw, 430, fill='surface', radius=26, shadow='card'))
                tx = x0 + ci * (cw + gapx) + 32
                p.add(Mark(tx, y + 100, 36))
                p.add(Text(tx, y + 170, cw - 64, 20, 'Mobile · Shopping', size=13, weight=600, color='primary', lh=20, ls=0.12, upper=True))
                p.add(Text(tx, y + 200, cw - 64, 130, 'Browse, filter\nand save', size=36, weight=600, color='ink', lh=42, ls=-0.03))
                p.add(Text(tx, y + 300, cw - 56, 160, 'Two-column grids, sticky bottom tabs, category pages with filters and a wishlist that needs no account.', size=15, weight=400, color='ink-2', lh=23))
                y += 430 + 60 + 34
                continue
            s, sc = it
            p.add(screen_card(x0 + ci * (cw + gapx), y, cw, shot('mobile', s), scroll=sc))
            y += ch + 34
    pages.append(p)

    # 22 Mobile product (reference style 1, three phones) -------------------------------------
    p = Page('mobile-product', 'Mobile product', 'mobile', bg='page')
    chrome(p, 22, 'Mobile showcase')
    heading(p, 'Mobile · Product', 'The product page,\nin the hand', 'A full-width gallery, price and saving, stock, delivery and payment promises. "Add to cart" and "Buy now" stay pinned to the thumb.', y=200, w=520, size=48)
    specs = [(700, 300, 320, 'product-1', 'Gallery'), (1070, 220, 350, 'product-1-info', 'Price, stock and delivery'), (1470, 300, 320, 'product-9', 'Pinned actions')]
    for x, y, wv, s, cap in specs:
        els, ph = phone(x, y, wv, shot('mobile', s), shadow='device' if wv == 350 else 'device-sm')
        p.add(els)
    p.add(Rect(M, 640, 520, 1, fill='line-2'))
    for i, (n, d) in enumerate([('Gallery', 'Swipe photos, tap thumbnails'), ('Details', 'Price, saving, stock, delivery'), ('Actions', 'Add to cart or buy now')]):
        y = 664 + i * 70
        p.add(Text(M, y, 40, 24, f'0{i + 1}', size=16, weight=700, color='primary', lh=24))
        p.add(Text(M + 50, y, 400, 24, n, size=19, weight=600, color='ink', lh=24))
        p.add(Text(M + 50, y + 28, 460, 22, d, size=15, weight=400, color='muted', lh=22))
    pages.append(p)

    # 23 Mobile shopping journey ----------------------------------------------------------------
    p = Page('mobile-journey', 'Mobile shopping journey', 'mobile', bg=(180, 'page', 'accent-soft'))
    chrome(p, 23, 'Mobile showcase')
    p.add(Text(0, 130, W, 20, 'Mobile · Shopping journey', size=14, weight=600, color='primary', lh=20, ls=0.12, upper=True, align='center'))
    p.add(Text(0, 160, W, 56, 'From browsing to a cash-on-delivery order', size=44, weight=600, color='ink', lh=56, ls=-0.03, align='center'))
    steps = [('category-watches', 'Browse', 'A category with filters'), ('product-9-info', 'Choose', 'Price, stock, delivery'),
             ('cart', 'Review', 'Cart with item totals'), ('cart-scrolled', 'Order', 'Address and cash on delivery')]
    pw = 262; gap = 120
    x = (W - (4 * pw + 3 * gap)) / 2
    for i, (s, t, d) in enumerate(steps):
        els, ph = phone(x, 250, pw, shot('mobile', s), shadow='device-sm')
        p.add(els)
        p.add(Rect(x + pw / 2 - 18, 250 + ph + 26, 36, 36, fill='primary', radius=18))
        p.add(Text(x + pw / 2 - 18, 250 + ph + 34, 36, 20, str(i + 1), size=15, weight=700, color='white', lh=20, align='center'))
        p.add(Text(x - 20, 250 + ph + 72, pw + 40, 26, t, size=20, weight=600, color='ink', lh=26, align='center'))
        p.add(Text(x - 20, 250 + ph + 100, pw + 40, 22, d, size=15, weight=400, color='muted', lh=22, align='center'))
        if i < 3:
            p.add(Rect(x + pw / 2 + 30, 250 + ph + 43, pw + gap - 60, 2, fill='accent'))
        x += pw + gap
    pages.append(p)

    # 24 Responsive -----------------------------------------------------------------------------
    p = Page('responsive', 'Responsive', 'responsive', bg=(150, 'accent-soft', 'page'))
    chrome(p, 24, 'Responsive')
    p.add(Text(0, 120, W, 20, 'Responsive', size=14, weight=600, color='primary', lh=20, ls=0.12, upper=True, align='center'))
    p.add(Text(0, 150, W, 56, 'One store, every screen', size=48, weight=600, color='ink', lh=56, ls=-0.03, align='center'))
    p.add(Text(0, 218, W, 26, 'Real captures at 1440 px, 820 px and 390 px. Each layout is the one the site serves at that width, not a scaled copy.', size=18, weight=400, color='ink-2', lh=26, align='center'))
    els, bh = browser(470, 290, 980, shot('desktop', 'home-hero'))
    p.add(els)
    els, th = tablet(1330, 420, 380, shot('tablet', 'home'))
    p.add(els)
    els, _ = phone(330, 470, 230, shot('mobile', 'home-hero'))
    p.add(els)
    pages.append(p)

    # 25 Do's and don'ts ------------------------------------------------------------------------
    p = Page('dos-donts', "Do's and don'ts", 'brand', bg='page')
    chrome(p, 25, 'Guidelines')
    heading(p, 'Guidelines', "Do's and don'ts", y=150, w=900, size=52)
    dos = ['Use the lockup exactly as supplied: cart mark left, name right.',
           'Keep violet (#5F42EC) for actions and selected states only.',
           'Set everything in Plus Jakarta Sans; SemiBold for headings.',
           'Show one product per square photo on a neutral backdrop.',
           'Say what happens: delivery cost, cash on delivery, no account.',
           'Use sale colours only for a real discount.']
    donts = ['Recolour, outline, stretch or rotate the logo.',
             'Put the violet tile on the aubergine surface (use the white tile there).',
             'Add a second accent colour or gradients on buttons.',
             'Mix in another typeface or use weights below 400.',
             'Use cluttered, filtered or branded product photos.',
             'Promise payment methods or features the store does not offer.']
    for ci, (title, items, colr, mark) in enumerate([('Do', dos, 'success', '✓'), ("Don't", donts, 'sale', '✕')]):
        x = M + ci * 860
        p.add(Rect(x, 290, 820, 600, fill='surface', radius=24, stroke='line'))
        p.add(Text(x + 40, 322, 400, 34, title, size=28, weight=600, color=colr, lh=34))
        for i, t in enumerate(items):
            y = 382 + i * 82
            p.add(Rect(x + 40, y, 760, 1, fill='line'))
            p.add(Rect(x + 40, y + 22, 32, 32, fill='success-soft' if ci == 0 else 'sale-soft', radius=16))
            p.add(Text(x + 40, y + 27, 32, 22, mark, size=16, weight=700, color=colr, lh=22, align='center'))
            p.add(Text(x + 92, y + 26, 690, 26, t, size=18, weight=500, color='ink', lh=26))
    pages.append(p)

    # 26 Closing --------------------------------------------------------------------------------
    p = Page('closing', 'Closing', 'brand', bg='inverse', dark=True)
    chrome(p, 26, 'Mirza Cart', dark=True)
    p.add(Mark(W / 2 - 60, 220, 120, bg='white', fg='primary'))
    p.add(wordmark(0, 372, 150, color='white', center_w=W, h=190))
    p.add(Text(0, 560, W, 40, 'Electronics, fashion, home and beauty, delivered across Pakistan.\nPay in cash when your order arrives.', size=26, weight=400, color='#C9C6D4', lh=40, align='center'))
    p.add(Rect(W / 2 - 40, 680, 80, 2, fill='primary'))
    p.add(Text(0, 712, W, 26, 'Responsive storefront  ·  Guest checkout  ·  Cash on Delivery  ·  Admin-managed with Payload CMS', size=17, weight=500, color='#B9B6C6', lh=26, align='center'))
    pages.append(p)

    assert len(pages) == TOTAL, len(pages)
    return pages

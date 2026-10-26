# demo-assets (M90)

Optional photos for the demo seed (`scripts/seed-demo.ts`). Everything in this folder except this README is git-ignored: photos are never committed.

The seed works with this folder empty. It then generates simple vector artwork (no text) for every image. Drop real photos in only if you want a more realistic demo.

## Running the seed

Local development only. It refuses to run when `NODE_ENV=production` or when `TUNNEL_TOKEN` or `APP_DB_PASSWORD` is set. Run it inside the app container so the uploads land in the `app-media` volume:

```
docker compose exec app npm run seed:demo
docker compose exec app npm run seed:demo -- --with-orders
```

Database guard: before the Payload config is even loaded, the seed also refuses to run if `DATABASE_URI` uses the `gocart_app` role or a host other than `postgres`, `localhost`, `127.0.0.1` or `::1`. It never prints the URI. A `DATABASE_URI` that cannot be parsed is not refused by the guard (Payload then fails to connect on its own).

Do not run `npm run test:e2e` against a demo-seeded database: it renames the store and moves the base seed products.

The products from `scripts/seed.ts` (if you ran `npm run seed` earlier) keep blank placeholder images. Delete them by hand in /admin before a client demo.

`--with-orders` also creates 8 sample orders (fake customers, phones `03000000001` to `03000000008`, obviously fake addresses, varied statuses). Without it no orders are created.

It is safe to run twice: categories are matched by slug, products by exact name, images by filename, orders by a fixed idempotency key. A row that already exists is never updated. The Settings global is filled only if it still has its defaults and no contact details.

## Using your own photos

1. Name each file `<product-slug>-<n>.<ext>`, where `n` is `1` or `2` and `ext` is `jpg`, `jpeg`, `png` or `webp`, for example `metro-canvas-backpack-1.jpg`. Slugs are in the table below.
2. Put the files directly in `demo-assets/`. Subfolders (including `_inbox/`) are ignored.
3. To use another folder, set `DEMO_ASSETS_DIR`, for example `docker compose exec -e DEMO_ASSETS_DIR=/app/my-photos app npm run seed:demo`. The folder must be visible inside the container. `docker-compose.yml` bind-mounts the project source into the app container (`.:/app`), so the host `demo-assets/` appears as `/app/demo-assets`. A folder outside the project is not mounted unless you add a mount yourself.
4. Run the seed. Each photo is downscaled to at most 1600px on the long edge (never enlarged), cropped square only when it is extremely wide or tall (more than 2:1), and saved as WebP at quality 80. Your original file is never modified.

A missing file or folder is normal and never an error. A photo that cannot be read falls back to the generated artwork, and the seed reports how many photos it used.

Photos are only picked up when a product is first created. To swap an image later, remove the product and its media in /admin (steps below), then run the seed again.

Photo rules:

- Check the licence of every photo before using it.
- Avoid brand logos and identifiable people.
- Replace stock photos with real product photos before any real launch.

## Removing the demo data by hand

There is deliberately no delete routine. In /admin (`/admin`), in this order, because products depend on categories and media:

1. Orders (only if you used `--with-orders`): open Orders, search for `Demo Customer` (or phone `0300000000`), select the 8 rows, Delete.
2. Products: open Products, select the 24 demo products listed below by name, Delete. Do not select products you added yourself.
3. Categories: open Categories. Delete the children first (Headphones, Speakers, Smart Watches, Power Banks, Watches, Bags, Sunglasses, Lamps, Kitchen, Skincare, Fragrances), then the parents (Electronics, Fashion, Home & Living, Beauty & Care). Skip `electronics`, `speakers`, `headphones`, `fashion` and `watches` if they existed before the demo seed (for example from `npm run seed`).
4. Media: open Media and delete the files named `category-<slug>.webp` and `<product-slug>-1.webp` / `<product-slug>-2.webp`.
5. Settings: open Settings and replace the placeholder store name and contact details (demo values: store name `GoCart Demo Store`, phone `0300-0000000`, email `demo@example.com`) with the real ones.

## Product slugs

| Product | Slug (image file prefix) |
| --- | --- |
| Aero Wave Wireless Headphones | `aero-wave-wireless-headphones` |
| Studio Lite Over-Ear Headphones | `studio-lite-over-ear-headphones` |
| Capsule Portable Bluetooth Speaker | `capsule-portable-bluetooth-speaker` |
| Cylinder Mini Speaker | `cylinder-mini-speaker` |
| Pulse Active Smart Watch | `pulse-active-smart-watch` |
| Orbit Slim Smart Watch | `orbit-slim-smart-watch` |
| Volt Compact Power Bank | `volt-compact-power-bank` |
| Volt Max Power Bank | `volt-max-power-bank` |
| Classic Steel Analog Watch | `classic-steel-analog-watch` |
| Minimal Leather Strap Watch | `minimal-leather-strap-watch` |
| Chrono Sport Wrist Watch | `chrono-sport-wrist-watch` |
| Metro Canvas Backpack | `metro-canvas-backpack` |
| Everyday Faux Leather Tote | `everyday-faux-leather-tote` |
| Weekender Duffle Bag | `weekender-duffle-bag` |
| Pilot Frame Sunglasses | `pilot-frame-sunglasses` |
| Round Frame Sunglasses | `round-frame-sunglasses` |
| Arc Table Lamp | `arc-table-lamp` |
| Dome Desk Lamp | `dome-desk-lamp` |
| Nonstick Frying Pan | `nonstick-frying-pan` |
| Glass Storage Jar Set | `glass-storage-jar-set` |
| Aloe Hydrating Gel Cream | `aloe-hydrating-gel-cream` |
| Gentle Foaming Face Wash | `gentle-foaming-face-wash` |
| Amber Oud Eau de Parfum | `amber-oud-eau-de-parfum` |
| Citrus Mist Body Spray | `citrus-mist-body-spray` |

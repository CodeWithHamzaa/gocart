I've attached rangla-design.zip. It contains the complete new UI/UX design for this GoCart project (Next.js + Tailwind): design source files, a design handoff guide and full-page screenshots of every screen. Redesign the entire storefront UI to match it, pixel-perfect and fully responsive.

STEP 0: SET UP THE DESIGN FILES
1. Create and switch to a new git branch called "redesign". Make sure the working tree is clean first; if it isn't, stop and tell me.
2. Find rangla-design.zip: check the project root first, then the attachment path. If you can't find it, stop and ask me for the path.
3. Extract it into the project root so the result is ./design/ (it contains design/*.dc.html, design/screens/*.png, design/DESIGN_HANDOFF.md and design/canvas.json). Don't create a nested design/design folder. Then delete the zip from the project root if it's there.
4. Add the design folder to git in its own commit: "chore: add redesign source files".

STEP 1: UNDERSTAND THE DESIGN
1. Read design/DESIGN_HANDOFF.md fully. It defines the colour tokens, typography, radii, shadows, layout rules, components and how to read the design files.
2. Look at every screenshot in design/screens/. These are the visual targets (desktop is 1440px wide; mobile is 390px wide at 2×).
3. Read every design/*.dc.html file. The markup inside <x-dc> is the exact layout spec: take spacing, radii, font sizes, colours and shadows from its inline styles. The DCLogic script at the bottom is only an interaction spec with sample data. These files are not runnable, so never copy them into the app as pages.

STEP 2: PLAN (WAIT FOR MY APPROVAL)
Explore the codebase, then send me a plan before editing any UI code. The plan should cover:
- A mapping of each design screen to our actual route and component files.
- The shared components you'll create or replace.
- The Tailwind token setup.
- Any design element that has no matching data or feature in our app (for example stitched/unstitched options, express delivery, promo codes, the flash-deal countdown). For each, suggest whether to skip it, show it as UI only, or flag it for later. Do not invent backend logic.
Then wait for my approval.

RULES
- UI only. Do NOT change business logic, API routes, database or Prisma models, auth, the state/Redux layer, or admin data flows. Keep every existing prop, data fetch, handler and route. Replace only markup and styles.
- Use our real product data and images. Ignore the sample products, the placeholder brand "Rangla" and the line-icon product placeholders. Keep our real store name and logo, and keep the pastel image-tile styling around real images.
- Put the tokens in tailwind.config (theme.extend) and load Plus Jakarta Sans with next/font/google. No hard-coded hex values in components.
- Build reusable components first (Header, ProductCard, CategoryTile, QuantityStepper, Badge, RadioCard, SectionHeader, MobileTabBar, MobileActionBar, Footer), then rebuild the pages with them.
- Responsive: the mobile design is 390px and the desktop design is 1440px with a 1280px max-width container (1120px for cart and checkout). Layouts must reflow cleanly at every width in between (flex-wrap and auto-fit grids; the filter sidebar and order summary stack on small screens) with no horizontal scroll. On mobile, the tab bar and action bars are fixed to the bottom of the viewport.
- Accessibility as in the design: 44px minimum touch targets, labelled inputs, aria-labels on icon-only buttons, 4.5:1 text contrast, visible focus states.
- Admin dashboard: there's no admin design. Apply the same tokens, font and card style for visual consistency only. Don't change its layout, tables or flows.
- Pages not in the design (auth, account, orders, wishlist, search, store/vendor pages) should reuse the new components and tokens so the whole site feels consistent.

STEP 3: IMPLEMENT
Work in this order, committing after each step with a clear message:
1. Tokens and font
2. Shared components
3. Home
4. All categories (new page if we don't have one; ask me for the route)
5. Category listing
6. Product detail
7. Cart
8. Checkout and order-placed state
9. Remaining storefront pages
10. Admin token pass

STEP 4: VERIFY EACH PAGE
For each page:
- Run the dev server.
- Take Playwright full-page screenshots at 390px and 1440px (plus a quick check at 768px).
- Compare them side by side with the matching file in design/screens/ and fix visible differences in layout, spacing, type, colour and radii.
- Run lint and a production build, and fix any errors before moving on.

STEP 5: REPORT
At the end, give me:
- A summary of what changed, page by page.
- Anything you couldn't match, and why.
- Any follow-ups that need backend work.

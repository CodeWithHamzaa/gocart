import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// M102 (ADR-048): categories become one flat level (owner decision, 2026-11-01). Before the
// `parent_id` column is dropped, the data is reshaped so nothing is lost:
//   1. Smart Watches is merged into Watches (owner's choice, so the store keeps 10 categories): its
//      products move to Watches and the empty Smart Watches row is deleted. Only when both slugs
//      exist; otherwise nothing happens.
//   2. display_order is renumbered 1..n in the old reading order (each former department's
//      sub-categories in turn), so the flat list keeps the order customers already saw.
//   3. A former department (a category that had sub-categories) is deleted only if no product is
//      filed directly under it. One that still holds products stays, as an ordinary category.
// Products never lose their category: their sub-category simply becomes a category.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  UPDATE "products" SET "category_id" = w."id"
    FROM "categories" w, "categories" sw
    WHERE w."slug" = 'watches' AND sw."slug" = 'smart-watches' AND "products"."category_id" = sw."id";
  DELETE FROM "categories" sw
    WHERE sw."slug" = 'smart-watches'
      AND EXISTS (SELECT 1 FROM "categories" w WHERE w."slug" = 'watches')
      AND NOT EXISTS (SELECT 1 FROM "products" p WHERE p."category_id" = sw."id");

  WITH ordered AS (
    SELECT c."id", row_number() OVER (
      ORDER BY coalesce(p."display_order", c."display_order"), coalesce(p."title", c."title"),
               (c."parent_id" IS NOT NULL), c."display_order", c."title", c."id"
    ) AS n
    FROM "categories" c LEFT JOIN "categories" p ON p."id" = c."parent_id"
    -- Number only the rows that stay (step 3 deletes empty former departments).
    WHERE NOT (EXISTS (SELECT 1 FROM "categories" ch WHERE ch."parent_id" = c."id")
               AND NOT EXISTS (SELECT 1 FROM "products" pr WHERE pr."category_id" = c."id"))
  )
  UPDATE "categories" SET "display_order" = ordered.n FROM ordered WHERE "categories"."id" = ordered."id";

  DELETE FROM "categories" c
    WHERE EXISTS (SELECT 1 FROM "categories" ch WHERE ch."parent_id" = c."id")
      AND NOT EXISTS (SELECT 1 FROM "products" pr WHERE pr."category_id" = c."id");

  ALTER TABLE "categories" DROP CONSTRAINT "categories_parent_id_categories_id_fk";
  DROP INDEX "categories_parent_idx";
  ALTER TABLE "categories" DROP COLUMN "parent_id";`)
}

// Restores the column, its foreign key and index. It cannot restore the hierarchy, the deleted
// departments or the Smart Watches category: that data is gone (restore a database backup for it).
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "categories" ADD COLUMN "parent_id" integer;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");`)
}

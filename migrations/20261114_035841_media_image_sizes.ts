import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN "sizes_product_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_product_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_product_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_product_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_product_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_product_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_category_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_category_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_category_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_category_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_category_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_category_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_filename" varchar;
  CREATE INDEX "media_sizes_product_sizes_product_filename_idx" ON "media" USING btree ("sizes_product_filename");
  CREATE INDEX "media_sizes_category_sizes_category_filename_idx" ON "media" USING btree ("sizes_category_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "media_sizes_product_sizes_product_filename_idx";
  DROP INDEX "media_sizes_category_sizes_category_filename_idx";
  DROP INDEX "media_sizes_hero_sizes_hero_filename_idx";
  ALTER TABLE "media" DROP COLUMN "sizes_product_url";
  ALTER TABLE "media" DROP COLUMN "sizes_product_width";
  ALTER TABLE "media" DROP COLUMN "sizes_product_height";
  ALTER TABLE "media" DROP COLUMN "sizes_product_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_product_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_product_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_category_url";
  ALTER TABLE "media" DROP COLUMN "sizes_category_width";
  ALTER TABLE "media" DROP COLUMN "sizes_category_height";
  ALTER TABLE "media" DROP COLUMN "sizes_category_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_category_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_category_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_url";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_width";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_height";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_filename";`)
}

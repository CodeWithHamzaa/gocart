import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_label" AS ENUM('new', 'limited', 'sale');
  ALTER TABLE "products" ADD COLUMN "label" "enum_products_label";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" DROP COLUMN "label";
  DROP TYPE "public"."enum_products_label";`)
}

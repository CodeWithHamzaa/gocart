import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Milestone 122 (ADR-053): the brand is Mirza Cart. Besides the column default, a stored name is renamed only
// when it is exactly the previous default ("Mirza"); any other name an admin has saved is left alone.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "settings" ALTER COLUMN "store_name" SET DEFAULT 'Mirza Cart';
   UPDATE "settings" SET "store_name" = 'Mirza Cart' WHERE "store_name" = 'Mirza';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "settings" ALTER COLUMN "store_name" SET DEFAULT 'Mirza';
   UPDATE "settings" SET "store_name" = 'Mirza' WHERE "store_name" = 'Mirza Cart';`)
}

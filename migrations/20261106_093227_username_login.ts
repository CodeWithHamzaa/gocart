import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
  ALTER TABLE "users" ADD COLUMN "username" varchar;
  -- Existing admins keep working: username = the part of the email before the @, suffixed with the id
  -- so it is always unique.
  UPDATE "users" SET "username" = regexp_replace(split_part("email", '@', 1), '[^A-Za-z0-9._-]', '', 'g') || '-' || "id" WHERE "username" IS NULL;
  ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
  CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "users_username_idx";
  ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
  ALTER TABLE "users" DROP COLUMN "username";`)
}

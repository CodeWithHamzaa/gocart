import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// M114 (ADR-051): admins sign in with a username only. Adds a unique users.username, makes email optional and
// drops its unique index (Payload no longer treats the email as a login identifier when allowEmailLogin is false).
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
  ALTER TABLE "users" ADD COLUMN "username" varchar;
  -- Existing admins keep working: username = the part of the email before the @, cleaned and lower-cased (Payload
  -- lower-cases a username when it signs in and compares exactly), suffixed with the id so it is always unique.
  UPDATE "users" SET "username" = lower(regexp_replace(split_part("email", '@', 1), '[^A-Za-z0-9._-]', '', 'g')) || '-' || "id" WHERE "username" IS NULL;
  ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
  CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");
  DROP INDEX IF EXISTS "users_email_idx";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Going back to email sign-in needs an email on every admin; refuse clearly instead of failing halfway.
  await db.execute(sql`
   DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM "users" WHERE "email" IS NULL) THEN
      RAISE EXCEPTION 'M114 down: set an email for every admin (users.email is NULL for some) before rolling back';
    END IF;
  END $$;
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  DROP INDEX "users_username_idx";
  ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
  ALTER TABLE "users" DROP COLUMN "username";`)
}

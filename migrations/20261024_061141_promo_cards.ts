import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_promo_cards_tone" AS ENUM('pink', 'blue', 'lavender', 'mint');
  CREATE TABLE "promo_cards" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"eyebrow" varchar,
  	"cta_text" varchar NOT NULL,
  	"link" varchar NOT NULL,
  	"tone" "enum_promo_cards_tone" DEFAULT 'lavender' NOT NULL,
  	"image_id" integer,
  	"order" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "promo_cards_id" integer;
  ALTER TABLE "promo_cards" ADD CONSTRAINT "promo_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "promo_cards_image_idx" ON "promo_cards" USING btree ("image_id");
  CREATE INDEX "promo_cards_updated_at_idx" ON "promo_cards" USING btree ("updated_at");
  CREATE INDEX "promo_cards_created_at_idx" ON "promo_cards" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_promo_cards_fk" FOREIGN KEY ("promo_cards_id") REFERENCES "public"."promo_cards"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_promo_cards_id_idx" ON "payload_locked_documents_rels" USING btree ("promo_cards_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "promo_cards" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "promo_cards" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_promo_cards_fk";
  
  DROP INDEX "payload_locked_documents_rels_promo_cards_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "promo_cards_id";
  DROP TYPE "public"."enum_promo_cards_tone";`)
}

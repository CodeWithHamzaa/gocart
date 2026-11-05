import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_hero_slides_badge_tone" AS ENUM('ink', 'sale');
  CREATE TYPE "public"."enum_hero_slides_tone" AS ENUM('green', 'blue', 'grey');
  CREATE TABLE "hero_slides" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar NOT NULL,
  	"badge" varchar NOT NULL,
  	"badge_tone" "enum_hero_slides_badge_tone" DEFAULT 'ink' NOT NULL,
  	"tone" "enum_hero_slides_tone" DEFAULT 'green' NOT NULL,
  	"cta_text" varchar NOT NULL,
  	"link" varchar NOT NULL,
  	"order" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "hero_slides_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "storefront_content_announcement_messages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "storefront_content" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"show_delivery_message" boolean DEFAULT true,
  	"show_track_order_link" boolean DEFAULT true,
  	"featured_title" varchar,
  	"featured_description" varchar,
  	"featured_link_label" varchar,
  	"new_arrivals_title" varchar,
  	"new_arrivals_description" varchar,
  	"new_arrivals_link_label" varchar,
  	"footer_tagline" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "hero_slides_id" integer;
  ALTER TABLE "hero_slides_rels" ADD CONSTRAINT "hero_slides_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."hero_slides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "hero_slides_rels" ADD CONSTRAINT "hero_slides_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "storefront_content_announcement_messages" ADD CONSTRAINT "storefront_content_announcement_messages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."storefront_content"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "hero_slides_updated_at_idx" ON "hero_slides" USING btree ("updated_at");
  CREATE INDEX "hero_slides_created_at_idx" ON "hero_slides" USING btree ("created_at");
  CREATE INDEX "hero_slides_rels_order_idx" ON "hero_slides_rels" USING btree ("order");
  CREATE INDEX "hero_slides_rels_parent_idx" ON "hero_slides_rels" USING btree ("parent_id");
  CREATE INDEX "hero_slides_rels_path_idx" ON "hero_slides_rels" USING btree ("path");
  CREATE INDEX "hero_slides_rels_media_id_idx" ON "hero_slides_rels" USING btree ("media_id");
  CREATE INDEX "storefront_content_announcement_messages_order_idx" ON "storefront_content_announcement_messages" USING btree ("_order");
  CREATE INDEX "storefront_content_announcement_messages_parent_id_idx" ON "storefront_content_announcement_messages" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_hero_slides_fk" FOREIGN KEY ("hero_slides_id") REFERENCES "public"."hero_slides"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_hero_slides_id_idx" ON "payload_locked_documents_rels" USING btree ("hero_slides_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "hero_slides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "hero_slides_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "storefront_content_announcement_messages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "storefront_content" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "hero_slides" CASCADE;
  DROP TABLE "hero_slides_rels" CASCADE;
  DROP TABLE "storefront_content_announcement_messages" CASCADE;
  DROP TABLE "storefront_content" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_hero_slides_fk";
  
  DROP INDEX "payload_locked_documents_rels_hero_slides_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "hero_slides_id";
  DROP TYPE "public"."enum_hero_slides_badge_tone";
  DROP TYPE "public"."enum_hero_slides_tone";`)
}

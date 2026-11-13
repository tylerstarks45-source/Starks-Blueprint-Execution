CREATE TABLE "asset_business_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"asset_id" integer NOT NULL,
	"business_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_business_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'custom' NOT NULL,
	"stream_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"asset_classes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "type_key" text;--> statement-breakpoint
ALTER TABLE "asset_business_shares" ADD CONSTRAINT "asset_business_shares_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_business_shares" ADD CONSTRAINT "asset_business_shares_asset_id_canonical_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."canonical_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_business_shares" ADD CONSTRAINT "asset_business_shares_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_business_types" ADD CONSTRAINT "custom_business_types_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_business_shares_asset_business_idx" ON "asset_business_shares" USING btree ("asset_id","business_id");--> statement-breakpoint
CREATE INDEX "asset_business_shares_owner_idx" ON "asset_business_shares" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "asset_business_shares_business_idx" ON "asset_business_shares" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_business_types_owner_key_idx" ON "custom_business_types" USING btree ("owner_id","key");
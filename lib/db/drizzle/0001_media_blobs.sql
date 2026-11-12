CREATE TABLE "media_blobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" integer NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_blobs_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "media_blobs" ADD CONSTRAINT "media_blobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_blobs_user_id_idx" ON "media_blobs" USING btree ("user_id");
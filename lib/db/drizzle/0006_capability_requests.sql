CREATE TABLE "capability_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"capability" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"plan_id" integer,
	"mission_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "capability_requests" ADD CONSTRAINT "capability_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "capability_requests_user_idx" ON "capability_requests" USING btree ("user_id","status");
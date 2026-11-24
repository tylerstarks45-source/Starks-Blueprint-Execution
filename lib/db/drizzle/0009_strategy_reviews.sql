CREATE TABLE "strategy_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"mission_id" integer NOT NULL,
	"business_id" integer,
	"verdict" text NOT NULL,
	"summary" text NOT NULL,
	"adjustments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metrics" jsonb NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "strategy_reviews" ADD CONSTRAINT "strategy_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_reviews" ADD CONSTRAINT "strategy_reviews_mission_id_ash_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."ash_missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategy_reviews" ADD CONSTRAINT "strategy_reviews_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "strategy_reviews_mission_idx" ON "strategy_reviews" USING btree ("mission_id","created_at");
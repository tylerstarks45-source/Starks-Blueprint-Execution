CREATE TABLE "ash_control_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"business_id" integer,
	"level" text DEFAULT 'copilot' NOT NULL,
	"daily_spend_limit_cents" integer DEFAULT 0 NOT NULL,
	"monthly_spend_limit_cents" integer DEFAULT 0 NOT NULL,
	"approval_required" jsonb DEFAULT '["spend","delete","legal"]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ash_missions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"business_id" integer,
	"goal" text NOT NULL,
	"status" text DEFAULT 'planning' NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"waiting_for" text,
	"approval_id" integer,
	"step_runs" integer DEFAULT 0 NOT NULL,
	"max_step_runs" integer DEFAULT 20 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"next_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ash_spend_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"business_id" integer,
	"mission_id" integer,
	"amount_cents" integer NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pending_approvals" ALTER COLUMN "business_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ash_control_settings" ADD CONSTRAINT "ash_control_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_control_settings" ADD CONSTRAINT "ash_control_settings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_missions" ADD CONSTRAINT "ash_missions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_missions" ADD CONSTRAINT "ash_missions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_spend_events" ADD CONSTRAINT "ash_spend_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_spend_events" ADD CONSTRAINT "ash_spend_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ash_control_settings_account_idx" ON "ash_control_settings" USING btree ("user_id") WHERE "ash_control_settings"."business_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ash_control_settings_business_idx" ON "ash_control_settings" USING btree ("user_id","business_id") WHERE "ash_control_settings"."business_id" is not null;--> statement-breakpoint
CREATE INDEX "ash_missions_user_idx" ON "ash_missions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ash_missions_due_idx" ON "ash_missions" USING btree ("status","next_run_at");--> statement-breakpoint
CREATE INDEX "ash_spend_events_user_created_idx" ON "ash_spend_events" USING btree ("user_id","created_at");
CREATE TABLE "blueprint_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blueprints" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category_id" integer,
	"description" text,
	"difficulty" text DEFAULT 'beginner' NOT NULL,
	"estimated_cost" text,
	"estimated_time" text,
	"status" text DEFAULT 'active' NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"author_user_id" integer,
	"price_credits" integer DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'admin' NOT NULL,
	"review_status" text DEFAULT 'approved' NOT NULL,
	"sales_count" integer DEFAULT 0 NOT NULL,
	"rating_avg" real DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"rejection_reason" text,
	"estimated_earnings" text,
	"required_tools" text,
	"setup_steps" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blueprints_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blueprint_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"blueprint_id" integer NOT NULL,
	"step_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"action_type" text DEFAULT 'manual' NOT NULL,
	"config" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer,
	"name" text NOT NULL,
	"description" text,
	"affiliate_link" text,
	"signup_url" text,
	"pricing" text,
	"required_credentials" text[],
	"oauth_required" boolean DEFAULT false NOT NULL,
	"active_status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_credential_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"tool_id" integer NOT NULL,
	"credential_key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"required" boolean DEFAULT true NOT NULL,
	"credential_type" text DEFAULT 'api_key' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"confidence" integer DEFAULT 50 NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"source_type" text DEFAULT 'improvement_pass' NOT NULL,
	"suggested_tool_id" integer,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolved_at" timestamp with time zone,
	"owner_user_id" integer NOT NULL,
	"team_workspace_id" integer,
	"source_engine" text DEFAULT 'business_intelligence' NOT NULL,
	"created_by_user_id" integer,
	"updated_by_user_id" integer,
	"governance_status" text DEFAULT 'active' NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"project_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliate_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"tool_id" integer,
	"url" text NOT NULL,
	"campaign" text,
	"click_count" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" text,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text,
	"role" text DEFAULT 'USER',
	"membership_status" text DEFAULT 'inactive' NOT NULL,
	"membership_tier" text,
	"credits_balance" integer DEFAULT 0 NOT NULL,
	"wallet_balance" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"reset_token" text,
	"reset_token_expiry" timestamp with time zone,
	"email_verified" boolean DEFAULT false NOT NULL,
	"email_verify_token" text,
	"email_verify_expiry" timestamp with time zone,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"onboarding_checklist_dismissed" boolean DEFAULT false NOT NULL,
	"milestones_reached" jsonb DEFAULT '[]'::jsonb,
	"social_proof_consent" boolean DEFAULT false NOT NULL,
	"notify_revenue" boolean DEFAULT true NOT NULL,
	"notify_milestone" boolean DEFAULT true NOT NULL,
	"notify_build" boolean DEFAULT true NOT NULL,
	"notify_platform" boolean DEFAULT false NOT NULL,
	"token_version" integer DEFAULT 1 NOT NULL,
	"expo_push_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "system_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"blueprint_id" integer,
	"name" text NOT NULL,
	"build_status" text DEFAULT 'pending' NOT NULL,
	"health_status" text DEFAULT 'unknown' NOT NULL,
	"file_tree" jsonb,
	"saved_images" jsonb,
	"client_workspace_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_tool_selections" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_instance_id" integer NOT NULL,
	"tool_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tool_id" integer,
	"credential_key" text NOT NULL,
	"encrypted_value" text NOT NULL,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"connected_at" timestamp with time zone,
	"last_sync_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"metadata" text,
	"client_workspace_id" integer,
	"system_instance_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "build_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_instance_id" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_step_number" integer DEFAULT 1 NOT NULL,
	"current_model" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "build_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"build_session_id" integer NOT NULL,
	"step_id" integer,
	"step_number" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "build_outputs" (
	"id" serial PRIMARY KEY NOT NULL,
	"build_session_id" integer NOT NULL,
	"output_type" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_memory" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"system_instance_id" integer,
	"memory_key" text NOT NULL,
	"memory_value" text NOT NULL,
	"category" text,
	"importance_score" integer DEFAULT 50 NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence_score" integer DEFAULT 100 NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"scope" text DEFAULT 'global_user' NOT NULL,
	"business_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openrouter_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"system_instance_id" integer,
	"model" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost" numeric(10, 6),
	"success" text DEFAULT 'true' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "admin_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_health" (
	"id" serial PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"status" text DEFAULT 'healthy' NOT NULL,
	"message" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"notification_type" text DEFAULT 'info' NOT NULL,
	"link_url" text,
	"dedupe_key" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"tier" text DEFAULT 'starter' NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" text DEFAULT 'false',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"type" text NOT NULL,
	"reason" text,
	"model" text,
	"tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processed_stripe_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_activity_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_instance_id" integer NOT NULL,
	"event_type" text DEFAULT 'action' NOT NULL,
	"amount_cents" integer,
	"description" text NOT NULL,
	"metadata" text,
	"external_tx_id" text,
	"revenue_provider" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_activations" (
	"id" serial PRIMARY KEY NOT NULL,
	"skill_id" integer NOT NULL,
	"user_id" integer,
	"system_instance_id" integer,
	"activated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"keywords" text[] DEFAULT '{}' NOT NULL,
	"system_prompt_addition" text,
	"icon" text DEFAULT '⚡' NOT NULL,
	"active_status" boolean DEFAULT true NOT NULL,
	"is_platform_exclusive" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skills_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encryption_key_rotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"rotated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rotated_by_admin_id" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "system_connectors" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_instance_id" integer NOT NULL,
	"connector" text NOT NULL,
	"status" text DEFAULT 'unconfigured' NOT NULL,
	"last_tested_at" timestamp with time zone,
	"error_message" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runtime_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"system_instance_id" integer,
	"job_type" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"priority" integer DEFAULT 10 NOT NULL,
	"payload" jsonb,
	"result" jsonb,
	"attempt" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"error" text,
	"self_heal_retry_count" integer DEFAULT 0 NOT NULL,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "runtime_jobs_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text DEFAULT 'New Session' NOT NULL,
	"state_json" text DEFAULT '{}' NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"phase" text DEFAULT 'idle' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"system_instance_id" integer,
	"session_id" text,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"file_type" text DEFAULT 'text' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_usage_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"system_instance_id" integer,
	"session_id" text,
	"event_type" text NOT NULL,
	"credits_consumed" integer DEFAULT 0 NOT NULL,
	"tokens_used" integer DEFAULT 0,
	"openrouter_cost" numeric(10, 6),
	"model" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landing_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"system_instance_id" integer,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"html_content" text DEFAULT '' NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"public_url" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"page_views" integer DEFAULT 0 NOT NULL,
	"optins" integer DEFAULT 0 NOT NULL,
	"custom_domain" text,
	"next_page_id" integer,
	"email_list_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_affiliate_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"system_instance_id" integer,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"cloaked_slug" text NOT NULL,
	"description" text,
	"category" text,
	"click_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliate_conversions" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"system_instance_id" integer,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"order_id" text,
	"referring_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"list_id" integer,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"from_name" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"open_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"bounce_count" integer DEFAULT 0 NOT NULL,
	"unsubscribe_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subscriber_id" integer,
	"sequence_id" integer,
	"step_id" integer,
	"campaign_id" integer,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"message_id" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"bounced_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"subscriber_count" integer DEFAULT 0 NOT NULL,
	"sendgrid_list_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_sequence_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"sequence_id" integer NOT NULL,
	"step_number" integer NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"delay_days" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"list_id" integer,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_id" integer NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"status" text DEFAULT 'active' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"domain" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"namecheap_order_id" text,
	"auto_renew" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"purchased_at" timestamp with time zone,
	"linked_page_id" integer,
	"dns_verified" boolean DEFAULT false NOT NULL,
	"dns_verified_at" timestamp with time zone,
	"registrant_first_name" text,
	"registrant_last_name" text,
	"registrant_email" text,
	"registrant_address1" text,
	"registrant_city" text,
	"registrant_state_province" text,
	"registrant_postal_code" text,
	"registrant_country" text DEFAULT 'US',
	"registrant_phone" text,
	"years" integer DEFAULT 1 NOT NULL,
	"price" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_instance_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"schedule_type" text NOT NULL,
	"schedule_config" jsonb NOT NULL,
	"action_type" text DEFAULT 'connector' NOT NULL,
	"action_params" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_run_status" text,
	"last_run_error" text,
	"next_run_at" timestamp with time zone,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_revenue_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_instance_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"provider" text NOT NULL,
	"credential_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp with time zone,
	"sync_status" text DEFAULT 'idle' NOT NULL,
	"sync_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "published_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_instance_id" integer NOT NULL,
	"channel" text NOT NULL,
	"content_type" text DEFAULT 'post' NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"published_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"published_at" timestamp with time zone,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"credential_key" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_instance_id" integer NOT NULL,
	"token" text NOT NULL,
	"name" text NOT NULL,
	"action_type" text DEFAULT 'log_event' NOT NULL,
	"action_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_fired_at" timestamp with time zone,
	"total_fires" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_endpoints_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "milestone_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"system_instance_id" integer,
	"amount_cents" integer NOT NULL,
	"milestone_label" text NOT NULL,
	"system_type" text,
	"best_category" text,
	"featured" boolean DEFAULT false NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"reached_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint_id" integer NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb,
	"response_status" integer DEFAULT 200 NOT NULL,
	"response_body" text,
	"processing_ms" integer,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "ab_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_instance_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"winner_variant_id" integer,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"concluded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ab_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"status" text DEFAULT 'active' NOT NULL,
	"content_ref" text DEFAULT '' NOT NULL,
	"visits" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"conversion_events" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blueprint_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"blueprint_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"review_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blueprint_reviews_blueprint_user_unique" UNIQUE("blueprint_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "blueprint_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"blueprint_id" integer NOT NULL,
	"buyer_user_id" integer NOT NULL,
	"author_user_id" integer,
	"price_credits" integer DEFAULT 0 NOT NULL,
	"creator_share_credits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blueprint_purchases_unique_buyer" UNIQUE("blueprint_id","buyer_user_id")
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"code" text NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_codes_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referral_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" integer NOT NULL,
	"referred_user_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"credits_awarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"agency_user_id" integer NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"notes" text,
	"portal_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_workspaces_portal_token_unique" UNIQUE("portal_token")
);
--> statement-breakpoint
CREATE TABLE "white_label_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"brand_name" text DEFAULT '' NOT NULL,
	"logo_url" text,
	"primary_color" text DEFAULT '#1A8CFF' NOT NULL,
	"accent_color" text DEFAULT '#00E5E5' NOT NULL,
	"custom_domain" text,
	"domain_verified" boolean DEFAULT false NOT NULL,
	"domain_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "white_label_configs_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "white_label_configs_custom_domain_unique" UNIQUE("custom_domain")
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"name" text DEFAULT 'Default Key' NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"monthly_call_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "api_key_usage_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"method" text DEFAULT 'POST' NOT NULL,
	"status_code" integer DEFAULT 200 NOT NULL,
	"response_time_ms" integer,
	"token_usage" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"system_instance_id" integer,
	"platform" text NOT NULL,
	"content" text NOT NULL,
	"media_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"link_url" text,
	"scheduled_at" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"platform_post_id" text,
	"published_url" text,
	"error_message" text,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"name" text NOT NULL,
	"business_type" text DEFAULT 'custom' NOT NULL,
	"revenue_model" text,
	"website_url" text,
	"origin" text DEFAULT 'imported' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"system_instance_id" integer,
	"notes" text,
	"client_workspace_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"connection_type" text DEFAULT 'other' NOT NULL,
	"platform_name" text NOT NULL,
	"user_credential_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_health_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"overall_health" integer NOT NULL,
	"automation_score" integer NOT NULL,
	"growth_score" integer NOT NULL,
	"marketing_score" integer NOT NULL,
	"seo_score" integer NOT NULL,
	"content_score" integer NOT NULL,
	"summary" text,
	"revenue_opportunities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"operational_risks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"missing_integrations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estimated_growth_potential" text,
	"owner_user_id" integer NOT NULL,
	"team_workspace_id" integer,
	"source_engine" text DEFAULT 'business_intelligence' NOT NULL,
	"created_by_user_id" integer,
	"updated_by_user_id" integer,
	"governance_status" text DEFAULT 'active' NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"project_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_operations_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"permissions" jsonb DEFAULT '{"monitorOnly":true,"draftContent":false,"schedulePosts":false,"autoFixLowRisk":false,"autoFixHighRisk":false}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_operations_settings_business_id_key" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "pending_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"category" text NOT NULL,
	"risk_level" text DEFAULT 'high' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolved_at" timestamp with time zone,
	"executed_at" timestamp with time zone,
	"reverted_at" timestamp with time zone,
	"undo_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_health_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_instance_id" integer NOT NULL,
	"overall_score" integer,
	"status" text DEFAULT 'healthy' NOT NULL,
	"connection_score" integer,
	"hosting_score" integer,
	"api_score" integer,
	"seo_score" integer,
	"performance_score" integer,
	"security_score" integer,
	"revenue_score" integer,
	"automation_score" integer,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_health_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"overall_score" integer,
	"status" text DEFAULT 'healthy' NOT NULL,
	"connection_score" integer,
	"hosting_score" integer,
	"api_score" integer,
	"seo_score" integer,
	"performance_score" integer,
	"security_score" integer,
	"revenue_score" integer,
	"automation_score" integer,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"owner_user_id" integer NOT NULL,
	"team_workspace_id" integer,
	"source_engine" text DEFAULT 'business_intelligence' NOT NULL,
	"created_by_user_id" integer,
	"updated_by_user_id" integer,
	"governance_status" text DEFAULT 'active' NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"project_id" integer,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitoring_log_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_instance_id" integer,
	"business_id" integer,
	"event_type" text DEFAULT 'health_check' NOT NULL,
	"action" text,
	"status" text DEFAULT 'success' NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landing_page_preview_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"preview_token" text NOT NULL,
	"user_id" integer NOT NULL,
	"page_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "landing_page_preview_sessions_preview_token_unique" UNIQUE("preview_token")
);
--> statement-breakpoint
CREATE TABLE "ash_lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope_type" text NOT NULL,
	"scope_key" text NOT NULL,
	"scope_label" text,
	"sample_size" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"total_revenue_cents" bigint DEFAULT 0 NOT NULL,
	"avg_revenue_cents" integer DEFAULT 0 NOT NULL,
	"avg_health" integer,
	"top_tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"outcome" text DEFAULT 'emerging' NOT NULL,
	"summary" text NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_distilled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ash_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"goal_text" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estimated_completion" text,
	"completion_criteria" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ash_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"system_instance_id" integer,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"objective" text,
	"current_phase" text,
	"current_task_id" integer,
	"business_type" text,
	"revenue_goal" text,
	"connected_services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_tool_stack" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ash_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"goal_id" integer,
	"milestone_id" integer,
	"description" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"assigned_engine" text DEFAULT 'ai_orchestrator' NOT NULL,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"result" jsonb,
	"priority_score" integer DEFAULT 50 NOT NULL,
	"complexity_score" integer DEFAULT 50 NOT NULL,
	"dependency_score" integer DEFAULT 0 NOT NULL,
	"estimated_duration_minutes" integer,
	"execution_order" integer,
	"blocked_reason" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_failure_reason" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ash_project_memory" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"type" text DEFAULT 'business_note' NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"importance_score" integer DEFAULT 50 NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence_score" integer DEFAULT 100 NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_memory" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"business_model" text,
	"products" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"customers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"competitors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"revenue_goals" text,
	"marketing_strategy" text,
	"seo_strategy" text,
	"automation_strategy" text,
	"importance_score" integer DEFAULT 50 NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence_score" integer DEFAULT 100 NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"owner_user_id" integer NOT NULL,
	"team_workspace_id" integer,
	"source_engine" text DEFAULT 'business_intelligence' NOT NULL,
	"created_by_user_id" integer,
	"updated_by_user_id" integer,
	"governance_status" text DEFAULT 'active' NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"project_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ash_knowledge_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"source_project_id" integer,
	"scope" text DEFAULT 'global' NOT NULL,
	"business_id" integer,
	"category" text DEFAULT 'playbook' NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"key_findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_project_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"importance_score" integer DEFAULT 50 NOT NULL,
	"confidence_score" integer DEFAULT 100 NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"owner_user_id" integer NOT NULL,
	"team_workspace_id" integer,
	"source_engine" text DEFAULT 'business_intelligence' NOT NULL,
	"created_by_user_id" integer,
	"updated_by_user_id" integer,
	"governance_status" text DEFAULT 'active' NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ash_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"goal_id" integer,
	"title" text NOT NULL,
	"description" text,
	"phase" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ash_plan_decisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"task_id" integer,
	"decision" text DEFAULT 'proceed' NOT NULL,
	"goal_alignment_score" integer DEFAULT 50 NOT NULL,
	"confidence_score" integer DEFAULT 50 NOT NULL,
	"risk_level" text DEFAULT 'low' NOT NULL,
	"risks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_resources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selected_path" text,
	"reasoning" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ash_research_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"source_project_id" integer,
	"knowledge_entry_id" integer,
	"profile_type" text NOT NULL,
	"name" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ash_research_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer,
	"research_type" text DEFAULT 'business' NOT NULL,
	"objective" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"plan" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reused_existing_knowledge" integer DEFAULT 0 NOT NULL,
	"sources_count" integer DEFAULT 0 NOT NULL,
	"avg_reliability_score" integer,
	"findings_summary" text,
	"result_knowledge_entry_id" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "business_dna_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"field_key" text NOT NULL,
	"current_value" jsonb NOT NULL,
	"confidence_score" integer DEFAULT 50 NOT NULL,
	"trust_level" text DEFAULT 'low_confidence_inference' NOT NULL,
	"source" text NOT NULL,
	"reasoning" text,
	"version" integer DEFAULT 1 NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"owner_user_id" integer NOT NULL,
	"team_workspace_id" integer,
	"source_engine" text DEFAULT 'business_intelligence' NOT NULL,
	"created_by_user_id" integer,
	"updated_by_user_id" integer,
	"governance_status" text DEFAULT 'active' NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"project_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_dna_conflicts" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"claim_id" integer NOT NULL,
	"field_key" text NOT NULL,
	"current_value" jsonb NOT NULL,
	"incoming_value" jsonb NOT NULL,
	"current_trust_level" text NOT NULL,
	"incoming_trust_level" text NOT NULL,
	"incoming_confidence_score" integer NOT NULL,
	"incoming_source" text NOT NULL,
	"incoming_reasoning" text,
	"impact_score" integer DEFAULT 20 NOT NULL,
	"impact_reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_by_user_id" integer,
	"resolution" text,
	"resolved_at" timestamp with time zone,
	"owner_user_id" integer NOT NULL,
	"team_workspace_id" integer,
	"source_engine" text DEFAULT 'business_intelligence' NOT NULL,
	"created_by_user_id" integer,
	"updated_by_user_id" integer,
	"governance_status" text DEFAULT 'active' NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"project_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_dna_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"claim_id" integer NOT NULL,
	"business_id" integer NOT NULL,
	"version" integer NOT NULL,
	"value" jsonb NOT NULL,
	"confidence_score" integer NOT NULL,
	"trust_level" text NOT NULL,
	"source" text NOT NULL,
	"reasoning" text,
	"change_type" text NOT NULL,
	"owner_user_id" integer NOT NULL,
	"team_workspace_id" integer,
	"source_engine" text DEFAULT 'business_intelligence' NOT NULL,
	"created_by_user_id" integer,
	"updated_by_user_id" integer,
	"governance_status" text DEFAULT 'active' NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"project_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_domain_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"project_id" integer,
	"event_type" text NOT NULL,
	"source" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedupe_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp with time zone,
	"error_message" text,
	"owner_user_id" integer NOT NULL,
	"team_workspace_id" integer,
	"source_engine" text DEFAULT 'business_intelligence' NOT NULL,
	"created_by_user_id" integer,
	"updated_by_user_id" integer,
	"governance_status" text DEFAULT 'active' NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_review_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"conflict_id" integer,
	"kind" text NOT NULL,
	"priority" integer DEFAULT 50 NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"owner_user_id" integer NOT NULL,
	"team_workspace_id" integer,
	"source_engine" text DEFAULT 'business_intelligence' NOT NULL,
	"created_by_user_id" integer,
	"updated_by_user_id" integer,
	"governance_status" text DEFAULT 'active' NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"project_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_timeline_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"project_id" integer,
	"event_type" text NOT NULL,
	"source" text NOT NULL,
	"description" text NOT NULL,
	"trigger" text NOT NULL,
	"related_objects" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"owner_user_id" integer NOT NULL,
	"team_workspace_id" integer,
	"source_engine" text DEFAULT 'business_intelligence' NOT NULL,
	"created_by_user_id" integer,
	"updated_by_user_id" integer,
	"governance_status" text DEFAULT 'active' NOT NULL,
	"record_version" integer DEFAULT 1 NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_trail_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_user_id" integer,
	"business_id" integer,
	"record_table" text NOT NULL,
	"record_id" integer NOT NULL,
	"action" text NOT NULL,
	"source_engine" text NOT NULL,
	"actor_type" text DEFAULT 'system' NOT NULL,
	"actor_user_id" integer,
	"changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cognitive_artifacts" (
	"id" text PRIMARY KEY NOT NULL,
	"artifact_type" text NOT NULL,
	"source_brain" text DEFAULT 'executive-brain' NOT NULL,
	"decision_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"confidence_overall" text DEFAULT 'unknown' NOT NULL,
	"confidence_reasoning" text,
	"confidence_capability" text,
	"confidence_brain_selection" text,
	"brains_selected" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"capabilities_used" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"executive_brain_version" text,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"relationships" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"objective_text" text,
	"user_id" integer,
	"project_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cognitive_clusters" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cluster_type" text DEFAULT 'manual' NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cognitive_cluster_members" (
	"id" text PRIMARY KEY NOT NULL,
	"cluster_id" text NOT NULL,
	"artifact_id" text NOT NULL,
	"membership_reason" text,
	"added_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cognitive_cluster_members_unique" UNIQUE("cluster_id","artifact_id")
);
--> statement-breakpoint
CREATE TABLE "cognitive_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"source_artifact_id" text NOT NULL,
	"target_artifact_id" text NOT NULL,
	"relationship_type" text NOT NULL,
	"created_by" text NOT NULL,
	"creation_reason" text NOT NULL,
	"confidence" text DEFAULT 'unknown' NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "context_entity_links" (
	"id" text PRIMARY KEY NOT NULL,
	"context_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"relationship_description" text,
	"added_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "context_entity_links_unique" UNIQUE("context_id","entity_type","entity_id")
);
--> statement-breakpoint
CREATE TABLE "context_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"context_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"objective_text" text,
	"active_objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active_constraints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active_priorities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active_risks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_artifact_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_cluster_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_brain_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_capability_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"environmental_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"conflict_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resolution_strategy" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "context_timeline_events" (
	"id" text PRIMARY KEY NOT NULL,
	"context_id" text NOT NULL,
	"event_type" text NOT NULL,
	"changed_field" text,
	"old_value" jsonb,
	"new_value" jsonb,
	"reason" text,
	"triggered_by" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executive_contexts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" text NOT NULL,
	"context_type" text DEFAULT 'operational' NOT NULL,
	"description" text,
	"purpose" text,
	"mission" text,
	"scope" text,
	"objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"constraints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"priorities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stakeholders" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"success_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"failure_conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"confidence" text DEFAULT 'unknown' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executive_judgments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"decision_objective" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selected_option_key" text,
	"composite_scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"decision_score" real,
	"confidence_score" real,
	"risk_score" real,
	"opportunity_score" real,
	"complexity_score" real,
	"strategic_alignment" text,
	"supporting_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_context_snapshot_id" text,
	"related_artifact_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_cluster_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"constraints_used" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scoring_weights" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"decision_rationale" text,
	"alternative_rankings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"explanation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executive_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"parent_goal_id" text,
	"name" text NOT NULL,
	"description" text,
	"goal_type" text DEFAULT 'operational' NOT NULL,
	"category" text DEFAULT 'custom' NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"importance" real DEFAULT 50 NOT NULL,
	"urgency" real DEFAULT 50 NOT NULL,
	"strategic_value" real DEFAULT 50 NOT NULL,
	"risk" real DEFAULT 50 NOT NULL,
	"opportunity" real DEFAULT 50 NOT NULL,
	"confidence" real DEFAULT 50 NOT NULL,
	"priority_score" real DEFAULT 50 NOT NULL,
	"progress_pct" real DEFAULT 0 NOT NULL,
	"owner_brain" text,
	"success_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"failure_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"constraints_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metrics_definition" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"related_context_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_judgment_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_artifact_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_cluster_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_goal_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_date" timestamp with time zone,
	"completion_date" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"goal_id" text NOT NULL,
	"depends_on_goal_id" text NOT NULL,
	"dependency_type" text DEFAULT 'requires' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"goal_id" text NOT NULL,
	"metric_key" text NOT NULL,
	"metric_value" real,
	"unit" text,
	"target_value" real,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_progress_history" (
	"id" text PRIMARY KEY NOT NULL,
	"goal_id" text NOT NULL,
	"progress_pct" real NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executive_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"goal_id" text,
	"parent_plan_id" text,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"planning_strategy" text DEFAULT 'top_down' NOT NULL,
	"estimated_duration_days" real,
	"estimated_complexity" real DEFAULT 50 NOT NULL,
	"estimated_cost" real,
	"estimated_risk" real DEFAULT 50 NOT NULL,
	"estimated_confidence" real DEFAULT 50 NOT NULL,
	"priority" real DEFAULT 50 NOT NULL,
	"success_probability" real DEFAULT 50 NOT NULL,
	"overall_score" real DEFAULT 50 NOT NULL,
	"score_dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_alternative" boolean DEFAULT false NOT NULL,
	"assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"constraints_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_resources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_context_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_judgment_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_goal_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_artifact_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_knowledge_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"target_id" text NOT NULL,
	"source_type" text DEFAULT 'plan' NOT NULL,
	"dependency_type" text DEFAULT 'requires' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_history" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"event_type" text DEFAULT 'revision' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"note" text,
	"decided_by" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"metric_key" text NOT NULL,
	"metric_value" real,
	"unit" text,
	"target_value" real,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"parent_milestone_id" text,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"progress_pct" real DEFAULT 0 NOT NULL,
	"estimated_duration_days" real,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"milestone_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"estimated_effort_hours" real,
	"required_capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"depends_on_step_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assigned_brain" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_history" (
	"id" text PRIMARY KEY NOT NULL,
	"execution_id" text NOT NULL,
	"step_id" text,
	"event_type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"note" text,
	"triggered_by" text,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"execution_id" text NOT NULL,
	"step_id" text,
	"metric_key" text NOT NULL,
	"metric_value" real,
	"unit" text,
	"target_value" real,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_recovery_points" (
	"id" text PRIMARY KEY NOT NULL,
	"execution_id" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"state_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_step_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"source_execution_id" text NOT NULL,
	"target_id" text NOT NULL,
	"target_type" text NOT NULL,
	"relationship_type" text DEFAULT 'related' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"execution_id" text NOT NULL,
	"plan_step_id" text,
	"milestone_id" text,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"success" boolean,
	"failure_reason" text,
	"skipped_reason" text,
	"adapter_type" text,
	"adapter_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"adapter_result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executive_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"plan_id" text,
	"goal_id" text,
	"judgment_id" text,
	"context_snapshot_id" text,
	"parent_execution_id" text,
	"current_milestone_id" text,
	"current_step_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"previous_status" text,
	"progress_pct" real DEFAULT 0 NOT NULL,
	"total_steps" integer DEFAULT 0 NOT NULL,
	"completed_steps" integer DEFAULT 0 NOT NULL,
	"failed_steps" integer DEFAULT 0 NOT NULL,
	"skipped_steps" integer DEFAULT 0 NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"success" boolean,
	"failure_reason" text,
	"cancellation_reason" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"resumed_at" timestamp with time zone,
	"related_memory_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_context_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_judgment_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_plan_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_goal_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"adapter_type" text,
	"adapter_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"adapter_result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executive_observations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"source_system" text NOT NULL,
	"source_object_id" text,
	"source_object_type" text,
	"event_type" text NOT NULL,
	"event_category" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"attention_score" real DEFAULT 0 NOT NULL,
	"attention_dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"signal_type" text DEFAULT 'unknown' NOT NULL,
	"observed_state" text,
	"previous_state" text,
	"chain_id" text,
	"related_goal_id" text,
	"related_plan_id" text,
	"related_execution_id" text,
	"related_context_id" text,
	"related_judgment_id" text,
	"related_memory_id" text,
	"related_knowledge_id" text,
	"related_user_request_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observation_anomalies" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"anomaly_type" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"description" text NOT NULL,
	"source_object_id" text,
	"source_object_type" text,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observation_chain_members" (
	"id" text PRIMARY KEY NOT NULL,
	"chain_id" text NOT NULL,
	"observation_id" text NOT NULL,
	"position_in_chain" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observation_chains" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" text NOT NULL,
	"description" text,
	"anchor_object_id" text,
	"anchor_object_type" text,
	"observation_count" integer DEFAULT 0 NOT NULL,
	"first_observed_at" timestamp with time zone,
	"last_observed_at" timestamp with time zone,
	"signal_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"max_severity" text DEFAULT 'info' NOT NULL,
	"max_attention_score" real DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observation_correlations" (
	"id" text PRIMARY KEY NOT NULL,
	"source_observation_id" text NOT NULL,
	"target_observation_id" text NOT NULL,
	"correlation_type" text DEFAULT 'same_execution' NOT NULL,
	"strength" real DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observation_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"metric_key" text NOT NULL,
	"metric_value" real,
	"window_label" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observation_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"observation_id" text NOT NULL,
	"user_id" integer,
	"signal_type" text NOT NULL,
	"strength" real DEFAULT 0.5 NOT NULL,
	"description" text,
	"related_goal_id" text,
	"related_plan_id" text,
	"related_execution_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"emitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observation_trends" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"trend_type" text NOT NULL,
	"direction" text DEFAULT 'neutral' NOT NULL,
	"magnitude" real DEFAULT 0 NOT NULL,
	"window_start_at" timestamp with time zone NOT NULL,
	"window_end_at" timestamp with time zone NOT NULL,
	"sample_count" integer DEFAULT 0 NOT NULL,
	"description" text,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"anchor_object_id" text,
	"anchor_object_type" text,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_members" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"object_id" text NOT NULL,
	"object_type" text NOT NULL,
	"role" text DEFAULT 'participant' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_timelines" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"sequence_number" integer DEFAULT 0 NOT NULL,
	"event_type" text NOT NULL,
	"event_category" text NOT NULL,
	"event_description" text,
	"source_object_id" text,
	"source_object_type" text,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executive_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"root_request" text,
	"business_domain" text,
	"strategic_category" text,
	"primary_goal_id" text,
	"primary_plan_id" text,
	"primary_execution_id" text,
	"primary_chain_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_ms" integer,
	"completion_status" text DEFAULT 'in_progress' NOT NULL,
	"primary_outcome" text,
	"closed_at" timestamp with time zone,
	"is_closed" boolean DEFAULT false NOT NULL,
	"reflection_report_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reflection_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"case_id" text NOT NULL,
	"evidence_type" text NOT NULL,
	"source_object_id" text,
	"source_object_type" text,
	"summary" text NOT NULL,
	"strength" real DEFAULT 0.5 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reflection_factors" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"case_id" text NOT NULL,
	"user_id" integer,
	"factor_category" text NOT NULL,
	"factor_description" text NOT NULL,
	"influence_score" real DEFAULT 0.5 NOT NULL,
	"direction" text DEFAULT 'neutral' NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reflection_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text,
	"user_id" integer,
	"metric_key" text NOT NULL,
	"metric_value" real,
	"window_label" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reflection_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"user_id" integer,
	"executive_summary" text NOT NULL,
	"primary_factors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weaknesses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"missed_opportunities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unexpected_outcomes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"business_impact" text,
	"reflection_confidence" real DEFAULT 0.5 NOT NULL,
	"evidence_quality" real DEFAULT 0.5 NOT NULL,
	"overall_quality_score" real DEFAULT 0.5 NOT NULL,
	"produced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reflection_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"case_id" text NOT NULL,
	"user_id" integer,
	"score_dimension" text NOT NULL,
	"score" real DEFAULT 0.5 NOT NULL,
	"explanation" text NOT NULL,
	"evidence_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executive_principles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"business_domain" text DEFAULT 'general' NOT NULL,
	"strategic_category" text DEFAULT 'general' NOT NULL,
	"origin_cases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"supporting_evidence" real DEFAULT 0 NOT NULL,
	"contradictory_evidence" real DEFAULT 0 NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"reliability" real DEFAULT 0.5 NOT NULL,
	"novelty" real DEFAULT 0.5 NOT NULL,
	"generality" real DEFAULT 0.5 NOT NULL,
	"applicability" real DEFAULT 0.5 NOT NULL,
	"success_rate" real DEFAULT 0 NOT NULL,
	"failure_rate" real DEFAULT 0 NOT NULL,
	"times_observed" integer DEFAULT 0 NOT NULL,
	"times_confirmed" integer DEFAULT 0 NOT NULL,
	"times_contradicted" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"pattern_type" text,
	"pattern_frequency" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"validated_at" timestamp with time zone,
	"deprecated_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"report_id" text,
	"metric_key" text NOT NULL,
	"metric_value" real,
	"window_label" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"new_principle_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"strengthened_principle_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weakening_principle_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deprecated_principle_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_summary" text NOT NULL,
	"confidence_changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"business_impact" text,
	"learning_confidence" real DEFAULT 0.5 NOT NULL,
	"cases_analyzed" integer DEFAULT 0 NOT NULL,
	"reports_analyzed" integer DEFAULT 0 NOT NULL,
	"patterns_discovered" integer DEFAULT 0 NOT NULL,
	"principles_extracted" integer DEFAULT 0 NOT NULL,
	"principles_validated" integer DEFAULT 0 NOT NULL,
	"cycle_version" integer DEFAULT 1 NOT NULL,
	"produced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "principle_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_key" text NOT NULL,
	"category_type" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "principle_categories_category_key_unique" UNIQUE("category_key")
);
--> statement-breakpoint
CREATE TABLE "principle_contradictions" (
	"id" text PRIMARY KEY NOT NULL,
	"principle_id" text NOT NULL,
	"user_id" integer,
	"contradicting_case_id" text,
	"contradicting_report_id" text,
	"contradiction_type" text NOT NULL,
	"severity" real DEFAULT 0.5 NOT NULL,
	"description" text NOT NULL,
	"confidence_impact" real DEFAULT -0.05 NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "principle_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"principle_id" text NOT NULL,
	"user_id" integer,
	"case_id" text,
	"report_id" text,
	"evidence_type" text NOT NULL,
	"summary" text NOT NULL,
	"strength" real DEFAULT 0.5 NOT NULL,
	"business_domain" text,
	"quality_score" real,
	"outcome_status" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "principle_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"from_principle_id" text NOT NULL,
	"to_principle_id" text NOT NULL,
	"relation_type" text NOT NULL,
	"strength" real DEFAULT 0.5 NOT NULL,
	"user_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "principle_validation_hist" (
	"id" text PRIMARY KEY NOT NULL,
	"principle_id" text NOT NULL,
	"user_id" integer,
	"validation_result" text NOT NULL,
	"previous_status" text NOT NULL,
	"new_status" text NOT NULL,
	"min_observations_met" boolean DEFAULT false NOT NULL,
	"min_support_met" boolean DEFAULT false NOT NULL,
	"max_contradiction_met" boolean DEFAULT false NOT NULL,
	"min_confidence_met" boolean DEFAULT false NOT NULL,
	"business_significance_met" boolean DEFAULT false NOT NULL,
	"strategic_significance_met" boolean DEFAULT false NOT NULL,
	"confidence_at_validation" real DEFAULT 0 NOT NULL,
	"observations_at_validation" integer DEFAULT 0 NOT NULL,
	"failure_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"validated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "principle_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"principle_id" text NOT NULL,
	"user_id" integer,
	"version" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text NOT NULL,
	"confidence" real NOT NULL,
	"times_observed" integer DEFAULT 0 NOT NULL,
	"times_confirmed" integer DEFAULT 0 NOT NULL,
	"times_contradicted" integer DEFAULT 0 NOT NULL,
	"change_reason" text,
	"snapshot_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adaptation_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"policies_to_activate" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"policies_to_retire" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_profile_type" text DEFAULT 'balanced' NOT NULL,
	"expected_impact" text NOT NULL,
	"affected_cognitive_systems" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rollback_strategy" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"snapshot_id" text,
	"executed_at" timestamp with time zone,
	"rolled_back_at" timestamp with time zone,
	"governance_report_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "behavior_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" text NOT NULL,
	"profile_type" text DEFAULT 'balanced' NOT NULL,
	"description" text NOT NULL,
	"active_policy_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"policy_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"activated_at" timestamp with time zone,
	"deactivated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "behavior_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"profile_id" text,
	"profile_type" text NOT NULL,
	"active_policy_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"adaptation_plan_id" text,
	"reason" text NOT NULL,
	"is_rollback_point" boolean DEFAULT true NOT NULL,
	"rolled_back_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executive_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"source_principle_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"business_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"strategic_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"policy_type" text DEFAULT 'general' NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"guidance" text DEFAULT '' NOT NULL,
	"effective_date" timestamp with time zone,
	"expiration_date" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"conflict_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governance_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"report_id" text,
	"metric_key" text NOT NULL,
	"metric_value" real,
	"window_label" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governance_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"evaluated_principle_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approved_policy_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rejected_policy_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deferred_principle_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"conflicts_found" integer DEFAULT 0 NOT NULL,
	"behavior_changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rollback_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"executive_summary" text NOT NULL,
	"governance_confidence" real DEFAULT 0.5 NOT NULL,
	"adaptation_plan_id" text,
	"active_profile_id" text,
	"active_profile_type" text,
	"cycle_version" integer DEFAULT 1 NOT NULL,
	"produced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_conflicts" (
	"id" text PRIMARY KEY NOT NULL,
	"policy_id_a" text NOT NULL,
	"policy_id_b" text NOT NULL,
	"user_id" integer,
	"conflict_type" text NOT NULL,
	"severity" real DEFAULT 0.5 NOT NULL,
	"description" text NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"policy_id" text,
	"principle_id" text,
	"user_id" integer,
	"decision" text NOT NULL,
	"rationale" text NOT NULL,
	"confidence_at_decision" real,
	"reliability_at_decision" real,
	"observations_at_decision" integer,
	"conflicts_detected" integer DEFAULT 0 NOT NULL,
	"superseded_policy_id" text,
	"merged_into_id" text,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"policy_id" text NOT NULL,
	"user_id" integer,
	"version" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"guidance" text NOT NULL,
	"status" text NOT NULL,
	"priority" integer NOT NULL,
	"change_reason" text,
	"snapshot_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"from_node_id" text,
	"to_node_id" text,
	"dependency_type" text NOT NULL,
	"severity" real DEFAULT 0.5 NOT NULL,
	"description" text NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"from_node_id" text NOT NULL,
	"to_node_id" text NOT NULL,
	"edge_type" text NOT NULL,
	"label" text,
	"weight" real DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_health" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"overall_health" real DEFAULT 0.5 NOT NULL,
	"financial_health" real DEFAULT 0.5 NOT NULL,
	"marketing_health" real DEFAULT 0.5 NOT NULL,
	"sales_health" real DEFAULT 0.5 NOT NULL,
	"operational_health" real DEFAULT 0.5 NOT NULL,
	"product_health" real DEFAULT 0.5 NOT NULL,
	"growth_health" real DEFAULT 0.5 NOT NULL,
	"executive_health" real DEFAULT 0.5 NOT NULL,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"node_count" integer DEFAULT 0 NOT NULL,
	"kpi_count" integer DEFAULT 0 NOT NULL,
	"dependency_count" integer DEFAULT 0 NOT NULL,
	"critical_dependencies" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_kpis" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"node_id" text,
	"name" text NOT NULL,
	"kpi_type" text NOT NULL,
	"current_value" real,
	"target_value" real,
	"previous_value" real,
	"unit" text DEFAULT '' NOT NULL,
	"trend" text DEFAULT 'stable' NOT NULL,
	"period" text DEFAULT 'monthly' NOT NULL,
	"is_healthy" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"measured_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"kpi_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"value" real NOT NULL,
	"label" text,
	"period" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"node_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"lifecycle" text DEFAULT 'active' NOT NULL,
	"health" text DEFAULT 'unknown' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"owner_name" text,
	"priority" integer DEFAULT 5 NOT NULL,
	"risk" text DEFAULT 'medium' NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"business_value" real DEFAULT 0.5 NOT NULL,
	"strategic_importance" real DEFAULT 0.5 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"node_count" integer DEFAULT 0 NOT NULL,
	"edge_count" integer DEFAULT 0 NOT NULL,
	"kpi_count" integer DEFAULT 0 NOT NULL,
	"overall_health" real,
	"last_activity_at" timestamp with time zone,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_registry_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "business_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"node_count" integer DEFAULT 0 NOT NULL,
	"edge_count" integer DEFAULT 0 NOT NULL,
	"kpi_count" integer DEFAULT 0 NOT NULL,
	"health_score" real,
	"reason" text DEFAULT 'periodic' NOT NULL,
	"graph_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"report_id" text NOT NULL,
	"user_id" integer,
	"finding_count" integer DEFAULT 0 NOT NULL,
	"critical_findings" integer DEFAULT 0 NOT NULL,
	"high_findings" integer DEFAULT 0 NOT NULL,
	"bottleneck_count" integer DEFAULT 0 NOT NULL,
	"constraint_count" integer DEFAULT 0 NOT NULL,
	"leverage_count" integer DEFAULT 0 NOT NULL,
	"complexity_score" real DEFAULT 0.5 NOT NULL,
	"maturity_score" real DEFAULT 0.5 NOT NULL,
	"confidence_score" real DEFAULT 0.7 NOT NULL,
	"stability_score" real DEFAULT 0.5 NOT NULL,
	"computed_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analysis_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"report_count" integer DEFAULT 0 NOT NULL,
	"latest_report_id" text,
	"latest_complexity" real,
	"latest_maturity" real,
	"latest_confidence" real,
	"latest_stability" real,
	"last_analyzed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_registry_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "analysis_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"report_id" text NOT NULL,
	"user_id" integer,
	"node_count" integer DEFAULT 0 NOT NULL,
	"edge_count" integer DEFAULT 0 NOT NULL,
	"kpi_count" integer DEFAULT 0 NOT NULL,
	"health_score" real,
	"dep_count" integer DEFAULT 0 NOT NULL,
	"graph_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_analysis_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"report_version" integer DEFAULT 1 NOT NULL,
	"executive_summary" text DEFAULT '' NOT NULL,
	"business_overview" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"graph_analysis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"kpi_analysis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"health_analysis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"bottlenecks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"constraints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"leverage_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"business_stability" real DEFAULT 0.5 NOT NULL,
	"business_complexity_score" real DEFAULT 0.5 NOT NULL,
	"business_maturity_score" real DEFAULT 0.5 NOT NULL,
	"business_confidence" real DEFAULT 0.5 NOT NULL,
	"finding_count" integer DEFAULT 0 NOT NULL,
	"critical_finding_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_bottlenecks" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"report_id" text NOT NULL,
	"user_id" integer,
	"bottleneck_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" real DEFAULT 0.5 NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"business_impact" text DEFAULT '' NOT NULL,
	"confidence" real DEFAULT 0.7 NOT NULL,
	"affected_node_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_constraints" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"report_id" text NOT NULL,
	"user_id" integer,
	"constraint_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" real DEFAULT 0.5 NOT NULL,
	"affected_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"affected_node_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_findings" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"report_id" text NOT NULL,
	"user_id" integer,
	"category" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" real DEFAULT 0.7 NOT NULL,
	"business_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_node_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_kpi_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_health_dimensions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_leverage_points" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"report_id" text NOT NULL,
	"user_id" integer,
	"leverage_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"leverage_score" real DEFAULT 0.5 NOT NULL,
	"affected_node_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"affected_kpi_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executive_opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"report_id" text NOT NULL,
	"user_id" integer,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"discovery_source" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"business_impact" real DEFAULT 0.5 NOT NULL,
	"estimated_reach" real DEFAULT 0.5 NOT NULL,
	"estimated_effort" real DEFAULT 0.5 NOT NULL,
	"risk" real DEFAULT 0.3 NOT NULL,
	"confidence" real DEFAULT 0.7 NOT NULL,
	"strategic_value" real DEFAULT 0.5 NOT NULL,
	"composite_score" real DEFAULT 0.5 NOT NULL,
	"rank_position" integer,
	"priority_group" text DEFAULT 'medium' NOT NULL,
	"evidence_count" integer DEFAULT 0 NOT NULL,
	"analysis_report_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"evidence_type" text NOT NULL,
	"reference_id" text NOT NULL,
	"reference_type" text NOT NULL,
	"description" text NOT NULL,
	"weight" real DEFAULT 0.5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_rankings" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"opportunity_id" text NOT NULL,
	"rank_position" integer NOT NULL,
	"priority_group" text NOT NULL,
	"score_at_rank" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"total_discovered" integer DEFAULT 0 NOT NULL,
	"active_count" integer DEFAULT 0 NOT NULL,
	"resolved_count" integer DEFAULT 0 NOT NULL,
	"dismissed_count" integer DEFAULT 0 NOT NULL,
	"latest_report_id" text,
	"highest_score" real,
	"highest_confidence" real,
	"highest_business_value" real,
	"last_discovered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_registry_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "opportunity_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"analysis_report_id" text,
	"user_id" integer,
	"total_opportunities" integer DEFAULT 0 NOT NULL,
	"critical_opportunities" integer DEFAULT 0 NOT NULL,
	"high_priority_opportunities" integer DEFAULT 0 NOT NULL,
	"top_category" text,
	"highest_score" real,
	"avg_confidence" real,
	"discovery_duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"opportunity_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"report_id" text NOT NULL,
	"business_impact" real DEFAULT 0.5 NOT NULL,
	"estimated_reach" real DEFAULT 0.5 NOT NULL,
	"estimated_effort" real DEFAULT 0.5 NOT NULL,
	"risk" real DEFAULT 0.3 NOT NULL,
	"confidence" real DEFAULT 0.7 NOT NULL,
	"strategic_value" real DEFAULT 0.5 NOT NULL,
	"composite_score" real DEFAULT 0.5 NOT NULL,
	"scoring_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"report_id" text NOT NULL,
	"total_opportunities" integer DEFAULT 0 NOT NULL,
	"top_opportunity_id" text,
	"highest_score" real,
	"category_distribution" jsonb DEFAULT '{}' NOT NULL,
	"priority_distribution" jsonb DEFAULT '{}' NOT NULL,
	"source_distribution" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "future_scenarios" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"report_id" text NOT NULL,
	"user_id" integer,
	"opportunity_id" text,
	"scenario_name" text NOT NULL,
	"scenario_description" text NOT NULL,
	"scenario_type" text NOT NULL,
	"status" text DEFAULT 'generated' NOT NULL,
	"business_impact_summary" jsonb DEFAULT '{}' NOT NULL,
	"kpi_projection_summary" jsonb DEFAULT '{}' NOT NULL,
	"health_projection_summary" jsonb DEFAULT '{}' NOT NULL,
	"outcome_summary" jsonb DEFAULT '{}' NOT NULL,
	"risk_summary" jsonb DEFAULT '{}' NOT NULL,
	"overall_confidence" real DEFAULT 0.7 NOT NULL,
	"expected_value_score" real DEFAULT 0.5 NOT NULL,
	"growth_potential" real DEFAULT 0.5 NOT NULL,
	"automation_potential" real DEFAULT 0.5 NOT NULL,
	"risk_score" real DEFAULT 0.3 NOT NULL,
	"execution_complexity" real DEFAULT 0.5 NOT NULL,
	"assumption_count" integer DEFAULT 0 NOT NULL,
	"evidence_count" integer DEFAULT 0 NOT NULL,
	"analysis_report_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenario_branches" (
	"id" text PRIMARY KEY NOT NULL,
	"scenario_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"branch_type" text NOT NULL,
	"description" text NOT NULL,
	"probability" real DEFAULT 0.5 NOT NULL,
	"value_score" real DEFAULT 0.5 NOT NULL,
	"key_drivers" jsonb DEFAULT '[]' NOT NULL,
	"key_risks" jsonb DEFAULT '[]' NOT NULL,
	"kpi_impact" jsonb DEFAULT '{}' NOT NULL,
	"health_impact" jsonb DEFAULT '{}' NOT NULL,
	"financial_impact" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulation_assumptions" (
	"id" text PRIMARY KEY NOT NULL,
	"scenario_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"assumption_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"confidence" real DEFAULT 0.8 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulation_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"scenario_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"evidence_type" text NOT NULL,
	"reference_id" text NOT NULL,
	"reference_type" text NOT NULL,
	"description" text NOT NULL,
	"weight" real DEFAULT 0.5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulation_outcomes" (
	"id" text PRIMARY KEY NOT NULL,
	"scenario_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"outcome_type" text NOT NULL,
	"probability" real DEFAULT 0.5 NOT NULL,
	"kpi_impact" jsonb DEFAULT '{}' NOT NULL,
	"health_impact" jsonb DEFAULT '{}' NOT NULL,
	"financial_impact" jsonb DEFAULT '{}' NOT NULL,
	"operational_impact" jsonb DEFAULT '{}' NOT NULL,
	"risk_impact" jsonb DEFAULT '{}' NOT NULL,
	"confidence" real DEFAULT 0.7 NOT NULL,
	"known_unknowns" jsonb DEFAULT '[]' NOT NULL,
	"value_score" real DEFAULT 0.5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulation_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"latest_report_id" text,
	"simulation_count" integer DEFAULT 0 NOT NULL,
	"overall_confidence" numeric(5, 4) DEFAULT '0' NOT NULL,
	"rollback_confidence" numeric(5, 4) DEFAULT '0' NOT NULL,
	"is_simulation_complete" boolean DEFAULT false NOT NULL,
	"last_simulation_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "simulation_registry_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "simulation_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"scenario_count" integer DEFAULT 0 NOT NULL,
	"highest_confidence_scenario_id" text,
	"lowest_risk_scenario_id" text,
	"highest_value_scenario_id" text,
	"highest_growth_scenario_id" text,
	"highest_automation_scenario_id" text,
	"simulation_duration_ms" integer DEFAULT 0 NOT NULL,
	"executive_summary" text DEFAULT '' NOT NULL,
	"analysis_report_id" text,
	"opportunity_report_id" text,
	"avg_confidence" real,
	"avg_risk" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulation_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"snapshot_data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_confidence" (
	"id" text PRIMARY KEY NOT NULL,
	"decision_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"decision_confidence" real DEFAULT 0.7 NOT NULL,
	"evidence_score" real DEFAULT 0.7 NOT NULL,
	"data_completeness" real DEFAULT 0.7 NOT NULL,
	"assumption_stability" real DEFAULT 0.7 NOT NULL,
	"policy_compliance" real DEFAULT 1 NOT NULL,
	"overall_confidence" real DEFAULT 0.7 NOT NULL,
	"confidence_narrative" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_matrices" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"criterion" text NOT NULL,
	"criterion_weight" real DEFAULT 0.14 NOT NULL,
	"scenario_id" text NOT NULL,
	"scenario_type" text NOT NULL,
	"raw_score" real DEFAULT 0 NOT NULL,
	"weighted_score" real DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_rationales" (
	"id" text PRIMARY KEY NOT NULL,
	"decision_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"rationale_type" text NOT NULL,
	"dimension" text NOT NULL,
	"title" text NOT NULL,
	"explanation" text NOT NULL,
	"weight" real DEFAULT 0.5 NOT NULL,
	"supporting_evidence" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"total_decisions" integer DEFAULT 0 NOT NULL,
	"total_reports" integer DEFAULT 0 NOT NULL,
	"latest_report_id" text,
	"latest_primary_decision_id" text,
	"latest_primary_scenario_type" text,
	"latest_confidence" real,
	"latest_alignment_score" real,
	"last_decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "decision_registry_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "decision_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"simulation_report_id" text,
	"primary_decision_id" text,
	"decision_count" integer DEFAULT 0 NOT NULL,
	"alternative_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"overall_confidence" real,
	"strategic_alignment_score" real,
	"executive_summary" text DEFAULT '' NOT NULL,
	"decision_duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"report_id" text NOT NULL,
	"primary_decision_id" text,
	"decision_count" integer DEFAULT 0 NOT NULL,
	"overall_confidence" real,
	"strategic_alignment_score" real,
	"type_distribution" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_tradeoffs" (
	"id" text PRIMARY KEY NOT NULL,
	"decision_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"tradeoff_category" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"magnitude" real DEFAULT 0.5 NOT NULL,
	"certainty" real DEFAULT 0.7 NOT NULL,
	"time_horizon" text DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executive_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"scenario_id" text NOT NULL,
	"scenario_name" text NOT NULL,
	"scenario_type" text NOT NULL,
	"decision_type" text NOT NULL,
	"rank_position" integer DEFAULT 0 NOT NULL,
	"selection_score" real DEFAULT 0 NOT NULL,
	"expected_value_score" real DEFAULT 0 NOT NULL,
	"strategic_alignment_score" real DEFAULT 0 NOT NULL,
	"risk_score" real DEFAULT 0 NOT NULL,
	"confidence_score" real DEFAULT 0 NOT NULL,
	"complexity_score" real DEFAULT 0 NOT NULL,
	"resource_demand" real DEFAULT 0 NOT NULL,
	"governance_compliant" boolean DEFAULT true NOT NULL,
	"goal_alignment_score" real DEFAULT 0 NOT NULL,
	"rejection_reason" text,
	"alignment_profile" jsonb DEFAULT '{}' NOT NULL,
	"tradeoff_summary" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executive_strategies" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"decision_id" text,
	"scenario_type" text NOT NULL,
	"strategy_name" text NOT NULL,
	"strategy_description" text NOT NULL,
	"strategic_vision" text NOT NULL,
	"competitive_positioning" text NOT NULL,
	"time_horizon" text DEFAULT 'medium' NOT NULL,
	"alignment_score" real DEFAULT 0 NOT NULL,
	"confidence_score" real DEFAULT 0 NOT NULL,
	"completeness_score" real DEFAULT 0 NOT NULL,
	"business_value_score" real DEFAULT 0 NOT NULL,
	"sustainability_score" real DEFAULT 0 NOT NULL,
	"risk_score" real DEFAULT 0 NOT NULL,
	"pillar_count" integer DEFAULT 0 NOT NULL,
	"objective_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategic_constraints" (
	"id" text PRIMARY KEY NOT NULL,
	"strategy_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"constraint_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"impact" text DEFAULT 'medium' NOT NULL,
	"adaptation_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategic_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"strategy_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"dependency_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"mitigation_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategic_objectives" (
	"id" text PRIMARY KEY NOT NULL,
	"pillar_id" text NOT NULL,
	"strategy_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"objective_name" text NOT NULL,
	"objective_description" text NOT NULL,
	"success_criteria" text NOT NULL,
	"timeframe" text DEFAULT 'medium' NOT NULL,
	"priority" integer DEFAULT 3 NOT NULL,
	"alignment_score" real DEFAULT 0 NOT NULL,
	"confidence" real DEFAULT 0.7 NOT NULL,
	"business_impact" text DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategic_pillars" (
	"id" text PRIMARY KEY NOT NULL,
	"strategy_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"pillar_type" text NOT NULL,
	"pillar_name" text NOT NULL,
	"pillar_description" text NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"weight" real DEFAULT 0.11 NOT NULL,
	"alignment_score" real DEFAULT 0 NOT NULL,
	"objective_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"total_strategies" integer DEFAULT 0 NOT NULL,
	"total_reports" integer DEFAULT 0 NOT NULL,
	"latest_report_id" text,
	"latest_strategy_id" text,
	"latest_scenario_type" text,
	"latest_confidence" real,
	"latest_alignment_score" real,
	"latest_pillar_count" integer,
	"latest_objective_count" integer,
	"last_strategy_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "strategy_registry_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "strategy_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"decision_report_id" text,
	"primary_strategy_id" text,
	"strategy_count" integer DEFAULT 0 NOT NULL,
	"pillar_count" integer DEFAULT 0 NOT NULL,
	"objective_count" integer DEFAULT 0 NOT NULL,
	"dependency_count" integer DEFAULT 0 NOT NULL,
	"constraint_count" integer DEFAULT 0 NOT NULL,
	"overall_alignment_score" real,
	"overall_confidence" real,
	"completeness_score" real,
	"business_value_score" real,
	"sustainability_score" real,
	"executive_summary" text DEFAULT '' NOT NULL,
	"strategy_duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"report_id" text NOT NULL,
	"primary_strategy_id" text,
	"pillar_count" integer DEFAULT 0 NOT NULL,
	"objective_count" integer DEFAULT 0 NOT NULL,
	"overall_confidence" real,
	"overall_alignment_score" real,
	"pillar_type_distribution" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planning_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"dependency_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"from_entity_type" text,
	"from_entity_id" text,
	"to_entity_type" text,
	"to_entity_id" text,
	"severity" text DEFAULT 'medium' NOT NULL,
	"mitigation_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planning_milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"initiative_id" text NOT NULL,
	"program_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"milestone_type" text NOT NULL,
	"milestone_name" text NOT NULL,
	"milestone_description" text NOT NULL,
	"success_criteria" text NOT NULL,
	"sequence_position" integer DEFAULT 0 NOT NULL,
	"is_critical_path" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planning_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"total_plans" integer DEFAULT 0 NOT NULL,
	"total_reports" integer DEFAULT 0 NOT NULL,
	"latest_report_id" text,
	"latest_plan_id" text,
	"latest_program_count" integer,
	"latest_initiative_count" integer,
	"latest_milestone_count" integer,
	"latest_readiness_score" real,
	"latest_confidence" real,
	"last_planning_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planning_registry_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "planning_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"strategy_report_id" text,
	"primary_plan_id" text,
	"program_count" integer DEFAULT 0 NOT NULL,
	"initiative_count" integer DEFAULT 0 NOT NULL,
	"milestone_count" integer DEFAULT 0 NOT NULL,
	"dependency_count" integer DEFAULT 0 NOT NULL,
	"sequence_count" integer DEFAULT 0 NOT NULL,
	"overall_readiness_score" real,
	"overall_confidence" real,
	"completeness_score" real,
	"feasibility_score" real,
	"alignment_score" real,
	"executive_summary" text DEFAULT '' NOT NULL,
	"planning_duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planning_sequences" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_name" text NOT NULL,
	"sequence_layer" integer DEFAULT 0 NOT NULL,
	"sequence_position" integer DEFAULT 0 NOT NULL,
	"predecessor_ids" jsonb DEFAULT '[]' NOT NULL,
	"can_parallelise" integer DEFAULT 0 NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategic_initiatives" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"initiative_name" text NOT NULL,
	"initiative_description" text NOT NULL,
	"initiative_type" text NOT NULL,
	"effort" text DEFAULT 'medium' NOT NULL,
	"complexity" text DEFAULT 'medium' NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"sequence_position" integer DEFAULT 0 NOT NULL,
	"milestone_count" integer DEFAULT 0 NOT NULL,
	"alignment_score" real,
	"confidence" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategic_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"strategy_id" text,
	"strategy_report_id" text,
	"plan_name" text NOT NULL,
	"plan_description" text NOT NULL,
	"plan_horizon" text DEFAULT 'medium' NOT NULL,
	"program_count" integer DEFAULT 0 NOT NULL,
	"initiative_count" integer DEFAULT 0 NOT NULL,
	"milestone_count" integer DEFAULT 0 NOT NULL,
	"dependency_count" integer DEFAULT 0 NOT NULL,
	"readiness_score" real,
	"completeness_score" real,
	"feasibility_score" real,
	"alignment_score" real,
	"complexity_score" real,
	"risk_score" real,
	"confidence" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategic_programs" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"pillar_id" text,
	"pillar_type" text NOT NULL,
	"program_type" text NOT NULL,
	"program_name" text NOT NULL,
	"program_description" text NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"weight" real DEFAULT 0.11 NOT NULL,
	"expected_duration" text DEFAULT 'medium' NOT NULL,
	"initiative_count" integer DEFAULT 0 NOT NULL,
	"sequence_layer" integer DEFAULT 0 NOT NULL,
	"alignment_score" real,
	"confidence" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"dependency_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"from_domain_type" text,
	"to_domain_type" text,
	"severity" text DEFAULT 'medium' NOT NULL,
	"mitigation_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_domains" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"domain_type" text NOT NULL,
	"domain_name" text NOT NULL,
	"domain_description" text NOT NULL,
	"requirement_count" integer DEFAULT 0 NOT NULL,
	"gap_count" integer DEFAULT 0 NOT NULL,
	"critical_gap_count" integer DEFAULT 0 NOT NULL,
	"overall_maturity_score" real,
	"overall_readiness_score" real,
	"business_impact" text DEFAULT 'medium' NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_gaps" (
	"id" text PRIMARY KEY NOT NULL,
	"requirement_id" text NOT NULL,
	"domain_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"gap_type" text NOT NULL,
	"gap_title" text NOT NULL,
	"gap_description" text NOT NULL,
	"current_state" text NOT NULL,
	"required_state" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"closure_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"strategic_plan_id" text,
	"planning_report_id" text,
	"domain_count" integer DEFAULT 0 NOT NULL,
	"requirement_count" integer DEFAULT 0 NOT NULL,
	"gap_count" integer DEFAULT 0 NOT NULL,
	"critical_gap_count" integer DEFAULT 0 NOT NULL,
	"missing_capability_count" integer DEFAULT 0 NOT NULL,
	"dependency_count" integer DEFAULT 0 NOT NULL,
	"overall_readiness_score" real,
	"overall_maturity_score" real,
	"coverage_score" real,
	"completeness_score" real,
	"business_impact_score" real,
	"risk_score" real,
	"confidence" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_readiness" (
	"id" text PRIMARY KEY NOT NULL,
	"domain_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"domain_type" text NOT NULL,
	"maturity_score" real,
	"maturity_level" text DEFAULT 'basic' NOT NULL,
	"availability_score" real,
	"scalability_score" real,
	"reliability_score" real,
	"maintainability_score" real,
	"governance_score" real,
	"overall_readiness_score" real,
	"readiness_level" text DEFAULT 'developing' NOT NULL,
	"key_gap" text,
	"recommendation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"total_plans" integer DEFAULT 0 NOT NULL,
	"total_reports" integer DEFAULT 0 NOT NULL,
	"latest_report_id" text,
	"latest_plan_id" text,
	"latest_domain_count" integer,
	"latest_requirement_count" integer,
	"latest_gap_count" integer,
	"latest_critical_gap_count" integer,
	"latest_readiness_score" real,
	"latest_confidence" real,
	"last_capability_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capability_registry_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "capability_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"planning_report_id" text,
	"primary_plan_id" text,
	"domain_count" integer DEFAULT 0 NOT NULL,
	"requirement_count" integer DEFAULT 0 NOT NULL,
	"gap_count" integer DEFAULT 0 NOT NULL,
	"critical_gap_count" integer DEFAULT 0 NOT NULL,
	"missing_capability_count" integer DEFAULT 0 NOT NULL,
	"dependency_count" integer DEFAULT 0 NOT NULL,
	"overall_readiness_score" real,
	"overall_maturity_score" real,
	"overall_confidence" real,
	"coverage_score" real,
	"completeness_score" real,
	"executive_summary" text DEFAULT '' NOT NULL,
	"capability_duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_requirements" (
	"id" text PRIMARY KEY NOT NULL,
	"domain_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"program_id" text,
	"program_type" text,
	"capability_name" text NOT NULL,
	"capability_description" text NOT NULL,
	"required_level" text DEFAULT 'defined' NOT NULL,
	"current_level" text DEFAULT 'basic' NOT NULL,
	"gap_severity" text DEFAULT 'medium' NOT NULL,
	"business_criticality" text DEFAULT 'medium' NOT NULL,
	"is_missing" integer DEFAULT 0 NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"dependency_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"from_package_id" text,
	"to_package_id" text,
	"from_phase_type" text,
	"to_phase_type" text,
	"severity" text DEFAULT 'medium' NOT NULL,
	"mitigation_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_sequences" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"work_package_id" text NOT NULL,
	"sequence_position" integer NOT NULL,
	"phase_order" integer NOT NULL,
	"within_phase_order" integer NOT NULL,
	"prerequisite_package_ids" text DEFAULT '[]' NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_phases" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"phase_type" text NOT NULL,
	"phase_name" text NOT NULL,
	"phase_description" text NOT NULL,
	"phase_order" integer NOT NULL,
	"work_package_count" integer DEFAULT 0 NOT NULL,
	"critical_work_package_count" integer DEFAULT 0 NOT NULL,
	"readiness_score" real,
	"priority" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"capability_plan_id" text,
	"capability_report_id" text,
	"phase_count" integer DEFAULT 0 NOT NULL,
	"work_package_count" integer DEFAULT 0 NOT NULL,
	"dependency_count" integer DEFAULT 0 NOT NULL,
	"critical_dependency_count" integer DEFAULT 0 NOT NULL,
	"sequence_count" integer DEFAULT 0 NOT NULL,
	"execution_readiness_score" real,
	"execution_confidence" real,
	"completeness_score" real,
	"feasibility_score" real,
	"complexity_score" real,
	"risk_score" real,
	"readiness_score" real,
	"confidence_score" real,
	"overall_score" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_readiness" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"capability_readiness_score" real,
	"operational_readiness_score" real,
	"technology_readiness_score" real,
	"governance_readiness_score" real,
	"execution_confidence_score" real,
	"overall_readiness_score" real,
	"readiness_level" text DEFAULT 'developing' NOT NULL,
	"key_blocker" text,
	"recommendation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"total_plans" integer DEFAULT 0 NOT NULL,
	"total_reports" integer DEFAULT 0 NOT NULL,
	"latest_report_id" text,
	"latest_plan_id" text,
	"latest_phase_count" integer,
	"latest_work_package_count" integer,
	"latest_critical_dependency_count" integer,
	"latest_readiness_score" real,
	"latest_confidence" real,
	"latest_overall_score" real,
	"last_operational_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operational_registry_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "operational_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"capability_report_id" text,
	"primary_plan_id" text,
	"phase_count" integer DEFAULT 0 NOT NULL,
	"work_package_count" integer DEFAULT 0 NOT NULL,
	"dependency_count" integer DEFAULT 0 NOT NULL,
	"critical_dependency_count" integer DEFAULT 0 NOT NULL,
	"sequence_count" integer DEFAULT 0 NOT NULL,
	"execution_readiness_score" real,
	"execution_confidence" real,
	"overall_score" real,
	"executive_summary" text DEFAULT '' NOT NULL,
	"operational_duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"phase_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"capability_requirement_id" text,
	"capability_name" text NOT NULL,
	"package_title" text NOT NULL,
	"package_description" text NOT NULL,
	"outcome_statement" text NOT NULL,
	"phase_type" text NOT NULL,
	"complexity_level" text DEFAULT 'medium' NOT NULL,
	"business_criticality" text DEFAULT 'medium' NOT NULL,
	"effort_score" real,
	"sequence_position" integer,
	"priority" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"owner_id" text NOT NULL,
	"work_package_id" text NOT NULL,
	"package_title" text NOT NULL,
	"phase_type" text NOT NULL,
	"owner_type" text NOT NULL,
	"execution_class" text NOT NULL,
	"complexity_level" text DEFAULT 'medium' NOT NULL,
	"business_criticality" text DEFAULT 'medium' NOT NULL,
	"blocker_count" integer DEFAULT 0 NOT NULL,
	"policy_count" integer DEFAULT 0 NOT NULL,
	"readiness_score" real,
	"sequence_position" integer,
	"rationale" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_orchestration_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"total_plans" integer DEFAULT 0 NOT NULL,
	"total_reports" integer DEFAULT 0 NOT NULL,
	"latest_report_id" text,
	"latest_plan_id" text,
	"latest_assignment_count" integer,
	"latest_blocker_count" integer,
	"latest_critical_blocker_count" integer,
	"latest_automation_ratio" real,
	"latest_readiness_score" real,
	"latest_confidence" real,
	"latest_overall_score" real,
	"last_orchestration_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "execution_orchestration_registry_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "execution_owners" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"owner_type" text NOT NULL,
	"owner_name" text NOT NULL,
	"owner_description" text NOT NULL,
	"execution_class" text NOT NULL,
	"assignment_count" integer DEFAULT 0 NOT NULL,
	"average_complexity" text DEFAULT 'medium' NOT NULL,
	"readiness_score" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"operational_plan_id" text,
	"operational_report_id" text,
	"assignment_count" integer DEFAULT 0 NOT NULL,
	"owner_count" integer DEFAULT 0 NOT NULL,
	"queue_count" integer DEFAULT 0 NOT NULL,
	"blocker_count" integer DEFAULT 0 NOT NULL,
	"critical_blocker_count" integer DEFAULT 0 NOT NULL,
	"policy_count" integer DEFAULT 0 NOT NULL,
	"automated_count" integer DEFAULT 0 NOT NULL,
	"manual_count" integer DEFAULT 0 NOT NULL,
	"deferred_count" integer DEFAULT 0 NOT NULL,
	"automation_ratio" real,
	"execution_readiness_score" real,
	"execution_confidence" real,
	"overall_score" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"assignment_id" text,
	"policy_type" text NOT NULL,
	"policy_title" text NOT NULL,
	"policy_description" text NOT NULL,
	"policy_status" text DEFAULT 'satisfied' NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"requires_approval" integer DEFAULT 0 NOT NULL,
	"mitigation_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_queues" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"assignment_id" text NOT NULL,
	"work_package_id" text NOT NULL,
	"queue_position" integer NOT NULL,
	"phase_order" integer NOT NULL,
	"owner_type" text NOT NULL,
	"execution_class" text NOT NULL,
	"priority_score" real,
	"is_blocked" integer DEFAULT 0 NOT NULL,
	"blocker_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_readiness" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"operational_readiness_score" real,
	"capability_readiness_score" real,
	"policy_readiness_score" real,
	"dependency_readiness_score" real,
	"overall_readiness_score" real,
	"readiness_level" text DEFAULT 'developing' NOT NULL,
	"execution_confidence" real,
	"key_blocker" text,
	"recommendation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"operational_report_id" text,
	"primary_plan_id" text,
	"assignment_count" integer DEFAULT 0 NOT NULL,
	"owner_count" integer DEFAULT 0 NOT NULL,
	"queue_count" integer DEFAULT 0 NOT NULL,
	"blocker_count" integer DEFAULT 0 NOT NULL,
	"critical_blocker_count" integer DEFAULT 0 NOT NULL,
	"policy_count" integer DEFAULT 0 NOT NULL,
	"automated_count" integer DEFAULT 0 NOT NULL,
	"manual_count" integer DEFAULT 0 NOT NULL,
	"deferred_count" integer DEFAULT 0 NOT NULL,
	"automation_ratio" real,
	"execution_readiness_score" real,
	"execution_confidence" real,
	"overall_score" real,
	"executive_summary" text DEFAULT '' NOT NULL,
	"orchestration_duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authority_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"requirement_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"decision_type" text NOT NULL,
	"decision_rationale" text DEFAULT '' NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"approval_level" text DEFAULT 'none' NOT NULL,
	"confidence" numeric(5, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authority_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"requirement_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"granted_by" text DEFAULT 'system' NOT NULL,
	"grant_status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone,
	"authority_source" text DEFAULT 'implicit' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authority_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"orchestration_plan_id" text,
	"scope_count" integer DEFAULT 0 NOT NULL,
	"requirement_count" integer DEFAULT 0 NOT NULL,
	"granted_count" integer DEFAULT 0 NOT NULL,
	"pending_count" integer DEFAULT 0 NOT NULL,
	"denied_count" integer DEFAULT 0 NOT NULL,
	"dependency_count" integer DEFAULT 0 NOT NULL,
	"decision_count" integer DEFAULT 0 NOT NULL,
	"approval_required_count" integer DEFAULT 0 NOT NULL,
	"coverage_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"completeness_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"risk_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"trust_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"readiness_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"confidence_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"overall_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authority_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"latest_report_id" text,
	"latest_plan_id" text,
	"total_requirements" integer DEFAULT 0 NOT NULL,
	"granted_count" integer DEFAULT 0 NOT NULL,
	"pending_count" integer DEFAULT 0 NOT NULL,
	"denied_count" integer DEFAULT 0 NOT NULL,
	"missing_count" integer DEFAULT 0 NOT NULL,
	"authorization_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"authority_confidence" numeric(5, 4) DEFAULT '0' NOT NULL,
	"is_authorized" boolean DEFAULT false NOT NULL,
	"last_resolution_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authority_registry_business_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "authority_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"orchestration_report_id" text,
	"requirement_count" integer DEFAULT 0 NOT NULL,
	"granted_count" integer DEFAULT 0 NOT NULL,
	"pending_count" integer DEFAULT 0 NOT NULL,
	"denied_count" integer DEFAULT 0 NOT NULL,
	"expired_count" integer DEFAULT 0 NOT NULL,
	"unavailable_count" integer DEFAULT 0 NOT NULL,
	"missing_count" integer DEFAULT 0 NOT NULL,
	"approval_required_count" integer DEFAULT 0 NOT NULL,
	"authorization_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"authority_confidence" numeric(5, 4) DEFAULT '0' NOT NULL,
	"overall_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"is_authorized" boolean DEFAULT false NOT NULL,
	"executive_summary" text DEFAULT '' NOT NULL,
	"resolution_duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authority_requirements" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"assignment_id" text,
	"work_package_id" text,
	"authority_type" text NOT NULL,
	"scope_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"approval_level" text DEFAULT 'none' NOT NULL,
	"risk_level" text DEFAULT 'low' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authority_scopes" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"scope_type" text NOT NULL,
	"scope_target" text DEFAULT '' NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"requires_elevation" boolean DEFAULT false NOT NULL,
	"resolution_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authority_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"snapshot_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_risk_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"category" text NOT NULL,
	"risk_level" text DEFAULT 'low' NOT NULL,
	"risk_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"factors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_risk_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"from_category" text NOT NULL,
	"to_category" text NOT NULL,
	"dependency_reason" text DEFAULT '' NOT NULL,
	"is_critical" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_risk_mitigations" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"profile_id" text,
	"mitigation_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"applicable_to" text DEFAULT 'all' NOT NULL,
	"risk_categories_addressed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estimated_effort" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_risk_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"assignment_id" text NOT NULL,
	"work_package_id" text,
	"package_title" text,
	"owner_type" text NOT NULL,
	"execution_class" text NOT NULL,
	"complexity_level" text DEFAULT 'medium' NOT NULL,
	"business_criticality" text DEFAULT 'medium' NOT NULL,
	"operational_risk_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"financial_risk_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"security_risk_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"privacy_risk_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"compliance_risk_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"continuity_risk_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"overall_risk_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"overall_risk_level" text DEFAULT 'low' NOT NULL,
	"reversibility_level" text DEFAULT 'partially_reversible' NOT NULL,
	"rollback_complexity" text DEFAULT 'moderate' NOT NULL,
	"rollback_note" text DEFAULT '' NOT NULL,
	"category_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_risk_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"latest_report_id" text,
	"total_profiles" integer DEFAULT 0 NOT NULL,
	"mitigation_count" integer DEFAULT 0 NOT NULL,
	"overall_risk_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"overall_risk_level" text DEFAULT 'low' NOT NULL,
	"safety_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"rollback_readiness" numeric(5, 4) DEFAULT '0' NOT NULL,
	"highest_risk_category" text DEFAULT 'operational' NOT NULL,
	"is_safe_to_execute" boolean DEFAULT false NOT NULL,
	"last_assessment_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "execution_risk_registry_business_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "execution_risk_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"authority_report_id" text,
	"orchestration_report_id" text,
	"profile_count" integer DEFAULT 0 NOT NULL,
	"mitigation_count" integer DEFAULT 0 NOT NULL,
	"overall_risk_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"overall_risk_level" text DEFAULT 'low' NOT NULL,
	"safety_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"rollback_readiness" numeric(5, 4) DEFAULT '0' NOT NULL,
	"highest_risk_category" text DEFAULT 'operational' NOT NULL,
	"highest_risk_level" text DEFAULT 'low' NOT NULL,
	"is_safe_to_execute" boolean DEFAULT false NOT NULL,
	"executive_summary" text DEFAULT '' NOT NULL,
	"assessment_duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_risk_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"snapshot_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_safety_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"safety_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"rollback_readiness" numeric(5, 4) DEFAULT '0' NOT NULL,
	"reversibility_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"mitigation_coverage_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"overall_risk_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"highest_risk_category" text DEFAULT 'operational' NOT NULL,
	"highest_risk_level" text DEFAULT 'low' NOT NULL,
	"is_safe_to_execute" boolean DEFAULT false NOT NULL,
	"safety_narrative" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_simulation_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"risk_report_id" text,
	"authority_report_id" text,
	"orchestration_report_id" text,
	"simulation_count" integer DEFAULT 0 NOT NULL,
	"scenario_count" integer DEFAULT 0 NOT NULL,
	"overall_confidence" numeric(5, 4) DEFAULT '0' NOT NULL,
	"best_case_confidence" numeric(5, 4) DEFAULT '0' NOT NULL,
	"worst_case_confidence" numeric(5, 4) DEFAULT '0' NOT NULL,
	"estimated_duration_min" numeric(8, 2) DEFAULT '0' NOT NULL,
	"estimated_duration_expected" numeric(8, 2) DEFAULT '0' NOT NULL,
	"estimated_duration_max" numeric(8, 2) DEFAULT '0' NOT NULL,
	"estimated_duration_unit" text DEFAULT 'hours' NOT NULL,
	"rollback_confidence" numeric(5, 4) DEFAULT '0' NOT NULL,
	"is_simulation_complete" boolean DEFAULT false NOT NULL,
	"executive_summary" text DEFAULT '' NOT NULL,
	"simulation_duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_simulations" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"assignment_id" text NOT NULL,
	"work_package_id" text,
	"package_title" text,
	"owner_type" text NOT NULL,
	"execution_class" text NOT NULL,
	"complexity_level" text DEFAULT 'medium' NOT NULL,
	"business_criticality" text DEFAULT 'medium' NOT NULL,
	"scenario_count" integer DEFAULT 0 NOT NULL,
	"expected_outcome_summary" text DEFAULT '' NOT NULL,
	"predicted_duration_hours" numeric(8, 2) DEFAULT '0' NOT NULL,
	"resource_consumption_estimate" jsonb DEFAULT '{}' NOT NULL,
	"confidence_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"uncertainty_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predicted_outcomes" (
	"id" text PRIMARY KEY NOT NULL,
	"scenario_id" text NOT NULL,
	"simulation_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"outcome_type" text NOT NULL,
	"outcome_summary" text DEFAULT '' NOT NULL,
	"impact_severity" text DEFAULT 'low' NOT NULL,
	"impact_description" text DEFAULT '' NOT NULL,
	"dependencies_affected" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predicted_state_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"simulation_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"state_domain" text NOT NULL,
	"change_type" text NOT NULL,
	"affected_entity" text DEFAULT '' NOT NULL,
	"change_description" text DEFAULT '' NOT NULL,
	"is_reversible" boolean DEFAULT true NOT NULL,
	"is_critical" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rollback_simulations" (
	"id" text PRIMARY KEY NOT NULL,
	"simulation_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"rollback_confidence" numeric(5, 4) DEFAULT '0' NOT NULL,
	"recovery_complexity" text DEFAULT 'moderate' NOT NULL,
	"estimated_recovery_duration_hours" numeric(8, 2) DEFAULT '0' NOT NULL,
	"rollback_steps" jsonb DEFAULT '[]' NOT NULL,
	"rollback_notes" text DEFAULT '' NOT NULL,
	"is_rollback_feasible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulation_scenarios" (
	"id" text PRIMARY KEY NOT NULL,
	"simulation_id" text NOT NULL,
	"report_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"scenario_type" text NOT NULL,
	"scenario_title" text DEFAULT '' NOT NULL,
	"scenario_description" text DEFAULT '' NOT NULL,
	"probability" numeric(5, 4) DEFAULT '0' NOT NULL,
	"success_likelihood" numeric(5, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_workflows" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"simulation_report_id" text,
	"risk_report_id" text,
	"authority_report_id" text,
	"orchestration_report_id" text,
	"node_count" integer DEFAULT 0 NOT NULL,
	"edge_count" integer DEFAULT 0 NOT NULL,
	"checkpoint_count" integer DEFAULT 0 NOT NULL,
	"branch_count" integer DEFAULT 0 NOT NULL,
	"rollback_count" integer DEFAULT 0 NOT NULL,
	"phase_count" integer DEFAULT 0 NOT NULL,
	"workflow_complexity" text DEFAULT 'moderate' NOT NULL,
	"rollback_coverage" numeric(5, 4) DEFAULT '0' NOT NULL,
	"workflow_confidence" numeric(5, 4) DEFAULT '0' NOT NULL,
	"is_workflow_ready" boolean DEFAULT false NOT NULL,
	"executive_summary" text DEFAULT '' NOT NULL,
	"build_duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_branches" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"node_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"branch_condition" text NOT NULL,
	"target_node_id" text,
	"branch_description" text DEFAULT '' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_default_path" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_checkpoints" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"node_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"checkpoint_type" text DEFAULT 'pre_execution' NOT NULL,
	"expected_state" text DEFAULT '' NOT NULL,
	"required_validation" text DEFAULT '' NOT NULL,
	"rollback_marker" text DEFAULT '' NOT NULL,
	"success_criteria" text DEFAULT '' NOT NULL,
	"is_blocking" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"from_node_id" text NOT NULL,
	"to_node_id" text NOT NULL,
	"edge_type" text DEFAULT 'sequential' NOT NULL,
	"edge_label" text DEFAULT '' NOT NULL,
	"condition" text DEFAULT '' NOT NULL,
	"is_critical" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"assignment_id" text,
	"work_package_id" text,
	"package_title" text,
	"phase" text DEFAULT 'preparation' NOT NULL,
	"node_type" text DEFAULT 'task' NOT NULL,
	"node_title" text DEFAULT '' NOT NULL,
	"node_description" text DEFAULT '' NOT NULL,
	"sequence_position" integer DEFAULT 0 NOT NULL,
	"owner_type" text DEFAULT 'automation' NOT NULL,
	"execution_class" text DEFAULT 'automated' NOT NULL,
	"estimated_duration_hours" numeric(8, 2) DEFAULT '0' NOT NULL,
	"is_critical" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"latest_workflow_id" text,
	"node_count" integer DEFAULT 0 NOT NULL,
	"edge_count" integer DEFAULT 0 NOT NULL,
	"checkpoint_count" integer DEFAULT 0 NOT NULL,
	"rollback_coverage" numeric(5, 4) DEFAULT '0' NOT NULL,
	"workflow_confidence" numeric(5, 4) DEFAULT '0' NOT NULL,
	"is_workflow_ready" boolean DEFAULT false NOT NULL,
	"last_build_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_registry_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "workflow_rollbacks" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"node_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"rollback_target_node_id" text,
	"rollback_strategy" text DEFAULT 'checkpoint' NOT NULL,
	"rollback_steps" jsonb DEFAULT '[]' NOT NULL,
	"estimated_rollback_duration_hours" numeric(8, 2) DEFAULT '0' NOT NULL,
	"rollback_confidence" numeric(5, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"snapshot_data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_events" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"node_id" text,
	"business_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"event_description" text DEFAULT '' NOT NULL,
	"event_data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"node_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"evidence_type" text NOT NULL,
	"evidence_data" jsonb DEFAULT '{}' NOT NULL,
	"is_error" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"workflow_id" text,
	"workflow_node_id" text,
	"node_title" text DEFAULT '' NOT NULL,
	"node_type" text DEFAULT 'task' NOT NULL,
	"phase" text DEFAULT 'preparation' NOT NULL,
	"execution_class" text DEFAULT 'automated' NOT NULL,
	"owner_type" text DEFAULT 'automation' NOT NULL,
	"sequence_position" integer DEFAULT 0 NOT NULL,
	"is_critical" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"checkpoint_pre_validated" boolean DEFAULT false NOT NULL,
	"checkpoint_post_validated" boolean DEFAULT false NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"latest_session_id" text,
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"total_nodes_executed" integer DEFAULT 0 NOT NULL,
	"total_nodes_failed" integer DEFAULT 0 NOT NULL,
	"total_nodes_rolled_back" integer DEFAULT 0 NOT NULL,
	"success_rate" numeric(5, 4) DEFAULT '0' NOT NULL,
	"execution_health" text DEFAULT 'unknown' NOT NULL,
	"last_execution_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "execution_registry_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "execution_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"workflow_id" text,
	"is_workflow_ready" boolean DEFAULT false NOT NULL,
	"node_count" integer DEFAULT 0 NOT NULL,
	"started_node_count" integer DEFAULT 0 NOT NULL,
	"completed_node_count" integer DEFAULT 0 NOT NULL,
	"failed_node_count" integer DEFAULT 0 NOT NULL,
	"rolled_back_node_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"executive_summary" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"snapshot_data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_timelines" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"node_count" integer DEFAULT 0 NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"rolled_back_count" integer DEFAULT 0 NOT NULL,
	"total_duration_ms" integer DEFAULT 0 NOT NULL,
	"estimated_remaining_ms" integer DEFAULT 0 NOT NULL,
	"progress_pct" numeric(5, 4) DEFAULT '0' NOT NULL,
	"timeline_data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ue_execution_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"node_count" integer DEFAULT 0 NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"rolled_back_count" integer DEFAULT 0 NOT NULL,
	"success_rate" numeric(5, 4) DEFAULT '0' NOT NULL,
	"execution_health" text DEFAULT 'unknown' NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"executive_summary" text DEFAULT '' NOT NULL,
	"report_data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adapter_capabilities" (
	"id" text PRIMARY KEY NOT NULL,
	"adapter_id" text NOT NULL,
	"capability_key" text NOT NULL,
	"action_type" text DEFAULT '' NOT NULL,
	"resource_type" text DEFAULT '' NOT NULL,
	"platform" text DEFAULT '' NOT NULL,
	"api" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adapter_contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"adapter_id" text NOT NULL,
	"contract_type" text DEFAULT 'execution' NOT NULL,
	"input_schema" jsonb DEFAULT '{}' NOT NULL,
	"output_schema" jsonb DEFAULT '{}' NOT NULL,
	"error_schema" jsonb DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adapter_health" (
	"id" text PRIMARY KEY NOT NULL,
	"adapter_id" text NOT NULL,
	"health_status" text DEFAULT 'unknown' NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"error_message" text DEFAULT '' NOT NULL,
	"check_data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adapter_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"adapter_id" text NOT NULL,
	"permission_key" text NOT NULL,
	"permission_level" text DEFAULT 'read' NOT NULL,
	"resource_type" text DEFAULT '' NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adapter_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"adapter_type" text NOT NULL,
	"adapter_id" text,
	"total_installed" integer DEFAULT 0 NOT NULL,
	"total_enabled" integer DEFAULT 0 NOT NULL,
	"health" text DEFAULT 'unknown' NOT NULL,
	"capability_count" integer DEFAULT 0 NOT NULL,
	"last_health_check_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "adapter_registry_adapter_type_unique" UNIQUE("adapter_type")
);
--> statement-breakpoint
CREATE TABLE "adapter_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"adapter_id" text NOT NULL,
	"execution_session_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"result_summary" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adapter_telemetry" (
	"id" text PRIMARY KEY NOT NULL,
	"adapter_id" text NOT NULL,
	"session_id" text,
	"execution_class" text DEFAULT 'automated' NOT NULL,
	"action_type" text DEFAULT '' NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"success" boolean DEFAULT true NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_type" text DEFAULT '' NOT NULL,
	"capability_key" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adapter_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"adapter_id" text NOT NULL,
	"version" text NOT NULL,
	"previous_version" text DEFAULT '' NOT NULL,
	"changelog" text DEFAULT '' NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_adapters" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"adapter_type" text NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sandbox_enabled" boolean DEFAULT true NOT NULL,
	"is_builtin" boolean DEFAULT false NOT NULL,
	"manifest" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"capability_key" text NOT NULL,
	"adapter_type" text NOT NULL,
	"window_days" integer DEFAULT 30 NOT NULL,
	"uptime_percent" real DEFAULT 100 NOT NULL,
	"downtime_minutes" real DEFAULT 0 NOT NULL,
	"maintenance_window_start" timestamp,
	"maintenance_window_end" timestamp,
	"has_scheduled_maintenance" boolean DEFAULT false NOT NULL,
	"connectivity_status" text DEFAULT 'connected' NOT NULL,
	"interruption_count" integer DEFAULT 0 NOT NULL,
	"last_interruption_at" timestamp,
	"last_restoration_at" timestamp,
	"service_level" text DEFAULT 'standard' NOT NULL,
	"measured_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_forecasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"capability_key" text NOT NULL,
	"adapter_type" text NOT NULL,
	"forecast_type" text NOT NULL,
	"severity" text DEFAULT 'low' NOT NULL,
	"probability" real DEFAULT 0 NOT NULL,
	"expected_at" timestamp,
	"horizon_days" integer DEFAULT 30 NOT NULL,
	"trigger_condition" text NOT NULL,
	"current_value" real,
	"threshold_value" real,
	"rationale" text NOT NULL,
	"recommended_action" text NOT NULL,
	"is_admin_only" boolean DEFAULT false NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_optimizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"capability_key" text NOT NULL,
	"adapter_type" text NOT NULL,
	"optimization_type" text NOT NULL,
	"priority" text DEFAULT 'low' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"expected_impact" text NOT NULL,
	"effort" text DEFAULT 'low' NOT NULL,
	"is_admin_recommendation" boolean DEFAULT false NOT NULL,
	"admin_category" text,
	"is_applied" boolean DEFAULT false NOT NULL,
	"applied_at" timestamp,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_reliability" (
	"id" serial PRIMARY KEY NOT NULL,
	"capability_key" text NOT NULL,
	"adapter_type" text NOT NULL,
	"window_days" integer DEFAULT 7 NOT NULL,
	"total_executions" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"success_rate" real DEFAULT 0 NOT NULL,
	"failure_rate" real DEFAULT 0 NOT NULL,
	"avg_latency_ms" real DEFAULT 0 NOT NULL,
	"p95_latency_ms" real DEFAULT 0 NOT NULL,
	"p99_latency_ms" real DEFAULT 0 NOT NULL,
	"recovery_rate" real DEFAULT 0 NOT NULL,
	"consistency_score" real DEFAULT 0 NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"measured_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_type" text DEFAULT 'scheduled' NOT NULL,
	"total_capabilities" integer DEFAULT 0 NOT NULL,
	"healthy_count" integer DEFAULT 0 NOT NULL,
	"warning_count" integer DEFAULT 0 NOT NULL,
	"degraded_count" integer DEFAULT 0 NOT NULL,
	"critical_count" integer DEFAULT 0 NOT NULL,
	"unavailable_count" integer DEFAULT 0 NOT NULL,
	"avg_confidence" real DEFAULT 0 NOT NULL,
	"avg_success_rate" real DEFAULT 0 NOT NULL,
	"avg_latency_ms" real DEFAULT 0 NOT NULL,
	"open_forecasts" integer DEFAULT 0 NOT NULL,
	"open_optimizations" integer DEFAULT 0 NOT NULL,
	"admin_recommendation_count" integer DEFAULT 0 NOT NULL,
	"capability_details" jsonb DEFAULT '[]' NOT NULL,
	"snapshot_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ci_capability_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"capability_key" text NOT NULL,
	"adapter_type" text NOT NULL,
	"dependency_key" text NOT NULL,
	"dependency_type" text NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"dependency_health" text DEFAULT 'unknown' NOT NULL,
	"upstream_risk" text DEFAULT 'low' NOT NULL,
	"downstream_impact" text DEFAULT 'low' NOT NULL,
	"shared_with" jsonb DEFAULT '[]' NOT NULL,
	"assessed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ci_capability_health" (
	"id" serial PRIMARY KEY NOT NULL,
	"capability_key" text NOT NULL,
	"adapter_type" text NOT NULL,
	"status" text NOT NULL,
	"latency_ms" real,
	"success_rate" real DEFAULT 0 NOT NULL,
	"error_rate" real DEFAULT 0 NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	"check_duration_ms" real,
	"error_message" text,
	"diagnostics" jsonb DEFAULT '{}' NOT NULL,
	"triggered_by" text DEFAULT 'scheduler' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ci_capability_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"capability_key" text NOT NULL,
	"adapter_type" text NOT NULL,
	"adapter_ids" jsonb DEFAULT '[]' NOT NULL,
	"current_health" text DEFAULT 'unknown' NOT NULL,
	"current_readiness" text DEFAULT 'unknown' NOT NULL,
	"overall_confidence" real DEFAULT 0 NOT NULL,
	"success_rate" real DEFAULT 0 NOT NULL,
	"avg_latency_ms" real DEFAULT 0 NOT NULL,
	"total_executions" integer DEFAULT 0 NOT NULL,
	"total_failures" integer DEFAULT 0 NOT NULL,
	"last_evaluated_at" timestamp,
	"last_health_at" timestamp,
	"is_admin_restricted" boolean DEFAULT false NOT NULL,
	"meta" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ci_capability_registry_capability_key_unique" UNIQUE("capability_key")
);
--> statement-breakpoint
CREATE TABLE "infrastructure_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_type" text DEFAULT 'scheduled' NOT NULL,
	"total_resources" integer DEFAULT 0 NOT NULL,
	"healthy_count" integer DEFAULT 0 NOT NULL,
	"warning_count" integer DEFAULT 0 NOT NULL,
	"degraded_count" integer DEFAULT 0 NOT NULL,
	"critical_count" integer DEFAULT 0 NOT NULL,
	"unavailable_count" integer DEFAULT 0 NOT NULL,
	"avg_utilization_percent" real DEFAULT 0 NOT NULL,
	"overall_pressure" text DEFAULT 'none' NOT NULL,
	"platform_readiness" text DEFAULT 'unknown' NOT NULL,
	"open_alerts" integer DEFAULT 0 NOT NULL,
	"open_forecasts" integer DEFAULT 0 NOT NULL,
	"admin_recommendation_count" integer DEFAULT 0 NOT NULL,
	"resource_details" jsonb DEFAULT '[]' NOT NULL,
	"performance_summary" jsonb DEFAULT '{}' NOT NULL,
	"snapshot_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_infrastructure_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_key" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_name" text NOT NULL,
	"description" text,
	"current_health" text DEFAULT 'unknown' NOT NULL,
	"current_utilization_percent" real DEFAULT 0 NOT NULL,
	"total_capacity" real,
	"used_capacity" real,
	"available_capacity" real,
	"capacity_unit" text,
	"pressure_level" text DEFAULT 'none' NOT NULL,
	"is_admin_restricted" boolean DEFAULT true NOT NULL,
	"last_scanned_at" timestamp,
	"last_health_at" timestamp,
	"meta" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_infrastructure_registry_resource_key_unique" UNIQUE("resource_key")
);
--> statement-breakpoint
CREATE TABLE "platform_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"measurement_type" text NOT NULL,
	"resource_key" text,
	"throughput_rpm" real,
	"avg_latency_ms" real,
	"p95_latency_ms" real,
	"p99_latency_ms" real,
	"concurrent_workers" integer,
	"queue_depth" integer,
	"error_rate" real DEFAULT 0 NOT NULL,
	"utilization_percent" real DEFAULT 0 NOT NULL,
	"efficiency_score" real DEFAULT 0 NOT NULL,
	"bottleneck_resource" text,
	"bottleneck_severity" text DEFAULT 'none' NOT NULL,
	"measured_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_key" text NOT NULL,
	"resource_type" text NOT NULL,
	"alert_type" text NOT NULL,
	"severity" text DEFAULT 'low' NOT NULL,
	"message" text NOT NULL,
	"current_value" real,
	"threshold_value" real,
	"is_acknowledged" boolean DEFAULT false NOT NULL,
	"acknowledged_at" timestamp,
	"is_admin_only" boolean DEFAULT true NOT NULL,
	"triggered_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_capacity" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_key" text NOT NULL,
	"resource_type" text NOT NULL,
	"total_capacity" real DEFAULT 0 NOT NULL,
	"used_capacity" real DEFAULT 0 NOT NULL,
	"available_capacity" real DEFAULT 0 NOT NULL,
	"reserved_capacity" real DEFAULT 0 NOT NULL,
	"peak_used" real DEFAULT 0 NOT NULL,
	"utilization_percent" real DEFAULT 0 NOT NULL,
	"capacity_unit" text DEFAULT '%' NOT NULL,
	"growth_rate_per_day" real DEFAULT 0 NOT NULL,
	"days_to_exhaustion" real,
	"measured_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_key" text NOT NULL,
	"depends_on_key" text NOT NULL,
	"dependency_type" text NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"dependency_health" text DEFAULT 'unknown' NOT NULL,
	"cascade_risk" text DEFAULT 'low' NOT NULL,
	"shared_consumers" jsonb DEFAULT '[]' NOT NULL,
	"assessed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_forecasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_key" text NOT NULL,
	"resource_type" text NOT NULL,
	"forecast_type" text NOT NULL,
	"severity" text DEFAULT 'low' NOT NULL,
	"probability" real DEFAULT 0 NOT NULL,
	"expected_at" timestamp,
	"horizon_days" integer DEFAULT 30 NOT NULL,
	"current_utilization" real DEFAULT 0 NOT NULL,
	"projected_utilization" real DEFAULT 0 NOT NULL,
	"trigger_condition" text NOT NULL,
	"rationale" text NOT NULL,
	"recommended_action" text NOT NULL,
	"is_admin_only" boolean DEFAULT true NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_health" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_key" text NOT NULL,
	"resource_type" text NOT NULL,
	"status" text NOT NULL,
	"utilization_percent" real DEFAULT 0 NOT NULL,
	"pressure_level" text DEFAULT 'none' NOT NULL,
	"latency_ms" real,
	"error_rate" real DEFAULT 0 NOT NULL,
	"observed_at" timestamp DEFAULT now() NOT NULL,
	"triggered_by" text DEFAULT 'scan' NOT NULL,
	"diagnostics" jsonb DEFAULT '{}' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_key" text NOT NULL,
	"resource_type" text NOT NULL,
	"recommendation_type" text NOT NULL,
	"priority" text DEFAULT 'low' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"evidence" text NOT NULL,
	"current_utilization" real,
	"historical_trend" text,
	"predicted_exhaustion" text,
	"expected_improvement" text NOT NULL,
	"estimated_cost_impact" text,
	"confidence" real DEFAULT 0 NOT NULL,
	"alternatives" jsonb DEFAULT '[]' NOT NULL,
	"risks_if_ignored" text NOT NULL,
	"is_admin_only" boolean DEFAULT true NOT NULL,
	"is_applied" boolean DEFAULT false NOT NULL,
	"applied_at" timestamp,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technology_benchmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"technology_key" text NOT NULL,
	"scanned_at" timestamp DEFAULT now() NOT NULL,
	"performance_score" real,
	"reliability_score" real,
	"cost_score" real,
	"latency_score" real,
	"scalability_score" real,
	"maintenance_burden_score" real,
	"vendor_maturity_score" real,
	"community_adoption_score" real,
	"security_posture_score" real,
	"composite_score" real,
	"benchmark_notes" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "technology_capabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"technology_key" text NOT NULL,
	"capability_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"strength_score" real NOT NULL,
	"is_key_capability" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technology_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"vendor" text NOT NULL,
	"description" text NOT NULL,
	"website" text,
	"license_type" text,
	"pricing_model" text,
	"maturity_level" text NOT NULL,
	"open_source_url" text,
	"documentation_url" text,
	"is_admin_restricted" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "technology_catalog_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "technology_compatibility" (
	"id" serial PRIMARY KEY NOT NULL,
	"technology_key" text NOT NULL,
	"assessed_at" timestamp DEFAULT now() NOT NULL,
	"compatibility_level" text NOT NULL,
	"compatibility_score" real NOT NULL,
	"infrastructure_compatible" boolean DEFAULT true NOT NULL,
	"adapter_compatible" boolean DEFAULT true NOT NULL,
	"os_compatible" boolean DEFAULT true NOT NULL,
	"execution_model_compatible" boolean DEFAULT true NOT NULL,
	"integration_complexity" text NOT NULL,
	"blockers" text[],
	"requirements" text[],
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "technology_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"website" text,
	"founded_year" integer,
	"headquarters" text,
	"vendor_maturity_score" real,
	"community_adoption_score" real,
	"support_tier" text,
	"is_public_company" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "technology_providers_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "technology_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"technology_key" text NOT NULL,
	"recommendation_type" text NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"priority" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"evidence" text NOT NULL,
	"business_impact" text NOT NULL,
	"performance_impact" text NOT NULL,
	"cost_impact" text NOT NULL,
	"security_impact" text NOT NULL,
	"compatibility_score" real NOT NULL,
	"expected_improvement" text NOT NULL,
	"implementation_complexity" text NOT NULL,
	"operational_risk" text NOT NULL,
	"confidence" real NOT NULL,
	"alternatives" text[],
	"is_admin_only" boolean DEFAULT true NOT NULL,
	"is_applied" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technology_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"technology_key" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"vendor" text NOT NULL,
	"maturity_level" text NOT NULL,
	"composite_score" real,
	"compatibility_level" text,
	"compatibility_score" real,
	"open_recommendations" integer DEFAULT 0 NOT NULL,
	"last_scanned_at" timestamp DEFAULT now() NOT NULL,
	"is_admin_restricted" boolean DEFAULT true NOT NULL,
	CONSTRAINT "technology_registry_technology_key_unique" UNIQUE("technology_key")
);
--> statement-breakpoint
CREATE TABLE "technology_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL,
	"total_technologies" integer DEFAULT 0 NOT NULL,
	"total_providers" integer DEFAULT 0 NOT NULL,
	"category_counts" jsonb,
	"avg_composite_score" real,
	"compatible_count" integer DEFAULT 0 NOT NULL,
	"partial_count" integer DEFAULT 0 NOT NULL,
	"incompatible_count" integer DEFAULT 0 NOT NULL,
	"open_recommendations" integer DEFAULT 0 NOT NULL,
	"top_opportunities" text[],
	"technology_readiness" text NOT NULL,
	"innovation_score" real,
	"snapshot_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "conflict_graph" (
	"id" serial PRIMARY KEY NOT NULL,
	"technology_key_a" text NOT NULL,
	"technology_key_b" text NOT NULL,
	"conflict_type" text NOT NULL,
	"severity" text NOT NULL,
	"description" text NOT NULL,
	"resolution" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dependency_graph" (
	"id" serial PRIMARY KEY NOT NULL,
	"dependent_key" text NOT NULL,
	"dependency_key" text NOT NULL,
	"dependency_type" text NOT NULL,
	"reason" text,
	"is_currently_met" boolean DEFAULT true NOT NULL,
	"risk_if_missing" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship_clusters" (
	"id" serial PRIMARY KEY NOT NULL,
	"cluster_name" text NOT NULL,
	"cluster_type" text NOT NULL,
	"technologies" text[] NOT NULL,
	"cohesion_score" real NOT NULL,
	"primary_technology" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship_graph" (
	"id" serial PRIMARY KEY NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL,
	"total_nodes" integer DEFAULT 0 NOT NULL,
	"total_edges" integer DEFAULT 0 NOT NULL,
	"avg_degree" real,
	"network_density" real,
	"most_connected_technology" text,
	"most_connected_degree" integer,
	"relationship_type_counts" jsonb,
	"network_score" real,
	"graph_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "relationship_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"technology_key" text NOT NULL,
	"total_relationships" integer DEFAULT 0 NOT NULL,
	"outgoing_relationships" integer DEFAULT 0 NOT NULL,
	"incoming_relationships" integer DEFAULT 0 NOT NULL,
	"ecosystems" text[],
	"primary_ecosystem" text,
	"dependency_count" integer DEFAULT 0 NOT NULL,
	"dependent_count" integer DEFAULT 0 NOT NULL,
	"conflict_count" integer DEFAULT 0 NOT NULL,
	"synergy_score" real,
	"network_centrality_score" real,
	"last_built_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "relationship_registry_technology_key_unique" UNIQUE("technology_key")
);
--> statement-breakpoint
CREATE TABLE "relationship_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL,
	"total_relationships" integer DEFAULT 0 NOT NULL,
	"total_ecosystems" integer DEFAULT 0 NOT NULL,
	"total_clusters" integer DEFAULT 0 NOT NULL,
	"total_dependencies" integer DEFAULT 0 NOT NULL,
	"total_conflicts" integer DEFAULT 0 NOT NULL,
	"total_replacements" integer DEFAULT 0 NOT NULL,
	"network_score" real,
	"synergy_opportunities" integer DEFAULT 0 NOT NULL,
	"conflict_alerts" integer DEFAULT 0 NOT NULL,
	"migration_opportunities" integer DEFAULT 0 NOT NULL,
	"relationship_coverage" real,
	"snapshot_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "replacement_graph" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_technology_key" text NOT NULL,
	"target_technology_key" text NOT NULL,
	"replacement_type" text NOT NULL,
	"direction" text NOT NULL,
	"migration_complexity" text NOT NULL,
	"migration_risk" text NOT NULL,
	"estimated_effort" text,
	"rollback_strategy" text,
	"compatibility_confidence" real NOT NULL,
	"benefit_score" real NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technology_ecosystems" (
	"id" serial PRIMARY KEY NOT NULL,
	"ecosystem_name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text NOT NULL,
	"technologies" text[] NOT NULL,
	"core_technology" text,
	"maturity_score" real NOT NULL,
	"coherence_score" real NOT NULL,
	"coverage_score" real NOT NULL,
	"tech_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technology_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_technology_key" text NOT NULL,
	"target_technology_key" text NOT NULL,
	"relationship_type" text NOT NULL,
	"strength" real DEFAULT 1 NOT NULL,
	"directionality" text DEFAULT 'directed' NOT NULL,
	"description" text,
	"evidence" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technology_adoption" (
	"id" serial PRIMARY KEY NOT NULL,
	"technology_key" text NOT NULL,
	"enterprise_adoption_score" real NOT NULL,
	"developer_adoption_score" real NOT NULL,
	"community_maturity_score" real NOT NULL,
	"industry_acceptance_score" real NOT NULL,
	"adoption_stage" text NOT NULL,
	"fortune500_presence" text NOT NULL,
	"open_source_health" text,
	"ecosystem_size" text NOT NULL,
	"composite_adoption_score" real NOT NULL,
	"adoption_notes" text,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technology_change_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"technology_key" text NOT NULL,
	"event_type" text NOT NULL,
	"event_description" text NOT NULL,
	"previous_value" text,
	"new_value" text,
	"impact_level" text NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technology_evolution_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"technology_key" text NOT NULL,
	"lifecycle_stage" text NOT NULL,
	"trend_direction" text NOT NULL,
	"maturity_score" real NOT NULL,
	"stability_score" real NOT NULL,
	"adoption_score" real NOT NULL,
	"velocity_score" real NOT NULL,
	"confidence_score" real NOT NULL,
	"obsolescence_risk" real NOT NULL,
	"upgrade_urgency" text NOT NULL,
	"replacement_likelihood" text NOT NULL,
	"strategic_relevance" text NOT NULL,
	"overall_evolution_score" real NOT NULL,
	"last_rebuilt_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "technology_evolution_registry_technology_key_unique" UNIQUE("technology_key")
);
--> statement-breakpoint
CREATE TABLE "technology_evolution_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL,
	"total_technologies" integer DEFAULT 0 NOT NULL,
	"deprecation_alerts" integer DEFAULT 0 NOT NULL,
	"emerging_technologies" integer DEFAULT 0 NOT NULL,
	"stable_technologies" integer DEFAULT 0 NOT NULL,
	"upgrade_priorities" integer DEFAULT 0 NOT NULL,
	"average_maturity_score" real,
	"average_stability_score" real,
	"average_adoption_score" real,
	"average_confidence_score" real,
	"platform_evolution_score" real,
	"snapshot_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "technology_lifecycle" (
	"id" serial PRIMARY KEY NOT NULL,
	"technology_key" text NOT NULL,
	"lifecycle_stage" text NOT NULL,
	"maturity_score" real NOT NULL,
	"stability_score" real NOT NULL,
	"longevity_score" real NOT NULL,
	"support_status" text NOT NULL,
	"latest_major_version" text,
	"release_year" integer,
	"last_major_release_year" integer,
	"expected_eol_year" integer,
	"lifecycle_notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "technology_lifecycle_technology_key_unique" UNIQUE("technology_key")
);
--> statement-breakpoint
CREATE TABLE "technology_outlook" (
	"id" serial PRIMARY KEY NOT NULL,
	"technology_key" text NOT NULL,
	"expected_longevity_years" integer,
	"replacement_likelihood" text NOT NULL,
	"replacement_timeframe" text,
	"upgrade_urgency" text NOT NULL,
	"future_compatibility_score" real NOT NULL,
	"technology_confidence_score" real NOT NULL,
	"strategic_relevance" text NOT NULL,
	"risk_level" text NOT NULL,
	"obsolescence_risk" real NOT NULL,
	"innovation_potential" real NOT NULL,
	"outlook_notes" text,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technology_recommendations_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"technology_key" text NOT NULL,
	"recommendation_type" text NOT NULL,
	"priority" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"lifecycle_evidence" text NOT NULL,
	"trend_evidence" text NOT NULL,
	"business_impact" text NOT NULL,
	"migration_urgency" text NOT NULL,
	"operational_impact" text NOT NULL,
	"confidence" real NOT NULL,
	"alternatives" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technology_trends" (
	"id" serial PRIMARY KEY NOT NULL,
	"technology_key" text NOT NULL,
	"trend_direction" text NOT NULL,
	"adoption_velocity" real NOT NULL,
	"market_momentum" real NOT NULL,
	"community_growth_rate" real NOT NULL,
	"enterprise_interest_score" real NOT NULL,
	"job_market_trend" text NOT NULL,
	"github_stars_trend" text,
	"trend_notes" text,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technology_velocity" (
	"id" serial PRIMARY KEY NOT NULL,
	"technology_key" text NOT NULL,
	"release_frequency" text NOT NULL,
	"releases_per_year" real,
	"breaking_change_frequency" text NOT NULL,
	"maintenance_activity" text NOT NULL,
	"issue_resolution_speed" text NOT NULL,
	"backwards_compatibility_score" real NOT NULL,
	"operational_stability_score" real NOT NULL,
	"velocity_score" real NOT NULL,
	"velocity_notes" text,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sdi_feedback_loops" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_key" text NOT NULL,
	"loop_key" text NOT NULL,
	"loop_name" text NOT NULL,
	"loop_type" text NOT NULL,
	"direction" text NOT NULL,
	"strength" text NOT NULL,
	"strength_score" real NOT NULL,
	"trigger_condition" text NOT NULL,
	"effect" text NOT NULL,
	"components" text[] DEFAULT '{}' NOT NULL,
	"time_constant" text NOT NULL,
	"desirability" text NOT NULL,
	"loop_notes" text,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sdi_leverage_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_key" text NOT NULL,
	"leverage_key" text NOT NULL,
	"leverage_name" text NOT NULL,
	"leverage_type" text NOT NULL,
	"leverage_score" real NOT NULL,
	"expected_impact" real NOT NULL,
	"risk_score" real NOT NULL,
	"confidence_score" real NOT NULL,
	"description" text NOT NULL,
	"mechanism" text NOT NULL,
	"target_component" text NOT NULL,
	"affected_systems" text[] DEFAULT '{}' NOT NULL,
	"implementation_complexity" text NOT NULL,
	"time_to_impact" text NOT NULL,
	"leverage_notes" text,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sdi_propagation_paths" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_system_key" text NOT NULL,
	"target_system_key" text NOT NULL,
	"path_key" text NOT NULL,
	"propagation_type" text NOT NULL,
	"propagation_speed" text NOT NULL,
	"impact_magnitude" text NOT NULL,
	"impact_score" real NOT NULL,
	"probability" real NOT NULL,
	"hops_count" integer DEFAULT 1 NOT NULL,
	"intermediaries" text[] DEFAULT '{}' NOT NULL,
	"mitigation_exists" boolean DEFAULT false NOT NULL,
	"mitigation_notes" text,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sdi_subsystems" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_system_key" text NOT NULL,
	"subsystem_key" text NOT NULL,
	"subsystem_name" text NOT NULL,
	"subsystem_type" text NOT NULL,
	"role" text NOT NULL,
	"autonomy_level" text NOT NULL,
	"coupling_strength" text NOT NULL,
	"health_score" real DEFAULT 0 NOT NULL,
	"stability_score" real DEFAULT 0 NOT NULL,
	"is_bottleneck" boolean DEFAULT false NOT NULL,
	"is_critical" boolean DEFAULT false NOT NULL,
	"subsystem_notes" text,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sdi_system_constraints" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_key" text NOT NULL,
	"constraint_key" text NOT NULL,
	"constraint_name" text NOT NULL,
	"constraint_type" text NOT NULL,
	"severity" text NOT NULL,
	"severity_score" real NOT NULL,
	"description" text NOT NULL,
	"root_cause" text NOT NULL,
	"downstream_impact" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_actively_managed" boolean DEFAULT false NOT NULL,
	"resolution_path" text,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sdi_system_resilience" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_key" text NOT NULL,
	"robustness_score" real NOT NULL,
	"redundancy_score" real NOT NULL,
	"fault_tolerance_score" real NOT NULL,
	"recovery_capacity_score" real NOT NULL,
	"operational_resilience_score" real NOT NULL,
	"composite_resilience_score" real NOT NULL,
	"single_points_of_failure" integer DEFAULT 0 NOT NULL,
	"redundant_paths" integer DEFAULT 0 NOT NULL,
	"mean_time_to_recovery" text NOT NULL,
	"resilience_level" text NOT NULL,
	"vulnerabilities" text[] DEFAULT '{}' NOT NULL,
	"strengths" text[] DEFAULT '{}' NOT NULL,
	"resilience_notes" text,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sdi_systems" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_key" text NOT NULL,
	"system_name" text NOT NULL,
	"system_type" text NOT NULL,
	"description" text NOT NULL,
	"boundary_scope" text NOT NULL,
	"component_count" integer DEFAULT 0 NOT NULL,
	"connection_count" integer DEFAULT 0 NOT NULL,
	"stability_score" real DEFAULT 0 NOT NULL,
	"complexity_score" real DEFAULT 0 NOT NULL,
	"health_score" real DEFAULT 0 NOT NULL,
	"maturity_level" text NOT NULL,
	"critical_path" boolean DEFAULT false NOT NULL,
	"system_notes" text,
	"captured_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sdi_systems_system_key_unique" UNIQUE("system_key")
);
--> statement-breakpoint
CREATE TABLE "sdi_systems_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_key" text NOT NULL,
	"system_name" text NOT NULL,
	"system_type" text NOT NULL,
	"health_score" real DEFAULT 0 NOT NULL,
	"stability_score" real DEFAULT 0 NOT NULL,
	"resilience_score" real DEFAULT 0 NOT NULL,
	"complexity_score" real DEFAULT 0 NOT NULL,
	"constraint_count" integer DEFAULT 0 NOT NULL,
	"leverage_count" integer DEFAULT 0 NOT NULL,
	"feedback_loop_count" integer DEFAULT 0 NOT NULL,
	"propagation_risk_score" real DEFAULT 0 NOT NULL,
	"overall_system_score" real DEFAULT 0 NOT NULL,
	"top_constraint" text,
	"top_leverage_point" text,
	"critical_path" boolean DEFAULT false NOT NULL,
	"last_rebuilt_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sdi_systems_registry_system_key_unique" UNIQUE("system_key")
);
--> statement-breakpoint
CREATE TABLE "sdi_systems_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL,
	"total_systems" integer DEFAULT 0 NOT NULL,
	"total_subsystems" integer DEFAULT 0 NOT NULL,
	"total_feedback_loops" integer DEFAULT 0 NOT NULL,
	"total_propagation_paths" integer DEFAULT 0 NOT NULL,
	"total_constraints" integer DEFAULT 0 NOT NULL,
	"critical_constraints" integer DEFAULT 0 NOT NULL,
	"total_leverage_points" integer DEFAULT 0 NOT NULL,
	"average_system_health" real,
	"average_resilience" real,
	"average_stability" real,
	"platform_systems_score" real,
	"highest_risk_system" text,
	"highest_leverage_system" text,
	"snapshot_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "tradeoff_constraint_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" integer NOT NULL,
	"constraint_key" text NOT NULL,
	"constraint_type" text NOT NULL,
	"constraint_name" text NOT NULL,
	"constraint_value" text NOT NULL,
	"constraint_unit" text,
	"severity" text NOT NULL,
	"is_binding_now" boolean DEFAULT true NOT NULL,
	"relates_to" text[] DEFAULT '{}' NOT NULL,
	"notes" text,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tradeoff_decision_frontiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" integer NOT NULL,
	"frontier_options" jsonb NOT NULL,
	"dominated_options" jsonb NOT NULL,
	"frontier_size" integer DEFAULT 0 NOT NULL,
	"dominated_count" integer DEFAULT 0 NOT NULL,
	"objectives_considered" text[] DEFAULT '{}' NOT NULL,
	"frontier_explanation" text NOT NULL,
	"recommended_from_frontier" text,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tradeoff_executive_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"preference_key" text NOT NULL,
	"decision_type" text DEFAULT 'all' NOT NULL,
	"risk_tolerance" text DEFAULT 'moderate' NOT NULL,
	"time_horizon" text DEFAULT 'medium' NOT NULL,
	"cost_sensitivity" real DEFAULT 0.5 NOT NULL,
	"quality_bias" real DEFAULT 0.5 NOT NULL,
	"innovation_appetite" real DEFAULT 0.5 NOT NULL,
	"sustainability_weight" real DEFAULT 0.3 NOT NULL,
	"preference_notes" text,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tradeoff_optimization_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" integer NOT NULL,
	"objective" text NOT NULL,
	"weight" real NOT NULL,
	"target_direction" text NOT NULL,
	"rationale" text NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tradeoff_sensitivity_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" integer NOT NULL,
	"changed_constraint" text NOT NULL,
	"change_type" text NOT NULL,
	"change_description" text NOT NULL,
	"original_recommendation" text NOT NULL,
	"sensitized_recommendation" text NOT NULL,
	"recommendation_changed" boolean DEFAULT false NOT NULL,
	"sensitivity_score" real NOT NULL,
	"affected_objectives" text[] DEFAULT '{}' NOT NULL,
	"analysis" text NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tradeoff_matrices" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" integer NOT NULL,
	"option_key" text NOT NULL,
	"option_name" text NOT NULL,
	"option_description" text NOT NULL,
	"objective_scores" jsonb NOT NULL,
	"constraint_violations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weighted_composite_score" real NOT NULL,
	"raw_composite_score" real NOT NULL,
	"dominance_rank" integer DEFAULT 0 NOT NULL,
	"is_on_frontier" boolean DEFAULT false NOT NULL,
	"explanations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tradeoff_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_key" text NOT NULL,
	"title" text NOT NULL,
	"decision_type" text NOT NULL,
	"recommended_option" text NOT NULL,
	"runner_up_option" text,
	"rejected_options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tradeoff_explanation" text NOT NULL,
	"key_assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sensitivity_flag" boolean DEFAULT false NOT NULL,
	"confidence_score" real NOT NULL,
	"executive_law_applied" boolean DEFAULT true NOT NULL,
	"last_evaluated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tradeoff_registry_scenario_key_unique" UNIQUE("scenario_key")
);
--> statement-breakpoint
CREATE TABLE "tradeoff_scenarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"decision_type" text NOT NULL,
	"context_domain" text NOT NULL,
	"option_count" integer DEFAULT 0 NOT NULL,
	"objective_count" integer DEFAULT 0 NOT NULL,
	"constraint_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'evaluated' NOT NULL,
	"triggered_by" text DEFAULT 'platform' NOT NULL,
	"user_id" integer,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tradeoff_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL,
	"total_evaluations" integer DEFAULT 0 NOT NULL,
	"frontier_decisions" integer DEFAULT 0 NOT NULL,
	"high_confidence_decisions" integer DEFAULT 0 NOT NULL,
	"sensitivities_detected" integer DEFAULT 0 NOT NULL,
	"average_confidence_score" real,
	"average_frontier_size" real,
	"most_common_decision_type" text,
	"top_constraint_type" text,
	"snapshot_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "executive_portfolios" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolio_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"portfolio_domain" text NOT NULL,
	"initiative_count" integer DEFAULT 0 NOT NULL,
	"active_initiatives" integer DEFAULT 0 NOT NULL,
	"total_budget_units" real,
	"total_people_units" real,
	"health_score" real,
	"balance_score" real,
	"capacity_score" real,
	"exposure_score" real,
	"overall_score" real,
	"triggered_by" text DEFAULT 'platform' NOT NULL,
	"user_id" integer,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolio_id" integer NOT NULL,
	"resource_type" text NOT NULL,
	"total_available" real DEFAULT 1 NOT NULL,
	"total_allocated" real DEFAULT 0 NOT NULL,
	"utilization_rate" real DEFAULT 0 NOT NULL,
	"overcommitted" boolean DEFAULT false NOT NULL,
	"overcommit_delta" real DEFAULT 0 NOT NULL,
	"buckets_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"top_consumers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"allocation_score" real DEFAULT 1 NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_capacity" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolio_id" integer NOT NULL,
	"current_utilization" real DEFAULT 0 NOT NULL,
	"available_capacity" real DEFAULT 0 NOT NULL,
	"growth_capacity" real DEFAULT 0 NOT NULL,
	"constraint_pressure" real DEFAULT 0 NOT NULL,
	"expansion_readiness" real DEFAULT 0 NOT NULL,
	"most_constrained_resource" text,
	"resource_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"overcommitted_resources" text[] DEFAULT '{}' NOT NULL,
	"capacity_score" real DEFAULT 1 NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_exposures" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolio_id" integer NOT NULL,
	"exposure_type" text NOT NULL,
	"severity" text NOT NULL,
	"affected_initiatives" text[] DEFAULT '{}' NOT NULL,
	"affected_count" integer DEFAULT 0 NOT NULL,
	"concentration_ratio" real DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"mitigation" text NOT NULL,
	"exposure_score" real DEFAULT 0 NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolio_key" text NOT NULL,
	"portfolio_id" integer NOT NULL,
	"evaluated_at" timestamp DEFAULT now() NOT NULL,
	"overall_score" real,
	"health_score" real,
	"balance_score" real,
	"capacity_score" real,
	"exposure_score" real,
	"initiative_count" integer DEFAULT 0 NOT NULL,
	"recommendation_count" integer DEFAULT 0 NOT NULL,
	"top_recommendation_type" text,
	"change_summary" text,
	"snapshot_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "portfolio_initiatives" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolio_id" integer NOT NULL,
	"initiative_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"initiative_type" text NOT NULL,
	"strategic_theme" text NOT NULL,
	"investment_bucket" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"risk_level" text DEFAULT 'medium' NOT NULL,
	"horizon" text DEFAULT 'medium' NOT NULL,
	"strategic_alignment" real DEFAULT 0.5 NOT NULL,
	"resource_demand" jsonb NOT NULL,
	"dependencies" text[] DEFAULT '{}' NOT NULL,
	"dependency_count" integer DEFAULT 0 NOT NULL,
	"is_critical_path" boolean DEFAULT false NOT NULL,
	"is_on_pareto_cut" boolean DEFAULT false NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolio_id" integer NOT NULL,
	"recommendation_type" text NOT NULL,
	"priority" text NOT NULL,
	"target_initiative" text,
	"title" text NOT NULL,
	"rationale" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expected_impact" text NOT NULL,
	"risk_if_ignored" text NOT NULL,
	"alternative_action" text,
	"confidence_score" real DEFAULT 0 NOT NULL,
	"portfolio_law_applied" boolean DEFAULT true NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"portfolio_key" text NOT NULL,
	"title" text NOT NULL,
	"portfolio_domain" text NOT NULL,
	"overall_score" real DEFAULT 0 NOT NULL,
	"health_score" real DEFAULT 0 NOT NULL,
	"balance_score" real DEFAULT 0 NOT NULL,
	"capacity_score" real DEFAULT 0 NOT NULL,
	"exposure_score" real DEFAULT 0 NOT NULL,
	"initiative_count" integer DEFAULT 0 NOT NULL,
	"overcommitted" boolean DEFAULT false NOT NULL,
	"critical_exposures" integer DEFAULT 0 NOT NULL,
	"top_recommendation" text,
	"portfolio_law_applied" boolean DEFAULT true NOT NULL,
	"last_evaluated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_registry_portfolio_key_unique" UNIQUE("portfolio_key")
);
--> statement-breakpoint
CREATE TABLE "portfolio_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL,
	"total_portfolios" integer DEFAULT 0 NOT NULL,
	"total_initiatives" integer DEFAULT 0 NOT NULL,
	"average_health_score" real,
	"average_balance_score" real,
	"overcommitted_count" integer DEFAULT 0 NOT NULL,
	"critical_exposures" integer DEFAULT 0 NOT NULL,
	"high_priority_recs" integer DEFAULT 0 NOT NULL,
	"top_risk" text,
	"top_opportunity" text,
	"snapshot_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "priority_attention" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"attention_load" real DEFAULT 0 NOT NULL,
	"priority_saturation" real DEFAULT 0 NOT NULL,
	"focus_drift" real DEFAULT 0 NOT NULL,
	"critical_window_utilization" real DEFAULT 0 NOT NULL,
	"attention_score" real DEFAULT 0 NOT NULL,
	"top_attention_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attention_warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_focus_area" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "priority_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"upstream_key" text NOT NULL,
	"downstream_key" text NOT NULL,
	"dependency_type" text DEFAULT 'blocks' NOT NULL,
	"delay_risk" real DEFAULT 0 NOT NULL,
	"is_critical_path" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "priority_escalations" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"item_key" text NOT NULL,
	"item_title" text NOT NULL,
	"escalation_level" text NOT NULL,
	"reason" text NOT NULL,
	"trigger_dimensions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"composite_score" real DEFAULT 0 NOT NULL,
	"urgency_score" real DEFAULT 0 NOT NULL,
	"business_risk" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "priority_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_key" text NOT NULL,
	"profile_id" integer NOT NULL,
	"top_priority_key" text,
	"total_items" integer DEFAULT 0 NOT NULL,
	"blocked_items" integer DEFAULT 0 NOT NULL,
	"critical_count" integer DEFAULT 0 NOT NULL,
	"overall_health" real DEFAULT 0 NOT NULL,
	"snapshot_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "priority_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"domain" text NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"top_priority_key" text,
	"top_priority_title" text,
	"priority_law_applied" boolean DEFAULT true NOT NULL,
	"blocked_items" integer DEFAULT 0 NOT NULL,
	"stale_items" integer DEFAULT 0 NOT NULL,
	"critical_escalations" integer DEFAULT 0 NOT NULL,
	"overall_health" real DEFAULT 0 NOT NULL,
	"user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "priority_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"item_key" text NOT NULL,
	"item_title" text NOT NULL,
	"action" text NOT NULL,
	"priority" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"business_impact" text NOT NULL,
	"opportunity_cost" text NOT NULL,
	"risk_if_delayed" text NOT NULL,
	"confidence_score" real DEFAULT 0 NOT NULL,
	"reasoning_trace" text NOT NULL,
	"priority_law_applied" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "priority_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_key" text NOT NULL,
	"title" text NOT NULL,
	"domain" text NOT NULL,
	"top_priority_key" text,
	"top_priority_title" text,
	"total_items" integer DEFAULT 0 NOT NULL,
	"blocked_items" integer DEFAULT 0 NOT NULL,
	"stale_items" integer DEFAULT 0 NOT NULL,
	"critical_escalations" integer DEFAULT 0 NOT NULL,
	"overall_health" real DEFAULT 0 NOT NULL,
	"priority_law_applied" boolean DEFAULT true NOT NULL,
	"last_evaluated_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "priority_registry_profile_key_unique" UNIQUE("profile_key")
);
--> statement-breakpoint
CREATE TABLE "priority_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"item_key" text NOT NULL,
	"item_title" text NOT NULL,
	"item_type" text NOT NULL,
	"strategic_value" real DEFAULT 0 NOT NULL,
	"business_impact" real DEFAULT 0 NOT NULL,
	"urgency" real DEFAULT 0 NOT NULL,
	"dependency_criticality" real DEFAULT 0 NOT NULL,
	"resource_availability" real DEFAULT 0 NOT NULL,
	"risk_reduction" real DEFAULT 0 NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"time_sensitivity" real DEFAULT 0 NOT NULL,
	"composite_score" real DEFAULT 0 NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL,
	"escalation_level" text DEFAULT 'normal' NOT NULL,
	"aging_status" text DEFAULT 'fresh' NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"blocked_by" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"priority_law_applied" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "priority_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_profiles" integer DEFAULT 0 NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"avg_overall_health" real DEFAULT 0 NOT NULL,
	"total_blocked" integer DEFAULT 0 NOT NULL,
	"total_stale" integer DEFAULT 0 NOT NULL,
	"total_critical" integer DEFAULT 0 NOT NULL,
	"top_platform_priority" text,
	"executive_focus_area" text,
	"priority_law_rate" real DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cognitive_cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"total_engines" integer DEFAULT 0 NOT NULL,
	"waves_executed" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"confidence_score" real DEFAULT 0 NOT NULL,
	"evidence_items" integer DEFAULT 0 NOT NULL,
	"law_applied" boolean DEFAULT true NOT NULL,
	"pipeline_complete" boolean DEFAULT false NOT NULL,
	"top_engine_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "confidence_flows" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"source_engine_id" text NOT NULL,
	"target_engine_id" text NOT NULL,
	"source_confidence" real DEFAULT 0 NOT NULL,
	"propagated_value" real DEFAULT 0 NOT NULL,
	"attenuation" real DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_flows" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"source_engine_id" text NOT NULL,
	"target_engine_id" text NOT NULL,
	"evidence_type" text NOT NULL,
	"evidence_key" text NOT NULL,
	"evidence_available" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_diagnostics" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"engine_id" text NOT NULL,
	"wave_number" integer DEFAULT 1 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"succeeded" boolean DEFAULT false NOT NULL,
	"has_summary" boolean DEFAULT false NOT NULL,
	"dependency_satisfied" boolean DEFAULT true NOT NULL,
	"confidence_value" real,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_graphs" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"engine_id" text NOT NULL,
	"engine_title" text NOT NULL,
	"wave_number" integer DEFAULT 1 NOT NULL,
	"executed" boolean DEFAULT false NOT NULL,
	"succeeded" boolean DEFAULT false NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_waves" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"wave_number" integer NOT NULL,
	"engine_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orchestration_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"engine_id" text NOT NULL,
	"depends_on_id" text NOT NULL,
	"dependency_type" text DEFAULT 'evidence' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orchestration_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"engine_id" text NOT NULL,
	"engine_title" text NOT NULL,
	"build_number" integer DEFAULT 0 NOT NULL,
	"wave_number" integer DEFAULT 1 NOT NULL,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"law_compliant" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orchestration_registry_engine_id_unique" UNIQUE("engine_id")
);
--> statement-breakpoint
CREATE TABLE "orchestration_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_engines" integer DEFAULT 0 NOT NULL,
	"total_cycles" integer DEFAULT 0 NOT NULL,
	"avg_confidence" real DEFAULT 0 NOT NULL,
	"avg_duration_ms" integer DEFAULT 0 NOT NULL,
	"avg_success_rate" real DEFAULT 0 NOT NULL,
	"top_engine_id" text,
	"law_compliance_rate" real DEFAULT 1 NOT NULL,
	"wave_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graph_confidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"node_id" integer NOT NULL,
	"confidence_score" real DEFAULT 0.5 NOT NULL,
	"confidence_basis" text NOT NULL,
	"evidence_count" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graph_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"node_id" integer,
	"edge_id" integer,
	"source_engine" text NOT NULL,
	"evidence_type" text NOT NULL,
	"confidence_value" real DEFAULT 0.5 NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graph_identity_map" (
	"id" serial PRIMARY KEY NOT NULL,
	"canonical_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"identity_hash" text NOT NULL,
	"node_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "graph_identity_map_canonical_id_unique" UNIQUE("canonical_id"),
	CONSTRAINT "graph_identity_map_identity_hash_unique" UNIQUE("identity_hash")
);
--> statement-breakpoint
CREATE TABLE "graph_paths" (
	"id" serial PRIMARY KEY NOT NULL,
	"path_type" text NOT NULL,
	"source_node_id" integer,
	"target_node_id" integer,
	"node_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"edge_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graph_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"engine_id" text NOT NULL,
	"node_count" integer DEFAULT 0 NOT NULL,
	"edge_count" integer DEFAULT 0 NOT NULL,
	"last_synced" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "graph_registry_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "graph_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"node_count" integer DEFAULT 0 NOT NULL,
	"edge_count" integer DEFAULT 0 NOT NULL,
	"domain_count" integer DEFAULT 0 NOT NULL,
	"evidence_items" integer DEFAULT 0 NOT NULL,
	"confidence_avg" real DEFAULT 0 NOT NULL,
	"law_applied" boolean DEFAULT true NOT NULL,
	"snapshot_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graph_temporal_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"node_id" integer NOT NULL,
	"change_type" text NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_graph_edges" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_node_id" integer NOT NULL,
	"to_node_id" integer NOT NULL,
	"relationship_type" text NOT NULL,
	"semantic_label" text NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_engine" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_graph_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"node_type" text NOT NULL,
	"domain" text NOT NULL,
	"external_ref_type" text,
	"external_ref_id" text,
	"identity_hash" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_engine" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability_bindings" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"capability_id" text NOT NULL,
	"channel_type" text NOT NULL,
	"bound" boolean DEFAULT false NOT NULL,
	"authorized_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digital_workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"workspace_name" text NOT NULL,
	"domain" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dol_execution_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer,
	"user_id" integer,
	"session_type" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"authority_ref" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"completed_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "environment_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"environment_name" text NOT NULL,
	"environment_type" text NOT NULL,
	"discovered" boolean DEFAULT false NOT NULL,
	"available" boolean DEFAULT false NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_discovered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_type" text NOT NULL,
	"domain" text NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"session_id" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"channel_type" text NOT NULL,
	"requested_operation" text NOT NULL,
	"authorized_operation" text NOT NULL,
	"actual_operation" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer,
	"result" text DEFAULT 'success' NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rollback_ref" text,
	"authority_ref" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operating_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"channel_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"session_count" integer DEFAULT 0 NOT NULL,
	"last_active" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "operating_registry_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "operating_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"active_workspaces" integer DEFAULT 0 NOT NULL,
	"active_sessions" integer DEFAULT 0 NOT NULL,
	"total_channels" integer DEFAULT 0 NOT NULL,
	"total_receipts" integer DEFAULT 0 NOT NULL,
	"avg_latency_ms" integer DEFAULT 0 NOT NULL,
	"overall_health" text DEFAULT 'healthy' NOT NULL,
	"law_applied" boolean DEFAULT true NOT NULL,
	"snapshot_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runtime_diagnostics" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer,
	"channel_type" text NOT NULL,
	"availability" real DEFAULT 1 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"reliability" real DEFAULT 1 NOT NULL,
	"session_health" text DEFAULT 'healthy' NOT NULL,
	"connector_health" text DEFAULT 'healthy' NOT NULL,
	"resource_utilization" real DEFAULT 0 NOT NULL,
	"throughput" integer DEFAULT 0 NOT NULL,
	"measured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connection_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer,
	"connection_profile_id" integer,
	"audit_type" text NOT NULL,
	"actor" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connection_health" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"connection_profile_id" integer,
	"availability" real DEFAULT 1 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"quota_used" integer DEFAULT 0 NOT NULL,
	"quota_limit" integer,
	"rate_limit_used" integer DEFAULT 0 NOT NULL,
	"rate_limit_max" integer,
	"auth_state" text DEFAULT 'valid' NOT NULL,
	"version_compatible" boolean DEFAULT true NOT NULL,
	"health_score" real DEFAULT 1 NOT NULL,
	"measured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connection_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"auth_profile_id" text,
	"connected_at" timestamp,
	"last_active_at" timestamp,
	"expires_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connection_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_name" text NOT NULL,
	"domain" text NOT NULL,
	"provider_type" text NOT NULL,
	"version" text,
	"status" text DEFAULT 'active' NOT NULL,
	"base_url" text,
	"docs_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "connection_providers_provider_name_unique" UNIQUE("provider_name")
);
--> statement-breakpoint
CREATE TABLE "connection_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"provider_count" integer DEFAULT 0 NOT NULL,
	"active_connections" integer DEFAULT 0 NOT NULL,
	"healthy_providers" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "connection_registry_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "connection_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"total_providers" integer DEFAULT 0 NOT NULL,
	"total_connections" integer DEFAULT 0 NOT NULL,
	"healthy_connections" integer DEFAULT 0 NOT NULL,
	"avg_health_score" real DEFAULT 0 NOT NULL,
	"domains_registered" integer DEFAULT 0 NOT NULL,
	"risk_flags" integer DEFAULT 0 NOT NULL,
	"law_applied" boolean DEFAULT true NOT NULL,
	"snapshot_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credential_references" (
	"id" serial PRIMARY KEY NOT NULL,
	"connection_profile_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"credential_ref_key" text NOT NULL,
	"credential_type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"rotation_due" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_capabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"capability_name" text NOT NULL,
	"capability_type" text NOT NULL,
	"description" text,
	"rate_limit" integer,
	"quota_limit" integer,
	"api_version" text,
	"supported" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_compatibility" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"capability_name" text NOT NULL,
	"compatible_with" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"alternative_provider_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"failover_score" real DEFAULT 0.5 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "administrator_signoffs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"admin_id" integer NOT NULL,
	"signoff_status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certification_domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"domain_name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"certified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certification_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"last_run_id" integer,
	"last_status" text DEFAULT 'pending' NOT NULL,
	"last_score" real DEFAULT 0 NOT NULL,
	"last_checked" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "certification_registry_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "certification_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"triggered_by" integer,
	"total_domains" integer DEFAULT 0 NOT NULL,
	"passed_domains" integer DEFAULT 0 NOT NULL,
	"failed_domains" integer DEFAULT 0 NOT NULL,
	"overall_score" real DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certification_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer,
	"total_domains" integer DEFAULT 0 NOT NULL,
	"passed_domains" integer DEFAULT 0 NOT NULL,
	"failed_domains" integer DEFAULT 0 NOT NULL,
	"warned_domains" integer DEFAULT 0 NOT NULL,
	"overall_score" real DEFAULT 0 NOT NULL,
	"readiness_level" text DEFAULT 'not_ready' NOT NULL,
	"law_compliance_score" real DEFAULT 0 NOT NULL,
	"launch_ready" boolean DEFAULT false NOT NULL,
	"snapshot_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"law_name" text NOT NULL,
	"law_domain" text NOT NULL,
	"compliant" boolean DEFAULT false NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"findings" text,
	"measured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"domain_name" text NOT NULL,
	"check_type" text NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"reliability_score" real DEFAULT 1 NOT NULL,
	"coverage_score" real DEFAULT 1 NOT NULL,
	"consistency_score" real DEFAULT 1 NOT NULL,
	"confidence_score" real DEFAULT 1 NOT NULL,
	"health_score" real DEFAULT 1 NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"measured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "launch_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"launch_score" real DEFAULT 0 NOT NULL,
	"readiness_level" text DEFAULT 'not_ready' NOT NULL,
	"critical_issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"blocked_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"certified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "launch_reports_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "validation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_code" text NOT NULL,
	"rule_name" text NOT NULL,
	"domain" text NOT NULL,
	"severity" text DEFAULT 'high' NOT NULL,
	"description" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "validation_rules_rule_code_unique" UNIQUE("rule_code")
);
--> statement-breakpoint
CREATE TABLE "launch_findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"finding_code" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"why_it_matters" text NOT NULL,
	"build_introduced" text NOT NULL,
	"affected_files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_solution" text NOT NULL,
	"complexity" text NOT NULL,
	"fix_before_launch" boolean DEFAULT true NOT NULL,
	"category" text NOT NULL,
	"audit_section" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "launch_findings_finding_code_unique" UNIQUE("finding_code")
);
--> statement-breakpoint
CREATE TABLE "launch_hardening_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"finding_id" integer NOT NULL,
	"finding_code" text NOT NULL,
	"priority" text DEFAULT 'PRE_LAUNCH' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_to" text,
	"target_build" text,
	"depends_on" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "launch_hardening_registry_finding_code_unique" UNIQUE("finding_code")
);
--> statement-breakpoint
CREATE TABLE "launch_regression" (
	"id" serial PRIMARY KEY NOT NULL,
	"remediation_id" integer NOT NULL,
	"finding_code" text NOT NULL,
	"impacted_subsystems" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"regression_risk" text DEFAULT 'low' NOT NULL,
	"regression_notes" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "launch_remediation" (
	"id" serial PRIMARY KEY NOT NULL,
	"finding_id" integer NOT NULL,
	"finding_code" text NOT NULL,
	"plan_description" text NOT NULL,
	"estimated_complexity" text NOT NULL,
	"depends_on" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"build_number" text,
	"author" text,
	"status" text DEFAULT 'planned' NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "launch_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_findings" integer DEFAULT 0 NOT NULL,
	"critical_open" integer DEFAULT 0 NOT NULL,
	"high_open" integer DEFAULT 0 NOT NULL,
	"medium_open" integer DEFAULT 0 NOT NULL,
	"low_open" integer DEFAULT 0 NOT NULL,
	"blockers_remaining" integer DEFAULT 0 NOT NULL,
	"prelaunching_remaining" integer DEFAULT 0 NOT NULL,
	"verified_fixed" integer DEFAULT 0 NOT NULL,
	"deferred_count" integer DEFAULT 0 NOT NULL,
	"accepted_risk_count" integer DEFAULT 0 NOT NULL,
	"launch_confidence" real DEFAULT 0 NOT NULL,
	"launch_status" text DEFAULT 'NOT_READY' NOT NULL,
	"trigger_build" text,
	"snapshot_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "launch_verification" (
	"id" serial PRIMARY KEY NOT NULL,
	"remediation_id" integer NOT NULL,
	"finding_code" text NOT NULL,
	"verification_method" text NOT NULL,
	"verification_result" text NOT NULL,
	"verified_by" text NOT NULL,
	"verification_notes" text,
	"verified_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"activity_type" text NOT NULL,
	"app_id" text,
	"project_id" integer,
	"workspace_id" integer,
	"actor" text DEFAULT 'user' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"app_name" text NOT NULL,
	"app_domain" text NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"commands" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"project_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"asset_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"manifest" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_builtin" boolean DEFAULT false NOT NULL,
	"registered_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_applications_app_id_unique" UNIQUE("app_id")
);
--> statement-breakpoint
CREATE TABLE "platform_commands" (
	"id" serial PRIMARY KEY NOT NULL,
	"command_id" text NOT NULL,
	"app_id" text NOT NULL,
	"command_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"required_permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"route" text,
	"method" text DEFAULT 'POST' NOT NULL,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_commands_command_id_unique" UNIQUE("command_id")
);
--> statement-breakpoint
CREATE TABLE "platform_context" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"current_page" text,
	"current_app_id" text,
	"current_project_id" integer,
	"current_workspace_id" integer,
	"current_org_id" integer,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"available_commands" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"breadcrumb" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_context_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "platform_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"app_id" text,
	"project_id" integer,
	"read" boolean DEFAULT false NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"action_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"workspace_id" integer NOT NULL,
	"app_id" text,
	"project_name" text NOT NULL,
	"project_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"app_name" text NOT NULL,
	"domain" text NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"capability_count" integer DEFAULT 0 NOT NULL,
	"command_count" integer DEFAULT 0 NOT NULL,
	"project_type_count" integer DEFAULT 0 NOT NULL,
	"runtime_health" text DEFAULT 'unknown' NOT NULL,
	"last_health_check_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_registry_app_id_unique" UNIQUE("app_id")
);
--> statement-breakpoint
CREATE TABLE "platform_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"workspace_id" integer,
	"project_id" integer,
	"app_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"total_apps" integer DEFAULT 0 NOT NULL,
	"active_apps" integer DEFAULT 0 NOT NULL,
	"total_workspaces" integer DEFAULT 0 NOT NULL,
	"total_projects" integer DEFAULT 0 NOT NULL,
	"active_sessions" integer DEFAULT 0 NOT NULL,
	"commands_available" integer DEFAULT 0 NOT NULL,
	"notifications_pending" integer DEFAULT 0 NOT NULL,
	"runtime_health" text DEFAULT 'unknown' NOT NULL,
	"law_applied" boolean DEFAULT true NOT NULL,
	"snapshot_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"workspace_name" text NOT NULL,
	"workspace_type" text DEFAULT 'personal' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_asset_id" integer NOT NULL,
	"target_asset_id" integer NOT NULL,
	"relationship_type" text NOT NULL,
	"strength" text DEFAULT 'required' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"version" text NOT NULL,
	"change_type" text NOT NULL,
	"change_summary" text DEFAULT '' NOT NULL,
	"checksum" text,
	"snapshot_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"workspace_id" integer,
	"business_id" integer,
	"project_name" text NOT NULL,
	"project_type" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"phase" text DEFAULT 'planning' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"template_id" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"business_id" integer,
	"org_id" integer,
	"workspace_name" text NOT NULL,
	"workspace_type" text DEFAULT 'business' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"workspace_id" integer,
	"project_id" integer,
	"asset_id" integer,
	"business_id" integer,
	"activity_type" text NOT NULL,
	"actor" text DEFAULT 'user' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"business_id" integer,
	"workspace_id" integer,
	"asset_name" text NOT NULL,
	"asset_type" text NOT NULL,
	"asset_status" text DEFAULT 'draft' NOT NULL,
	"current_version" text DEFAULT '1.0.0' NOT NULL,
	"deployment_status" text DEFAULT 'undeployed' NOT NULL,
	"external_ref" text,
	"checksum" text,
	"size_bytes" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_health" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"overall_score" integer DEFAULT 0 NOT NULL,
	"completeness_score" integer DEFAULT 0 NOT NULL,
	"activity_score" integer DEFAULT 0 NOT NULL,
	"dependency_score" integer DEFAULT 0 NOT NULL,
	"deployment_score" integer DEFAULT 0 NOT NULL,
	"documentation_score" integer DEFAULT 0 NOT NULL,
	"automation_score" integer DEFAULT 0 NOT NULL,
	"missing_assets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"health_warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"business_id" integer,
	"workspace_id" integer,
	"project_name" text NOT NULL,
	"project_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"asset_count" integer DEFAULT 0 NOT NULL,
	"health_score" integer DEFAULT 0 NOT NULL,
	"last_activity" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_registry_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "project_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_name" text NOT NULL,
	"template_type" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"required_assets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"optional_assets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_phase" text DEFAULT 'planning' NOT NULL,
	"is_builtin" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"total_businesses" integer DEFAULT 0 NOT NULL,
	"total_workspaces" integer DEFAULT 0 NOT NULL,
	"total_projects" integer DEFAULT 0 NOT NULL,
	"total_assets" integer DEFAULT 0 NOT NULL,
	"active_projects" integer DEFAULT 0 NOT NULL,
	"deployed_assets" integer DEFAULT 0 NOT NULL,
	"avg_health_score" integer DEFAULT 0 NOT NULL,
	"law_applied" boolean DEFAULT true NOT NULL,
	"snapshot_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_capabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"capability_id" text NOT NULL,
	"capability_name" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"parameters" jsonb DEFAULT '{}' NOT NULL,
	"declared_by" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_key" text NOT NULL,
	"display_name" text NOT NULL,
	"category" text NOT NULL,
	"parent_class_key" text,
	"description" text NOT NULL,
	"is_builtin" boolean DEFAULT true NOT NULL,
	"supports_versioning" boolean DEFAULT true NOT NULL,
	"supports_deployment" boolean DEFAULT false NOT NULL,
	"default_capabilities" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "asset_classes_class_key_unique" UNIQUE("class_key")
);
--> statement-breakpoint
CREATE TABLE "asset_lifecycle" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"from_stage" text,
	"to_stage" text,
	"actor" text DEFAULT 'system' NOT NULL,
	"summary" text NOT NULL,
	"details" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_manifests" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"manifest_version" text NOT NULL,
	"class_key" text NOT NULL,
	"canonical_name" text NOT NULL,
	"capabilities" jsonb DEFAULT '[]' NOT NULL,
	"relationships" jsonb DEFAULT '[]' NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"lifecycle_stage" text NOT NULL,
	"deployment_info" jsonb DEFAULT '{}' NOT NULL,
	"checksum" text,
	"is_latest" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"metadata_type" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"value_type" text DEFAULT 'string' NOT NULL,
	"normalized_from" text,
	"confidence" integer DEFAULT 100 NOT NULL,
	"source" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"class_key" text NOT NULL,
	"canonical_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"lifecycle_stage" text DEFAULT 'active' NOT NULL,
	"capability_count" integer DEFAULT 0 NOT NULL,
	"relationship_count" integer DEFAULT 0 NOT NULL,
	"metadata_count" integer DEFAULT 0 NOT NULL,
	"manifest_version" text,
	"has_translation" boolean DEFAULT false NOT NULL,
	"last_activity_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "asset_registry_asset_id_unique" UNIQUE("asset_id")
);
--> statement-breakpoint
CREATE TABLE "asset_relationships_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"source_asset_id" integer NOT NULL,
	"target_asset_id" integer NOT NULL,
	"relationship_type" text NOT NULL,
	"semantic_label" text NOT NULL,
	"strength" text DEFAULT 'strong' NOT NULL,
	"direction" text DEFAULT 'directed' NOT NULL,
	"is_inferred" boolean DEFAULT false NOT NULL,
	"confidence" integer DEFAULT 100 NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_assets" integer DEFAULT 0 NOT NULL,
	"total_classes" integer DEFAULT 0 NOT NULL,
	"total_relationships" integer DEFAULT 0 NOT NULL,
	"total_capabilities" integer DEFAULT 0 NOT NULL,
	"total_translations" integer DEFAULT 0 NOT NULL,
	"active_assets" integer DEFAULT 0 NOT NULL,
	"class_breakdown" jsonb DEFAULT '{}' NOT NULL,
	"capability_breakdown" jsonb DEFAULT '{}' NOT NULL,
	"top_relationship_types" jsonb DEFAULT '[]' NOT NULL,
	"law_applied" boolean DEFAULT true NOT NULL,
	"snapshot_data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_translation" (
	"id" serial PRIMARY KEY NOT NULL,
	"canonical_asset_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"builder_source" text NOT NULL,
	"builder_object_id" text NOT NULL,
	"builder_object_type" text NOT NULL,
	"translated_class_key" text NOT NULL,
	"field_mappings" jsonb DEFAULT '{}' NOT NULL,
	"raw_payload" jsonb DEFAULT '{}' NOT NULL,
	"translation_version" text DEFAULT '1.0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canonical_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"business_id" integer,
	"project_id" integer,
	"workspace_id" integer,
	"class_key" text NOT NULL,
	"canonical_name" text NOT NULL,
	"canonical_slug" text NOT NULL,
	"description" text,
	"builder_source" text,
	"builder_object_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"external_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "builder_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"builder_type" text NOT NULL,
	"asset_id" integer,
	"draft_version" integer DEFAULT 1 NOT NULL,
	"draft_state" text DEFAULT 'draft' NOT NULL,
	"content" jsonb DEFAULT '{}' NOT NULL,
	"content_checksum" text,
	"changes_summary" text,
	"is_autosave" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "builder_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"builder_type" text NOT NULL,
	"event_type" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"summary" text NOT NULL,
	"details" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "builder_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"builder_type" text NOT NULL,
	"sequence_number" integer NOT NULL,
	"operation_type" text NOT NULL,
	"operation_label" text NOT NULL,
	"target_path" text,
	"before_state" jsonb DEFAULT '{}' NOT NULL,
	"after_state" jsonb DEFAULT '{}' NOT NULL,
	"is_undone" boolean DEFAULT false NOT NULL,
	"is_redone" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "builder_locks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"builder_type" text NOT NULL,
	"asset_id" integer,
	"element_path" text,
	"lock_type" text DEFAULT 'exclusive' NOT NULL,
	"session_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"acquired_at" timestamp DEFAULT now() NOT NULL,
	"released_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "builder_recovery" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_session_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"builder_type" text NOT NULL,
	"asset_id" integer,
	"recovery_state" text DEFAULT 'pending' NOT NULL,
	"last_good_draft_id" integer,
	"recovered_content" jsonb DEFAULT '{}' NOT NULL,
	"crash_reason" text,
	"recovery_notes" text,
	"recovered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "builder_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"builder_type" text NOT NULL,
	"asset_id" integer,
	"project_id" integer,
	"business_id" integer,
	"session_state" text DEFAULT 'active' NOT NULL,
	"draft_id" integer,
	"has_unsaved_work" boolean DEFAULT false NOT NULL,
	"autosave_enabled" boolean DEFAULT true NOT NULL,
	"autosave_interval_ms" integer DEFAULT 30000 NOT NULL,
	"last_autosave_at" timestamp,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "builder_validation" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"builder_type" text NOT NULL,
	"draft_id" integer,
	"validation_type" text NOT NULL,
	"overall_status" text NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"warning_count" integer DEFAULT 0 NOT NULL,
	"results" jsonb DEFAULT '[]' NOT NULL,
	"is_publish_blocked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runtime_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"builder_type" text NOT NULL,
	"asset_id" integer,
	"session_state" text DEFAULT 'active' NOT NULL,
	"current_draft_id" integer,
	"current_draft_version" integer DEFAULT 1 NOT NULL,
	"history_length" integer DEFAULT 0 NOT NULL,
	"undo_pointer" integer DEFAULT 0 NOT NULL,
	"has_unsaved_work" boolean DEFAULT false NOT NULL,
	"is_publish_ready" boolean DEFAULT false NOT NULL,
	"last_validation_status" text,
	"last_validated_at" timestamp,
	"last_autosave_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "runtime_registry_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "runtime_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"active_sessions" integer DEFAULT 0 NOT NULL,
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"total_drafts" integer DEFAULT 0 NOT NULL,
	"total_history_ops" integer DEFAULT 0 NOT NULL,
	"total_events" integer DEFAULT 0 NOT NULL,
	"active_locks" integer DEFAULT 0 NOT NULL,
	"builder_breakdown" jsonb DEFAULT '{}' NOT NULL,
	"validation_pass_rate" integer DEFAULT 100 NOT NULL,
	"recovery_count" integer DEFAULT 0 NOT NULL,
	"crash_count" integer DEFAULT 0 NOT NULL,
	"law_applied" boolean DEFAULT true NOT NULL,
	"snapshot_data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ubre_diagnostics" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer,
	"user_id" integer,
	"builder_type" text,
	"diagnostic_type" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"details" jsonb DEFAULT '{}' NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_capabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"capability_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"capability_type" text DEFAULT 'read' NOT NULL,
	"requires_permissions" jsonb DEFAULT '[]' NOT NULL,
	"is_platform_capability" boolean DEFAULT false NOT NULL,
	"ash_can_invoke" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_diagnostics" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" text,
	"diagnostic_type" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"details" jsonb DEFAULT '{}' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"title" text NOT NULL,
	"lifecycle_state" text DEFAULT 'available' NOT NULL,
	"current_version" text DEFAULT '1.0.0' NOT NULL,
	"manifest_id" integer,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_platform_app" boolean DEFAULT false NOT NULL,
	"install_context" text DEFAULT 'platform' NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"enabled_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"last_health_check_at" timestamp with time zone,
	"health_status" text DEFAULT 'healthy' NOT NULL,
	"error_message" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_application_registry_app_id" UNIQUE("app_id")
);
--> statement-breakpoint
CREATE TABLE "application_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_apps" integer DEFAULT 0 NOT NULL,
	"enabled_apps" integer DEFAULT 0 NOT NULL,
	"disabled_apps" integer DEFAULT 0 NOT NULL,
	"platform_apps" integer DEFAULT 0 NOT NULL,
	"user_apps" integer DEFAULT 0 NOT NULL,
	"available_capabilities" integer DEFAULT 0 NOT NULL,
	"available_widgets" integer DEFAULT 0 NOT NULL,
	"available_services" integer DEFAULT 0 NOT NULL,
	"lifecycle_breakdown" jsonb DEFAULT '{}' NOT NULL,
	"health_breakdown" jsonb DEFAULT '{}' NOT NULL,
	"law_applied" boolean DEFAULT true NOT NULL,
	"snapshot_data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_app_manifests" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon" text,
	"category" text DEFAULT 'general' NOT NULL,
	"developer" text DEFAULT 'platform' NOT NULL,
	"homepage_url" text,
	"supported_permissions" jsonb DEFAULT '[]' NOT NULL,
	"min_platform_version" text DEFAULT '1.0.0' NOT NULL,
	"compatible_asset_classes" jsonb DEFAULT '[]' NOT NULL,
	"compatible_builder_types" jsonb DEFAULT '[]' NOT NULL,
	"manifest_hash" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"page_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"route" text DEFAULT '/' NOT NULL,
	"icon" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"requires_permissions" jsonb DEFAULT '[]' NOT NULL,
	"menu_placement" text DEFAULT 'sidebar' NOT NULL,
	"menu_group" text DEFAULT 'main' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_panels" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"page_id" integer,
	"panel_key" text NOT NULL,
	"title" text NOT NULL,
	"panel_type" text DEFAULT 'sidebar' NOT NULL,
	"position" text DEFAULT 'right' NOT NULL,
	"is_default_open" boolean DEFAULT false NOT NULL,
	"width_px" integer DEFAULT 320 NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"service_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"service_type" text DEFAULT 'api' NOT NULL,
	"endpoint_prefix" text,
	"auth_required" boolean DEFAULT true NOT NULL,
	"rate_limit_per_min" integer DEFAULT 60 NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"page_id" integer NOT NULL,
	"view_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"view_type" text DEFAULT 'list' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_widgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"widget_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"widget_type" text DEFAULT 'display' NOT NULL,
	"is_platform_widget" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"supported_pages" jsonb DEFAULT '[]' NOT NULL,
	"props_schema" jsonb DEFAULT '{}' NOT NULL,
	"default_props" jsonb DEFAULT '{}' NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "component_capabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"component_id" integer NOT NULL,
	"component_key" text NOT NULL,
	"capability_key" text NOT NULL,
	"title" text NOT NULL,
	"capability_type" text DEFAULT 'render' NOT NULL,
	"ash_can_reason" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "component_diagnostics" (
	"id" serial PRIMARY KEY NOT NULL,
	"component_key" text,
	"diagnostic_type" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"details" jsonb DEFAULT '{}' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "component_families" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_component_family_key" UNIQUE("family_key")
);
--> statement-breakpoint
CREATE TABLE "component_manifests" (
	"id" serial PRIMARY KEY NOT NULL,
	"component_id" integer NOT NULL,
	"component_key" text NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"props_schema" jsonb DEFAULT '{}' NOT NULL,
	"dependencies" jsonb DEFAULT '[]' NOT NULL,
	"accessibility_contract" jsonb DEFAULT '{}' NOT NULL,
	"semantic_contract" jsonb DEFAULT '{}' NOT NULL,
	"manifest_hash" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "component_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"component_key" text NOT NULL,
	"title" text NOT NULL,
	"family_id" integer,
	"current_version" text DEFAULT '1.0.0' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_platform_component" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"health_status" text DEFAULT 'healthy' NOT NULL,
	"deprecated" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_component_registry_key" UNIQUE("component_key")
);
--> statement-breakpoint
CREATE TABLE "component_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_components" integer DEFAULT 0 NOT NULL,
	"enabled_components" integer DEFAULT 0 NOT NULL,
	"total_families" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"total_variants" integer DEFAULT 0 NOT NULL,
	"total_capabilities" integer DEFAULT 0 NOT NULL,
	"ash_semantic_coverage" integer DEFAULT 0 NOT NULL,
	"accessibility_coverage" integer DEFAULT 0 NOT NULL,
	"health_breakdown" jsonb DEFAULT '{}' NOT NULL,
	"category_breakdown" jsonb DEFAULT '{}' NOT NULL,
	"law_applied" boolean DEFAULT true NOT NULL,
	"snapshot_data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "component_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"component_key" text NOT NULL,
	"app_id" text,
	"context" text DEFAULT '' NOT NULL,
	"usage_count" integer DEFAULT 1 NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "component_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"component_id" integer NOT NULL,
	"component_key" text NOT NULL,
	"variant_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"props_overrides" jsonb DEFAULT '{}' NOT NULL,
	"token_overrides" jsonb DEFAULT '{}' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_key" text NOT NULL,
	"token_name" text NOT NULL,
	"category" text DEFAULT 'color' NOT NULL,
	"value_light" text NOT NULL,
	"value_dark" text,
	"description" text DEFAULT '' NOT NULL,
	"is_semantic" boolean DEFAULT false NOT NULL,
	"semantic_role" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_design_token_key" UNIQUE("token_key")
);
--> statement-breakpoint
CREATE TABLE "visual_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" integer NOT NULL,
	"component_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'display' NOT NULL,
	"props_schema" jsonb DEFAULT '{}' NOT NULL,
	"default_props" jsonb DEFAULT '{}' NOT NULL,
	"accessibility_role" text,
	"aria_label_template" text,
	"keyboard_interactions" jsonb DEFAULT '[]' NOT NULL,
	"semantic_meaning" text,
	"semantic_intent" text,
	"responsive_breakpoints" jsonb DEFAULT '[]' NOT NULL,
	"supported_themes" jsonb DEFAULT '[]' NOT NULL,
	"is_platform_component" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"ash_semantic_tag" text,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"deprecated_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_visual_component_key" UNIQUE("component_key")
);
--> statement-breakpoint
CREATE TABLE "canvas_diagnostics" (
	"id" serial PRIMARY KEY NOT NULL,
	"canvas_id" text,
	"diagnostic_type" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_guides" (
	"id" serial PRIMARY KEY NOT NULL,
	"canvas_id" text NOT NULL,
	"guide_type" text DEFAULT 'horizontal' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"color" text DEFAULT '#3366ff' NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_sticky" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"canvas_id" text NOT NULL,
	"session_id" integer,
	"operation_type" text NOT NULL,
	"operation_title" text NOT NULL,
	"affected_node_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"before_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"after_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_undone" boolean DEFAULT false NOT NULL,
	"sequence_number" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_layers" (
	"id" serial PRIMARY KEY NOT NULL,
	"canvas_id" text NOT NULL,
	"layer_key" text NOT NULL,
	"title" text NOT NULL,
	"layer_type" text DEFAULT 'content' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"node_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"styles" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"pref_key" text NOT NULL,
	"grid_enabled" boolean DEFAULT true NOT NULL,
	"grid_size" integer DEFAULT 8 NOT NULL,
	"snap_enabled" boolean DEFAULT true NOT NULL,
	"snap_threshold" integer DEFAULT 8 NOT NULL,
	"guides_enabled" boolean DEFAULT true NOT NULL,
	"ruler_enabled" boolean DEFAULT true NOT NULL,
	"minimap_enabled" boolean DEFAULT true NOT NULL,
	"theme" text DEFAULT 'light' NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"canvas_id" text NOT NULL,
	"title" text NOT NULL,
	"canvas_mode" text DEFAULT 'website_layout' NOT NULL,
	"owner_type" text DEFAULT 'system' NOT NULL,
	"owner_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"node_count" integer DEFAULT 0 NOT NULL,
	"layer_count" integer DEFAULT 0 NOT NULL,
	"last_edited_at" timestamp,
	"last_session_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "canvas_registry_canvas_id_unique" UNIQUE("canvas_id")
);
--> statement-breakpoint
CREATE TABLE "canvas_renderers" (
	"id" serial PRIMARY KEY NOT NULL,
	"renderer_key" text NOT NULL,
	"title" text NOT NULL,
	"renderer_type" text DEFAULT 'dom' NOT NULL,
	"canvas_modes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_platform" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"canvas_id" text NOT NULL,
	"user_id" integer,
	"session_type" text DEFAULT 'edit' NOT NULL,
	"viewport_x" integer DEFAULT 0 NOT NULL,
	"viewport_y" integer DEFAULT 0 NOT NULL,
	"zoom_level" integer DEFAULT 100 NOT NULL,
	"selected_node_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"clipboard_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"session_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"canvas_id" text,
	"total_canvases" integer DEFAULT 0 NOT NULL,
	"active_sessions" integer DEFAULT 0 NOT NULL,
	"total_layers" integer DEFAULT 0 NOT NULL,
	"total_renderers" integer DEFAULT 0 NOT NULL,
	"total_history" integer DEFAULT 0 NOT NULL,
	"canvas_modes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"renderer_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"law_applied" boolean DEFAULT true NOT NULL,
	"snapshot_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"canvas_id" text NOT NULL,
	"view_key" text NOT NULL,
	"title" text NOT NULL,
	"viewport_x" integer DEFAULT 0 NOT NULL,
	"viewport_y" integer DEFAULT 0 NOT NULL,
	"zoom_level" integer DEFAULT 100 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_experiences" (
	"id" serial PRIMARY KEY NOT NULL,
	"experience_id" text NOT NULL,
	"business_id" integer,
	"user_id" integer,
	"title" text NOT NULL,
	"experience_type" text DEFAULT 'business_website' NOT NULL,
	"slug" text NOT NULL,
	"domain" text,
	"theme_id" text,
	"canvas_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"seo_profile_id" text,
	"navigation_id" text,
	"page_count" integer DEFAULT 0 NOT NULL,
	"section_count" integer DEFAULT 0 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"target_audience" text DEFAULT '' NOT NULL,
	"brand_summary" text DEFAULT '' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_diagnostics" (
	"id" serial PRIMARY KEY NOT NULL,
	"experience_id" text,
	"diagnostic_type" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"title" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_navigation" (
	"id" serial PRIMARY KEY NOT NULL,
	"experience_id" text NOT NULL,
	"navigation_id" text NOT NULL,
	"title" text NOT NULL,
	"nav_type" text DEFAULT 'primary' NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"footer_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"logo_url" text,
	"logo_text" text,
	"sticky" boolean DEFAULT true NOT NULL,
	"transparent" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"experience_id" text NOT NULL,
	"page_id" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"page_type" text DEFAULT 'standard' NOT NULL,
	"layout_template" text DEFAULT 'blank' NOT NULL,
	"component_tree" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"section_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"og_image" text,
	"canonical_url" text,
	"is_home_page" boolean DEFAULT false NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"breakpoints" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"experience_id" text NOT NULL,
	"title" text NOT NULL,
	"experience_type" text DEFAULT 'business_website' NOT NULL,
	"business_id" integer,
	"user_id" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"page_count" integer DEFAULT 0 NOT NULL,
	"seo_score" integer DEFAULT 0 NOT NULL,
	"health_status" text DEFAULT 'healthy' NOT NULL,
	"last_published_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"experience_id" text NOT NULL,
	"section_id" text NOT NULL,
	"title" text NOT NULL,
	"section_type" text DEFAULT 'content' NOT NULL,
	"component_tree" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_reusable" boolean DEFAULT false NOT NULL,
	"is_global" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"styles" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_seo" (
	"id" serial PRIMARY KEY NOT NULL,
	"experience_id" text NOT NULL,
	"seo_id" text NOT NULL,
	"site_title" text DEFAULT '' NOT NULL,
	"site_description" text DEFAULT '' NOT NULL,
	"canonical_base" text DEFAULT '' NOT NULL,
	"og_title" text,
	"og_description" text,
	"og_image" text,
	"twitter_card" text DEFAULT 'summary_large_image' NOT NULL,
	"schema_type" text DEFAULT 'LocalBusiness' NOT NULL,
	"schema_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"robots_meta" text DEFAULT 'index,follow' NOT NULL,
	"sitemap_enabled" boolean DEFAULT true NOT NULL,
	"analytics_id" text,
	"score" integer DEFAULT 0 NOT NULL,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_experiences" integer DEFAULT 0 NOT NULL,
	"published_experiences" integer DEFAULT 0 NOT NULL,
	"total_pages" integer DEFAULT 0 NOT NULL,
	"total_sections" integer DEFAULT 0 NOT NULL,
	"total_themes" integer DEFAULT 0 NOT NULL,
	"total_templates" integer DEFAULT 0 NOT NULL,
	"average_seo_score" integer DEFAULT 0 NOT NULL,
	"type_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"law_applied" boolean DEFAULT true NOT NULL,
	"snapshot_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_key" text NOT NULL,
	"title" text NOT NULL,
	"template_type" text DEFAULT 'page' NOT NULL,
	"experience_type" text DEFAULT 'business_website' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"thumbnail" text,
	"component_tree" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"default_theme" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"default_seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_platform" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_themes" (
	"id" serial PRIMARY KEY NOT NULL,
	"theme_id" text NOT NULL,
	"title" text NOT NULL,
	"theme_type" text DEFAULT 'custom' NOT NULL,
	"color_primary" text DEFAULT '#3366ff' NOT NULL,
	"color_secondary" text DEFAULT '#6c757d' NOT NULL,
	"color_background" text DEFAULT '#ffffff' NOT NULL,
	"color_surface" text DEFAULT '#f8f9fa' NOT NULL,
	"color_text" text DEFAULT '#212529' NOT NULL,
	"color_accent" text DEFAULT '#22c55e' NOT NULL,
	"font_heading" text DEFAULT 'Inter' NOT NULL,
	"font_body" text DEFAULT 'Inter' NOT NULL,
	"font_mono" text DEFAULT 'JetBrains Mono' NOT NULL,
	"border_radius" text DEFAULT '0.5rem' NOT NULL,
	"spacing" text DEFAULT '1rem' NOT NULL,
	"dark_mode" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tokens" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_platform" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_engagement" (
	"id" serial PRIMARY KEY NOT NULL,
	"engagement_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"engagement_score" real DEFAULT 0,
	"recency_score" real DEFAULT 0,
	"frequency_score" real DEFAULT 0,
	"monetary_score" real DEFAULT 0,
	"rfm_score" real DEFAULT 0,
	"health_status" text DEFAULT 'unknown',
	"total_interactions" integer DEFAULT 0,
	"email_opens" integer DEFAULT 0,
	"email_clicks" integer DEFAULT 0,
	"form_submissions" integer DEFAULT 0,
	"page_views" integer DEFAULT 0,
	"purchases" integer DEFAULT 0,
	"support_tickets" integer DEFAULT 0,
	"total_revenue" real DEFAULT 0,
	"average_order_value" real DEFAULT 0,
	"lifetime_value" real DEFAULT 0,
	"predicted_ltv" real DEFAULT 0,
	"first_seen_at" timestamp,
	"last_seen_at" timestamp,
	"last_purchase_at" timestamp,
	"next_follow_up_at" timestamp,
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"interaction_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"interaction_type" text NOT NULL,
	"channel" text,
	"direction" text,
	"subject" text,
	"summary" text,
	"sentiment" text,
	"outcome" text,
	"duration_seconds" integer,
	"metadata" jsonb DEFAULT '{}',
	"scheduled_at" timestamp,
	"occurred_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_lifecycle" (
	"id" serial PRIMARY KEY NOT NULL,
	"lifecycle_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"current_stage" text NOT NULL,
	"previous_stage" text,
	"stage_history" jsonb DEFAULT '[]',
	"entered_stage_at" timestamp DEFAULT now(),
	"days_in_stage" integer DEFAULT 0,
	"conversion_score" real DEFAULT 0,
	"lost_reason" text,
	"won_reason" text,
	"notes" text,
	"triggered_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"entity_type" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"full_name" text,
	"display_name" text,
	"email" text,
	"phone" text,
	"avatar_url" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"country" text,
	"website" text,
	"linkedin_url" text,
	"twitter_handle" text,
	"social_profiles" jsonb DEFAULT '{}',
	"timezone" text,
	"language" text DEFAULT 'en',
	"currency" text DEFAULT 'USD',
	"tags" jsonb DEFAULT '[]',
	"custom_fields" jsonb DEFAULT '{}',
	"consent_given" boolean DEFAULT false,
	"consent_date" timestamp,
	"consent_details" jsonb DEFAULT '{}',
	"assigned_user_id" integer,
	"source" text,
	"source_id" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_quality" (
	"id" serial PRIMARY KEY NOT NULL,
	"quality_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"completeness_score" real DEFAULT 0,
	"has_name" boolean DEFAULT false,
	"has_email" boolean DEFAULT false,
	"has_phone" boolean DEFAULT false,
	"has_address" boolean DEFAULT false,
	"has_organization" boolean DEFAULT false,
	"has_lifecycle_stage" boolean DEFAULT false,
	"has_engagement_data" boolean DEFAULT false,
	"duplicate_flag" boolean DEFAULT false,
	"duplicate_of" text,
	"duplicate_confidence" real DEFAULT 0,
	"merge_recommendation" text,
	"validation_issues" jsonb DEFAULT '[]',
	"missing_fields" jsonb DEFAULT '[]',
	"recommendations" jsonb DEFAULT '[]',
	"analyzed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"full_name" text,
	"email" text,
	"entity_type" text,
	"current_stage" text,
	"health_status" text DEFAULT 'unknown',
	"engagement_score" real DEFAULT 0,
	"lifetime_value" real DEFAULT 0,
	"interaction_count" integer DEFAULT 0,
	"relationship_count" integer DEFAULT 0,
	"segment_ids" jsonb DEFAULT '[]',
	"org_id" text,
	"duplicate_flag" boolean DEFAULT false,
	"merge_recommendation" text,
	"profile_complete" real DEFAULT 0,
	"last_activity_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"relationship_id" text NOT NULL,
	"source_id" text NOT NULL,
	"source_type" text NOT NULL,
	"target_id" text NOT NULL,
	"target_type" text NOT NULL,
	"relationship_type" text NOT NULL,
	"strength" real DEFAULT 0.5,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_bidirectional" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"segment_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"title" text NOT NULL,
	"description" text,
	"segment_type" text NOT NULL,
	"criteria" jsonb DEFAULT '{}',
	"customer_ids" jsonb DEFAULT '[]',
	"member_count" integer DEFAULT 0,
	"is_automatic" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"last_refreshed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_customers" integer DEFAULT 0,
	"total_organizations" integer DEFAULT 0,
	"total_interactions" integer DEFAULT 0,
	"total_segments" integer DEFAULT 0,
	"active_customers" integer DEFAULT 0,
	"stage_breakdown" jsonb DEFAULT '{}',
	"health_breakdown" jsonb DEFAULT '{}',
	"entity_type_breakdown" jsonb DEFAULT '{}',
	"average_engagement" real DEFAULT 0,
	"average_lifetime_value" real DEFAULT 0,
	"duplicate_flag_count" integer DEFAULT 0,
	"law_applied" boolean DEFAULT true,
	"snapshot_data" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organization_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"org_type" text NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"domain" text,
	"email" text,
	"phone" text,
	"website" text,
	"industry" text,
	"employee_count" integer,
	"annual_revenue" real,
	"currency" text DEFAULT 'USD',
	"country" text,
	"city" text,
	"linkedin_url" text,
	"tags" jsonb DEFAULT '[]',
	"custom_fields" jsonb DEFAULT '{}',
	"parent_org_id" text,
	"hierarchy_depth" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_processes" (
	"id" serial PRIMARY KEY NOT NULL,
	"process_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"title" text NOT NULL,
	"description" text,
	"process_domain" text NOT NULL,
	"process_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"owner_id" integer,
	"template_id" text,
	"stage_count" integer DEFAULT 0 NOT NULL,
	"completed_stages" integer DEFAULT 0 NOT NULL,
	"sla_hours" real,
	"sla_status" text DEFAULT 'on_track',
	"health_score" real DEFAULT 0,
	"optimization_score" real DEFAULT 0,
	"tags" jsonb DEFAULT '[]',
	"metadata" jsonb DEFAULT '{}',
	"started_at" timestamp,
	"completed_at" timestamp,
	"due_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "process_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"dependency_id" text NOT NULL,
	"source_process_id" text NOT NULL,
	"target_process_id" text NOT NULL,
	"dependency_type" text NOT NULL,
	"strength" real DEFAULT 1,
	"is_critical_path" boolean DEFAULT false,
	"description" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "process_diagnostics" (
	"id" serial PRIMARY KEY NOT NULL,
	"diagnostic_id" text NOT NULL,
	"process_id" text,
	"user_id" integer,
	"severity" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"recommendation" text,
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "process_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"metric_id" text NOT NULL,
	"process_id" text NOT NULL,
	"user_id" integer,
	"total_duration_hours" real DEFAULT 0,
	"avg_stage_hours" real DEFAULT 0,
	"longest_stage_id" text,
	"longest_stage_hours" real DEFAULT 0,
	"completion_rate" real DEFAULT 0,
	"bottleneck_count" integer DEFAULT 0,
	"rework_count" integer DEFAULT 0,
	"escalation_count" integer DEFAULT 0,
	"sla_adherence" real DEFAULT 100,
	"sla_breach_count" integer DEFAULT 0,
	"optimization_score" real DEFAULT 0,
	"opportunities" jsonb DEFAULT '[]',
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "process_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"process_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"title" text,
	"process_domain" text,
	"status" text DEFAULT 'draft',
	"stage_count" integer DEFAULT 0,
	"completed_stages" integer DEFAULT 0,
	"completion_percent" real DEFAULT 0,
	"health_score" real DEFAULT 0,
	"sla_status" text DEFAULT 'on_track',
	"bottleneck_stage_id" text,
	"pending_approvals" integer DEFAULT 0,
	"blocked_stages" integer DEFAULT 0,
	"dependency_count" integer DEFAULT 0,
	"last_progress_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "process_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" text NOT NULL,
	"process_id" text NOT NULL,
	"user_id" integer,
	"title" text NOT NULL,
	"description" text,
	"rule_type" text NOT NULL,
	"trigger_event" text,
	"conditions" jsonb DEFAULT '[]',
	"actions" jsonb DEFAULT '[]',
	"priority" integer DEFAULT 50 NOT NULL,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "process_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_processes" integer DEFAULT 0,
	"active_processes" integer DEFAULT 0,
	"completed_processes" integer DEFAULT 0,
	"blocked_processes" integer DEFAULT 0,
	"sla_breached_count" integer DEFAULT 0,
	"pending_approvals" integer DEFAULT 0,
	"total_templates" integer DEFAULT 0,
	"domain_breakdown" jsonb DEFAULT '{}',
	"status_breakdown" jsonb DEFAULT '{}',
	"average_health_score" real DEFAULT 0,
	"average_completion" real DEFAULT 0,
	"law_applied" boolean DEFAULT true,
	"snapshot_data" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "process_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage_id" text NOT NULL,
	"process_id" text NOT NULL,
	"user_id" integer,
	"title" text NOT NULL,
	"description" text,
	"stage_order" integer NOT NULL,
	"stage_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"assignee_id" integer,
	"assignee_type" text,
	"requires_approval" boolean DEFAULT false,
	"sla_hours" real,
	"started_at" timestamp,
	"completed_at" timestamp,
	"due_at" timestamp,
	"blocked_reason" text,
	"step_count" integer DEFAULT 0 NOT NULL,
	"completed_steps" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "process_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"step_id" text NOT NULL,
	"stage_id" text NOT NULL,
	"process_id" text NOT NULL,
	"user_id" integer,
	"title" text NOT NULL,
	"description" text,
	"step_order" integer NOT NULL,
	"step_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"is_required" boolean DEFAULT true,
	"is_blocking" boolean DEFAULT false,
	"assignee_id" integer,
	"input_schema" jsonb DEFAULT '{}',
	"output_schema" jsonb DEFAULT '{}',
	"completed_at" timestamp,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "process_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"user_id" integer,
	"title" text NOT NULL,
	"description" text,
	"process_domain" text NOT NULL,
	"process_type" text NOT NULL,
	"is_platform" boolean DEFAULT false,
	"stage_schema" jsonb DEFAULT '[]',
	"rule_schema" jsonb DEFAULT '[]',
	"estimated_hours" real,
	"usage_count" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "billing_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"customer_id" text,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"payment_gateway" text,
	"invoice_prefix" text,
	"auto_invoice" boolean DEFAULT false,
	"net_terms_days" integer DEFAULT 30,
	"late_fee_pct" real,
	"tax_exempt" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "checkout_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"checkout_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"offer_id" text,
	"status" text DEFAULT 'configuring' NOT NULL,
	"readiness_score" real DEFAULT 0,
	"checkout_type" text DEFAULT 'standard',
	"required_assets" jsonb DEFAULT '[]',
	"validation_results" jsonb DEFAULT '[]',
	"conversion_metadata" jsonb DEFAULT '{}',
	"abandonment_metadata" jsonb DEFAULT '{}',
	"readiness_diagnostics" jsonb DEFAULT '[]',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commerce_bundles" (
	"id" serial PRIMARY KEY NOT NULL,
	"bundle_id" text NOT NULL,
	"catalog_id" text,
	"user_id" integer,
	"business_id" integer,
	"title" text NOT NULL,
	"description" text,
	"bundle_type" text DEFAULT 'curated' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"bundle_price" real,
	"currency" text DEFAULT 'USD' NOT NULL,
	"discount_type" text DEFAULT 'none',
	"discount_value" real,
	"offer_ids" jsonb DEFAULT '[]',
	"product_ids" jsonb DEFAULT '[]',
	"service_ids" jsonb DEFAULT '[]',
	"savings_amount" real,
	"is_limited_time" boolean DEFAULT false,
	"expires_at" timestamp,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commerce_catalogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"catalog_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"title" text NOT NULL,
	"description" text,
	"catalog_type" text DEFAULT 'general' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"default_currency" text DEFAULT 'USD' NOT NULL,
	"supported_currencies" jsonb DEFAULT '[]',
	"product_count" integer DEFAULT 0 NOT NULL,
	"service_count" integer DEFAULT 0 NOT NULL,
	"offer_count" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false,
	"tags" jsonb DEFAULT '[]',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commerce_diagnostics" (
	"id" serial PRIMARY KEY NOT NULL,
	"diagnostic_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"engine_name" text NOT NULL,
	"severity" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"recommendation" text,
	"affected_object_id" text,
	"affected_object_type" text,
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commerce_offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"offer_id" text NOT NULL,
	"catalog_id" text,
	"user_id" integer,
	"business_id" integer,
	"title" text NOT NULL,
	"headline" text,
	"description" text,
	"offer_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"price" real,
	"compare_at_price" real,
	"currency" text DEFAULT 'USD' NOT NULL,
	"pricing_model_id" text,
	"product_ids" jsonb DEFAULT '[]',
	"service_ids" jsonb DEFAULT '[]',
	"value_proposition" jsonb DEFAULT '[]',
	"bonus_metadata" jsonb DEFAULT '[]',
	"guarantee_metadata" jsonb DEFAULT '{}',
	"valid_from" timestamp,
	"valid_until" timestamp,
	"max_redemptions" integer,
	"redemption_count" integer DEFAULT 0,
	"conversion_score" real DEFAULT 0,
	"tags" jsonb DEFAULT '[]',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commerce_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"catalog_id" text,
	"user_id" integer,
	"business_id" integer,
	"title" text NOT NULL,
	"description" text,
	"product_type" text NOT NULL,
	"sku" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"base_price" real,
	"currency" text DEFAULT 'USD' NOT NULL,
	"has_variants" boolean DEFAULT false,
	"variant_count" integer DEFAULT 0,
	"inventory_policy" text DEFAULT 'unlimited',
	"inventory_qty" integer,
	"is_digital" boolean DEFAULT false,
	"delivery_metadata" jsonb DEFAULT '{}',
	"fulfillment_metadata" jsonb DEFAULT '{}',
	"seo_metadata" jsonb DEFAULT '{}',
	"tags" jsonb DEFAULT '[]',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commerce_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"registry_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"total_catalogs" integer DEFAULT 0,
	"total_products" integer DEFAULT 0,
	"total_services" integer DEFAULT 0,
	"total_offers" integer DEFAULT 0,
	"total_bundles" integer DEFAULT 0,
	"total_variants" integer DEFAULT 0,
	"total_pricing_models" integer DEFAULT 0,
	"total_subscriptions" integer DEFAULT 0,
	"active_subscriptions" integer DEFAULT 0,
	"total_contracts" integer DEFAULT 0,
	"total_quotes" integer DEFAULT 0,
	"total_proposals" integer DEFAULT 0,
	"total_invoices" integer DEFAULT 0,
	"total_revenue_streams" integer DEFAULT 0,
	"estimated_monthly_revenue" real DEFAULT 0,
	"catalog_health_score" real DEFAULT 0,
	"pricing_completeness_score" real DEFAULT 0,
	"checkout_readiness_score" real DEFAULT 0,
	"monetization_score" real DEFAULT 0,
	"missing_monetization" jsonb DEFAULT '[]',
	"open_opportunities" jsonb DEFAULT '[]',
	"governance_metadata" jsonb DEFAULT '{}',
	"last_analyzed_at" timestamp,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commerce_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" text NOT NULL,
	"catalog_id" text,
	"user_id" integer,
	"business_id" integer,
	"title" text NOT NULL,
	"description" text,
	"service_type" text NOT NULL,
	"delivery_mode" text DEFAULT 'remote' NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"base_price" real,
	"pricing_model" text DEFAULT 'fixed',
	"currency" text DEFAULT 'USD' NOT NULL,
	"duration_hours" real,
	"capacity_limit" integer,
	"requires_booking" boolean DEFAULT false,
	"booking_metadata" jsonb DEFAULT '{}',
	"deliverables" jsonb DEFAULT '[]',
	"tags" jsonb DEFAULT '[]',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commerce_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"total_catalogs" integer DEFAULT 0,
	"total_products" integer DEFAULT 0,
	"total_services" integer DEFAULT 0,
	"total_offers" integer DEFAULT 0,
	"total_subscriptions" integer DEFAULT 0,
	"active_subscriptions" integer DEFAULT 0,
	"estimated_monthly_revenue" real DEFAULT 0,
	"monetization_score" real DEFAULT 0,
	"catalog_health_score" real DEFAULT 0,
	"pricing_completeness_score" real DEFAULT 0,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commerce_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant_id" text NOT NULL,
	"parent_id" text NOT NULL,
	"parent_type" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"title" text NOT NULL,
	"sku" text,
	"price" real,
	"compare_at_price" real,
	"currency" text DEFAULT 'USD',
	"attributes" jsonb DEFAULT '{}',
	"inventory_qty" integer,
	"is_available" boolean DEFAULT true,
	"position" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_doc_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"customer_id" text,
	"title" text NOT NULL,
	"contract_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_value" real,
	"currency" text DEFAULT 'USD',
	"term_start_date" timestamp,
	"term_end_date" timestamp,
	"renewal_terms" text,
	"clauses" jsonb DEFAULT '[]',
	"signed_at" timestamp,
	"signed_by_customer" boolean DEFAULT false,
	"signed_by_business" boolean DEFAULT false,
	"terminated_at" timestamp,
	"termination_reason" text,
	"related_quote_id" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "discount_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"discount_rule_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"code" text,
	"title" text NOT NULL,
	"discount_type" text NOT NULL,
	"discount_value" real,
	"minimum_purchase" real,
	"maximum_discount" real,
	"is_public" boolean DEFAULT false,
	"is_stackable" boolean DEFAULT false,
	"starts_at" timestamp,
	"expires_at" timestamp,
	"max_uses" integer,
	"used_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoice_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"customer_id" text,
	"contract_doc_id" text,
	"subscription_contract_id" text,
	"title" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"line_items" jsonb DEFAULT '[]',
	"subtotal" real,
	"discount_amount" real,
	"tax_amount" real,
	"total" real,
	"amount_paid" real DEFAULT 0,
	"currency" text DEFAULT 'USD',
	"due_date" timestamp,
	"paid_at" timestamp,
	"notes" text,
	"payment_gateway" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pricing_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"catalog_id" text,
	"title" text NOT NULL,
	"model_type" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"base_amount" real,
	"billing_interval" text,
	"trial_days" integer,
	"setup_fee" real,
	"tiers" jsonb DEFAULT '[]',
	"usage_metric" text,
	"region_overrides" jsonb DEFAULT '{}',
	"is_active" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" text NOT NULL,
	"model_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"rule_type" text NOT NULL,
	"conditions" jsonb DEFAULT '{}',
	"effect" jsonb DEFAULT '{}' NOT NULL,
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promotion_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"promotion_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"title" text NOT NULL,
	"promotion_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"discount_type" text NOT NULL,
	"discount_value" real,
	"minimum_order" real,
	"applies_to" jsonb DEFAULT '{}',
	"starts_at" timestamp,
	"ends_at" timestamp,
	"max_uses" integer,
	"used_count" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"proposal_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"customer_id" text,
	"title" text NOT NULL,
	"executive_summary" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"sections" jsonb DEFAULT '[]',
	"total_value" real,
	"currency" text DEFAULT 'USD',
	"valid_until" timestamp,
	"accepted_at" timestamp,
	"declined_at" timestamp,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"customer_id" text,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"line_items" jsonb DEFAULT '[]',
	"subtotal" real,
	"discount_amount" real,
	"tax_amount" real,
	"total" real,
	"currency" text DEFAULT 'USD',
	"valid_until" timestamp,
	"terms" text,
	"notes" text,
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"accepted_at" timestamp,
	"declined_at" timestamp,
	"converted_to_contract_id" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "revenue_forecasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"forecast_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"title" text NOT NULL,
	"forecast_period" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"projected_revenue" real,
	"currency" text DEFAULT 'USD',
	"confidence_score" real DEFAULT 0,
	"stream_breakdown" jsonb DEFAULT '{}',
	"growth_assumptions" jsonb DEFAULT '{}',
	"risk_factors" jsonb DEFAULT '[]',
	"opportunity_factors" jsonb DEFAULT '[]',
	"expansion_opportunities" jsonb DEFAULT '[]',
	"baseline_revenue" real,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "revenue_streams" (
	"id" serial PRIMARY KEY NOT NULL,
	"stream_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"title" text NOT NULL,
	"stream_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"estimated_monthly_revenue" real,
	"currency" text DEFAULT 'USD',
	"revenue_metadata" jsonb DEFAULT '{}',
	"concentration_risk" real DEFAULT 0,
	"growth_velocity" real DEFAULT 0,
	"average_order_value" real,
	"customer_lifetime_value" real,
	"conversion_rate" real,
	"tags" jsonb DEFAULT '[]',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shipping_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipping_profile_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"title" text NOT NULL,
	"shipping_type" text NOT NULL,
	"flat_rate" real,
	"currency" text DEFAULT 'USD',
	"free_threshold" real,
	"shipping_zones" jsonb DEFAULT '[]',
	"carriers" jsonb DEFAULT '[]',
	"estimated_days" jsonb DEFAULT '{}',
	"is_active" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shopping_carts" (
	"id" serial PRIMARY KEY NOT NULL,
	"cart_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"customer_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"items" jsonb DEFAULT '[]',
	"subtotal" real DEFAULT 0,
	"discount_amount" real DEFAULT 0,
	"tax_amount" real DEFAULT 0,
	"shipping_amount" real DEFAULT 0,
	"total" real DEFAULT 0,
	"currency" text DEFAULT 'USD',
	"applied_coupons" jsonb DEFAULT '[]',
	"metadata" jsonb DEFAULT '{}',
	"expires_at" timestamp,
	"converted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscription_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"customer_id" text,
	"offer_id" text,
	"pricing_model_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"plan_title" text,
	"amount" real,
	"currency" text DEFAULT 'USD',
	"billing_interval" text DEFAULT 'monthly' NOT NULL,
	"trial_ends_at" timestamp,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"grace_period_days" integer DEFAULT 0,
	"renewal_metadata" jsonb DEFAULT '{}',
	"upgrade_metadata" jsonb DEFAULT '{}',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tax_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"tax_profile_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"title" text NOT NULL,
	"tax_type" text NOT NULL,
	"default_rate" real,
	"is_inclusive" boolean DEFAULT false,
	"region_rates" jsonb DEFAULT '{}',
	"exemptions" jsonb DEFAULT '[]',
	"tax_provider" text,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "capability_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"domains" jsonb DEFAULT '[]',
	"auth_methods" jsonb DEFAULT '[]',
	"status" text DEFAULT 'registered' NOT NULL,
	"existing_connector" boolean DEFAULT false,
	"connector_id" text,
	"registered_at" timestamp DEFAULT now(),
	"docs_url" text,
	"base_url" text,
	"api_version" text,
	"is_officially_supported" boolean DEFAULT false,
	"capability_count" integer DEFAULT 0,
	"health_score" real DEFAULT 1,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" text NOT NULL,
	"provider_id" text,
	"connection_id" text,
	"user_id" integer,
	"action" text NOT NULL,
	"actor_id" integer,
	"actor_role" text,
	"before" jsonb DEFAULT '{}',
	"after" jsonb DEFAULT '{}',
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"connection_id" text NOT NULL,
	"user_id" integer,
	"business_id" integer,
	"provider_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"auth_method" text DEFAULT 'api_key' NOT NULL,
	"connected_at" timestamp,
	"last_health_check" timestamp,
	"last_active_at" timestamp,
	"expires_at" timestamp,
	"drift_detected_at" timestamp,
	"health_score" real DEFAULT 1,
	"scope_ids" jsonb DEFAULT '[]',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" integer,
	"contract_type" text NOT NULL,
	"tier" text,
	"monthly_limit" integer,
	"cost_per_unit" real,
	"currency" text DEFAULT 'USD',
	"sla_uptime" real,
	"terms_url" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"auto_renews" boolean DEFAULT false,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"credential_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" integer,
	"credential_type" text NOT NULL,
	"vault_ref_key" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"issued_at" timestamp,
	"expires_at" timestamp,
	"last_rotated_at" timestamp,
	"rotation_due_at" timestamp,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"dependency_id" text NOT NULL,
	"source_provider_id" text NOT NULL,
	"target_provider_id" text NOT NULL,
	"dependency_type" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_diagnostics" (
	"id" serial PRIMARY KEY NOT NULL,
	"diagnostic_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"connection_id" text,
	"user_id" integer,
	"engine_name" text NOT NULL,
	"severity" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"recommendation" text,
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"connection_id" text,
	"user_id" integer,
	"event_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}',
	"severity" text DEFAULT 'info',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_health" (
	"id" serial PRIMARY KEY NOT NULL,
	"health_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"connection_id" text,
	"user_id" integer,
	"health_status" text DEFAULT 'unknown' NOT NULL,
	"availability_score" real DEFAULT 1,
	"latency_ms" integer,
	"auth_state" text DEFAULT 'valid',
	"quota_state" text DEFAULT 'ok',
	"rate_limit_state" text DEFAULT 'ok',
	"version_compatible" boolean DEFAULT true,
	"drift_detected" boolean DEFAULT false,
	"issues" jsonb DEFAULT '[]',
	"checked_at" timestamp DEFAULT now(),
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_lifecycle" (
	"id" serial PRIMARY KEY NOT NULL,
	"lifecycle_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"connection_id" text,
	"user_id" integer,
	"lifecycle_stage" text NOT NULL,
	"previous_stage" text,
	"transition_reason" text,
	"triggered_by" text DEFAULT 'system',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_manifests" (
	"id" serial PRIMARY KEY NOT NULL,
	"manifest_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"capabilities" jsonb DEFAULT '[]',
	"auth_requirements" jsonb DEFAULT '{}',
	"rate_limits" jsonb DEFAULT '{}',
	"quotas" jsonb DEFAULT '{}',
	"webhook_support" boolean DEFAULT false,
	"webhook_events" jsonb DEFAULT '[]',
	"sdk_languages" jsonb DEFAULT '[]',
	"compliance" jsonb DEFAULT '[]',
	"regions" jsonb DEFAULT '[]',
	"is_active" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_oauth" (
	"id" serial PRIMARY KEY NOT NULL,
	"oauth_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" integer,
	"oauth_version" text DEFAULT '2.0' NOT NULL,
	"grant_type" text DEFAULT 'authorization_code',
	"scopes" jsonb DEFAULT '[]',
	"token_status" text DEFAULT 'pending' NOT NULL,
	"token_expires_at" timestamp,
	"refresh_token_ref" text,
	"last_refresh_at" timestamp,
	"refresh_fail_count" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"permission_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" integer,
	"permission_type" text NOT NULL,
	"resource_type" text,
	"is_granted" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"granted_at" timestamp,
	"revoked_at" timestamp,
	"verified_at" timestamp,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"policy_id" text NOT NULL,
	"provider_id" text,
	"policy_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"rules" jsonb DEFAULT '[]',
	"enforcement" text DEFAULT 'advisory' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"applies_to" jsonb DEFAULT '{}',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_quotas" (
	"id" serial PRIMARY KEY NOT NULL,
	"quota_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"connection_id" text,
	"user_id" integer,
	"quota_type" text NOT NULL,
	"quota_limit" integer,
	"quota_used" integer DEFAULT 0,
	"reset_at" timestamp,
	"usage_percent" real DEFAULT 0,
	"alert_threshold" real DEFAULT 80,
	"status" text DEFAULT 'ok',
	"metadata" jsonb DEFAULT '{}',
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"rate_limit_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"connection_id" text,
	"user_id" integer,
	"window_type" text DEFAULT 'minute' NOT NULL,
	"limit_value" integer,
	"used_value" integer DEFAULT 0,
	"remaining_value" integer,
	"reset_at" timestamp,
	"status" text DEFAULT 'ok',
	"retry_after_ms" integer,
	"metadata" jsonb DEFAULT '{}',
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"recommendation_id" text NOT NULL,
	"target_role" text DEFAULT 'FOUNDER_ADMIN' NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"recommended_action" text,
	"priority" integer DEFAULT 5,
	"estimated_impact" text,
	"suggested_provider_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"acknowledged_at" timestamp,
	"actioned_at" timestamp,
	"dismissed_at" timestamp,
	"expires_at" timestamp,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"registry_id" text NOT NULL,
	"user_id" integer,
	"total_providers" integer DEFAULT 0,
	"active_providers" integer DEFAULT 0,
	"connected_providers" integer DEFAULT 0,
	"healthy_providers" integer DEFAULT 0,
	"degraded_providers" integer DEFAULT 0,
	"expired_credentials" integer DEFAULT 0,
	"pending_sync" integer DEFAULT 0,
	"total_capabilities" integer DEFAULT 0,
	"active_connections" integer DEFAULT 0,
	"open_recommendations" integer DEFAULT 0,
	"critical_diagnostics" integer DEFAULT 0,
	"integration_readiness" real DEFAULT 0,
	"missing_domains" jsonb DEFAULT '[]',
	"infrastructure_alerts" jsonb DEFAULT '[]',
	"last_analyzed_at" timestamp,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_scopes" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" integer,
	"scope_name" text NOT NULL,
	"is_granted" boolean DEFAULT false,
	"is_required" boolean DEFAULT false,
	"granted_at" timestamp,
	"revoked_at" timestamp,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" text NOT NULL,
	"user_id" integer,
	"total_providers" integer DEFAULT 0,
	"active_providers" integer DEFAULT 0,
	"connected_providers" integer DEFAULT 0,
	"healthy_providers" integer DEFAULT 0,
	"expired_credentials" integer DEFAULT 0,
	"active_connections" integer DEFAULT 0,
	"integration_readiness" real DEFAULT 0,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_sync_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"history_id" text NOT NULL,
	"sync_job_id" text NOT NULL,
	"connection_id" text,
	"provider_id" text NOT NULL,
	"user_id" integer,
	"sync_type" text NOT NULL,
	"outcome" text NOT NULL,
	"duration_ms" integer,
	"records_processed" integer DEFAULT 0,
	"errors_found" integer DEFAULT 0,
	"summary" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_sync_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"sync_job_id" text NOT NULL,
	"connection_id" text,
	"provider_id" text NOT NULL,
	"user_id" integer,
	"sync_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"failed_at" timestamp,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"result" jsonb DEFAULT '{}',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"version" text NOT NULL,
	"change_type" text DEFAULT 'minor' NOT NULL,
	"release_date" timestamp,
	"is_supported" boolean DEFAULT true,
	"is_latest" boolean DEFAULT false,
	"change_notes" text,
	"breaking_changes" jsonb DEFAULT '[]',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhook_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" integer,
	"endpoint_url" text,
	"events" jsonb DEFAULT '[]',
	"status" text DEFAULT 'pending' NOT NULL,
	"failure_count" integer DEFAULT 0,
	"last_delivery_at" timestamp,
	"last_failure_at" timestamp,
	"last_failure_msg" text,
	"secret_ref" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "uecios_capabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"capability_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"domain_slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"capability_type" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"existing_action" text,
	"is_registered" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "uecios_domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"parent_domain" text,
	"icon" text,
	"is_system" boolean DEFAULT true,
	"provider_count" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_instance_id" integer,
	"business_id" integer,
	"user_id" integer,
	"category" text DEFAULT 'automation' NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"component" text,
	"action" text,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduler_state" (
	"task_key" text PRIMARY KEY NOT NULL,
	"last_run_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blueprints" ADD CONSTRAINT "blueprints_category_id_blueprint_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."blueprint_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprints" ADD CONSTRAINT "blueprints_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_steps" ADD CONSTRAINT "blueprint_steps_blueprint_id_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."blueprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tools" ADD CONSTRAINT "tools_category_id_tool_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."tool_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_credential_requirements" ADD CONSTRAINT "tool_credential_requirements_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_recommendations" ADD CONSTRAINT "business_recommendations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_recommendations" ADD CONSTRAINT "business_recommendations_suggested_tool_id_tools_id_fk" FOREIGN KEY ("suggested_tool_id") REFERENCES "public"."tools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_recommendations" ADD CONSTRAINT "business_recommendations_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_recommendations" ADD CONSTRAINT "business_recommendations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_recommendations" ADD CONSTRAINT "business_recommendations_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_recommendations" ADD CONSTRAINT "business_recommendations_project_id_ash_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ash_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_instances" ADD CONSTRAINT "system_instances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_instances" ADD CONSTRAINT "system_instances_blueprint_id_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."blueprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_instances" ADD CONSTRAINT "system_instances_client_workspace_id_client_workspaces_id_fk" FOREIGN KEY ("client_workspace_id") REFERENCES "public"."client_workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tool_selections" ADD CONSTRAINT "user_tool_selections_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tool_selections" ADD CONSTRAINT "user_tool_selections_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_client_workspace_id_client_workspaces_id_fk" FOREIGN KEY ("client_workspace_id") REFERENCES "public"."client_workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_sessions" ADD CONSTRAINT "build_sessions_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_progress" ADD CONSTRAINT "build_progress_build_session_id_build_sessions_id_fk" FOREIGN KEY ("build_session_id") REFERENCES "public"."build_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_progress" ADD CONSTRAINT "build_progress_step_id_blueprint_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."blueprint_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_outputs" ADD CONSTRAINT "build_outputs_build_session_id_build_sessions_id_fk" FOREIGN KEY ("build_session_id") REFERENCES "public"."build_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_memory" ADD CONSTRAINT "user_memory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_memory" ADD CONSTRAINT "user_memory_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_memory" ADD CONSTRAINT "user_memory_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openrouter_usage" ADD CONSTRAINT "openrouter_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openrouter_usage" ADD CONSTRAINT "openrouter_usage_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_activity" ADD CONSTRAINT "admin_activity_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_activity_events" ADD CONSTRAINT "system_activity_events_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_activations" ADD CONSTRAINT "skill_activations_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encryption_key_rotations" ADD CONSTRAINT "encryption_key_rotations_rotated_by_admin_id_users_id_fk" FOREIGN KEY ("rotated_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_connectors" ADD CONSTRAINT "system_connectors_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runtime_jobs" ADD CONSTRAINT "runtime_jobs_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_files" ADD CONSTRAINT "generated_files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_files" ADD CONSTRAINT "generated_files_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_usage_events" ADD CONSTRAINT "credit_usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_usage_events" ADD CONSTRAINT "credit_usage_events_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_email_list_id_email_lists_id_fk" FOREIGN KEY ("email_list_id") REFERENCES "public"."email_lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_affiliate_links" ADD CONSTRAINT "user_affiliate_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_affiliate_links" ADD CONSTRAINT "user_affiliate_links_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_link_id_user_affiliate_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."user_affiliate_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_list_id_email_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."email_lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_subscriber_id_email_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."email_subscribers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_sequence_id_email_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."email_sequences"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_step_id_email_sequence_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."email_sequence_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_lists" ADD CONSTRAINT "email_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sequence_steps" ADD CONSTRAINT "email_sequence_steps_sequence_id_email_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."email_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sequences" ADD CONSTRAINT "email_sequences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_sequences" ADD CONSTRAINT "email_sequences_list_id_email_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."email_lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_subscribers" ADD CONSTRAINT "email_subscribers_list_id_email_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."email_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_domains" ADD CONSTRAINT "user_domains_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_domains" ADD CONSTRAINT "user_domains_linked_page_id_landing_pages_id_fk" FOREIGN KEY ("linked_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_tasks" ADD CONSTRAINT "scheduled_tasks_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_tasks" ADD CONSTRAINT "scheduled_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_revenue_providers" ADD CONSTRAINT "system_revenue_providers_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_revenue_providers" ADD CONSTRAINT "system_revenue_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_content" ADD CONSTRAINT "published_content_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_events" ADD CONSTRAINT "milestone_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_events" ADD CONSTRAINT "milestone_events_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ab_variants" ADD CONSTRAINT "ab_variants_test_id_ab_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."ab_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_reviews" ADD CONSTRAINT "blueprint_reviews_blueprint_id_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."blueprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_reviews" ADD CONSTRAINT "blueprint_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_purchases" ADD CONSTRAINT "blueprint_purchases_blueprint_id_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."blueprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_purchases" ADD CONSTRAINT "blueprint_purchases_buyer_user_id_users_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_purchases" ADD CONSTRAINT "blueprint_purchases_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_workspaces" ADD CONSTRAINT "client_workspaces_agency_user_id_users_id_fk" FOREIGN KEY ("agency_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "white_label_configs" ADD CONSTRAINT "white_label_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_usage_events" ADD CONSTRAINT "api_key_usage_events_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_usage_events" ADD CONSTRAINT "api_key_usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_client_workspace_id_client_workspaces_id_fk" FOREIGN KEY ("client_workspace_id") REFERENCES "public"."client_workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_connections" ADD CONSTRAINT "business_connections_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_connections" ADD CONSTRAINT "business_connections_user_credential_id_user_credentials_id_fk" FOREIGN KEY ("user_credential_id") REFERENCES "public"."user_credentials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_health_scores" ADD CONSTRAINT "business_health_scores_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_health_scores" ADD CONSTRAINT "business_health_scores_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_health_scores" ADD CONSTRAINT "business_health_scores_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_health_scores" ADD CONSTRAINT "business_health_scores_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_health_scores" ADD CONSTRAINT "business_health_scores_project_id_ash_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ash_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_operations_settings" ADD CONSTRAINT "business_operations_settings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_approvals" ADD CONSTRAINT "pending_approvals_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_approvals" ADD CONSTRAINT "pending_approvals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_health_scores" ADD CONSTRAINT "system_health_scores_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_health_metrics" ADD CONSTRAINT "business_health_metrics_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_health_metrics" ADD CONSTRAINT "business_health_metrics_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_health_metrics" ADD CONSTRAINT "business_health_metrics_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_health_metrics" ADD CONSTRAINT "business_health_metrics_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_health_metrics" ADD CONSTRAINT "business_health_metrics_project_id_ash_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ash_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_log_events" ADD CONSTRAINT "monitoring_log_events_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_log_events" ADD CONSTRAINT "monitoring_log_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_page_preview_sessions" ADD CONSTRAINT "landing_page_preview_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_page_preview_sessions" ADD CONSTRAINT "landing_page_preview_sessions_page_id_landing_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."landing_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_goals" ADD CONSTRAINT "ash_goals_project_id_ash_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ash_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_projects" ADD CONSTRAINT "ash_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_projects" ADD CONSTRAINT "ash_projects_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_tasks" ADD CONSTRAINT "ash_tasks_project_id_ash_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ash_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_tasks" ADD CONSTRAINT "ash_tasks_goal_id_ash_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."ash_goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_project_memory" ADD CONSTRAINT "ash_project_memory_project_id_ash_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ash_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_memory" ADD CONSTRAINT "business_memory_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_memory" ADD CONSTRAINT "business_memory_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_memory" ADD CONSTRAINT "business_memory_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_memory" ADD CONSTRAINT "business_memory_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_memory" ADD CONSTRAINT "business_memory_project_id_ash_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ash_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_knowledge_entries" ADD CONSTRAINT "ash_knowledge_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_knowledge_entries" ADD CONSTRAINT "ash_knowledge_entries_source_project_id_ash_projects_id_fk" FOREIGN KEY ("source_project_id") REFERENCES "public"."ash_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_knowledge_entries" ADD CONSTRAINT "ash_knowledge_entries_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_knowledge_entries" ADD CONSTRAINT "ash_knowledge_entries_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_knowledge_entries" ADD CONSTRAINT "ash_knowledge_entries_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_knowledge_entries" ADD CONSTRAINT "ash_knowledge_entries_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_milestones" ADD CONSTRAINT "ash_milestones_project_id_ash_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ash_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_milestones" ADD CONSTRAINT "ash_milestones_goal_id_ash_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."ash_goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_plan_decisions" ADD CONSTRAINT "ash_plan_decisions_project_id_ash_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ash_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_plan_decisions" ADD CONSTRAINT "ash_plan_decisions_task_id_ash_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."ash_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_research_profiles" ADD CONSTRAINT "ash_research_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_research_profiles" ADD CONSTRAINT "ash_research_profiles_source_project_id_ash_projects_id_fk" FOREIGN KEY ("source_project_id") REFERENCES "public"."ash_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_research_profiles" ADD CONSTRAINT "ash_research_profiles_knowledge_entry_id_ash_knowledge_entries_id_fk" FOREIGN KEY ("knowledge_entry_id") REFERENCES "public"."ash_knowledge_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_research_sessions" ADD CONSTRAINT "ash_research_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_research_sessions" ADD CONSTRAINT "ash_research_sessions_project_id_ash_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ash_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ash_research_sessions" ADD CONSTRAINT "ash_research_sessions_result_knowledge_entry_id_ash_knowledge_entries_id_fk" FOREIGN KEY ("result_knowledge_entry_id") REFERENCES "public"."ash_knowledge_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_claims" ADD CONSTRAINT "business_dna_claims_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_claims" ADD CONSTRAINT "business_dna_claims_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_claims" ADD CONSTRAINT "business_dna_claims_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_claims" ADD CONSTRAINT "business_dna_claims_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_claims" ADD CONSTRAINT "business_dna_claims_project_id_ash_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ash_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_conflicts" ADD CONSTRAINT "business_dna_conflicts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_conflicts" ADD CONSTRAINT "business_dna_conflicts_claim_id_business_dna_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."business_dna_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_conflicts" ADD CONSTRAINT "business_dna_conflicts_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_conflicts" ADD CONSTRAINT "business_dna_conflicts_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_conflicts" ADD CONSTRAINT "business_dna_conflicts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_conflicts" ADD CONSTRAINT "business_dna_conflicts_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_conflicts" ADD CONSTRAINT "business_dna_conflicts_project_id_ash_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ash_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_versions" ADD CONSTRAINT "business_dna_versions_claim_id_business_dna_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."business_dna_claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_versions" ADD CONSTRAINT "business_dna_versions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_versions" ADD CONSTRAINT "business_dna_versions_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_versions" ADD CONSTRAINT "business_dna_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_versions" ADD CONSTRAINT "business_dna_versions_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dna_versions" ADD CONSTRAINT "business_dna_versions_project_id_ash_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ash_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_domain_events" ADD CONSTRAINT "business_domain_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_domain_events" ADD CONSTRAINT "business_domain_events_project_id_ash_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ash_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_domain_events" ADD CONSTRAINT "business_domain_events_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_domain_events" ADD CONSTRAINT "business_domain_events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_domain_events" ADD CONSTRAINT "business_domain_events_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_review_queue" ADD CONSTRAINT "business_review_queue_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_review_queue" ADD CONSTRAINT "business_review_queue_conflict_id_business_dna_conflicts_id_fk" FOREIGN KEY ("conflict_id") REFERENCES "public"."business_dna_conflicts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_review_queue" ADD CONSTRAINT "business_review_queue_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_review_queue" ADD CONSTRAINT "business_review_queue_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_review_queue" ADD CONSTRAINT "business_review_queue_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_review_queue" ADD CONSTRAINT "business_review_queue_project_id_ash_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ash_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_timeline_events" ADD CONSTRAINT "business_timeline_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_timeline_events" ADD CONSTRAINT "business_timeline_events_project_id_ash_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ash_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_timeline_events" ADD CONSTRAINT "business_timeline_events_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_timeline_events" ADD CONSTRAINT "business_timeline_events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_timeline_events" ADD CONSTRAINT "business_timeline_events_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_trail_entries" ADD CONSTRAINT "audit_trail_entries_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_trail_entries" ADD CONSTRAINT "audit_trail_entries_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_trail_entries" ADD CONSTRAINT "audit_trail_entries_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_artifacts" ADD CONSTRAINT "cognitive_artifacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_artifacts" ADD CONSTRAINT "cognitive_artifacts_project_id_ash_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."ash_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_clusters" ADD CONSTRAINT "cognitive_clusters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_cluster_members" ADD CONSTRAINT "cognitive_cluster_members_cluster_id_cognitive_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."cognitive_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_cluster_members" ADD CONSTRAINT "cognitive_cluster_members_artifact_id_cognitive_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."cognitive_artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_relationships" ADD CONSTRAINT "cognitive_relationships_source_artifact_id_cognitive_artifacts_id_fk" FOREIGN KEY ("source_artifact_id") REFERENCES "public"."cognitive_artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_relationships" ADD CONSTRAINT "cognitive_relationships_target_artifact_id_cognitive_artifacts_id_fk" FOREIGN KEY ("target_artifact_id") REFERENCES "public"."cognitive_artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognitive_relationships" ADD CONSTRAINT "cognitive_relationships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_entity_links" ADD CONSTRAINT "context_entity_links_context_id_executive_contexts_id_fk" FOREIGN KEY ("context_id") REFERENCES "public"."executive_contexts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_snapshots" ADD CONSTRAINT "context_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_timeline_events" ADD CONSTRAINT "context_timeline_events_context_id_executive_contexts_id_fk" FOREIGN KEY ("context_id") REFERENCES "public"."executive_contexts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executive_contexts" ADD CONSTRAINT "executive_contexts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executive_judgments" ADD CONSTRAINT "executive_judgments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executive_goals" ADD CONSTRAINT "executive_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_dependencies" ADD CONSTRAINT "goal_dependencies_goal_id_executive_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."executive_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_dependencies" ADD CONSTRAINT "goal_dependencies_depends_on_goal_id_executive_goals_id_fk" FOREIGN KEY ("depends_on_goal_id") REFERENCES "public"."executive_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_metrics" ADD CONSTRAINT "goal_metrics_goal_id_executive_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."executive_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_progress_history" ADD CONSTRAINT "goal_progress_history_goal_id_executive_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."executive_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executive_plans" ADD CONSTRAINT "executive_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_history" ADD CONSTRAINT "plan_history_plan_id_executive_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."executive_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_metrics" ADD CONSTRAINT "plan_metrics_plan_id_executive_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."executive_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_milestones" ADD CONSTRAINT "plan_milestones_plan_id_executive_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."executive_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_steps" ADD CONSTRAINT "plan_steps_milestone_id_plan_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."plan_milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_steps" ADD CONSTRAINT "plan_steps_plan_id_executive_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."executive_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_history" ADD CONSTRAINT "execution_history_execution_id_executive_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executive_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_metrics" ADD CONSTRAINT "execution_metrics_execution_id_executive_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executive_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_recovery_points" ADD CONSTRAINT "execution_recovery_points_execution_id_executive_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executive_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_relationships" ADD CONSTRAINT "execution_relationships_source_execution_id_executive_executions_id_fk" FOREIGN KEY ("source_execution_id") REFERENCES "public"."executive_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_steps" ADD CONSTRAINT "execution_steps_execution_id_executive_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executive_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executive_executions" ADD CONSTRAINT "executive_executions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executive_executions" ADD CONSTRAINT "executive_executions_plan_id_executive_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."executive_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executive_observations" ADD CONSTRAINT "executive_observations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_anomalies" ADD CONSTRAINT "observation_anomalies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_chain_members" ADD CONSTRAINT "observation_chain_members_chain_id_observation_chains_id_fk" FOREIGN KEY ("chain_id") REFERENCES "public"."observation_chains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_chain_members" ADD CONSTRAINT "observation_chain_members_observation_id_executive_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."executive_observations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_chains" ADD CONSTRAINT "observation_chains_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_correlations" ADD CONSTRAINT "observation_correlations_source_observation_id_executive_observations_id_fk" FOREIGN KEY ("source_observation_id") REFERENCES "public"."executive_observations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_correlations" ADD CONSTRAINT "observation_correlations_target_observation_id_executive_observations_id_fk" FOREIGN KEY ("target_observation_id") REFERENCES "public"."executive_observations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_metrics" ADD CONSTRAINT "observation_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_signals" ADD CONSTRAINT "observation_signals_observation_id_executive_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."executive_observations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_signals" ADD CONSTRAINT "observation_signals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_trends" ADD CONSTRAINT "observation_trends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_members" ADD CONSTRAINT "case_members_case_id_executive_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."executive_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_timelines" ADD CONSTRAINT "case_timelines_case_id_executive_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."executive_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executive_cases" ADD CONSTRAINT "executive_cases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflection_evidence" ADD CONSTRAINT "reflection_evidence_report_id_reflection_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reflection_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflection_evidence" ADD CONSTRAINT "reflection_evidence_case_id_executive_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."executive_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflection_factors" ADD CONSTRAINT "reflection_factors_report_id_reflection_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reflection_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflection_factors" ADD CONSTRAINT "reflection_factors_case_id_executive_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."executive_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflection_factors" ADD CONSTRAINT "reflection_factors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflection_metrics" ADD CONSTRAINT "reflection_metrics_case_id_executive_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."executive_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflection_metrics" ADD CONSTRAINT "reflection_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflection_reports" ADD CONSTRAINT "reflection_reports_case_id_executive_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."executive_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflection_reports" ADD CONSTRAINT "reflection_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflection_scores" ADD CONSTRAINT "reflection_scores_report_id_reflection_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reflection_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflection_scores" ADD CONSTRAINT "reflection_scores_case_id_executive_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."executive_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflection_scores" ADD CONSTRAINT "reflection_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_metrics" ADD CONSTRAINT "learning_metrics_report_id_learning_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."learning_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principle_contradictions" ADD CONSTRAINT "principle_contradictions_principle_id_executive_principles_id_fk" FOREIGN KEY ("principle_id") REFERENCES "public"."executive_principles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principle_evidence" ADD CONSTRAINT "principle_evidence_principle_id_executive_principles_id_fk" FOREIGN KEY ("principle_id") REFERENCES "public"."executive_principles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principle_relationships" ADD CONSTRAINT "principle_relationships_from_principle_id_executive_principles_id_fk" FOREIGN KEY ("from_principle_id") REFERENCES "public"."executive_principles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principle_relationships" ADD CONSTRAINT "principle_relationships_to_principle_id_executive_principles_id_fk" FOREIGN KEY ("to_principle_id") REFERENCES "public"."executive_principles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principle_validation_hist" ADD CONSTRAINT "principle_validation_hist_principle_id_executive_principles_id_fk" FOREIGN KEY ("principle_id") REFERENCES "public"."executive_principles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principle_versions" ADD CONSTRAINT "principle_versions_principle_id_executive_principles_id_fk" FOREIGN KEY ("principle_id") REFERENCES "public"."executive_principles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_snapshots" ADD CONSTRAINT "behavior_snapshots_profile_id_behavior_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."behavior_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governance_metrics" ADD CONSTRAINT "governance_metrics_report_id_governance_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."governance_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_conflicts" ADD CONSTRAINT "policy_conflicts_policy_id_a_executive_policies_id_fk" FOREIGN KEY ("policy_id_a") REFERENCES "public"."executive_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_conflicts" ADD CONSTRAINT "policy_conflicts_policy_id_b_executive_policies_id_fk" FOREIGN KEY ("policy_id_b") REFERENCES "public"."executive_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_decisions" ADD CONSTRAINT "policy_decisions_policy_id_executive_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."executive_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_policy_id_executive_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."executive_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dependencies" ADD CONSTRAINT "business_dependencies_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dependencies" ADD CONSTRAINT "business_dependencies_from_node_id_business_nodes_id_fk" FOREIGN KEY ("from_node_id") REFERENCES "public"."business_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_dependencies" ADD CONSTRAINT "business_dependencies_to_node_id_business_nodes_id_fk" FOREIGN KEY ("to_node_id") REFERENCES "public"."business_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_edges" ADD CONSTRAINT "business_edges_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_edges" ADD CONSTRAINT "business_edges_from_node_id_business_nodes_id_fk" FOREIGN KEY ("from_node_id") REFERENCES "public"."business_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_edges" ADD CONSTRAINT "business_edges_to_node_id_business_nodes_id_fk" FOREIGN KEY ("to_node_id") REFERENCES "public"."business_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_health" ADD CONSTRAINT "business_health_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_kpis" ADD CONSTRAINT "business_kpis_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_kpis" ADD CONSTRAINT "business_kpis_node_id_business_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."business_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_metrics" ADD CONSTRAINT "business_metrics_kpi_id_business_kpis_id_fk" FOREIGN KEY ("kpi_id") REFERENCES "public"."business_kpis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_metrics" ADD CONSTRAINT "business_metrics_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_nodes" ADD CONSTRAINT "business_nodes_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_registry" ADD CONSTRAINT "business_registry_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_snapshots" ADD CONSTRAINT "business_snapshots_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_metrics" ADD CONSTRAINT "analysis_metrics_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_metrics" ADD CONSTRAINT "analysis_metrics_report_id_business_analysis_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."business_analysis_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_registry" ADD CONSTRAINT "analysis_registry_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_snapshots" ADD CONSTRAINT "analysis_snapshots_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_snapshots" ADD CONSTRAINT "analysis_snapshots_report_id_business_analysis_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."business_analysis_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_analysis_reports" ADD CONSTRAINT "business_analysis_reports_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_bottlenecks" ADD CONSTRAINT "business_bottlenecks_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_bottlenecks" ADD CONSTRAINT "business_bottlenecks_report_id_business_analysis_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."business_analysis_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_constraints" ADD CONSTRAINT "business_constraints_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_constraints" ADD CONSTRAINT "business_constraints_report_id_business_analysis_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."business_analysis_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_findings" ADD CONSTRAINT "business_findings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_findings" ADD CONSTRAINT "business_findings_report_id_business_analysis_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."business_analysis_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_leverage_points" ADD CONSTRAINT "business_leverage_points_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_leverage_points" ADD CONSTRAINT "business_leverage_points_report_id_business_analysis_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."business_analysis_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_snapshots" ADD CONSTRAINT "simulation_snapshots_report_id_execution_simulation_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."execution_simulation_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planning_dependencies" ADD CONSTRAINT "planning_dependencies_plan_id_strategic_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."strategic_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planning_milestones" ADD CONSTRAINT "planning_milestones_initiative_id_strategic_initiatives_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."strategic_initiatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planning_sequences" ADD CONSTRAINT "planning_sequences_plan_id_strategic_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."strategic_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategic_initiatives" ADD CONSTRAINT "strategic_initiatives_program_id_strategic_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."strategic_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategic_plans" ADD CONSTRAINT "strategic_plans_report_id_planning_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."planning_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategic_programs" ADD CONSTRAINT "strategic_programs_plan_id_strategic_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."strategic_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_dependencies" ADD CONSTRAINT "capability_dependencies_plan_id_capability_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."capability_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_domains" ADD CONSTRAINT "capability_domains_plan_id_capability_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."capability_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_gaps" ADD CONSTRAINT "capability_gaps_requirement_id_capability_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."capability_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_plans" ADD CONSTRAINT "capability_plans_report_id_capability_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."capability_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_readiness" ADD CONSTRAINT "capability_readiness_domain_id_capability_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."capability_domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_requirements" ADD CONSTRAINT "capability_requirements_domain_id_capability_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."capability_domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_dependencies" ADD CONSTRAINT "execution_dependencies_plan_id_operational_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."operational_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_sequences" ADD CONSTRAINT "execution_sequences_plan_id_operational_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."operational_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_phases" ADD CONSTRAINT "operational_phases_plan_id_operational_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."operational_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_plans" ADD CONSTRAINT "operational_plans_report_id_operational_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."operational_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_readiness" ADD CONSTRAINT "operational_readiness_plan_id_operational_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."operational_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_packages" ADD CONSTRAINT "work_packages_phase_id_operational_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."operational_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_assignments" ADD CONSTRAINT "execution_assignments_plan_id_execution_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."execution_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_owners" ADD CONSTRAINT "execution_owners_plan_id_execution_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."execution_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_plans" ADD CONSTRAINT "execution_plans_report_id_execution_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."execution_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_policies" ADD CONSTRAINT "execution_policies_plan_id_execution_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."execution_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_queues" ADD CONSTRAINT "execution_queues_plan_id_execution_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."execution_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_readiness" ADD CONSTRAINT "execution_readiness_plan_id_execution_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."execution_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_decisions" ADD CONSTRAINT "authority_decisions_requirement_id_authority_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."authority_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_decisions" ADD CONSTRAINT "authority_decisions_plan_id_authority_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."authority_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_decisions" ADD CONSTRAINT "authority_decisions_report_id_authority_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."authority_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_grants" ADD CONSTRAINT "authority_grants_requirement_id_authority_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."authority_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_grants" ADD CONSTRAINT "authority_grants_plan_id_authority_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."authority_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_grants" ADD CONSTRAINT "authority_grants_report_id_authority_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."authority_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_plans" ADD CONSTRAINT "authority_plans_report_id_authority_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."authority_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_requirements" ADD CONSTRAINT "authority_requirements_plan_id_authority_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."authority_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_requirements" ADD CONSTRAINT "authority_requirements_report_id_authority_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."authority_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_scopes" ADD CONSTRAINT "authority_scopes_plan_id_authority_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."authority_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_scopes" ADD CONSTRAINT "authority_scopes_report_id_authority_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."authority_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authority_snapshots" ADD CONSTRAINT "authority_snapshots_report_id_authority_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."authority_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_risk_categories" ADD CONSTRAINT "execution_risk_categories_profile_id_execution_risk_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."execution_risk_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_risk_categories" ADD CONSTRAINT "execution_risk_categories_report_id_execution_risk_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."execution_risk_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_risk_dependencies" ADD CONSTRAINT "execution_risk_dependencies_report_id_execution_risk_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."execution_risk_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_risk_mitigations" ADD CONSTRAINT "execution_risk_mitigations_report_id_execution_risk_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."execution_risk_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_risk_profiles" ADD CONSTRAINT "execution_risk_profiles_report_id_execution_risk_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."execution_risk_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_risk_snapshots" ADD CONSTRAINT "execution_risk_snapshots_report_id_execution_risk_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."execution_risk_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_safety_scores" ADD CONSTRAINT "execution_safety_scores_report_id_execution_risk_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."execution_risk_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_simulations" ADD CONSTRAINT "execution_simulations_report_id_execution_simulation_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."execution_simulation_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predicted_outcomes" ADD CONSTRAINT "predicted_outcomes_scenario_id_simulation_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."simulation_scenarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predicted_outcomes" ADD CONSTRAINT "predicted_outcomes_simulation_id_execution_simulations_id_fk" FOREIGN KEY ("simulation_id") REFERENCES "public"."execution_simulations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predicted_outcomes" ADD CONSTRAINT "predicted_outcomes_report_id_execution_simulation_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."execution_simulation_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predicted_state_changes" ADD CONSTRAINT "predicted_state_changes_simulation_id_execution_simulations_id_fk" FOREIGN KEY ("simulation_id") REFERENCES "public"."execution_simulations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predicted_state_changes" ADD CONSTRAINT "predicted_state_changes_report_id_execution_simulation_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."execution_simulation_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollback_simulations" ADD CONSTRAINT "rollback_simulations_simulation_id_execution_simulations_id_fk" FOREIGN KEY ("simulation_id") REFERENCES "public"."execution_simulations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollback_simulations" ADD CONSTRAINT "rollback_simulations_report_id_execution_simulation_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."execution_simulation_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_scenarios" ADD CONSTRAINT "simulation_scenarios_simulation_id_execution_simulations_id_fk" FOREIGN KEY ("simulation_id") REFERENCES "public"."execution_simulations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_scenarios" ADD CONSTRAINT "simulation_scenarios_report_id_execution_simulation_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."execution_simulation_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_branches" ADD CONSTRAINT "workflow_branches_workflow_id_execution_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."execution_workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_branches" ADD CONSTRAINT "workflow_branches_node_id_workflow_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."workflow_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_checkpoints" ADD CONSTRAINT "workflow_checkpoints_workflow_id_execution_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."execution_workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_checkpoints" ADD CONSTRAINT "workflow_checkpoints_node_id_workflow_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."workflow_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_workflow_id_execution_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."execution_workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_from_node_id_workflow_nodes_id_fk" FOREIGN KEY ("from_node_id") REFERENCES "public"."workflow_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_to_node_id_workflow_nodes_id_fk" FOREIGN KEY ("to_node_id") REFERENCES "public"."workflow_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_nodes" ADD CONSTRAINT "workflow_nodes_workflow_id_execution_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."execution_workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_rollbacks" ADD CONSTRAINT "workflow_rollbacks_workflow_id_execution_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."execution_workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_rollbacks" ADD CONSTRAINT "workflow_rollbacks_node_id_workflow_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."workflow_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_snapshots" ADD CONSTRAINT "workflow_snapshots_workflow_id_execution_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."execution_workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_events" ADD CONSTRAINT "execution_events_session_id_execution_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."execution_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_evidence" ADD CONSTRAINT "execution_evidence_session_id_execution_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."execution_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_evidence" ADD CONSTRAINT "execution_evidence_node_id_execution_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."execution_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_nodes" ADD CONSTRAINT "execution_nodes_session_id_execution_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."execution_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_snapshots" ADD CONSTRAINT "execution_snapshots_session_id_execution_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."execution_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_timelines" ADD CONSTRAINT "execution_timelines_session_id_execution_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."execution_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ue_execution_reports" ADD CONSTRAINT "ue_execution_reports_session_id_execution_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."execution_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adapter_capabilities" ADD CONSTRAINT "adapter_capabilities_adapter_id_execution_adapters_id_fk" FOREIGN KEY ("adapter_id") REFERENCES "public"."execution_adapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adapter_contracts" ADD CONSTRAINT "adapter_contracts_adapter_id_execution_adapters_id_fk" FOREIGN KEY ("adapter_id") REFERENCES "public"."execution_adapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adapter_health" ADD CONSTRAINT "adapter_health_adapter_id_execution_adapters_id_fk" FOREIGN KEY ("adapter_id") REFERENCES "public"."execution_adapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adapter_permissions" ADD CONSTRAINT "adapter_permissions_adapter_id_execution_adapters_id_fk" FOREIGN KEY ("adapter_id") REFERENCES "public"."execution_adapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adapter_sessions" ADD CONSTRAINT "adapter_sessions_adapter_id_execution_adapters_id_fk" FOREIGN KEY ("adapter_id") REFERENCES "public"."execution_adapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adapter_telemetry" ADD CONSTRAINT "adapter_telemetry_adapter_id_execution_adapters_id_fk" FOREIGN KEY ("adapter_id") REFERENCES "public"."execution_adapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adapter_versions" ADD CONSTRAINT "adapter_versions_adapter_id_execution_adapters_id_fk" FOREIGN KEY ("adapter_id") REFERENCES "public"."execution_adapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priority_attention" ADD CONSTRAINT "priority_attention_profile_id_priority_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."priority_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priority_dependencies" ADD CONSTRAINT "priority_dependencies_profile_id_priority_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."priority_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priority_escalations" ADD CONSTRAINT "priority_escalations_profile_id_priority_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."priority_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priority_history" ADD CONSTRAINT "priority_history_profile_id_priority_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."priority_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priority_recommendations" ADD CONSTRAINT "priority_recommendations_profile_id_priority_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."priority_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priority_scores" ADD CONSTRAINT "priority_scores_profile_id_priority_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."priority_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confidence_flows" ADD CONSTRAINT "confidence_flows_cycle_id_cognitive_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cognitive_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_flows" ADD CONSTRAINT "evidence_flows_cycle_id_cognitive_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cognitive_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_diagnostics" ADD CONSTRAINT "execution_diagnostics_cycle_id_cognitive_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cognitive_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_graphs" ADD CONSTRAINT "execution_graphs_cycle_id_cognitive_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cognitive_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_waves" ADD CONSTRAINT "execution_waves_cycle_id_cognitive_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cognitive_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_system_instance_id_system_instances_id_fk" FOREIGN KEY ("system_instance_id") REFERENCES "public"."system_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_recommendations_business_id_idx" ON "business_recommendations" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_recommendations_business_id_status_idx" ON "business_recommendations" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "business_recommendations_business_id_source_idx" ON "business_recommendations" USING btree ("business_id","source_type");--> statement-breakpoint
CREATE INDEX "business_recommendations_owner_user_id_idx" ON "business_recommendations" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "system_instances_user_id_idx" ON "system_instances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "system_instances_user_id_build_status_idx" ON "system_instances" USING btree ("user_id","build_status");--> statement-breakpoint
CREATE INDEX "system_instances_client_workspace_id_idx" ON "system_instances" USING btree ("client_workspace_id");--> statement-breakpoint
CREATE INDEX "user_tool_selections_system_instance_id_idx" ON "user_tool_selections" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "user_credentials_user_id_idx" ON "user_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_credentials_user_id_key_idx" ON "user_credentials" USING btree ("user_id","credential_key");--> statement-breakpoint
CREATE INDEX "user_credentials_client_workspace_id_idx" ON "user_credentials" USING btree ("client_workspace_id");--> statement-breakpoint
CREATE INDEX "user_credentials_system_instance_id_idx" ON "user_credentials" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "build_sessions_system_instance_id_idx" ON "build_sessions" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "build_progress_build_session_id_idx" ON "build_progress" USING btree ("build_session_id");--> statement-breakpoint
CREATE INDEX "user_memory_user_id_idx" ON "user_memory" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_memory_user_id_category_idx" ON "user_memory" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "user_memory_business_id_idx" ON "user_memory" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "openrouter_usage_user_id_idx" ON "openrouter_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "openrouter_usage_created_at_idx" ON "openrouter_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_read_idx" ON "notifications" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX "notifications_user_id_dedupe_key_idx" ON "notifications" USING btree ("user_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_transactions_user_id_idx" ON "credit_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_transactions_created_at_idx" ON "credit_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "system_activity_events_system_instance_id_idx" ON "system_activity_events" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "system_activity_events_created_at_idx" ON "system_activity_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "system_activity_events_external_tx_id_idx" ON "system_activity_events" USING btree ("external_tx_id");--> statement-breakpoint
CREATE INDEX "system_connectors_instance_id_idx" ON "system_connectors" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "system_connectors_instance_connector_idx" ON "system_connectors" USING btree ("system_instance_id","connector");--> statement-breakpoint
CREATE INDEX "runtime_jobs_status_run_after_idx" ON "runtime_jobs" USING btree ("status","run_after");--> statement-breakpoint
CREATE INDEX "runtime_jobs_instance_id_idx" ON "runtime_jobs" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generated_files_user_id_idx" ON "generated_files" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generated_files_session_id_idx" ON "generated_files" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "credit_usage_events_user_id_idx" ON "credit_usage_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_usage_events_system_id_idx" ON "credit_usage_events" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "credit_usage_events_created_at_idx" ON "credit_usage_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "credit_usage_events_event_type_idx" ON "credit_usage_events" USING btree ("event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "landing_pages_slug_idx" ON "landing_pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "landing_pages_user_id_idx" ON "landing_pages" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_affiliate_links_slug_idx" ON "user_affiliate_links" USING btree ("cloaked_slug");--> statement-breakpoint
CREATE INDEX "user_affiliate_links_user_id_idx" ON "user_affiliate_links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_affiliate_links_system_instance_id_idx" ON "user_affiliate_links" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "affiliate_conversions_link_id_idx" ON "affiliate_conversions" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "affiliate_conversions_user_id_idx" ON "affiliate_conversions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "affiliate_conversions_system_instance_id_idx" ON "affiliate_conversions" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "email_campaigns_user_id_idx" ON "email_campaigns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_deliveries_user_id_idx" ON "email_deliveries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_deliveries_sequence_id_idx" ON "email_deliveries" USING btree ("sequence_id");--> statement-breakpoint
CREATE INDEX "email_deliveries_campaign_id_idx" ON "email_deliveries" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "email_deliveries_subscriber_id_idx" ON "email_deliveries" USING btree ("subscriber_id");--> statement-breakpoint
CREATE INDEX "email_deliveries_message_id_idx" ON "email_deliveries" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_deliveries_campaign_sub_uniq" ON "email_deliveries" USING btree ("campaign_id","subscriber_id") WHERE campaign_id IS NOT NULL AND subscriber_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "email_deliveries_step_sub_uniq" ON "email_deliveries" USING btree ("step_id","subscriber_id") WHERE step_id IS NOT NULL AND subscriber_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "email_lists_user_id_idx" ON "email_lists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_sequence_steps_sequence_id_idx" ON "email_sequence_steps" USING btree ("sequence_id");--> statement-breakpoint
CREATE INDEX "email_sequences_user_id_idx" ON "email_sequences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_subscribers_list_email_idx" ON "email_subscribers" USING btree ("list_id","email");--> statement-breakpoint
CREATE INDEX "email_subscribers_list_id_idx" ON "email_subscribers" USING btree ("list_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_domains_domain_idx" ON "user_domains" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "user_domains_user_id_idx" ON "user_domains" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_domains_linked_page_id_idx" ON "user_domains" USING btree ("linked_page_id");--> statement-breakpoint
CREATE INDEX "scheduled_tasks_system_instance_id_idx" ON "scheduled_tasks" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "scheduled_tasks_user_id_idx" ON "scheduled_tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scheduled_tasks_next_run_at_enabled_idx" ON "scheduled_tasks" USING btree ("next_run_at","enabled");--> statement-breakpoint
CREATE INDEX "system_revenue_providers_system_id_idx" ON "system_revenue_providers" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "system_revenue_providers_user_id_idx" ON "system_revenue_providers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "published_content_system_instance_id_idx" ON "published_content" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "published_content_status_idx" ON "published_content" USING btree ("status");--> statement-breakpoint
CREATE INDEX "published_content_created_at_idx" ON "published_content" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhook_endpoints_system_instance_id_idx" ON "webhook_endpoints" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "webhook_endpoints_token_idx" ON "webhook_endpoints" USING btree ("token");--> statement-breakpoint
CREATE INDEX "webhook_logs_endpoint_id_idx" ON "webhook_logs" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "webhook_logs_received_at_idx" ON "webhook_logs" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "ab_tests_system_instance_id_idx" ON "ab_tests" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "ab_tests_user_id_idx" ON "ab_tests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ab_tests_status_idx" ON "ab_tests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ab_tests_token_idx" ON "ab_tests" USING btree ("token");--> statement-breakpoint
CREATE INDEX "ab_variants_test_id_idx" ON "ab_variants" USING btree ("test_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ab_variants_slug_idx" ON "ab_variants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blueprint_reviews_blueprint_id_idx" ON "blueprint_reviews" USING btree ("blueprint_id");--> statement-breakpoint
CREATE INDEX "blueprint_reviews_user_id_idx" ON "blueprint_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "blueprint_purchases_blueprint_id_idx" ON "blueprint_purchases" USING btree ("blueprint_id");--> statement-breakpoint
CREATE INDEX "blueprint_purchases_buyer_user_id_idx" ON "blueprint_purchases" USING btree ("buyer_user_id");--> statement-breakpoint
CREATE INDEX "blueprint_purchases_author_user_id_idx" ON "blueprint_purchases" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "referral_events_referrer_id_idx" ON "referral_events" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "referral_events_referred_user_id_idx" ON "referral_events" USING btree ("referred_user_id");--> statement-breakpoint
CREATE INDEX "client_workspaces_agency_user_id_idx" ON "client_workspaces" USING btree ("agency_user_id");--> statement-breakpoint
CREATE INDEX "white_label_configs_user_id_idx" ON "white_label_configs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "white_label_configs_custom_domain_idx" ON "white_label_configs" USING btree ("custom_domain");--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_key_usage_events_api_key_id_idx" ON "api_key_usage_events" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "api_key_usage_events_user_id_idx" ON "api_key_usage_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_key_usage_events_created_at_idx" ON "api_key_usage_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "scheduled_posts_status_scheduled_at_idx" ON "scheduled_posts" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "scheduled_posts_user_id_idx" ON "scheduled_posts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scheduled_posts_system_instance_id_idx" ON "scheduled_posts" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "businesses_owner_id_idx" ON "businesses" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "businesses_owner_id_origin_idx" ON "businesses" USING btree ("owner_id","origin");--> statement-breakpoint
CREATE INDEX "businesses_system_instance_id_idx" ON "businesses" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "businesses_client_workspace_id_idx" ON "businesses" USING btree ("client_workspace_id");--> statement-breakpoint
CREATE INDEX "business_connections_business_id_idx" ON "business_connections" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_connections_user_credential_id_idx" ON "business_connections" USING btree ("user_credential_id");--> statement-breakpoint
CREATE INDEX "business_health_scores_business_id_idx" ON "business_health_scores" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_health_scores_business_id_created_at_idx" ON "business_health_scores" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "business_health_scores_owner_user_id_idx" ON "business_health_scores" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "business_operations_settings_business_id_idx" ON "business_operations_settings" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "pending_approvals_business_id_idx" ON "pending_approvals" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "pending_approvals_user_id_status_idx" ON "pending_approvals" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "pending_approvals_business_id_status_idx" ON "pending_approvals" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "system_health_scores_system_instance_id_idx" ON "system_health_scores" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "system_health_scores_system_instance_id_computed_at_idx" ON "system_health_scores" USING btree ("system_instance_id","computed_at");--> statement-breakpoint
CREATE INDEX "business_health_metrics_business_id_idx" ON "business_health_metrics" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_health_metrics_business_id_computed_at_idx" ON "business_health_metrics" USING btree ("business_id","computed_at");--> statement-breakpoint
CREATE INDEX "business_health_metrics_owner_user_id_idx" ON "business_health_metrics" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "monitoring_log_events_system_instance_id_idx" ON "monitoring_log_events" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "monitoring_log_events_business_id_idx" ON "monitoring_log_events" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "monitoring_log_events_created_at_idx" ON "monitoring_log_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ash_lessons_scope_idx" ON "ash_lessons" USING btree ("scope_type","scope_key");--> statement-breakpoint
CREATE INDEX "ash_lessons_scope_type_idx" ON "ash_lessons" USING btree ("scope_type");--> statement-breakpoint
CREATE INDEX "ash_lessons_confidence_idx" ON "ash_lessons" USING btree ("confidence");--> statement-breakpoint
CREATE INDEX "ash_goals_project_id_idx" ON "ash_goals" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ash_goals_project_id_status_idx" ON "ash_goals" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "ash_projects_user_id_idx" ON "ash_projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ash_projects_user_id_status_idx" ON "ash_projects" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "ash_projects_system_instance_id_idx" ON "ash_projects" USING btree ("system_instance_id");--> statement-breakpoint
CREATE INDEX "ash_tasks_project_id_idx" ON "ash_tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ash_tasks_project_id_status_idx" ON "ash_tasks" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "ash_tasks_goal_id_idx" ON "ash_tasks" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "ash_tasks_milestone_id_idx" ON "ash_tasks" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX "ash_project_memory_project_id_idx" ON "ash_project_memory" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ash_project_memory_project_id_type_idx" ON "ash_project_memory" USING btree ("project_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "business_memory_business_id_idx" ON "business_memory" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_memory_owner_user_id_idx" ON "business_memory" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "ash_knowledge_entries_user_id_idx" ON "ash_knowledge_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ash_knowledge_entries_user_id_category_idx" ON "ash_knowledge_entries" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "ash_knowledge_entries_source_project_id_idx" ON "ash_knowledge_entries" USING btree ("source_project_id");--> statement-breakpoint
CREATE INDEX "ash_knowledge_entries_business_id_idx" ON "ash_knowledge_entries" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "ash_knowledge_entries_owner_user_id_idx" ON "ash_knowledge_entries" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "ash_milestones_project_id_idx" ON "ash_milestones" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ash_milestones_project_id_order_idx" ON "ash_milestones" USING btree ("project_id","order_index");--> statement-breakpoint
CREATE INDEX "ash_plan_decisions_project_id_idx" ON "ash_plan_decisions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ash_plan_decisions_task_id_idx" ON "ash_plan_decisions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "ash_research_profiles_user_id_idx" ON "ash_research_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ash_research_profiles_user_id_profile_type_idx" ON "ash_research_profiles" USING btree ("user_id","profile_type");--> statement-breakpoint
CREATE INDEX "ash_research_sessions_user_id_idx" ON "ash_research_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ash_research_sessions_project_id_idx" ON "ash_research_sessions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ash_research_sessions_user_id_research_type_idx" ON "ash_research_sessions" USING btree ("user_id","research_type");--> statement-breakpoint
CREATE UNIQUE INDEX "business_dna_claims_business_field_idx" ON "business_dna_claims" USING btree ("business_id","field_key");--> statement-breakpoint
CREATE INDEX "business_dna_claims_business_id_idx" ON "business_dna_claims" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_dna_claims_owner_user_id_idx" ON "business_dna_claims" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "business_dna_conflicts_business_status_idx" ON "business_dna_conflicts" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "business_dna_conflicts_claim_id_idx" ON "business_dna_conflicts" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "business_dna_conflicts_owner_user_id_idx" ON "business_dna_conflicts" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "business_dna_versions_claim_id_idx" ON "business_dna_versions" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "business_dna_versions_business_id_idx" ON "business_dna_versions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_dna_versions_owner_user_id_idx" ON "business_dna_versions" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_domain_events_dedupe_key_idx" ON "business_domain_events" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "business_domain_events_business_status_idx" ON "business_domain_events" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "business_domain_events_owner_user_id_idx" ON "business_domain_events" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "business_review_queue_business_status_idx" ON "business_review_queue" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "business_review_queue_conflict_id_idx" ON "business_review_queue" USING btree ("conflict_id");--> statement-breakpoint
CREATE INDEX "business_review_queue_owner_user_id_idx" ON "business_review_queue" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "business_timeline_events_business_occurred_idx" ON "business_timeline_events" USING btree ("business_id","occurred_at");--> statement-breakpoint
CREATE INDEX "business_timeline_events_project_id_idx" ON "business_timeline_events" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "business_timeline_events_owner_user_id_idx" ON "business_timeline_events" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "audit_trail_entries_owner_user_id_idx" ON "audit_trail_entries" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "audit_trail_entries_business_id_idx" ON "audit_trail_entries" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "audit_trail_entries_record_table_id_idx" ON "audit_trail_entries" USING btree ("record_table","record_id");--> statement-breakpoint
CREATE INDEX "audit_trail_entries_occurred_at_idx" ON "audit_trail_entries" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "cognitive_artifacts_artifact_type_idx" ON "cognitive_artifacts" USING btree ("artifact_type");--> statement-breakpoint
CREATE INDEX "cognitive_artifacts_source_brain_idx" ON "cognitive_artifacts" USING btree ("source_brain");--> statement-breakpoint
CREATE INDEX "cognitive_artifacts_decision_id_idx" ON "cognitive_artifacts" USING btree ("decision_id");--> statement-breakpoint
CREATE INDEX "cognitive_artifacts_lifecycle_status_idx" ON "cognitive_artifacts" USING btree ("lifecycle_status");--> statement-breakpoint
CREATE INDEX "cognitive_artifacts_confidence_overall_idx" ON "cognitive_artifacts" USING btree ("confidence_overall");--> statement-breakpoint
CREATE INDEX "cognitive_artifacts_user_id_idx" ON "cognitive_artifacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cognitive_artifacts_project_id_idx" ON "cognitive_artifacts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "cognitive_artifacts_created_at_idx" ON "cognitive_artifacts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cognitive_artifacts_user_type_lifecycle_idx" ON "cognitive_artifacts" USING btree ("user_id","artifact_type","lifecycle_status");--> statement-breakpoint
CREATE INDEX "cognitive_clusters_user_id_idx" ON "cognitive_clusters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cognitive_clusters_type_idx" ON "cognitive_clusters" USING btree ("cluster_type");--> statement-breakpoint
CREATE INDEX "cognitive_clusters_lifecycle_idx" ON "cognitive_clusters" USING btree ("lifecycle_status");--> statement-breakpoint
CREATE INDEX "cognitive_clusters_created_at_idx" ON "cognitive_clusters" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cognitive_cluster_members_cluster_id_idx" ON "cognitive_cluster_members" USING btree ("cluster_id");--> statement-breakpoint
CREATE INDEX "cognitive_cluster_members_artifact_id_idx" ON "cognitive_cluster_members" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "cognitive_rels_source_idx" ON "cognitive_relationships" USING btree ("source_artifact_id");--> statement-breakpoint
CREATE INDEX "cognitive_rels_target_idx" ON "cognitive_relationships" USING btree ("target_artifact_id");--> statement-breakpoint
CREATE INDEX "cognitive_rels_type_idx" ON "cognitive_relationships" USING btree ("relationship_type");--> statement-breakpoint
CREATE INDEX "cognitive_rels_lifecycle_idx" ON "cognitive_relationships" USING btree ("lifecycle_status");--> statement-breakpoint
CREATE INDEX "cognitive_rels_is_deleted_idx" ON "cognitive_relationships" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "cognitive_rels_user_id_idx" ON "cognitive_relationships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cognitive_rels_source_type_deleted_idx" ON "cognitive_relationships" USING btree ("source_artifact_id","relationship_type","is_deleted");--> statement-breakpoint
CREATE INDEX "cognitive_rels_target_type_deleted_idx" ON "cognitive_relationships" USING btree ("target_artifact_id","relationship_type","is_deleted");--> statement-breakpoint
CREATE INDEX "cognitive_rels_created_at_idx" ON "cognitive_relationships" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "context_entity_links_context_id_idx" ON "context_entity_links" USING btree ("context_id");--> statement-breakpoint
CREATE INDEX "context_entity_links_entity_type_idx" ON "context_entity_links" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "context_entity_links_entity_id_idx" ON "context_entity_links" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "context_snapshots_user_id_idx" ON "context_snapshots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "context_snapshots_created_at_idx" ON "context_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "context_timeline_context_id_idx" ON "context_timeline_events" USING btree ("context_id");--> statement-breakpoint
CREATE INDEX "context_timeline_event_type_idx" ON "context_timeline_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "context_timeline_created_at_idx" ON "context_timeline_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "context_timeline_context_created_idx" ON "context_timeline_events" USING btree ("context_id","created_at");--> statement-breakpoint
CREATE INDEX "exec_contexts_user_id_idx" ON "executive_contexts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "exec_contexts_status_idx" ON "executive_contexts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "exec_contexts_type_idx" ON "executive_contexts" USING btree ("context_type");--> statement-breakpoint
CREATE INDEX "exec_contexts_user_status_idx" ON "executive_contexts" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "exec_contexts_created_at_idx" ON "executive_contexts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "exec_judgments_user_id_idx" ON "executive_judgments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "exec_judgments_status_idx" ON "executive_judgments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "exec_judgments_created_at_idx" ON "executive_judgments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "exec_judgments_decision_score_idx" ON "executive_judgments" USING btree ("decision_score");--> statement-breakpoint
CREATE INDEX "exec_judgments_context_snapshot_idx" ON "executive_judgments" USING btree ("related_context_snapshot_id");--> statement-breakpoint
CREATE INDEX "exec_goals_user_id_idx" ON "executive_goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "exec_goals_parent_idx" ON "executive_goals" USING btree ("parent_goal_id");--> statement-breakpoint
CREATE INDEX "exec_goals_status_idx" ON "executive_goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "exec_goals_priority_idx" ON "executive_goals" USING btree ("priority_score");--> statement-breakpoint
CREATE INDEX "exec_goals_owner_brain_idx" ON "executive_goals" USING btree ("owner_brain");--> statement-breakpoint
CREATE INDEX "exec_goals_target_date_idx" ON "executive_goals" USING btree ("target_date");--> statement-breakpoint
CREATE INDEX "goal_deps_goal_id_idx" ON "goal_dependencies" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_deps_depends_on_idx" ON "goal_dependencies" USING btree ("depends_on_goal_id");--> statement-breakpoint
CREATE INDEX "goal_metrics_goal_id_idx" ON "goal_metrics" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_metrics_key_idx" ON "goal_metrics" USING btree ("metric_key");--> statement-breakpoint
CREATE INDEX "goal_progress_goal_id_idx" ON "goal_progress_history" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_progress_recorded_at_idx" ON "goal_progress_history" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "exec_plans_user_id_idx" ON "executive_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "exec_plans_goal_id_idx" ON "executive_plans" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "exec_plans_status_idx" ON "executive_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "exec_plans_parent_plan_idx" ON "executive_plans" USING btree ("parent_plan_id");--> statement-breakpoint
CREATE INDEX "exec_plans_score_idx" ON "executive_plans" USING btree ("overall_score");--> statement-breakpoint
CREATE INDEX "exec_plans_is_alternative_idx" ON "executive_plans" USING btree ("is_alternative");--> statement-breakpoint
CREATE INDEX "plan_deps_source_idx" ON "plan_dependencies" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "plan_deps_target_idx" ON "plan_dependencies" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "plan_deps_source_type_idx" ON "plan_dependencies" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "plan_history_plan_id_idx" ON "plan_history" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "plan_history_recorded_at_idx" ON "plan_history" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "plan_history_event_type_idx" ON "plan_history" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "plan_metrics_plan_id_idx" ON "plan_metrics" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "plan_metrics_key_idx" ON "plan_metrics" USING btree ("metric_key");--> statement-breakpoint
CREATE INDEX "plan_milestones_plan_id_idx" ON "plan_milestones" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "plan_milestones_parent_idx" ON "plan_milestones" USING btree ("parent_milestone_id");--> statement-breakpoint
CREATE INDEX "plan_milestones_order_idx" ON "plan_milestones" USING btree ("order_index");--> statement-breakpoint
CREATE INDEX "plan_steps_milestone_id_idx" ON "plan_steps" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX "plan_steps_plan_id_idx" ON "plan_steps" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "plan_steps_order_idx" ON "plan_steps" USING btree ("order_index");--> statement-breakpoint
CREATE INDEX "exec_history_execution_id_idx" ON "execution_history" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "exec_history_event_type_idx" ON "execution_history" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "exec_history_recorded_at_idx" ON "execution_history" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "exec_history_step_id_idx" ON "execution_history" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "exec_metrics_execution_id_idx" ON "execution_metrics" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "exec_metrics_key_idx" ON "execution_metrics" USING btree ("metric_key");--> statement-breakpoint
CREATE INDEX "exec_recovery_execution_id_idx" ON "execution_recovery_points" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "exec_recovery_is_active_idx" ON "execution_recovery_points" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "exec_rel_source_idx" ON "execution_relationships" USING btree ("source_execution_id");--> statement-breakpoint
CREATE INDEX "exec_rel_target_idx" ON "execution_relationships" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "exec_rel_type_idx" ON "execution_relationships" USING btree ("target_type");--> statement-breakpoint
CREATE INDEX "exec_steps_execution_id_idx" ON "execution_steps" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "exec_steps_plan_step_id_idx" ON "execution_steps" USING btree ("plan_step_id");--> statement-breakpoint
CREATE INDEX "exec_steps_status_idx" ON "execution_steps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "exec_steps_order_idx" ON "execution_steps" USING btree ("order_index");--> statement-breakpoint
CREATE INDEX "exec_exec_user_id_idx" ON "executive_executions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "exec_exec_plan_id_idx" ON "executive_executions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "exec_exec_goal_id_idx" ON "executive_executions" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "exec_exec_status_idx" ON "executive_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "exec_exec_parent_idx" ON "executive_executions" USING btree ("parent_execution_id");--> statement-breakpoint
CREATE INDEX "exec_exec_created_at_idx" ON "executive_executions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "obs_user_id_idx" ON "executive_observations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "obs_source_system_idx" ON "executive_observations" USING btree ("source_system");--> statement-breakpoint
CREATE INDEX "obs_event_category_idx" ON "executive_observations" USING btree ("event_category");--> statement-breakpoint
CREATE INDEX "obs_severity_idx" ON "executive_observations" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "obs_attention_score_idx" ON "executive_observations" USING btree ("attention_score");--> statement-breakpoint
CREATE INDEX "obs_signal_type_idx" ON "executive_observations" USING btree ("signal_type");--> statement-breakpoint
CREATE INDEX "obs_chain_id_idx" ON "executive_observations" USING btree ("chain_id");--> statement-breakpoint
CREATE INDEX "obs_observed_at_idx" ON "executive_observations" USING btree ("observed_at");--> statement-breakpoint
CREATE INDEX "obs_related_execution_idx" ON "executive_observations" USING btree ("related_execution_id");--> statement-breakpoint
CREATE INDEX "obs_related_goal_idx" ON "executive_observations" USING btree ("related_goal_id");--> statement-breakpoint
CREATE INDEX "obs_related_plan_idx" ON "executive_observations" USING btree ("related_plan_id");--> statement-breakpoint
CREATE INDEX "obs_anomaly_user_id_idx" ON "observation_anomalies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "obs_anomaly_type_idx" ON "observation_anomalies" USING btree ("anomaly_type");--> statement-breakpoint
CREATE INDEX "obs_anomaly_severity_idx" ON "observation_anomalies" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "obs_anomaly_source_idx" ON "observation_anomalies" USING btree ("source_object_id");--> statement-breakpoint
CREATE INDEX "obs_anomaly_detected_at_idx" ON "observation_anomalies" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "obs_chain_member_chain_idx" ON "observation_chain_members" USING btree ("chain_id");--> statement-breakpoint
CREATE INDEX "obs_chain_member_obs_idx" ON "observation_chain_members" USING btree ("observation_id");--> statement-breakpoint
CREATE INDEX "obs_chain_member_position_idx" ON "observation_chain_members" USING btree ("position_in_chain");--> statement-breakpoint
CREATE INDEX "obs_chain_user_id_idx" ON "observation_chains" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "obs_chain_anchor_idx" ON "observation_chains" USING btree ("anchor_object_id");--> statement-breakpoint
CREATE INDEX "obs_chain_max_attention_idx" ON "observation_chains" USING btree ("max_attention_score");--> statement-breakpoint
CREATE INDEX "obs_chain_is_active_idx" ON "observation_chains" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "obs_corr_source_idx" ON "observation_correlations" USING btree ("source_observation_id");--> statement-breakpoint
CREATE INDEX "obs_corr_target_idx" ON "observation_correlations" USING btree ("target_observation_id");--> statement-breakpoint
CREATE INDEX "obs_corr_type_idx" ON "observation_correlations" USING btree ("correlation_type");--> statement-breakpoint
CREATE INDEX "obs_metrics_user_id_idx" ON "observation_metrics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "obs_metrics_key_idx" ON "observation_metrics" USING btree ("metric_key");--> statement-breakpoint
CREATE INDEX "obs_metrics_recorded_at_idx" ON "observation_metrics" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "obs_signal_obs_id_idx" ON "observation_signals" USING btree ("observation_id");--> statement-breakpoint
CREATE INDEX "obs_signal_user_id_idx" ON "observation_signals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "obs_signal_signal_type_idx" ON "observation_signals" USING btree ("signal_type");--> statement-breakpoint
CREATE INDEX "obs_signal_strength_idx" ON "observation_signals" USING btree ("strength");--> statement-breakpoint
CREATE INDEX "obs_signal_emitted_at_idx" ON "observation_signals" USING btree ("emitted_at");--> statement-breakpoint
CREATE INDEX "obs_trend_user_id_idx" ON "observation_trends" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "obs_trend_type_idx" ON "observation_trends" USING btree ("trend_type");--> statement-breakpoint
CREATE INDEX "obs_trend_direction_idx" ON "observation_trends" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "obs_trend_detected_at_idx" ON "observation_trends" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "cm_case_id_idx" ON "case_members" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "cm_object_id_idx" ON "case_members" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "cm_object_type_idx" ON "case_members" USING btree ("object_type");--> statement-breakpoint
CREATE INDEX "ct_case_id_idx" ON "case_timelines" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "ct_sequence_idx" ON "case_timelines" USING btree ("sequence_number");--> statement-breakpoint
CREATE INDEX "ct_event_category_idx" ON "case_timelines" USING btree ("event_category");--> statement-breakpoint
CREATE INDEX "ct_observed_at_idx" ON "case_timelines" USING btree ("observed_at");--> statement-breakpoint
CREATE INDEX "ec_user_id_idx" ON "executive_cases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ec_completion_status_idx" ON "executive_cases" USING btree ("completion_status");--> statement-breakpoint
CREATE INDEX "ec_primary_execution_idx" ON "executive_cases" USING btree ("primary_execution_id");--> statement-breakpoint
CREATE INDEX "ec_primary_goal_idx" ON "executive_cases" USING btree ("primary_goal_id");--> statement-breakpoint
CREATE INDEX "ec_primary_chain_idx" ON "executive_cases" USING btree ("primary_chain_id");--> statement-breakpoint
CREATE INDEX "ec_is_closed_idx" ON "executive_cases" USING btree ("is_closed");--> statement-breakpoint
CREATE INDEX "ec_started_at_idx" ON "executive_cases" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "re_report_id_idx" ON "reflection_evidence" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "re_case_id_idx" ON "reflection_evidence" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "re_evidence_type_idx" ON "reflection_evidence" USING btree ("evidence_type");--> statement-breakpoint
CREATE INDEX "re_strength_idx" ON "reflection_evidence" USING btree ("strength");--> statement-breakpoint
CREATE INDEX "rf_report_id_idx" ON "reflection_factors" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "rf_case_id_idx" ON "reflection_factors" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "rf_factor_category_idx" ON "reflection_factors" USING btree ("factor_category");--> statement-breakpoint
CREATE INDEX "rf_influence_score_idx" ON "reflection_factors" USING btree ("influence_score");--> statement-breakpoint
CREATE INDEX "rmet_case_id_idx" ON "reflection_metrics" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "rmet_user_id_idx" ON "reflection_metrics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rmet_key_idx" ON "reflection_metrics" USING btree ("metric_key");--> statement-breakpoint
CREATE INDEX "rmet_recorded_at_idx" ON "reflection_metrics" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "rr_case_id_idx" ON "reflection_reports" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "rr_user_id_idx" ON "reflection_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rr_overall_quality_idx" ON "reflection_reports" USING btree ("overall_quality_score");--> statement-breakpoint
CREATE INDEX "rr_produced_at_idx" ON "reflection_reports" USING btree ("produced_at");--> statement-breakpoint
CREATE INDEX "rs_report_id_idx" ON "reflection_scores" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "rs_case_id_idx" ON "reflection_scores" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "rs_dimension_idx" ON "reflection_scores" USING btree ("score_dimension");--> statement-breakpoint
CREATE INDEX "rs_score_idx" ON "reflection_scores" USING btree ("score");--> statement-breakpoint
CREATE INDEX "idx_asset_capabilities_asset" ON "asset_capabilities" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_asset_capabilities_user" ON "asset_capabilities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_asset_capabilities_id" ON "asset_capabilities" USING btree ("capability_id");--> statement-breakpoint
CREATE INDEX "idx_asset_capabilities_category" ON "asset_capabilities" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_asset_classes_key" ON "asset_classes" USING btree ("class_key");--> statement-breakpoint
CREATE INDEX "idx_asset_classes_category" ON "asset_classes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_asset_lifecycle_asset" ON "asset_lifecycle" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_asset_lifecycle_user" ON "asset_lifecycle" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_asset_lifecycle_type" ON "asset_lifecycle" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_asset_lifecycle_created" ON "asset_lifecycle" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_asset_manifests_asset" ON "asset_manifests" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_asset_manifests_user" ON "asset_manifests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_asset_manifests_latest" ON "asset_manifests" USING btree ("asset_id","is_latest");--> statement-breakpoint
CREATE INDEX "idx_asset_metadata_asset" ON "asset_metadata" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_asset_metadata_user" ON "asset_metadata" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_asset_metadata_type" ON "asset_metadata" USING btree ("metadata_type");--> statement-breakpoint
CREATE INDEX "idx_asset_metadata_key" ON "asset_metadata" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_asset_registry_user" ON "asset_registry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_asset_registry_class" ON "asset_registry" USING btree ("class_key");--> statement-breakpoint
CREATE INDEX "idx_asset_registry_status" ON "asset_registry" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_asset_registry_lifecycle" ON "asset_registry" USING btree ("lifecycle_stage");--> statement-breakpoint
CREATE INDEX "idx_asset_rels_v2_source" ON "asset_relationships_v2" USING btree ("source_asset_id");--> statement-breakpoint
CREATE INDEX "idx_asset_rels_v2_target" ON "asset_relationships_v2" USING btree ("target_asset_id");--> statement-breakpoint
CREATE INDEX "idx_asset_rels_v2_user" ON "asset_relationships_v2" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_asset_rels_v2_type" ON "asset_relationships_v2" USING btree ("relationship_type");--> statement-breakpoint
CREATE INDEX "idx_asset_translation_canonical" ON "asset_translation" USING btree ("canonical_asset_id");--> statement-breakpoint
CREATE INDEX "idx_asset_translation_builder" ON "asset_translation" USING btree ("builder_source","builder_object_id");--> statement-breakpoint
CREATE INDEX "idx_asset_translation_user" ON "asset_translation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_canonical_assets_user" ON "canonical_assets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_canonical_assets_business" ON "canonical_assets" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_canonical_assets_project" ON "canonical_assets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_canonical_assets_class" ON "canonical_assets" USING btree ("class_key");--> statement-breakpoint
CREATE INDEX "idx_canonical_assets_status" ON "canonical_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_canonical_assets_builder" ON "canonical_assets" USING btree ("builder_source","builder_object_id");--> statement-breakpoint
CREATE INDEX "idx_canonical_assets_created" ON "canonical_assets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_builder_drafts_session" ON "builder_drafts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_builder_drafts_user" ON "builder_drafts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_builder_drafts_asset" ON "builder_drafts" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_builder_drafts_state" ON "builder_drafts" USING btree ("draft_state");--> statement-breakpoint
CREATE INDEX "idx_builder_drafts_created" ON "builder_drafts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_builder_events_session" ON "builder_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_builder_events_user" ON "builder_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_builder_events_type" ON "builder_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_builder_events_severity" ON "builder_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_builder_events_created" ON "builder_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_builder_history_session" ON "builder_history" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_builder_history_user" ON "builder_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_builder_history_seq" ON "builder_history" USING btree ("session_id","sequence_number");--> statement-breakpoint
CREATE INDEX "idx_builder_history_created" ON "builder_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_builder_locks_user" ON "builder_locks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_builder_locks_asset" ON "builder_locks" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_builder_locks_session" ON "builder_locks" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_builder_locks_active" ON "builder_locks" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_builder_recovery_user" ON "builder_recovery" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_builder_recovery_session" ON "builder_recovery" USING btree ("original_session_id");--> statement-breakpoint
CREATE INDEX "idx_builder_recovery_state" ON "builder_recovery" USING btree ("recovery_state");--> statement-breakpoint
CREATE INDEX "idx_builder_sessions_user" ON "builder_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_builder_sessions_type" ON "builder_sessions" USING btree ("builder_type");--> statement-breakpoint
CREATE INDEX "idx_builder_sessions_state" ON "builder_sessions" USING btree ("session_state");--> statement-breakpoint
CREATE INDEX "idx_builder_sessions_asset" ON "builder_sessions" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_builder_sessions_started" ON "builder_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_builder_validation_session" ON "builder_validation" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_builder_validation_user" ON "builder_validation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_builder_validation_type" ON "builder_validation" USING btree ("validation_type");--> statement-breakpoint
CREATE INDEX "idx_builder_validation_status" ON "builder_validation" USING btree ("overall_status");--> statement-breakpoint
CREATE INDEX "idx_runtime_registry_user" ON "runtime_registry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_runtime_registry_type" ON "runtime_registry" USING btree ("builder_type");--> statement-breakpoint
CREATE INDEX "idx_runtime_registry_state" ON "runtime_registry" USING btree ("session_state");--> statement-breakpoint
CREATE INDEX "idx_ubre_diagnostics_session" ON "ubre_diagnostics" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_ubre_diagnostics_type" ON "ubre_diagnostics" USING btree ("diagnostic_type");--> statement-breakpoint
CREATE INDEX "idx_ubre_diagnostics_severity" ON "ubre_diagnostics" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_ubre_diagnostics_created" ON "ubre_diagnostics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_app_capabilities_app_id" ON "application_capabilities" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_app_capabilities_type" ON "application_capabilities" USING btree ("capability_type");--> statement-breakpoint
CREATE INDEX "idx_app_capabilities_ash" ON "application_capabilities" USING btree ("ash_can_invoke");--> statement-breakpoint
CREATE INDEX "idx_app_diagnostics_app_id" ON "application_diagnostics" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_app_diagnostics_type" ON "application_diagnostics" USING btree ("diagnostic_type");--> statement-breakpoint
CREATE INDEX "idx_app_diagnostics_severity" ON "application_diagnostics" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_app_diagnostics_created" ON "application_diagnostics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_app_registry_lifecycle" ON "application_registry" USING btree ("lifecycle_state");--> statement-breakpoint
CREATE INDEX "idx_app_registry_enabled" ON "application_registry" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "idx_app_registry_health" ON "application_registry" USING btree ("health_status");--> statement-breakpoint
CREATE INDEX "idx_app_manifests_app_id" ON "platform_app_manifests" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_app_manifests_version" ON "platform_app_manifests" USING btree ("version");--> statement-breakpoint
CREATE INDEX "idx_app_manifests_created" ON "platform_app_manifests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_platform_pages_app_id" ON "platform_pages" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_platform_pages_route" ON "platform_pages" USING btree ("route");--> statement-breakpoint
CREATE INDEX "idx_platform_pages_created" ON "platform_pages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_platform_panels_app_id" ON "platform_panels" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_platform_panels_page_id" ON "platform_panels" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "idx_platform_services_app_id" ON "platform_services" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_platform_services_type" ON "platform_services" USING btree ("service_type");--> statement-breakpoint
CREATE INDEX "idx_platform_views_app_id" ON "platform_views" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_platform_views_page_id" ON "platform_views" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "idx_platform_views_created" ON "platform_views" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_platform_widgets_app_id" ON "platform_widgets" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_platform_widgets_type" ON "platform_widgets" USING btree ("widget_type");--> statement-breakpoint
CREATE INDEX "idx_platform_widgets_public" ON "platform_widgets" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "idx_comp_capabilities_component" ON "component_capabilities" USING btree ("component_id");--> statement-breakpoint
CREATE INDEX "idx_comp_capabilities_type" ON "component_capabilities" USING btree ("capability_type");--> statement-breakpoint
CREATE INDEX "idx_comp_capabilities_ash" ON "component_capabilities" USING btree ("ash_can_reason");--> statement-breakpoint
CREATE INDEX "idx_comp_diagnostics_key" ON "component_diagnostics" USING btree ("component_key");--> statement-breakpoint
CREATE INDEX "idx_comp_diagnostics_type" ON "component_diagnostics" USING btree ("diagnostic_type");--> statement-breakpoint
CREATE INDEX "idx_comp_diagnostics_severity" ON "component_diagnostics" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_comp_diagnostics_created" ON "component_diagnostics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_comp_families_category" ON "component_families" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_comp_manifests_component" ON "component_manifests" USING btree ("component_id");--> statement-breakpoint
CREATE INDEX "idx_comp_manifests_version" ON "component_manifests" USING btree ("version");--> statement-breakpoint
CREATE INDEX "idx_comp_manifests_created" ON "component_manifests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_comp_registry_enabled" ON "component_registry" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "idx_comp_registry_health" ON "component_registry" USING btree ("health_status");--> statement-breakpoint
CREATE INDEX "idx_comp_registry_deprecated" ON "component_registry" USING btree ("deprecated");--> statement-breakpoint
CREATE INDEX "idx_comp_usage_key" ON "component_usage" USING btree ("component_key");--> statement-breakpoint
CREATE INDEX "idx_comp_usage_app" ON "component_usage" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "idx_comp_usage_last" ON "component_usage" USING btree ("last_used_at");--> statement-breakpoint
CREATE INDEX "idx_comp_variants_component" ON "component_variants" USING btree ("component_id");--> statement-breakpoint
CREATE INDEX "idx_comp_variants_key" ON "component_variants" USING btree ("component_key");--> statement-breakpoint
CREATE INDEX "idx_design_tokens_category" ON "design_tokens" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_design_tokens_semantic" ON "design_tokens" USING btree ("is_semantic");--> statement-breakpoint
CREATE INDEX "idx_visual_components_family" ON "visual_components" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "idx_visual_components_category" ON "visual_components" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_visual_components_ash_tag" ON "visual_components" USING btree ("ash_semantic_tag");--> statement-breakpoint
CREATE INDEX "idx_visual_components_created" ON "visual_components" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ce_engagement_id_idx" ON "customer_engagement" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "ce_customer_id_idx" ON "customer_engagement" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "ce_user_id_idx" ON "customer_engagement" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ce_business_id_idx" ON "customer_engagement" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "ce_health_status_idx" ON "customer_engagement" USING btree ("health_status");--> statement-breakpoint
CREATE INDEX "ce_lifetime_value_idx" ON "customer_engagement" USING btree ("lifetime_value");--> statement-breakpoint
CREATE INDEX "ci_interaction_id_idx" ON "customer_interactions" USING btree ("interaction_id");--> statement-breakpoint
CREATE INDEX "ci_customer_id_idx" ON "customer_interactions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "ci_user_id_idx" ON "customer_interactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ci_business_id_idx" ON "customer_interactions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "ci_interaction_type_idx" ON "customer_interactions" USING btree ("interaction_type");--> statement-breakpoint
CREATE INDEX "ci_occurred_at_idx" ON "customer_interactions" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "cl_lifecycle_id_idx" ON "customer_lifecycle" USING btree ("lifecycle_id");--> statement-breakpoint
CREATE INDEX "cl_customer_id_idx" ON "customer_lifecycle" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "cl_user_id_idx" ON "customer_lifecycle" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cl_business_id_idx" ON "customer_lifecycle" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "cl_current_stage_idx" ON "customer_lifecycle" USING btree ("current_stage");--> statement-breakpoint
CREATE INDEX "cp_customer_id_idx" ON "customer_profiles" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "cp_user_id_idx" ON "customer_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cp_business_id_idx" ON "customer_profiles" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "cp_email_idx" ON "customer_profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "cp_entity_type_idx" ON "customer_profiles" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "cp_is_active_idx" ON "customer_profiles" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "cq_quality_id_idx" ON "customer_quality" USING btree ("quality_id");--> statement-breakpoint
CREATE INDEX "cq_customer_id_idx" ON "customer_quality" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "cq_user_id_idx" ON "customer_quality" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cq_duplicate_flag_idx" ON "customer_quality" USING btree ("duplicate_flag");--> statement-breakpoint
CREATE INDEX "cq_completeness_score_idx" ON "customer_quality" USING btree ("completeness_score");--> statement-breakpoint
CREATE UNIQUE INDEX "cr2_customer_id_uq" ON "customer_registry" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "cr2_user_id_idx" ON "customer_registry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cr2_business_id_idx" ON "customer_registry" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "cr2_email_idx" ON "customer_registry" USING btree ("email");--> statement-breakpoint
CREATE INDEX "cr2_current_stage_idx" ON "customer_registry" USING btree ("current_stage");--> statement-breakpoint
CREATE INDEX "cr2_health_status_idx" ON "customer_registry" USING btree ("health_status");--> statement-breakpoint
CREATE INDEX "cr2_lifetime_value_idx" ON "customer_registry" USING btree ("lifetime_value");--> statement-breakpoint
CREATE INDEX "cr_relationship_id_idx" ON "customer_relationships" USING btree ("relationship_id");--> statement-breakpoint
CREATE INDEX "cr_source_id_idx" ON "customer_relationships" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "cr_target_id_idx" ON "customer_relationships" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "cr_relationship_type_idx" ON "customer_relationships" USING btree ("relationship_type");--> statement-breakpoint
CREATE INDEX "cs_segment_id_idx" ON "customer_segments" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "cs_user_id_idx" ON "customer_segments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cs_business_id_idx" ON "customer_segments" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "cs_segment_type_idx" ON "customer_segments" USING btree ("segment_type");--> statement-breakpoint
CREATE INDEX "csn_created_at_idx" ON "customer_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "op_org_id_idx" ON "organization_profiles" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "op_user_id_idx" ON "organization_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "op_business_id_idx" ON "organization_profiles" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "op_domain_idx" ON "organization_profiles" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "op_parent_org_id_idx" ON "organization_profiles" USING btree ("parent_org_id");--> statement-breakpoint
CREATE INDEX "bp_process_id_idx" ON "business_processes" USING btree ("process_id");--> statement-breakpoint
CREATE INDEX "bp_user_id_idx" ON "business_processes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bp_business_id_idx" ON "business_processes" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "bp_process_domain_idx" ON "business_processes" USING btree ("process_domain");--> statement-breakpoint
CREATE INDEX "bp_status_idx" ON "business_processes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bp_sla_status_idx" ON "business_processes" USING btree ("sla_status");--> statement-breakpoint
CREATE INDEX "pd_dependency_id_idx" ON "process_dependencies" USING btree ("dependency_id");--> statement-breakpoint
CREATE INDEX "pd_source_process_id_idx" ON "process_dependencies" USING btree ("source_process_id");--> statement-breakpoint
CREATE INDEX "pd_target_process_id_idx" ON "process_dependencies" USING btree ("target_process_id");--> statement-breakpoint
CREATE INDEX "pd_is_critical_path_idx" ON "process_dependencies" USING btree ("is_critical_path");--> statement-breakpoint
CREATE INDEX "pdiag_diagnostic_id_idx" ON "process_diagnostics" USING btree ("diagnostic_id");--> statement-breakpoint
CREATE INDEX "pdiag_process_id_idx" ON "process_diagnostics" USING btree ("process_id");--> statement-breakpoint
CREATE INDEX "pdiag_severity_idx" ON "process_diagnostics" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "pdiag_category_idx" ON "process_diagnostics" USING btree ("category");--> statement-breakpoint
CREATE INDEX "pdiag_is_resolved_idx" ON "process_diagnostics" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX "pm_metric_id_idx" ON "process_metrics" USING btree ("metric_id");--> statement-breakpoint
CREATE INDEX "pm_process_id_idx" ON "process_metrics" USING btree ("process_id");--> statement-breakpoint
CREATE INDEX "pm_user_id_idx" ON "process_metrics" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "preg_process_id_uq" ON "process_registry" USING btree ("process_id");--> statement-breakpoint
CREATE INDEX "preg_user_id_idx" ON "process_registry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "preg_business_id_idx" ON "process_registry" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "preg_status_idx" ON "process_registry" USING btree ("status");--> statement-breakpoint
CREATE INDEX "preg_process_domain_idx" ON "process_registry" USING btree ("process_domain");--> statement-breakpoint
CREATE INDEX "preg_sla_status_idx" ON "process_registry" USING btree ("sla_status");--> statement-breakpoint
CREATE INDEX "preg_health_score_idx" ON "process_registry" USING btree ("health_score");--> statement-breakpoint
CREATE INDEX "pr_rule_id_idx" ON "process_rules" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "pr_process_id_idx" ON "process_rules" USING btree ("process_id");--> statement-breakpoint
CREATE INDEX "pr_rule_type_idx" ON "process_rules" USING btree ("rule_type");--> statement-breakpoint
CREATE INDEX "pr_is_active_idx" ON "process_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "psn_created_at_idx" ON "process_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ps_stage_id_idx" ON "process_stages" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "ps_process_id_idx" ON "process_stages" USING btree ("process_id");--> statement-breakpoint
CREATE INDEX "ps_user_id_idx" ON "process_stages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ps_status_idx" ON "process_stages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ps_stage_order_idx" ON "process_stages" USING btree ("stage_order");--> statement-breakpoint
CREATE INDEX "pst_step_id_idx" ON "process_steps" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "pst_stage_id_idx" ON "process_steps" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "pst_process_id_idx" ON "process_steps" USING btree ("process_id");--> statement-breakpoint
CREATE INDEX "pst_status_idx" ON "process_steps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pt_template_id_idx" ON "process_templates" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "pt_process_domain_idx" ON "process_templates" USING btree ("process_domain");--> statement-breakpoint
CREATE INDEX "pt_is_platform_idx" ON "process_templates" USING btree ("is_platform");--> statement-breakpoint
CREATE INDEX "idx_billing_profiles_user" ON "billing_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_billing_profiles_business" ON "billing_profiles" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_billing_profiles_id" ON "billing_profiles" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_checkout_profiles_user" ON "checkout_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_checkout_profiles_business" ON "checkout_profiles" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_checkout_profiles_id" ON "checkout_profiles" USING btree ("checkout_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_bundles_user" ON "commerce_bundles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_bundles_business" ON "commerce_bundles" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_commerce_bundles_id" ON "commerce_bundles" USING btree ("bundle_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_catalogs_user" ON "commerce_catalogs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_catalogs_business" ON "commerce_catalogs" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_commerce_catalogs_id" ON "commerce_catalogs" USING btree ("catalog_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_diagnostics_user" ON "commerce_diagnostics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_diagnostics_business" ON "commerce_diagnostics" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_diagnostics_severity" ON "commerce_diagnostics" USING btree ("severity");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_commerce_diagnostics_id" ON "commerce_diagnostics" USING btree ("diagnostic_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_offers_user" ON "commerce_offers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_offers_business" ON "commerce_offers" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_commerce_offers_id" ON "commerce_offers" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_products_user" ON "commerce_products" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_products_business" ON "commerce_products" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_products_catalog" ON "commerce_products" USING btree ("catalog_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_commerce_products_id" ON "commerce_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_registry_user" ON "commerce_registry" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_commerce_registry_business" ON "commerce_registry" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_commerce_registry_id" ON "commerce_registry" USING btree ("registry_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_services_user" ON "commerce_services" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_services_business" ON "commerce_services" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_commerce_services_id" ON "commerce_services" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_snapshots_user" ON "commerce_snapshots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_snapshots_business" ON "commerce_snapshots" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_commerce_snapshots_id" ON "commerce_snapshots" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_variants_parent" ON "commerce_variants" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_commerce_variants_business" ON "commerce_variants" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_commerce_variants_id" ON "commerce_variants" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_contracts_user" ON "contracts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_contracts_business" ON "contracts" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_contracts_status" ON "contracts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_contracts_doc_id" ON "contracts" USING btree ("contract_doc_id");--> statement-breakpoint
CREATE INDEX "idx_discount_rules_user" ON "discount_rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_discount_rules_business" ON "discount_rules" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_discount_rules_id" ON "discount_rules" USING btree ("discount_rule_id");--> statement-breakpoint
CREATE INDEX "idx_invoice_profiles_user" ON "invoice_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_invoice_profiles_business" ON "invoice_profiles" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_invoice_profiles_status" ON "invoice_profiles" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_invoice_profiles_id" ON "invoice_profiles" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "idx_pricing_models_user" ON "pricing_models" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_pricing_models_business" ON "pricing_models" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pricing_models_id" ON "pricing_models" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "idx_pricing_rules_model" ON "pricing_rules" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "idx_pricing_rules_business" ON "pricing_rules" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pricing_rules_id" ON "pricing_rules" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "idx_promotion_rules_user" ON "promotion_rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_promotion_rules_business" ON "promotion_rules" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_promotion_rules_id" ON "promotion_rules" USING btree ("promotion_id");--> statement-breakpoint
CREATE INDEX "idx_proposals_user" ON "proposals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_proposals_business" ON "proposals" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_proposals_status" ON "proposals" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_proposals_id" ON "proposals" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "idx_quotes_user" ON "quotes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_quotes_business" ON "quotes" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_quotes_status" ON "quotes" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_quotes_id" ON "quotes" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "idx_revenue_forecasts_user" ON "revenue_forecasts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_revenue_forecasts_business" ON "revenue_forecasts" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_revenue_forecasts_id" ON "revenue_forecasts" USING btree ("forecast_id");--> statement-breakpoint
CREATE INDEX "idx_revenue_streams_user" ON "revenue_streams" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_revenue_streams_business" ON "revenue_streams" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_revenue_streams_type" ON "revenue_streams" USING btree ("stream_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_revenue_streams_id" ON "revenue_streams" USING btree ("stream_id");--> statement-breakpoint
CREATE INDEX "idx_shipping_profiles_user" ON "shipping_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_shipping_profiles_business" ON "shipping_profiles" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_shipping_profiles_id" ON "shipping_profiles" USING btree ("shipping_profile_id");--> statement-breakpoint
CREATE INDEX "idx_shopping_carts_user" ON "shopping_carts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_shopping_carts_business" ON "shopping_carts" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_shopping_carts_status" ON "shopping_carts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_shopping_carts_id" ON "shopping_carts" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "idx_subscription_contracts_user" ON "subscription_contracts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_subscription_contracts_business" ON "subscription_contracts" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_subscription_contracts_status" ON "subscription_contracts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_subscription_contracts_id" ON "subscription_contracts" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_tax_profiles_user" ON "tax_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tax_profiles_business" ON "tax_profiles" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tax_profiles_id" ON "tax_profiles" USING btree ("tax_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_capability_providers_id" ON "capability_providers" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_capability_providers_slug" ON "capability_providers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_capability_providers_status" ON "capability_providers" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_audits_id" ON "provider_audits" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX "idx_provider_audits_provider" ON "provider_audits" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_provider_audits_user" ON "provider_audits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_provider_audits_action" ON "provider_audits" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_connections_id" ON "provider_connections" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "idx_provider_connections_user" ON "provider_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_provider_connections_provider" ON "provider_connections" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_provider_connections_status" ON "provider_connections" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_contracts_id" ON "provider_contracts" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "idx_provider_contracts_provider" ON "provider_contracts" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_provider_contracts_user" ON "provider_contracts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_credentials_id" ON "provider_credentials" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "idx_provider_credentials_connection" ON "provider_credentials" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "idx_provider_credentials_user" ON "provider_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_provider_credentials_status" ON "provider_credentials" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_dependencies_id" ON "provider_dependencies" USING btree ("dependency_id");--> statement-breakpoint
CREATE INDEX "idx_provider_dependencies_source" ON "provider_dependencies" USING btree ("source_provider_id");--> statement-breakpoint
CREATE INDEX "idx_provider_dependencies_target" ON "provider_dependencies" USING btree ("target_provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_diagnostics_id" ON "provider_diagnostics" USING btree ("diagnostic_id");--> statement-breakpoint
CREATE INDEX "idx_provider_diagnostics_provider" ON "provider_diagnostics" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_provider_diagnostics_severity" ON "provider_diagnostics" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_provider_diagnostics_user" ON "provider_diagnostics" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_events_id" ON "provider_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_provider_events_provider" ON "provider_events" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_provider_events_type" ON "provider_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_provider_events_user" ON "provider_events" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_health_id" ON "provider_health" USING btree ("health_id");--> statement-breakpoint
CREATE INDEX "idx_provider_health_provider" ON "provider_health" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_provider_health_user" ON "provider_health" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_provider_health_status" ON "provider_health" USING btree ("health_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_lifecycle_id" ON "provider_lifecycle" USING btree ("lifecycle_id");--> statement-breakpoint
CREATE INDEX "idx_provider_lifecycle_provider" ON "provider_lifecycle" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_provider_lifecycle_user" ON "provider_lifecycle" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_manifests_id" ON "provider_manifests" USING btree ("manifest_id");--> statement-breakpoint
CREATE INDEX "idx_provider_manifests_provider" ON "provider_manifests" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_oauth_id" ON "provider_oauth" USING btree ("oauth_id");--> statement-breakpoint
CREATE INDEX "idx_provider_oauth_connection" ON "provider_oauth" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "idx_provider_oauth_user" ON "provider_oauth" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_provider_oauth_status" ON "provider_oauth" USING btree ("token_status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_permissions_id" ON "provider_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "idx_provider_permissions_connection" ON "provider_permissions" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "idx_provider_permissions_user" ON "provider_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_policies_id" ON "provider_policies" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "idx_provider_policies_type" ON "provider_policies" USING btree ("policy_type");--> statement-breakpoint
CREATE INDEX "idx_provider_policies_status" ON "provider_policies" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_quotas_id" ON "provider_quotas" USING btree ("quota_id");--> statement-breakpoint
CREATE INDEX "idx_provider_quotas_provider" ON "provider_quotas" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_provider_quotas_user" ON "provider_quotas" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_rate_limits_id" ON "provider_rate_limits" USING btree ("rate_limit_id");--> statement-breakpoint
CREATE INDEX "idx_provider_rate_limits_provider" ON "provider_rate_limits" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_provider_rate_limits_user" ON "provider_rate_limits" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_recommendations_id" ON "provider_recommendations" USING btree ("recommendation_id");--> statement-breakpoint
CREATE INDEX "idx_provider_recommendations_category" ON "provider_recommendations" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_provider_recommendations_status" ON "provider_recommendations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_provider_recommendations_role" ON "provider_recommendations" USING btree ("target_role");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_registry_id" ON "provider_registry" USING btree ("registry_id");--> statement-breakpoint
CREATE INDEX "idx_provider_registry_user" ON "provider_registry" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_scopes_id" ON "provider_scopes" USING btree ("scope_id");--> statement-breakpoint
CREATE INDEX "idx_provider_scopes_connection" ON "provider_scopes" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "idx_provider_scopes_user" ON "provider_scopes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_snapshots_id" ON "provider_snapshots" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "idx_provider_snapshots_user" ON "provider_snapshots" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_sync_history_id" ON "provider_sync_history" USING btree ("history_id");--> statement-breakpoint
CREATE INDEX "idx_provider_sync_history_provider" ON "provider_sync_history" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_provider_sync_history_job" ON "provider_sync_history" USING btree ("sync_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_sync_jobs_id" ON "provider_sync_jobs" USING btree ("sync_job_id");--> statement-breakpoint
CREATE INDEX "idx_provider_sync_jobs_provider" ON "provider_sync_jobs" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_provider_sync_jobs_status" ON "provider_sync_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_provider_sync_jobs_user" ON "provider_sync_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_versions_id" ON "provider_versions" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "idx_provider_versions_provider" ON "provider_versions" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_webhooks_id" ON "provider_webhooks" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "idx_provider_webhooks_connection" ON "provider_webhooks" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "idx_provider_webhooks_provider" ON "provider_webhooks" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_provider_webhooks_status" ON "provider_webhooks" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_uecios_capabilities_id" ON "uecios_capabilities" USING btree ("capability_id");--> statement-breakpoint
CREATE INDEX "idx_uecios_capabilities_provider" ON "uecios_capabilities" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_uecios_capabilities_domain" ON "uecios_capabilities" USING btree ("domain_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_capability_domains_id" ON "uecios_domains" USING btree ("domain_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_capability_domains_slug" ON "uecios_domains" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "system_logs_system_instance_id_created_at_idx" ON "system_logs" USING btree ("system_instance_id","created_at");--> statement-breakpoint
CREATE INDEX "system_logs_business_id_created_at_idx" ON "system_logs" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "system_logs_user_id_created_at_idx" ON "system_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "system_logs_created_at_idx" ON "system_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "system_logs_severity_idx" ON "system_logs" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "system_logs_category_idx" ON "system_logs" USING btree ("category");
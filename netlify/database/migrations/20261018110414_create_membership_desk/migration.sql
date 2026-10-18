CREATE TABLE "counters" (
	"key" text PRIMARY KEY,
	"value" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY,
	"member_code" text NOT NULL UNIQUE,
	"receipt_no" text UNIQUE,
	"full_name" text NOT NULL,
	"department" text NOT NULL,
	"roll_number" text NOT NULL,
	"contact_number" text NOT NULL,
	"membership_type" text NOT NULL,
	"payment_mode" text NOT NULL,
	"payment_status" text NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"transaction_ref" text,
	"notes" text,
	"registered_by" integer,
	"created_at" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"paid_at" text,
	CONSTRAINT "members_type" CHECK ("membership_type" in ('general','executive')),
	CONSTRAINT "members_mode" CHECK ("payment_mode" in ('online','offline')),
	CONSTRAINT "members_status" CHECK ("payment_status" in ('paid','pending')),
	CONSTRAINT "members_amount" CHECK ("amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY,
	"user_id" integer NOT NULL,
	"expires_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"username" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"identity_id" text UNIQUE,
	"created_at" text DEFAULT to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	CONSTRAINT "users_role" CHECK ("role" in ('admin', 'desk'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_members_roll" ON "members" (lower("roll_number"));--> statement-breakpoint
CREATE INDEX "idx_members_created" ON "members" ("created_at");--> statement-breakpoint
CREATE INDEX "idx_members_type" ON "members" ("membership_type");--> statement-breakpoint
CREATE INDEX "idx_members_payment" ON "members" ("payment_status");--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_registered_by_users_id_fkey" FOREIGN KEY ("registered_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
CREATE TABLE "login_attempts" (
	"key" text PRIMARY KEY,
	"count" integer NOT NULL,
	"reset_at" bigint NOT NULL
);

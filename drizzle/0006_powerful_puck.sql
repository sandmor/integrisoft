ALTER TABLE "accounts" ADD COLUMN "access_token" varchar(255);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "refresh_token" varchar(255);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "access_token_expires" timestamp;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "refresh_token_expires" timestamp;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "scope" varchar(255);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "id_token" varchar(255);
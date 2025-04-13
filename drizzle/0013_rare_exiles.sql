ALTER TABLE "activities_feed" ADD COLUMN "icon" varchar(50);--> statement-breakpoint
ALTER TABLE "activities_feed" ADD COLUMN "color" varchar(20);--> statement-breakpoint
ALTER TABLE "activities_feed" ADD COLUMN "priority" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "activities_feed" ADD COLUMN "tags" text[];
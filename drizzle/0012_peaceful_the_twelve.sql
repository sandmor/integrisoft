ALTER TABLE "system_logs" RENAME TO "activities_feed";--> statement-breakpoint
ALTER TABLE "activities_feed" DROP CONSTRAINT "system_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "activities_feed" DROP CONSTRAINT "system_logs_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "activities_feed" DROP CONSTRAINT "system_logs_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "activities_feed" DROP CONSTRAINT "system_logs_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "activities_feed" DROP CONSTRAINT "system_logs_employee_id_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "activities_feed" DROP CONSTRAINT "system_logs_task_id_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "activities_feed" DROP CONSTRAINT "system_logs_milestone_id_milestones_id_fk";
--> statement-breakpoint
ALTER TABLE "activities_feed" ADD CONSTRAINT "activities_feed_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities_feed" ADD CONSTRAINT "activities_feed_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities_feed" ADD CONSTRAINT "activities_feed_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities_feed" ADD CONSTRAINT "activities_feed_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities_feed" ADD CONSTRAINT "activities_feed_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities_feed" ADD CONSTRAINT "activities_feed_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities_feed" ADD CONSTRAINT "activities_feed_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE no action ON UPDATE no action;
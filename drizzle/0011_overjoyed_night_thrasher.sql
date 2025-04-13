ALTER TABLE "system_logs" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "system_logs" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "system_logs" ADD COLUMN "product_id" text;--> statement-breakpoint
ALTER TABLE "system_logs" ADD COLUMN "client_id" text;--> statement-breakpoint
ALTER TABLE "system_logs" ADD COLUMN "employee_id" text;--> statement-breakpoint
ALTER TABLE "system_logs" ADD COLUMN "task_id" text;--> statement-breakpoint
ALTER TABLE "system_logs" ADD COLUMN "milestone_id" text;--> statement-breakpoint
ALTER TABLE "system_logs" ADD COLUMN "related_entity_type" varchar(50);--> statement-breakpoint
ALTER TABLE "system_logs" ADD COLUMN "related_entity_id" text;--> statement-breakpoint
ALTER TABLE "system_logs" ADD COLUMN "is_system" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE no action ON UPDATE no action;
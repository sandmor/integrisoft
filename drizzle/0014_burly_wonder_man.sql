CREATE TABLE "kanban_board_order" (
	"project_id" text NOT NULL,
	"status" "task_status" NOT NULL,
	"ordered_task_ids" text[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "kanban_board_order_project_id_status_pk" PRIMARY KEY("project_id","status")
);
--> statement-breakpoint
ALTER TABLE "kanban_board_order" ADD CONSTRAINT "kanban_board_order_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
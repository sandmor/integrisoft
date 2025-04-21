/**
 * Types related to project tasks
 */

/**
 * Task status type
 */
export type TaskStatus = "todo" | "in_progress" | "review" | "done";

/**
 * Task priority type (1: Low, 2: Medium, 3: High)
 */
export type TaskPriority = 1 | 2 | 3;

/**
 * Task interface
 */
export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  startDate?: string | null;
  estimatedHours?: string | null;
  actualHours?: string | null;
  completedDate?: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  assignedToId?: string | null;
  milestoneId?: string | null;
  assignee?: {
    id: string;
    name: string;
  } | null;
  milestone?: {
    id: string;
    name: string;
  } | null;
}

/**
 * Task creation input
 */
export interface TaskCreateInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  startDate?: string | null;
  estimatedHours?: string | null;
  assignedToId?: string | null;
  milestoneId?: string | null;
}

/**
 * Task update input
 */
export interface TaskUpdateInput extends Partial<TaskCreateInput> {
  actualHours?: string | null;
  completedDate?: string | null;
  positionIndex?: number; // Used for kanban board positioning
}

/**
 * Tasks response with grouped by status data
 */
export interface TasksResponse {
  data: Task[] | Record<TaskStatus, Task[]>;
  count: number;
}

/**
 * Task response (single task)
 */
export interface TaskResponse {
  data: Task;
}

/**
 * Task reorder input
 */
export interface TaskReorderInput {
  status: TaskStatus;
  taskIds: string[];
}

/**
 * Types related to project milestones
 */

/**
 * Milestone interface
 */
export interface Milestone {
  id: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  completedDate: string | null;
  isCompleted: boolean;
}

/**
 * Milestone creation input
 */
export interface MilestoneCreateInput {
  name: string;
  description?: string | null;
  dueDate: string;
  isCompleted?: boolean;
  completedDate?: string | null;
}

/**
 * Milestone update input
 */
export interface MilestoneUpdateInput {
  name?: string;
  description?: string | null;
  dueDate?: string;
  isCompleted?: boolean;
  completedDate?: string | null;
}

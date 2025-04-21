/**
 * Types related to projects
 */

import { Milestone } from "./milestones";
import { TeamMember } from "./team-members";

/**
 * Project status options
 */
export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled";

/**
 * Project interface
 */
export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  startDate: string | null;
  targetEndDate?: string | null;
  actualEndDate?: string | null;
  client?: {
    id: string;
    name: string;
  } | null;
  clientId?: string;
  manager?: {
    id: string | null;
    name: string | null;
  } | null;
  managerId?: string;
  budget?: string;
  taskCount?: number;
  progress?: number;
  createdAt?: string;
  updatedAt?: string;
  milestones?: Milestone[];
  teamMembers?: TeamMember[];
  product?: {
    id: string;
    name: string;
  } | null;
  productId?: string;
}

/**
 * Project creation payload
 */
export interface ProjectCreateInput {
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string | null;
  targetEndDate?: string | null;
  clientId?: string;
  productId?: string;
  budget?: string;
  managerId?: string;
}

/**
 * Project update payload
 */
export interface ProjectUpdateInput extends Partial<ProjectCreateInput> {
  actualEndDate?: string | null;
}

/**
 * Project detail response with additional statistics
 */
export interface ProjectDetailResponse {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  targetEndDate: string | null;
  actualEndDate: string | null;
  client: {
    id: string;
    name: string;
    industry?: string;
    website?: string;
  } | null;
  manager: {
    id: string;
    name: string;
    position?: string;
    department?: string;
  } | null;
  progress: number;
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
  };
  milestones: {
    total: number;
    completed: number;
  };
  budget: {
    total: string;
    spent: string;
    remaining: string;
    percentUsed: number; // Percentage can remain a number
  };
  teamMembers?: TeamMember[];
  milestonesData?: Milestone[]; // Using a different name to avoid conflict with the stats property
}

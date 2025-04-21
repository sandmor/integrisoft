/**
 * Types related to project team members
 */

/**
 * Team member interface
 */
export interface TeamMember {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  allocationPercentage: number;
  startDate: string | null;
  endDate: string | null;
}

/**
 * Team member creation input
 */
export interface TeamMemberCreateInput {
  employeeId: string;
  role: string;
  allocationPercentage: number;
  startDate: string;
  endDate?: string | null;
}

/**
 * Team member update input
 */
export interface TeamMemberUpdateInput {
  role?: string;
  allocationPercentage?: number;
  startDate?: string;
  endDate?: string | null;
}

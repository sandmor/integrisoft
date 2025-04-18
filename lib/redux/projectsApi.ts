import { api } from "./api";

// Helper type for handling model updates with proper date typing
type TypeSafeUpdate<T> = {
  [K in keyof T]?: T[K] extends Date | null | undefined
    ? Date | null | undefined
    : T[K];
};

// Interfaces for Redux store
export interface SerializedProject
  extends Omit<
    Project,
    | "startDate"
    | "targetEndDate"
    | "actualEndDate"
    | "createdAt"
    | "updatedAt"
    | "milestones"
    | "teamMembers"
  > {
  startDate: string | null;
  targetEndDate?: string | null;
  actualEndDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  milestones?: SerializedMilestone[];
  teamMembers?: SerializedTeamMember[];
}

export interface SerializedTeamMember
  extends Omit<TeamMember, "startDate" | "endDate"> {
  startDate: string | null;
  endDate: string | null;
}

export interface SerializedMilestone
  extends Omit<Milestone, "dueDate" | "completedDate"> {
  dueDate: string | null;
  completedDate: string | null;
}

export interface SerializedTask
  extends Omit<
    Task,
    "dueDate" | "startDate" | "completedDate" | "createdAt" | "updatedAt"
  > {
  dueDate: string | null;
  startDate: string | null;
  completedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled";
  startDate: Date | null;
  targetEndDate?: Date | null;
  actualEndDate?: Date | null;
  client?: {
    id: string;
    name: string;
  } | null;
  clientId?: string;
  manager?: {
    id: string | null;
    name: string | null;
  } | null;
  budget?: number;
  taskCount?: number;
  progress?: number;
  createdAt?: Date;
  updatedAt?: Date;
  milestones?: Milestone[];
  teamMembers?: TeamMember[];
  product?: {
    id: string;
    name: string;
  } | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  pageCount: number;
  page: number;
  pageSize: number;
}

export interface TeamMember {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  allocationPercentage: number;
  startDate: Date | null;
  endDate: Date | null;
}

export interface Milestone {
  id: string;
  name: string;
  description: string | null;
  dueDate: Date | null;
  completedDate: Date | null;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: "todo" | "in_progress" | "review" | "done";
  priority: 1 | 2 | 3; // 1: Low, 2: Medium, 3: High
  dueDate?: Date | null;
  startDate?: Date | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  completedDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
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

// New type for tasks response with grouped by status data
export interface TasksResponse {
  data: Task[];
  count: number;
  groupedByStatus?: Record<string, Task[]>;
}

// Type for task response (single task)
export interface TaskResponse {
  data: Task;
}

export const projectsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getProjects: build.query<
      PaginatedResponse<Project>,
      {
        page?: number;
        pageSize?: number;
        sorts?: string[];
        filters?: string[];
        status?: string;
        clientId?: string;
      }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();

        if (params.page !== undefined)
          queryParams.append("page", params.page.toString());
        if (params.pageSize !== undefined)
          queryParams.append("pageSize", params.pageSize.toString());

        if (params.sorts) {
          params.sorts.forEach((sort) => queryParams.append("sorts", sort));
        }

        if (params.filters) {
          params.filters.forEach((filter) =>
            queryParams.append("filters", filter)
          );
        }

        if (params.status) {
          queryParams.append("filters", `status:${params.status}`);
        }

        if (params.clientId) {
          queryParams.append("filters", `clientId:${params.clientId}`);
        }

        return {
          url: `/projects?${queryParams.toString()}`,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Projects" as const,
                id,
              })),
              { type: "Projects", id: "LIST" },
            ]
          : [{ type: "Projects", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),

    getProjectById: build.query<Project, string>({
      query: (id) => `/projects/${id}`,
      providesTags: (_, __, id) => [{ type: "Projects", id }],
    }),

    getProjectsByClient: build.query<PaginatedResponse<Project>, string>({
      query: (clientId) => `/projects?filters=clientId:${clientId}`,
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Projects" as const,
                id,
              })),
              { type: "Projects", id: "LIST" },
            ]
          : [{ type: "Projects", id: "LIST" }],
    }),

    addProject: build.mutation<Project, Partial<Project>>({
      query: (body) => ({
        url: "/projects",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Projects", id: "LIST" }],
      onQueryStarted: async (newProject, { dispatch, queryFulfilled }) => {
        const tempId = Date.now().toString();

        const optimisticProject = {
          ...newProject,
          id: tempId,
          startDate: newProject.startDate?.toJSON() || null,
          targetEndDate: newProject.targetEndDate?.toJSON() || null,
          actualEndDate: newProject.actualEndDate?.toJSON() || null,
          createdAt: new Date().toJSON(),
          updatedAt: new Date().toJSON(),
        } as unknown as Project;

        // Add to projects list
        const patchResult = dispatch(
          projectsApi.util.updateQueryData("getProjects", {}, (draft) => {
            draft.data.unshift(optimisticProject);
            draft.totalCount = (draft.totalCount || 0) + 1;
          })
        );

        // Add to client projects list
        let clientPatchResult;
        if (newProject.clientId) {
          clientPatchResult = dispatch(
            projectsApi.util.updateQueryData(
              "getProjectsByClient",
              newProject.clientId,
              (draft) => {
                draft.data.unshift(optimisticProject);
                draft.totalCount = (draft.totalCount || 0) + 1;
              }
            )
          );
        }

        try {
          const { data: createdProject } = await queryFulfilled;

          const serializedProject = {
            ...createdProject,
            startDate: createdProject.startDate?.toJSON() || null,
            targetEndDate: createdProject.targetEndDate?.toJSON() || null,
            actualEndDate: createdProject.actualEndDate?.toJSON() || null,
            createdAt: createdProject.createdAt?.toJSON(),
            updatedAt: createdProject.updatedAt?.toJSON(),
          } as unknown as Project;

          // Replace optimistic entry with actual data
          dispatch(
            projectsApi.util.updateQueryData("getProjects", {}, (draft) => {
              const index = draft.data.findIndex(
                (project) => project.id === tempId
              );
              if (index !== -1) draft.data[index] = serializedProject;
            })
          );

          if (newProject.clientId) {
            dispatch(
              projectsApi.util.updateQueryData(
                "getProjectsByClient",
                newProject.clientId,
                (draft) => {
                  const index = draft.data.findIndex(
                    (project) => project.id === tempId
                  );
                  if (index !== -1) draft.data[index] = serializedProject;
                }
              )
            );
          }
        } catch {
          patchResult.undo();
          if (clientPatchResult) clientPatchResult.undo();
        }
      },
    }),

    updateProject: build.mutation<Project, Partial<Project> & { id: string }>({
      query: ({ id, ...body }) => ({
        url: `/projects/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_, __, arg) => [
        { type: "Projects", id: arg.id },
        { type: "Projects", id: "LIST" },
      ],
      onQueryStarted: async (updatedProject, { dispatch, queryFulfilled }) => {
        const serializedProject = {
          ...updatedProject,
          startDate: updatedProject.startDate?.toJSON() || null,
          targetEndDate: updatedProject.targetEndDate?.toJSON() || null,
          actualEndDate: updatedProject.actualEndDate?.toJSON() || null,
          updatedAt: new Date().toJSON(),
        } as unknown as Project;

        // Update projects list
        const listPatch = dispatch(
          projectsApi.util.updateQueryData("getProjects", {}, (draft) => {
            const index = draft.data.findIndex(
              (project) => project.id === updatedProject.id
            );
            if (index !== -1)
              draft.data[index] = {
                ...draft.data[index],
                ...serializedProject,
              };
          })
        );

        // Update project details
        const detailPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getProjectById",
            updatedProject.id,
            (draft) => {
              Object.assign(draft, { ...draft, ...serializedProject });
            }
          )
        );

        // Update client's projects list
        let clientPatch;
        if (updatedProject.clientId) {
          clientPatch = dispatch(
            projectsApi.util.updateQueryData(
              "getProjectsByClient",
              updatedProject.clientId,
              (draft) => {
                const index = draft.data.findIndex(
                  (project) => project.id === updatedProject.id
                );
                if (index !== -1)
                  draft.data[index] = {
                    ...draft.data[index],
                    ...serializedProject,
                  };
              }
            )
          );
        }

        try {
          await queryFulfilled;
        } catch {
          listPatch.undo();
          detailPatch.undo();
          if (clientPatch) clientPatch.undo();
        }
      },
    }),

    deleteProject: build.mutation<void, string>({
      query: (id) => ({
        url: `/projects/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_, __, id) => [
        { type: "Projects", id },
        { type: "Projects", id: "LIST" },
      ],
      onQueryStarted: async (id, { dispatch, queryFulfilled, getState }) => {
        const state = getState() as any;
        const projectsQueries = state.api.queries;
        let clientId;

        // Find client ID for the project
        Object.values(projectsQueries).forEach((query: any) => {
          if (query?.data?.data && Array.isArray(query.data.data)) {
            const project = query.data.data.find((p: any) => p.id === id);
            if (project && project.clientId) clientId = project.clientId;
          } else if (query?.data?.id === id && query?.data?.clientId) {
            clientId = query.data.clientId;
          }
        });

        // Remove project from projects list
        const listPatch = dispatch(
          projectsApi.util.updateQueryData("getProjects", {}, (draft) => {
            const index = draft.data.findIndex((project) => project.id === id);
            if (index !== -1) {
              draft.data.splice(index, 1);
              draft.totalCount = (draft.totalCount || 0) - 1;
            }
          })
        );

        // Remove project from client projects list
        let clientListPatch;
        if (clientId) {
          clientListPatch = dispatch(
            projectsApi.util.updateQueryData(
              "getProjectsByClient",
              clientId,
              (draft) => {
                const index = draft.data.findIndex(
                  (project) => project.id === id
                );
                if (index !== -1) {
                  draft.data.splice(index, 1);
                  draft.totalCount = (draft.totalCount || 0) - 1;
                }
              }
            )
          );
        }

        try {
          await queryFulfilled;
          // Remove project detail
          dispatch(
            projectsApi.util.updateQueryData(
              "getProjectById",
              id,
              () => undefined
            )
          );
        } catch {
          listPatch.undo();
          if (clientListPatch) clientListPatch.undo();
        }
      },
    }),

    getTeamMembers: build.query<TeamMember[], string>({
      query: (projectId) => `/projects/${projectId}/team-members`,
      providesTags: (result, error, projectId) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "Projects" as const,
                id: `teamMember-${id}`,
              })),
              { type: "Projects", id: `teamMembers-${projectId}` },
            ]
          : [{ type: "Projects", id: `teamMembers-${projectId}` }],
    }),

    getTeamMemberById: build.query<
      TeamMember,
      { projectId: string; teamMemberId: string }
    >({
      query: ({ projectId, teamMemberId }) =>
        `/projects/${projectId}/team-members/${teamMemberId}`,
      providesTags: (result, error, { teamMemberId }) => [
        { type: "Projects", id: `teamMember-${teamMemberId}` },
      ],
    }),

    addTeamMember: build.mutation<
      TeamMember,
      { projectId: string; teamMember: Omit<TeamMember, "id" | "name"> }
    >({
      query: ({ projectId, teamMember }) => ({
        url: `/projects/${projectId}/team-members`,
        method: "POST",
        body: teamMember,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "Projects", id: `teamMembers-${projectId}` },
      ],
      onQueryStarted: async (
        { projectId, teamMember },
        { dispatch, queryFulfilled }
      ) => {
        const tempId = Date.now().toString();

        const serializedTeamMember = {
          ...teamMember,
          startDate: teamMember.startDate?.toJSON() || null,
          endDate: teamMember.endDate?.toJSON() || null,
          id: tempId,
          name: "Loading...",
        } as unknown as TeamMember;

        // Add team member to list
        const teamMembersPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getTeamMembers",
            projectId,
            (draft) => {
              draft.push(serializedTeamMember);
            }
          )
        );

        // Add team member to project
        const projectPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getProjectById",
            projectId,
            (draft) => {
              if (draft.teamMembers) {
                draft.teamMembers.push(serializedTeamMember);
              } else {
                draft.teamMembers = [serializedTeamMember];
              }
            }
          )
        );

        try {
          const { data: createdTeamMember } = await queryFulfilled;

          // Replace with actual data
          const serializedResponse = {
            ...createdTeamMember,
            startDate: createdTeamMember.startDate?.toJSON() || null,
            endDate: createdTeamMember.endDate?.toJSON() || null,
          } as unknown as TeamMember;

          dispatch(
            projectsApi.util.updateQueryData(
              "getTeamMembers",
              projectId,
              (draft) => {
                const index = draft.findIndex((member) => member.id === tempId);
                if (index !== -1) draft[index] = serializedResponse;
              }
            )
          );

          dispatch(
            projectsApi.util.updateQueryData(
              "getProjectById",
              projectId,
              (draft) => {
                if (draft.teamMembers) {
                  const index = draft.teamMembers.findIndex(
                    (member) => member.id === tempId
                  );
                  if (index !== -1)
                    draft.teamMembers[index] = serializedResponse;
                }
              }
            )
          );
        } catch {
          teamMembersPatch.undo();
          projectPatch.undo();
        }
      },
    }),

    updateTeamMember: build.mutation<
      TeamMember,
      {
        projectId: string;
        teamMemberId: string;
        teamMember: Partial<Omit<TeamMember, "id" | "name">>;
      }
    >({
      query: ({ projectId, teamMemberId, teamMember }) => ({
        url: `/projects/${projectId}/team-members/${teamMemberId}`,
        method: "PATCH",
        body: teamMember,
      }),
      invalidatesTags: (result, error, { teamMemberId, projectId }) => [
        { type: "Projects", id: `teamMember-${teamMemberId}` },
        { type: "Projects", id: `teamMembers-${projectId}` },
      ],
      onQueryStarted: async (
        { projectId, teamMemberId, teamMember },
        { dispatch, queryFulfilled }
      ) => {
        const serializedTeamMember: SerializedTeamMember = {
          ...(teamMember as any),
          id: teamMemberId,
          name: "Loading...",
          startDate: teamMember.startDate?.toJSON() || null,
          endDate: teamMember.endDate?.toJSON() || null,
        };

        // Update team members list
        const teamMembersPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getTeamMembers",
            projectId,
            (draft) => {
              const index = draft.findIndex(
                (member) => member.id === teamMemberId
              );
              if (index !== -1) {
                draft[index] = {
                  ...draft[index],
                  ...teamMember,
                  startDate: serializedTeamMember.startDate as unknown as Date,
                  endDate: serializedTeamMember.endDate as unknown as Date,
                };
              }
            }
          )
        );

        // Update team member detail
        const teamMemberPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getTeamMemberById",
            { projectId, teamMemberId },
            (draft) => {
              Object.assign(draft, {
                ...draft,
                ...teamMember,
                startDate: serializedTeamMember.startDate as unknown as Date,
                endDate: serializedTeamMember.endDate as unknown as Date,
              });
            }
          )
        );

        // Update team member in project
        const projectPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getProjectById",
            projectId,
            (draft) => {
              if (draft.teamMembers) {
                const index = draft.teamMembers.findIndex(
                  (member) => member.id === teamMemberId
                );
                if (index !== -1) {
                  draft.teamMembers[index] = {
                    ...draft.teamMembers[index],
                    ...teamMember,
                    startDate:
                      serializedTeamMember.startDate as unknown as Date,
                    endDate: serializedTeamMember.endDate as unknown as Date,
                  };
                }
              }
            }
          )
        );

        try {
          await queryFulfilled;
        } catch {
          teamMembersPatch.undo();
          teamMemberPatch.undo();
          projectPatch.undo();
        }
      },
    }),

    deleteTeamMember: build.mutation<
      void,
      { projectId: string; teamMemberId: string }
    >({
      query: ({ projectId, teamMemberId }) => ({
        url: `/projects/${projectId}/team-members/${teamMemberId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { projectId, teamMemberId }) => [
        { type: "Projects", id: `teamMember-${teamMemberId}` },
        { type: "Projects", id: `teamMembers-${projectId}` },
      ],
      onQueryStarted: async (
        { projectId, teamMemberId },
        { dispatch, queryFulfilled }
      ) => {
        // Remove from team members list
        const teamMembersPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getTeamMembers",
            projectId,
            (draft) => {
              const index = draft.findIndex(
                (member) => member.id === teamMemberId
              );
              if (index !== -1) draft.splice(index, 1);
            }
          )
        );

        // Remove from project
        const projectPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getProjectById",
            projectId,
            (draft) => {
              if (draft.teamMembers) {
                const index = draft.teamMembers.findIndex(
                  (member) => member.id === teamMemberId
                );
                if (index !== -1) draft.teamMembers.splice(index, 1);
              }
            }
          )
        );

        try {
          await queryFulfilled;
          // Remove team member detail
          dispatch(
            projectsApi.util.updateQueryData(
              "getTeamMemberById",
              { projectId, teamMemberId },
              () => undefined
            )
          );
        } catch {
          teamMembersPatch.undo();
          projectPatch.undo();
        }
      },
    }),

    getMilestones: build.query<Milestone[], string>({
      query: (projectId) => `/projects/${projectId}/milestones`,
      providesTags: (result, error, projectId) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "Projects" as const,
                id: `milestone-${id}`,
              })),
              { type: "Projects", id: `milestones-${projectId}` },
            ]
          : [{ type: "Projects", id: `milestones-${projectId}` }],
    }),

    getMilestoneById: build.query<
      Milestone,
      { projectId: string; milestoneId: string }
    >({
      query: ({ projectId, milestoneId }) =>
        `/projects/${projectId}/milestones/${milestoneId}`,
      providesTags: (result, error, { milestoneId }) => [
        { type: "Projects", id: `milestone-${milestoneId}` },
      ],
    }),

    addMilestone: build.mutation<
      Milestone,
      { projectId: string; milestone: Omit<Milestone, "id"> }
    >({
      query: ({ projectId, milestone }) => ({
        url: `/projects/${projectId}/milestones`,
        method: "POST",
        body: milestone,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "Projects", id: `milestones-${projectId}` },
        { type: "Projects", id: projectId },
      ],
      onQueryStarted: async (
        { projectId, milestone },
        { dispatch, queryFulfilled }
      ) => {
        const tempId = Date.now().toString();

        // Create optimistic milestone
        const optimisticMilestone = {
          ...milestone,
          id: tempId,
          dueDate: milestone.dueDate?.toJSON() || null,
          completedDate: milestone.completedDate?.toJSON() || null,
        } as unknown as Milestone;

        // Add to milestones list
        const milestonesPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getMilestones",
            projectId,
            (draft) => {
              draft.push(optimisticMilestone);
            }
          )
        );

        // Add to project
        const projectPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getProjectById",
            projectId,
            (draft) => {
              if (draft.milestones) {
                draft.milestones.push(optimisticMilestone);
              } else {
                draft.milestones = [optimisticMilestone];
              }
            }
          )
        );

        try {
          const { data: createdMilestone } = await queryFulfilled;

          // Replace with actual data
          const serializedMilestone = {
            ...createdMilestone,
            dueDate: createdMilestone.dueDate?.toJSON() || null,
            completedDate: createdMilestone.completedDate?.toJSON() || null,
          } as unknown as Milestone;

          dispatch(
            projectsApi.util.updateQueryData(
              "getMilestones",
              projectId,
              (draft) => {
                const index = draft.findIndex((item) => item.id === tempId);
                if (index !== -1) draft[index] = serializedMilestone;
              }
            )
          );

          dispatch(
            projectsApi.util.updateQueryData(
              "getProjectById",
              projectId,
              (draft) => {
                if (draft.milestones) {
                  const index = draft.milestones.findIndex(
                    (item) => item.id === tempId
                  );
                  if (index !== -1)
                    draft.milestones[index] = serializedMilestone;
                }
              }
            )
          );
        } catch {
          milestonesPatch.undo();
          projectPatch.undo();
        }
      },
    }),

    updateMilestone: build.mutation<
      Milestone,
      {
        projectId: string;
        milestoneId: string;
        milestone: Partial<Omit<Milestone, "id">>;
      }
    >({
      query: ({ projectId, milestoneId, milestone }) => ({
        url: `/projects/${projectId}/milestones/${milestoneId}`,
        method: "PATCH",
        body: milestone,
      }),
      invalidatesTags: (result, error, { projectId, milestoneId }) => [
        { type: "Projects", id: `milestone-${milestoneId}` },
        { type: "Projects", id: `milestones-${projectId}` },
        { type: "Projects", id: projectId },
      ],
      onQueryStarted: async (
        { projectId, milestoneId, milestone },
        { dispatch, queryFulfilled }
      ) => {
        const serializedMilestone: SerializedMilestone = {
          ...(milestone as any),
          id: milestoneId,
          dueDate: milestone.dueDate?.toJSON() || null,
          completedDate: milestone.completedDate?.toJSON() || null,
          name: milestone.name || "",
          description: milestone.description || null,
          isCompleted: milestone.isCompleted ?? false,
        };

        // Update milestones list
        const milestonesPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getMilestones",
            projectId,
            (draft) => {
              const index = draft.findIndex((item) => item.id === milestoneId);
              if (index !== -1) {
                draft[index] = {
                  ...draft[index],
                  ...milestone,
                  dueDate: serializedMilestone.dueDate as unknown as Date,
                  completedDate:
                    serializedMilestone.completedDate as unknown as Date,
                };
              }
            }
          )
        );

        // Update milestone detail
        const milestonePatch = dispatch(
          projectsApi.util.updateQueryData(
            "getMilestoneById",
            { projectId, milestoneId },
            (draft) => {
              Object.assign(draft, {
                ...draft,
                ...milestone,
                dueDate: serializedMilestone.dueDate as unknown as Date,
                completedDate:
                  serializedMilestone.completedDate as unknown as Date,
              });
            }
          )
        );

        // Update project milestone
        const projectPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getProjectById",
            projectId,
            (draft) => {
              if (draft.milestones) {
                const index = draft.milestones.findIndex(
                  (item) => item.id === milestoneId
                );
                if (index !== -1) {
                  draft.milestones[index] = {
                    ...draft.milestones[index],
                    ...milestone,
                    dueDate: serializedMilestone.dueDate as unknown as Date,
                    completedDate:
                      serializedMilestone.completedDate as unknown as Date,
                  };
                }
              }
            }
          )
        );

        try {
          await queryFulfilled;
        } catch {
          milestonesPatch.undo();
          milestonePatch.undo();
          projectPatch.undo();
        }
      },
    }),

    deleteMilestone: build.mutation<
      void,
      { projectId: string; milestoneId: string }
    >({
      query: ({ projectId, milestoneId }) => ({
        url: `/projects/${projectId}/milestones/${milestoneId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { projectId, milestoneId }) => [
        { type: "Projects", id: `milestone-${milestoneId}` },
        { type: "Projects", id: `milestones-${projectId}` },
        { type: "Projects", id: projectId },
      ],
      onQueryStarted: async (
        { projectId, milestoneId },
        { dispatch, queryFulfilled }
      ) => {
        // Remove from milestones list
        const milestonesPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getMilestones",
            projectId,
            (draft) => {
              const index = draft.findIndex((item) => item.id === milestoneId);
              if (index !== -1) draft.splice(index, 1);
            }
          )
        );

        // Remove from project
        const projectPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getProjectById",
            projectId,
            (draft) => {
              if (draft.milestones) {
                const index = draft.milestones.findIndex(
                  (item) => item.id === milestoneId
                );
                if (index !== -1) draft.milestones.splice(index, 1);
              }
            }
          )
        );

        try {
          await queryFulfilled;
          // Remove milestone detail
          dispatch(
            projectsApi.util.updateQueryData(
              "getMilestoneById",
              { projectId, milestoneId },
              () => undefined
            )
          );
        } catch {
          milestonesPatch.undo();
          projectPatch.undo();
        }
      },
    }),

    // Tasks endpoints
    getTasks: build.query<
      TasksResponse,
      string | { projectId: string; orderByStatus?: boolean }
    >({
      query: (arg) => {
        const projectId = typeof arg === "string" ? arg : arg.projectId;
        const orderByStatus = typeof arg === "object" && arg.orderByStatus;

        return {
          url: `/projects/${projectId}/tasks${
            orderByStatus ? "?orderByStatus=true" : ""
          }`,
        };
      },
      providesTags: (result, error, arg) => {
        const projectId = typeof arg === "string" ? arg : arg.projectId;

        if (!result?.data) {
          return [{ type: "Projects", id: `tasks-${projectId}` }];
        }

        // Extract all task ids for tagging
        const taskIds = Array.isArray(result.data)
          ? result.data.map((task) => task.id)
          : Object.values(result.groupedByStatus || {}).flatMap((tasks) =>
              tasks.map((task) => task.id)
            );

        return [
          ...taskIds.map((id) => ({
            type: "Projects" as const,
            id: `task-${id}`,
          })),
          { type: "Projects", id: `tasks-${projectId}` },
        ];
      },
      transformResponse: (response: any) => {
        if (response.data && !Array.isArray(response.data)) {
          // Handle kanban grouped by status format
          const allTasks = Object.values(response.data).flat();
          return {
            data: allTasks,
            count: allTasks.length,
            groupedByStatus: response.data,
          };
        }
        return response;
      },
      keepUnusedDataFor: 60,
    }),

    getTask: build.query<TaskResponse, { projectId: string; taskId: string }>({
      query: ({ projectId, taskId }) =>
        `/projects/${projectId}/tasks/${taskId}`,
      providesTags: (result, error, { taskId }) => [
        { type: "Projects", id: `task-${taskId}` },
      ],
    }),

    createTask: build.mutation<
      Task,
      {
        projectId: string;
        task: TypeSafeUpdate<
          Omit<Task, "id" | "projectId" | "createdAt" | "updatedAt">
        >;
      }
    >({
      query: ({ projectId, task }) => ({
        url: `/projects/${projectId}/tasks`,
        method: "POST",
        body: task,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "Projects", id: `tasks-${projectId}` },
        { type: "Projects", id: projectId },
      ],
      onQueryStarted: async (
        { projectId, task },
        { dispatch, queryFulfilled }
      ) => {
        const tempId = Date.now().toString();

        // Create optimistic task
        const optimisticTask = {
          id: tempId,
          title: task.title || "New Task",
          description: task.description || null,
          status: task.status || "todo",
          priority: task.priority || 2,
          dueDate: task.dueDate || null,
          startDate: task.startDate || null,
          estimatedHours: task.estimatedHours || null,
          actualHours: task.actualHours || null,
          completedDate: task.completedDate || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          projectId,
          assignedToId: task.assignedToId || null,
          milestoneId: task.milestoneId || null,
          assignee: task.assignedToId
            ? { id: task.assignedToId, name: "Loading..." }
            : null,
          milestone: task.milestoneId
            ? { id: task.milestoneId, name: "Loading..." }
            : null,
        } as Task;

        // Add to tasks list
        const patchResult = dispatch(
          projectsApi.util.updateQueryData("getTasks", projectId, (draft) => {
            draft.data.unshift(optimisticTask);
            draft.count = (draft.count || 0) + 1;
          })
        );

        try {
          const { data: createdTask } = await queryFulfilled;

          // Replace with actual data
          dispatch(
            projectsApi.util.updateQueryData("getTasks", projectId, (draft) => {
              const index = draft.data.findIndex((t) => t.id === tempId);
              if (index !== -1) {
                draft.data[index] = createdTask;
              }
            })
          );
        } catch {
          patchResult.undo();
        }
      },
    }),

    updateTask: build.mutation<
      Task,
      {
        projectId: string;
        taskId: string;
        task: TypeSafeUpdate<
          Omit<Task, "id" | "projectId" | "createdAt" | "updatedAt">
        >;
      }
    >({
      query: ({ projectId, taskId, task }) => ({
        url: `/projects/${projectId}/tasks/${taskId}`,
        method: "PATCH",
        body: task,
      }),
      invalidatesTags: (result, error, { projectId, taskId }) => [
        { type: "Projects", id: `task-${taskId}` },
        { type: "Projects", id: `tasks-${projectId}` },
        { type: "Projects", id: projectId },
      ],
      onQueryStarted: async (
        { projectId, taskId, task },
        { dispatch, queryFulfilled, getState }
      ) => {
        // Serialize dates for Redux
        const serializedTask = {
          ...task,
          dueDate: task.dueDate?.toJSON() || null,
          startDate: task.startDate?.toJSON() || null,
          completedDate: task.completedDate?.toJSON() || null,
          updatedAt: new Date().toJSON(),
        } as SerializedTask;

        // For status changes (column moves), handle optimistic updates for kanban view
        const isStatusChange = "status" in task;

        const state = getState() as any;
        const tasksQueries = Object.values(state.api.queries).filter(
          (query: any) =>
            query?.endpointName === "getTasks" &&
            (query?.originalArgs === projectId ||
              (typeof query?.originalArgs === "object" &&
                query?.originalArgs.projectId === projectId))
        );

        // Updates for queries with grouped data (kanban board view)
        const kanbanPatches = isStatusChange
          ? tasksQueries
              .map((query: any) => {
                if (query.data?.groupedByStatus) {
                  return dispatch(
                    projectsApi.util.updateQueryData(
                      "getTasks",
                      query.originalArgs,
                      (draft: TasksResponse) => {
                        if (draft.groupedByStatus) {
                          // Find the current task in its original status column
                          let currentTask: Task | undefined;
                          let originalStatus: string | undefined;

                          // Find task and its current status
                          for (const [status, tasks] of Object.entries(
                            draft.groupedByStatus
                          )) {
                            const taskIndex = tasks.findIndex(
                              (t) => t.id === taskId
                            );
                            if (taskIndex !== -1) {
                              currentTask = { ...tasks[taskIndex] };
                              originalStatus = status;
                              // Remove from original status column
                              draft.groupedByStatus[status].splice(
                                taskIndex,
                                1
                              );
                              break;
                            }
                          }

                          // If we found the task and it's moving to a new status
                          if (currentTask && task.status) {
                            // Update the task with new data
                            const updatedTask = {
                              ...currentTask,
                              ...task,
                              dueDate:
                                serializedTask.dueDate as unknown as Date,
                              startDate:
                                serializedTask.startDate as unknown as Date,
                              completedDate:
                                serializedTask.completedDate as unknown as Date,
                              updatedAt:
                                serializedTask.updatedAt as unknown as Date,
                            };

                            // Add to the new status column
                            if (!draft.groupedByStatus[task.status]) {
                              draft.groupedByStatus[task.status] = [];
                            }

                            // Add to the beginning of the new column
                            draft.groupedByStatus[task.status].unshift(
                              updatedTask
                            );
                          }
                        }
                      }
                    )
                  );
                }
                return null;
              })
              .filter(Boolean)
          : [];

        // Update tasks list (standard view)
        const listPatch = dispatch(
          projectsApi.util.updateQueryData("getTasks", projectId, (draft) => {
            const index = draft.data.findIndex((t) => t.id === taskId);
            if (index !== -1) {
              draft.data[index] = {
                ...draft.data[index],
                ...task,
                dueDate: serializedTask.dueDate as unknown as Date,
                startDate: serializedTask.startDate as unknown as Date,
                completedDate: serializedTask.completedDate as unknown as Date,
                updatedAt: serializedTask.updatedAt as unknown as Date,
              };
            }
          })
        );

        // Update task detail
        const detailPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getTask",
            { projectId, taskId },
            (draft) => {
              if (draft.data) {
                draft.data = {
                  ...draft.data,
                  ...task,
                  dueDate: serializedTask.dueDate as unknown as Date,
                  startDate: serializedTask.startDate as unknown as Date,
                  completedDate:
                    serializedTask.completedDate as unknown as Date,
                  updatedAt: serializedTask.updatedAt as unknown as Date,
                };
              }
            }
          )
        );

        try {
          await queryFulfilled;
        } catch {
          // Undo all patches if the request fails
          listPatch.undo();
          detailPatch.undo();
          kanbanPatches.forEach((patch) => patch?.undo());
        }
      },
    }),

    deleteTask: build.mutation<void, { projectId: string; taskId: string }>({
      query: ({ projectId, taskId }) => ({
        url: `/projects/${projectId}/tasks/${taskId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { projectId, taskId }) => [
        { type: "Projects", id: `task-${taskId}` },
        { type: "Projects", id: `tasks-${projectId}` },
        { type: "Projects", id: projectId },
      ],
      onQueryStarted: async (
        { projectId, taskId },
        { dispatch, queryFulfilled }
      ) => {
        // Remove from tasks list
        const listPatch = dispatch(
          projectsApi.util.updateQueryData("getTasks", projectId, (draft) => {
            const index = draft.data.findIndex((t) => t.id === taskId);
            if (index !== -1) {
              draft.data.splice(index, 1);
              draft.count = Math.max(0, (draft.count || 0) - 1);
            }
          })
        );

        try {
          await queryFulfilled;
          // Remove task detail
          dispatch(
            projectsApi.util.updateQueryData(
              "getTask",
              { projectId, taskId },
              () => undefined as any
            )
          );
        } catch {
          listPatch.undo();
        }
      },
    }),

    // Reorder tasks within a column
    reorderTasks: build.mutation<
      { success: boolean },
      {
        projectId: string;
        status: "todo" | "in_progress" | "review" | "done";
        taskIds: string[];
      }
    >({
      query: ({ projectId, status, taskIds }) => ({
        url: `/projects/${projectId}/tasks/reorder`,
        method: "POST",
        body: { status, taskIds },
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "Projects", id: `tasks-${projectId}` },
      ],
      onQueryStarted: async (
        { projectId, status, taskIds },
        { dispatch, queryFulfilled, getState }
      ) => {
        const state = getState() as any;
        const tasksQueries = Object.values(state.api.queries).filter(
          (query: any) =>
            query?.endpointName === "getTasks" &&
            (query?.originalArgs === projectId ||
              (typeof query?.originalArgs === "object" &&
                query?.originalArgs.projectId === projectId))
        );

        const patches = tasksQueries
          .map((query: any) => {
            if (
              query.data?.groupedByStatus &&
              query.data.groupedByStatus[status]
            ) {
              return dispatch(
                projectsApi.util.updateQueryData(
                  "getTasks",
                  query.originalArgs,
                  (draft: TasksResponse) => {
                    if (
                      draft.groupedByStatus &&
                      draft.groupedByStatus[status]
                    ) {
                      const currentTasks = [...draft.groupedByStatus[status]];
                      const taskMap = new Map(
                        currentTasks.map((task) => [task.id, task])
                      );

                      const newOrderedTasks = taskIds
                        .map((id) => taskMap.get(id))
                        .filter((task): task is Task => task !== undefined);

                      const taskIdSet = new Set(taskIds);
                      const remainingTasks = currentTasks.filter(
                        (task) => !taskIdSet.has(task.id)
                      );

                      draft.groupedByStatus[status] = [
                        ...newOrderedTasks,
                        ...remainingTasks,
                      ];
                    }
                  }
                )
              );
            }
            return null;
          })
          .filter(Boolean);

        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch?.undo());
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useGetProjectsByClientQuery,
  useAddProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useGetTeamMembersQuery,
  useGetTeamMemberByIdQuery,
  useAddTeamMemberMutation,
  useUpdateTeamMemberMutation,
  useDeleteTeamMemberMutation,
  useGetMilestonesQuery,
  useGetMilestoneByIdQuery,
  useAddMilestoneMutation,
  useUpdateMilestoneMutation,
  useDeleteMilestoneMutation,
  useGetTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useReorderTasksMutation,
} = projectsApi;

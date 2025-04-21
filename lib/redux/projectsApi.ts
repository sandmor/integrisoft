import { api } from "./api";
import {
  Project,
  ProjectCreateInput,
  ProjectDetailResponse,
  ProjectUpdateInput,
  TeamMember,
  TeamMemberCreateInput,
  TeamMemberUpdateInput,
  Milestone,
  MilestoneCreateInput,
  MilestoneUpdateInput,
  Task,
  TaskCreateInput,
  TaskUpdateInput,
  TasksResponse,
  TaskResponse,
  TaskReorderInput,
  PaginatedResponse,
} from "@/lib/types";

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

    getProjectById: build.query<ProjectDetailResponse, string>({
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

    addProject: build.mutation<Project, ProjectCreateInput>({
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
          startDate: newProject.startDate,
          targetEndDate: newProject.targetEndDate,
          budget: newProject.budget || "0", // Ensure budget is handled as string
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

          // Replace optimistic entry with actual data
          dispatch(
            projectsApi.util.updateQueryData("getProjects", {}, (draft) => {
              const index = draft.data.findIndex(
                (project) => project.id === tempId
              );
              if (index !== -1) draft.data[index] = createdProject;
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
                  if (index !== -1) draft.data[index] = createdProject;
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

    updateProject: build.mutation<Project, ProjectUpdateInput & { id: string }>(
      {
        query: ({ id, ...body }) => ({
          url: `/projects/${id}`,
          method: "PATCH",
          body,
        }),
        invalidatesTags: (_, __, arg) => [
          { type: "Projects", id: arg.id },
          { type: "Projects", id: "LIST" },
        ],
        onQueryStarted: async (
          updatedProject,
          { dispatch, queryFulfilled }
        ) => {
          // Update projects list
          const listPatch = dispatch(
            projectsApi.util.updateQueryData("getProjects", {}, (draft) => {
              const index = draft.data.findIndex(
                (project) => project.id === updatedProject.id
              );
              if (index !== -1)
                draft.data[index] = {
                  ...draft.data[index],
                  ...updatedProject,
                };
            })
          );

          // Update project details
          const detailPatch = dispatch(
            projectsApi.util.updateQueryData(
              "getProjectById",
              updatedProject.id,
              (draft) => {
                Object.assign(draft, { ...draft, ...updatedProject });
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
                      ...updatedProject,
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
      }
    ),

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
      { projectId: string; teamMember: TeamMemberCreateInput }
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

        const newTeamMember = {
          ...teamMember,
          id: tempId,
          name: "Loading...",
        } as unknown as TeamMember;

        // Add team member to list
        const teamMembersPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getTeamMembers",
            projectId,
            (draft) => {
              draft.push(newTeamMember);
            }
          )
        );

        // Add team member to project
        const projectPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getProjectById",
            projectId,
            (draft) => {
              if (!draft.teamMembers) {
                draft.teamMembers = [];
              }
              draft.teamMembers.push(newTeamMember);
            }
          )
        );

        try {
          const { data: createdTeamMember } = await queryFulfilled;

          dispatch(
            projectsApi.util.updateQueryData(
              "getTeamMembers",
              projectId,
              (draft) => {
                const index = draft.findIndex((member) => member.id === tempId);
                if (index !== -1) draft[index] = createdTeamMember;
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
                    (member: TeamMember) => member.id === tempId
                  );
                  if (index !== -1)
                    draft.teamMembers[index] = createdTeamMember;
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
        teamMember: TeamMemberUpdateInput;
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
        const updatedTeamMember = {
          ...(teamMember as any),
          id: teamMemberId,
          name: "Loading...",
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
                  startDate: updatedTeamMember.startDate,
                  endDate: updatedTeamMember.endDate,
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
                startDate: updatedTeamMember.startDate,
                endDate: updatedTeamMember.endDate,
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
                    startDate: updatedTeamMember.startDate,
                    endDate: updatedTeamMember.endDate,
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
      { projectId: string; milestone: MilestoneCreateInput }
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
              if (!draft.milestonesData) {
                draft.milestonesData = [];
              }
              draft.milestonesData.push(optimisticMilestone);
            }
          )
        );

        try {
          const { data: createdMilestone } = await queryFulfilled;

          dispatch(
            projectsApi.util.updateQueryData(
              "getMilestones",
              projectId,
              (draft) => {
                const index = draft.findIndex((item) => item.id === tempId);
                if (index !== -1) draft[index] = createdMilestone;
              }
            )
          );

          dispatch(
            projectsApi.util.updateQueryData(
              "getProjectById",
              projectId,
              (draft) => {
                if (draft.milestonesData) {
                  const index = draft.milestonesData.findIndex(
                    (item: Milestone) => item.id === tempId
                  );
                  if (index !== -1)
                    draft.milestonesData[index] = createdMilestone;
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
        milestone: MilestoneUpdateInput;
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
              if (draft.milestonesData) {
                const index = draft.milestonesData.findIndex(
                  (item: Milestone) => item.id === milestoneId
                );
                if (index !== -1) {
                  draft.milestonesData[index] = {
                    ...draft.milestonesData[index],
                    ...milestone,
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
              if (draft.milestonesData) {
                const index = draft.milestonesData.findIndex(
                  (item: Milestone) => item.id === milestoneId
                );
                if (index !== -1) draft.milestonesData.splice(index, 1);
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
          : Object.values(result.data).flatMap((tasks: any) =>
              tasks.map((task: any) => task.id)
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
            data: response.data, // Keep the grouped structure under data
            count: allTasks.length,
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
        task: TaskCreateInput;
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
          estimatedHours: task.estimatedHours || null, // This is now a string
          actualHours: null,
          completedDate: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
            if (Array.isArray(draft.data)) {
              draft.data.unshift(optimisticTask);
            } else {
              // When data is grouped by status, add to the correct status column
              const status = optimisticTask.status;
              if (!draft.data[status]) {
                draft.data[status] = [];
              }
              draft.data[status].unshift(optimisticTask);
            }
            draft.count = (draft.count || 0) + 1;
          })
        );

        try {
          const { data: createdTask } = await queryFulfilled;

          // Replace with actual data
          dispatch(
            projectsApi.util.updateQueryData("getTasks", projectId, (draft) => {
              if (Array.isArray(draft.data)) {
                const index = draft.data.findIndex((t) => t.id === tempId);
                if (index !== -1) {
                  draft.data[index] = createdTask;
                }
              } else {
                // For grouped data structure
                const status = createdTask.status;
                if (draft.data[status]) {
                  const index = draft.data[status].findIndex(
                    (t) => t.id === tempId
                  );
                  if (index !== -1) {
                    draft.data[status][index] = createdTask;
                  }
                }
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
        task: TaskUpdateInput;
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
        // For status changes (column moves), handle optimistic updates for kanban view
        const isStatusChange = "status" in task;
        // Track if we need to handle position index explicitly
        const hasPositionInfo =
          isStatusChange &&
          "positionIndex" in task &&
          task.positionIndex !== undefined;

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
                if (!Array.isArray(query.data?.data)) {
                  return dispatch(
                    projectsApi.util.updateQueryData(
                      "getTasks",
                      query.originalArgs,
                      (draft: TasksResponse) => {
                        if (!Array.isArray(draft.data)) {
                          // Find the current task in its original status column
                          let currentTask: Task | undefined;
                          let originalStatus: string | undefined;

                          // Find task and its current status
                          for (const [status, tasks] of Object.entries(
                            draft.data
                          )) {
                            const taskIndex = tasks.findIndex(
                              (t: Task) => t.id === taskId
                            );
                            if (taskIndex !== -1) {
                              const typedStatus =
                                status as keyof typeof draft.data;
                              draft.data[typedStatus].splice(taskIndex, 1);
                              break;
                            }
                          }

                          // If we found the task and it's moving to a new status
                          if (currentTask && task.status) {
                            // Update the task with new data
                            const updatedTask = {
                              ...currentTask,
                              ...task,
                            };

                            // Add to the new status column
                            if (!draft.data[task.status]) {
                              draft.data[task.status] = [];
                            }

                            // Place the task at the specific position index if provided
                            // Otherwise place at the beginning
                            if (
                              hasPositionInfo &&
                              typeof task.positionIndex === "number"
                            ) {
                              const posIndex = Math.min(
                                Math.max(0, task.positionIndex),
                                draft.data[task.status].length
                              );
                              draft.data[task.status].splice(
                                posIndex,
                                0,
                                updatedTask
                              );
                            } else {
                              draft.data[task.status].unshift(updatedTask);
                            }
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
            if (Array.isArray(draft.data)) {
              const index = draft.data.findIndex((t: Task) => t.id === taskId);
              if (index !== -1) {
                draft.data[index] = {
                  ...draft.data[index],
                  ...task,
                };
              }
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
            if (Array.isArray(draft.data)) {
              const index = draft.data.findIndex((t: Task) => t.id === taskId);
              if (index !== -1) {
                draft.data.splice(index, 1);
                draft.count = Math.max(0, (draft.count || 0) - 1);
              }
            } else {
              // Handle grouped data structure
              for (const status of Object.keys(draft.data)) {
                const typedStatus = status as keyof typeof draft.data;
                const tasks = draft.data[typedStatus];
                const index = tasks.findIndex((t: Task) => t.id === taskId);
                if (index !== -1) {
                  draft.data[typedStatus].splice(index, 1);
                  draft.count = Math.max(0, (draft.count || 0) - 1);
                  break;
                }
              }
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
        reorderInput: TaskReorderInput;
      }
    >({
      query: ({ projectId, reorderInput }) => ({
        url: `/projects/${projectId}/tasks/reorder`,
        method: "POST",
        body: reorderInput,
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: "Projects", id: `tasks-${projectId}` },
      ],
      onQueryStarted: async (
        { projectId, reorderInput },
        { dispatch, queryFulfilled, getState }
      ) => {
        const { status, taskIds } = reorderInput;

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
            if (!Array.isArray(query.data?.data) && query.data?.data[status]) {
              return dispatch(
                projectsApi.util.updateQueryData(
                  "getTasks",
                  query.originalArgs,
                  (draft: TasksResponse) => {
                    if (!Array.isArray(draft.data) && draft.data[status]) {
                      const currentTasks = [...draft.data[status]];
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

                      draft.data[status] = [
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

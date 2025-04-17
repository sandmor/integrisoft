import { api } from "./api";

// Serialized interfaces for Redux store
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

        const patchResult = dispatch(
          projectsApi.util.updateQueryData("getProjects", {}, (draft) => {
            draft.data.unshift(optimisticProject);
            draft.totalCount = (draft.totalCount || 0) + 1;
          })
        );

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

        const detailPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getProjectById",
            updatedProject.id,
            (draft) => {
              Object.assign(draft, { ...draft, ...serializedProject });
            }
          )
        );

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

        Object.values(projectsQueries).forEach((query: any) => {
          if (query?.data?.data && Array.isArray(query.data.data)) {
            const project = query.data.data.find((p: any) => p.id === id);
            if (project && project.clientId) clientId = project.clientId;
          } else if (query?.data?.id === id && query?.data?.clientId) {
            clientId = query.data.clientId;
          }
        });

        const listPatch = dispatch(
          projectsApi.util.updateQueryData("getProjects", {}, (draft) => {
            const index = draft.data.findIndex((project) => project.id === id);
            if (index !== -1) {
              draft.data.splice(index, 1);
              draft.totalCount = (draft.totalCount || 0) - 1;
            }
          })
        );

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

        const teamMembersPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getTeamMembers",
            projectId,
            (draft) => {
              draft.push(serializedTeamMember);
            }
          )
        );

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

        const teamMembersPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getTeamMembers",
            projectId,
            (draft) => {
              const index = draft.findIndex(
                (member) => member.id === teamMemberId
              );
              if (index !== -1) {
                const updatedMember = {
                  ...draft[index],
                  ...teamMember,
                  startDate: serializedTeamMember.startDate as unknown as Date,
                  endDate: serializedTeamMember.endDate as unknown as Date,
                };
                draft[index] = updatedMember;
              }
            }
          )
        );

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
                  const updatedMember = {
                    ...draft.teamMembers[index],
                    ...teamMember,
                    startDate:
                      serializedTeamMember.startDate as unknown as Date,
                    endDate: serializedTeamMember.endDate as unknown as Date,
                  };
                  draft.teamMembers[index] = updatedMember;
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

        const optimisticMilestone = {
          ...milestone,
          id: tempId,
          dueDate: milestone.dueDate?.toJSON() || null,
          completedDate: milestone.completedDate?.toJSON() || null,
        } as unknown as Milestone;

        const milestonesPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getMilestones",
            projectId,
            (draft) => {
              draft.push(optimisticMilestone);
            }
          )
        );

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
          name: "",
          description: null,
          isCompleted: false,
          ...milestone,
        };

        const milestonesPatch = dispatch(
          projectsApi.util.updateQueryData(
            "getMilestones",
            projectId,
            (draft) => {
              const index = draft.findIndex((item) => item.id === milestoneId);
              if (index !== -1) {
                const updatedMilestone = {
                  ...draft[index],
                  ...milestone,
                  dueDate: serializedMilestone.dueDate as unknown as Date,
                  completedDate:
                    serializedMilestone.completedDate as unknown as Date,
                };
                draft[index] = updatedMilestone;
              }
            }
          )
        );

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
                  const updatedMilestone = {
                    ...draft.milestones[index],
                    ...milestone,
                    dueDate: serializedMilestone.dueDate as unknown as Date,
                    completedDate:
                      serializedMilestone.completedDate as unknown as Date,
                  };
                  draft.milestones[index] = updatedMilestone;
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
} = projectsApi;

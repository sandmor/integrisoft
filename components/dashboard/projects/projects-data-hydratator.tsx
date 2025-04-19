"use client";

import { useAppDispatch } from "@/lib/hooks";
import {
  Milestone,
  projectsApi,
  TasksResponse,
  TeamMember,
} from "@/lib/redux/projectsApi";
import { useEffect } from "react";

type ProjectsDataHydratatorProps = {
  projectId: string;
  tasks: TasksResponse;
  milestones: Milestone[];
  teamMembers: TeamMember[];
};

export function ProjectsDataHydratator({
  projectId,
  tasks,
  milestones,
  teamMembers,
}: ProjectsDataHydratatorProps) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(
      projectsApi.util.upsertQueryData(
        "getTasks",
        { projectId, orderByStatus: true },
        tasks
      )
    );
  }, [dispatch, projectId, tasks]);
  useEffect(() => {
    dispatch(
      projectsApi.util.upsertQueryData("getMilestones", projectId, milestones)
    );
  }, [dispatch, projectId, milestones]);
  useEffect(() => {
    dispatch(
      projectsApi.util.upsertQueryData("getTeamMembers", projectId, teamMembers)
    );
  }, [dispatch, projectId, teamMembers]);

  return <></>;
}

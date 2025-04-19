"use client";

import { useAppDispatch } from "@/lib/hooks";
import { Milestone, projectsApi, TasksResponse } from "@/lib/redux/projectsApi";
import { useEffect } from "react";

type ProjectsDataHydratatorProps = {
  projectId: string;
  tasks: TasksResponse;
  milestones: Milestone[];
};

export function ProjectsDataHydratator({
  projectId,
  tasks,
  milestones,
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
  }, [dispatch, tasks]);
  useEffect(() => {
    dispatch(
      projectsApi.util.upsertQueryData("getMilestones", projectId, milestones)
    );
  }, [dispatch, milestones]);

  return <></>;
}

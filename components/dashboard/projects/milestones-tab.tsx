"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MilestoneTimeline } from "@/components/dashboard/projects/milestone-timeline";
import { Milestone, useGetMilestonesQuery } from "@/lib/redux/projectsApi";
import { Spinner } from "@/components/ui/spinner";

type MilestonesTabProps = {
  projectId: string;
};

export function MilestonesTab({ projectId }: MilestonesTabProps) {
  const {
    data: milestones,
    isLoading,
    isError,
  } = useGetMilestonesQuery(projectId);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Project Milestones</h2>
        <Link href={`/dashboard/projects/${projectId}/milestones/new`}>
          <Button>
            <ClipboardList className="mr-2 h-4 w-4" />
            Add Milestone
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="text-center py-8 text-red-600">
          Error loading milestones. Please try again.
        </div>
      ) : (
        <MilestoneTimeline milestones={milestones!} projectId={projectId} />
      )}
    </>
  );
}

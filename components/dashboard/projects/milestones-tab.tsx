"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MilestoneTimeline } from "@/components/dashboard/projects/milestone-timeline";

type Milestone = {
  id: string;
  name: string;
  description: string | null;
  dueDate: Date | null;
  completedDate: Date | null;
  isCompleted: boolean;
};

type MilestonesTabProps = {
  projectId: string;
  initialMilestones: Milestone[];
};

export function MilestonesTab({
  projectId,
  initialMilestones,
}: MilestonesTabProps) {
  const router = useRouter();
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [isLoading, setIsLoading] = useState(false);

  // Reload milestones when the component mounts or when the projectId changes
  useEffect(() => {
    const fetchMilestones = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/projects/${projectId}/milestones`);
        if (response.ok) {
          const data = await response.json();
          setMilestones(data);
        }
      } catch (error) {
        console.error("Error fetching milestones:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMilestones();
  }, [projectId]);

  const handleMilestoneDelete = (milestoneId: string) => {
    // Filter out the deleted milestone from the state
    setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));

    // Refresh the page data
    router.refresh();
  };

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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <MilestoneTimeline
          milestones={milestones}
          projectId={projectId}
          onMilestoneDelete={handleMilestoneDelete}
        />
      )}
    </>
  );
}

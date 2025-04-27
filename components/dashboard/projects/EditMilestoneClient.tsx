"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MilestoneForm } from "@/components/dashboard/projects/milestone-form";
import { parseISO } from "date-fns";

export default function EditMilestoneClient() {
  const params = useParams<{ id: string; milestoneId: string }>();
  const { id: projectId, milestoneId } = params;
  const router = useRouter();
  const [milestone, setMilestone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMilestone() {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/milestones/${milestoneId}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch milestone");
        }

        const data = await response.json();

        // Format the dates properly
        const formattedData = {
          ...data,
          dueDate: data.dueDate ? parseISO(data.dueDate) : null,
          completedDate: data.completedDate
            ? parseISO(data.completedDate)
            : null,
        };

        setMilestone(formattedData);
      } catch (err) {
        console.error("Error fetching milestone:", err);
        setError("Failed to load milestone. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchMilestone();
  }, [projectId, milestoneId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
        </div>
        <div className="text-center py-10">
          <p className="text-red-600">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/projects/${projectId}`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Edit Milestone</h1>
            <p className="text-sm text-muted-foreground">
              Update milestone details
            </p>
          </div>
        </div>
      </div>

      {milestone && (
        <MilestoneForm
          projectId={projectId}
          milestoneId={milestoneId}
          defaultValues={milestone}
        />
      )}
    </div>
  );
}

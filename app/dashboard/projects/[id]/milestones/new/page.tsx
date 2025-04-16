"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MilestoneForm } from "@/components/dashboard/projects/milestone-form";

export default function NewMilestonePage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

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
            <h1 className="text-xl font-semibold">Add Milestone</h1>
            <p className="text-sm text-muted-foreground">
              Create a new milestone for this project
            </p>
          </div>
        </div>
      </div>

      <MilestoneForm projectId={projectId} />
    </div>
  );
}

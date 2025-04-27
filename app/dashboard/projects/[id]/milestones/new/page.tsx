import { Metadata } from "next";
import NewMilestoneClient from "@/components/dashboard/projects/NewMilestoneClient";

export const metadata: Metadata = {
  title: "Add New Milestone | Projects | Integrisoft",
  description: "Add a new milestone to a project.",
};

export default function NewMilestonePage() {
  return <NewMilestoneClient />;
}

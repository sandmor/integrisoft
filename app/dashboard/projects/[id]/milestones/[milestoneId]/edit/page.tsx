import { Metadata } from "next";
import EditMilestoneClient from "@/components/dashboard/projects/EditMilestoneClient";

export const metadata: Metadata = {
  title: "Edit Milestone | Projects | Integrisoft",
  description: "Edit an existing project milestone.",
};

export default function EditMilestonePage() {
  return <EditMilestoneClient />;
}

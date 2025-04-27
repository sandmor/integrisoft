import { Metadata } from "next";
import ProjectsClient from "@/components/dashboard/projects/ProjectsClient";

export const metadata: Metadata = {
  title: "Projects | Integrisoft",
  description: "Track projects, milestones, and tasks",
};

export default function ProjectsPage() {
  return <ProjectsClient />;
}

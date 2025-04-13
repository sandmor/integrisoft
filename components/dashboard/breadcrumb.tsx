import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { dashboardModules } from "@/lib/dashboard-config";
import React from "react";
import { db } from "@/lib/db";
import { employees, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// Helper function to get entity names by ID
async function getEntityNameById(
  type: string,
  id: string
): Promise<string | null> {
  try {
    if (type === "employees") {
      // Get the employee and join with users to get name
      const result = await db.query.employees.findFirst({
        where: (employees, { eq, and }) =>
          and(eq(employees.id, id), eq(employees.isDeleted, false)),
        with: {
          users: true,
        },
      });

      if (result?.users) {
        return `${result.users.name} ${result.users.lastName}`;
      }
    }
    // Add other entity types as needed (clients, projects, etc.)
    return null;
  } catch (error) {
    console.error(`Error fetching ${type} name:`, error);
    return null;
  }
}

export async function DashboardBreadcrumb({ pathname }: { pathname: string }) {
  // Skip for the main dashboard page
  if (pathname === "/dashboard") {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);

  // Build breadcrumb items based on current path
  const breadcrumbItemsPromises = segments.map(async (segment, index) => {
    // Build the current path up to this segment
    const path = `/${segments.slice(0, index + 1).join("/")}`;

    // Try to find the module name for this segment
    let displayName = segment.charAt(0).toUpperCase() + segment.slice(1);

    // Handle dashboard module segments
    if (segment === "dashboard" && index === 0) {
      displayName = "Dashboard";
    }
    // Handle known modules
    else if (dashboardModules[segment]) {
      displayName = dashboardModules[segment].label;
    }
    // Handle special segments
    else if (segment === "new") {
      displayName = "New";

      // Get context from previous segment
      const prevSegment = segments[index - 1];
      if (prevSegment && dashboardModules[prevSegment]) {
        // Convert plural to singular for title (e.g., employees → employee)
        const singularTitle = prevSegment.endsWith("s")
          ? prevSegment.slice(0, -1)
          : prevSegment;

        displayName = `New ${
          singularTitle.charAt(0).toUpperCase() + singularTitle.slice(1)
        }`;
      }
    } else if (segment === "edit") {
      displayName = "Edit";
    }
    // Handle UUIDs or IDs (most likely detail pages)
    else if (segment.match(/^[A-Za-z0-9]{20,}$/)) {
      // Try to get the entity name for this ID
      const entityType = segments[index - 1]; // The previous segment should be the entity type (e.g., employees)

      if (entityType) {
        const entityName = await getEntityNameById(entityType, segment);
        if (entityName) {
          displayName = entityName;
        } else {
          displayName = "Details";
        }
      } else {
        displayName = "Details";
      }
    }

    return {
      name: displayName,
      href: path,
      isActive: index === segments.length - 1,
    };
  });

  const breadcrumbItems = await Promise.all(breadcrumbItemsPromises);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbItems.slice(1).map((segment, index) => (
          <React.Fragment key={segment.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {segment.isActive ? (
                <BreadcrumbPage>{segment.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={segment.href}>{segment.name}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

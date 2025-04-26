"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { toast } from "sonner";
import { getEntityNameById } from "@/lib/actions/dashboard";

// Type for entity information
type EntityInfo = {
  id: string;
  name: string;
};

// Type for breadcrumb items
type BreadcrumbItemType = {
  name: string;
  href: string;
  isActive: boolean;
  isLoading: boolean;
};

interface DashboardBreadcrumbProps {
  initialEntityNameMap: Record<string, string>;
}

/**
 * Shared breadcrumb building logic that can be used both for initial server rendering
 * and client-side updates.
 */
function buildBreadcrumbItems(
  pathname: string,
  entityInfoMap: Record<string, string>
): {
  items: BreadcrumbItemType[];
  entitySegmentsToFetch: Array<{
    index: number;
    segment: string;
    type: string;
  }>;
} {
  // Default values
  const entitySegmentsToFetch: Array<{
    index: number;
    segment: string;
    type: string;
  }> = [];

  // Skip for the main dashboard page
  if (pathname === "/dashboard") {
    return { items: [], entitySegmentsToFetch: [] };
  }

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbItems: BreadcrumbItemType[] = [];

  // Process each segment
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    // Build the current path up to this segment
    const path = `/${segments.slice(0, index + 1).join("/")}`;

    // Default values
    let displayName = segment.charAt(0).toUpperCase() + segment.slice(1);
    let isLoading = false;

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
      const savedName = entityInfoMap[segment];
      if (savedName) {
        displayName = savedName;
      } else {
        isLoading = true;
        displayName = "Loading...";
        const entityType = segments[index - 1] || "";
        entitySegmentsToFetch.push({ index, segment, type: entityType });
      }
    }

    breadcrumbItems.push({
      name: displayName,
      href: path,
      isActive: index === segments.length - 1,
      isLoading,
    });
  }

  return { items: breadcrumbItems, entitySegmentsToFetch };
}

export function DashboardBreadcrumb({
  initialEntityNameMap,
}: DashboardBreadcrumbProps) {
  const pathname = usePathname() || "/dashboard";
  const [breadcrumbItems, setBreadcrumbItems] = useState<BreadcrumbItemType[]>(
    () => {
      const { items } = buildBreadcrumbItems(pathname, initialEntityNameMap);
      return items;
    }
  );
  const [entityNameMap, setEntityNameMap] =
    useState<Record<string, string>>(initialEntityNameMap);

  useEffect(() => {
    const { items, entitySegmentsToFetch } = buildBreadcrumbItems(
      pathname,
      entityNameMap
    );
    setBreadcrumbItems(items);

    entitySegmentsToFetch.forEach(({ segment, type, index }) => {
      getEntityNameById(type, segment)
        .then((result) => {
          if (result?.name) {
            setEntityNameMap((prev) => ({ ...prev, [segment]: result.name }));
            setBreadcrumbItems((prev) => {
              const newItems = [...prev];
              const path = `/${pathname
                .split("/")
                .filter(Boolean)
                .slice(0, index + 1)
                .join("/")}`;
              const itemIndex = newItems.findIndex(
                (item) => item.href === path && item.isLoading
              );
              if (itemIndex !== -1) {
                newItems[itemIndex] = {
                  ...newItems[itemIndex],
                  name: result.name,
                  isLoading: false,
                };
              }
              return newItems;
            });
          } else {
            throw new Error("No name returned");
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error(`Failed to load ${type} name`);
          setBreadcrumbItems((prev) => {
            const newItems = [...prev];
            const path = `/${pathname
              .split("/")
              .filter(Boolean)
              .slice(0, index + 1)
              .join("/")}`;
            const itemIndex = newItems.findIndex(
              (item) => item.href === path && item.isLoading
            );
            if (itemIndex !== -1) {
              newItems[itemIndex] = {
                ...newItems[itemIndex],
                name: "Details",
                isLoading: false,
              };
            }
            return newItems;
          });
        });
    });
  }, [pathname]);

  // Skip rendering for the main dashboard page
  if (pathname === "/dashboard" || breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <div>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {breadcrumbItems.slice(1).map((segment) => (
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
    </div>
  );
}

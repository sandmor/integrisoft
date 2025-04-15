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
  entityTitle?: EntityInfo;
}

/**
 * Shared breadcrumb building logic that can be used both for initial server rendering
 * and client-side updates.
 */
function buildBreadcrumbItems(
  pathname: string,
  entityInfo: EntityInfo | null
): {
  items: BreadcrumbItemType[];
  entitySegmentToFetch: { index: number; segment: string; type: string } | null;
} {
  // Default values
  let shouldHide = false;
  let entitySegmentToFetch = null;

  // Skip for the main dashboard page
  if (pathname === "/dashboard") {
    return { items: [], entitySegmentToFetch: null };
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
      // Check if we already have entity info for this ID
      if (entityInfo && entityInfo.id === segment) {
        displayName = entityInfo.name;
      } else {
        // For client-side rendering, we'll fetch the entity name
        isLoading = true;
        shouldHide = true;
        displayName = "Loading...";

        // Get the entity type from the previous segment
        const entityType = segments[index - 1];
        if (entityType) {
          // Store info to fetch later in useEffect
          entitySegmentToFetch = {
            index,
            segment,
            type: entityType,
          };
        } else {
          displayName = "Details";
          isLoading = false;
        }
      }
    }

    breadcrumbItems.push({
      name: displayName,
      href: path,
      isActive: index === segments.length - 1,
      isLoading,
    });
  }

  return {
    items: breadcrumbItems,
    entitySegmentToFetch,
  };
}

export function DashboardBreadcrumb({ entityTitle }: DashboardBreadcrumbProps) {
  // Use client-side pathname for navigation tracking
  const clientPathname = usePathname();
  // Use provided pathname or client pathname
  const pathname = clientPathname || "/dashboard";

  // Initialize breadcrumb items with server-provided information
  const initialBreadcrumbData = buildBreadcrumbItems(
    pathname,
    entityTitle || null
  );

  // State to track breadcrumb items
  const [breadcrumbItems, setBreadcrumbItems] = useState<BreadcrumbItemType[]>(
    initialBreadcrumbData.items
  );

  // State to track last entity information to avoid duplicate fetches
  const [lastEntityInfo, setLastEntityInfo] = useState<EntityInfo | null>(
    entityTitle || null
  );

  // Build breadcrumb items when pathname or entity info changes
  useEffect(() => {
    const { items, entitySegmentToFetch } = buildBreadcrumbItems(
      pathname,
      lastEntityInfo
    );

    // If we need to fetch an entity name
    if (entitySegmentToFetch) {
      const { segment, type, index } = entitySegmentToFetch;

      // Set items immediately, even with loading state
      setBreadcrumbItems(items);

      // Fetch entity name
      getEntityNameById(type, segment).then((result) => {
        if (result) {
          // Update the breadcrumb item with the fetched name
          setBreadcrumbItems((prevItems) => {
            const newItems = [...prevItems];
            // Find the loading item
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

            // Save this entity info for future navigation
            setLastEntityInfo({
              id: segment,
              name: result.name,
            });

            return newItems;
          });
        } else {
          // If we can't get a name, use a default
          setBreadcrumbItems((prevItems) => {
            const newItems = [...prevItems];
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
        }
      });
    } else {
      // No entity to fetch, just update items
      setBreadcrumbItems(items);
    }
  }, [pathname, lastEntityInfo]);

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

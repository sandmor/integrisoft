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

interface DashboardBreadcrumbProps {
  initialPathname?: string;
  entityTitle?: EntityInfo;
}

export function DashboardBreadcrumb({
  initialPathname,
  entityTitle,
}: DashboardBreadcrumbProps) {
  // Use client-side pathname for navigation tracking
  const clientPathname = usePathname();
  // Use provided pathname or client pathname
  const pathname = initialPathname || clientPathname || "/dashboard";

  // State to track breadcrumb items
  const [breadcrumbItems, setBreadcrumbItems] = useState<
    Array<{
      name: string;
      href: string;
      isActive: boolean;
      isLoading: boolean;
    }>
  >([]);

  // State to track last entity information to avoid duplicate fetches
  const [lastEntityInfo, setLastEntityInfo] = useState<EntityInfo | null>(
    entityTitle || null
  );

  // State for visibility while loading
  const [isVisible, setIsVisible] = useState<boolean>(
    !entityTitle || pathname === "/dashboard"
  );

  // Build breadcrumb items when pathname changes
  useEffect(() => {
    async function buildBreadcrumbs() {
      // Skip for the main dashboard page
      if (pathname === "/dashboard") {
        setBreadcrumbItems([]);
        return;
      }

      const segments = pathname.split("/").filter(Boolean);
      const newBreadcrumbItems: Array<{
        name: string;
        href: string;
        isActive: boolean;
        isLoading: boolean;
      }> = [];

      // Flag to determine if breadcrumb should be hidden initially
      let shouldHide = false;

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
          if (entityTitle && entityTitle.id === segment) {
            displayName = entityTitle.name;
            setLastEntityInfo(entityTitle);
          } else if (lastEntityInfo && lastEntityInfo.id === segment) {
            displayName = lastEntityInfo.name;
          } else {
            isLoading = true;
            shouldHide = true;
            displayName = "Loading...";

            // Get the entity type from the previous segment
            const entityType = segments[index - 1];
            if (entityType) {
              // Fetch in the background
              getEntityNameById(entityType, segment).then((name) => {
                if (name) {
                  // Update the breadcrumb item with the fetched name
                  setBreadcrumbItems((prevItems) => {
                    const newItems = [...prevItems];
                    const itemIndex = newItems.findIndex(
                      (item) => item.href === path && item.isLoading
                    );
                    if (itemIndex !== -1) {
                      newItems[itemIndex] = {
                        ...newItems[itemIndex],
                        name: name.name,
                        isLoading: false,
                      };

                      // Save this entity info for future navigation
                      setLastEntityInfo({
                        id: segment,
                        name: name.name,
                      });

                      // Check if we can make the breadcrumb visible again
                      const stillLoading = newItems.some(
                        (item) => item.isLoading
                      );
                      if (!stillLoading) {
                        setIsVisible(true);
                      }
                    }
                    return newItems;
                  });
                } else {
                  // If we can't get a name, use a default
                  setBreadcrumbItems((prevItems) => {
                    const newItems = [...prevItems];
                    const itemIndex = newItems.findIndex(
                      (item) => item.href === path && item.isLoading
                    );
                    if (itemIndex !== -1) {
                      newItems[itemIndex] = {
                        ...newItems[itemIndex],
                        name: "Details",
                        isLoading: false,
                      };

                      // Check if we can make the breadcrumb visible again
                      const stillLoading = newItems.some(
                        (item) => item.isLoading
                      );
                      if (!stillLoading) {
                        setIsVisible(true);
                      }
                    }
                    return newItems;
                  });
                }
              });
            } else {
              displayName = "Details";
              isLoading = false;
            }
          }
        }

        newBreadcrumbItems.push({
          name: displayName,
          href: path,
          isActive: index === segments.length - 1,
          isLoading,
        });
      }

      // Update the breadcrumb items
      setBreadcrumbItems(newBreadcrumbItems);

      // Hide breadcrumb while loading entity names
      setIsVisible(!shouldHide);
    }

    buildBreadcrumbs();
  }, [pathname, entityTitle, lastEntityInfo]);

  // Skip rendering for the main dashboard page
  if (pathname === "/dashboard" || breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <div
      className={`transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
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

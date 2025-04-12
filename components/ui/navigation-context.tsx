"use client";

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface NavigationContextType {
  isNavigating: boolean;
  startNavigation: (url?: string) => void;
  completeNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

export function NavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationTimeout, setNavigationTimeout] =
    useState<NodeJS.Timeout | null>(null);

  // Force navigation to complete after a maximum time
  const MAX_NAVIGATION_TIME = 5000;

  const startNavigation = useCallback(
    (url?: string) => {
      setIsNavigating(true);

      // Safety timeout to ensure navigation always completes
      if (navigationTimeout) {
        clearTimeout(navigationTimeout);
      }

      const timeout = setTimeout(() => {
        setIsNavigating(false);
      }, MAX_NAVIGATION_TIME);

      setNavigationTimeout(timeout);
    },
    [navigationTimeout]
  );

  const completeNavigation = useCallback(() => {
    setIsNavigating(false);

    if (navigationTimeout) {
      clearTimeout(navigationTimeout);
      setNavigationTimeout(null);
    }
  }, [navigationTimeout]);

  // When pathname or search params change, complete any navigation
  useEffect(() => {
    completeNavigation();
  }, [pathname, searchParams, completeNavigation]);

  // Listen for link clicks
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a");

      if (
        link &&
        link.href &&
        !link.target &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        const url = link.href;
        const currentUrl = window.location.href;

        // Only track clicks to different URLs
        if (url !== currentUrl) {
          startNavigation(url);
        }
      }
    };

    document.addEventListener("click", handleLinkClick);

    return () => {
      document.removeEventListener("click", handleLinkClick);
    };
  }, [startNavigation]);

  return (
    <NavigationContext.Provider
      value={{
        isNavigating,
        startNavigation,
        completeNavigation,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);

  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }

  return context;
}

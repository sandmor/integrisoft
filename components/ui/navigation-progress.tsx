"use client";

import { useEffect, useState } from "react";
import { Progress } from "./progress";
import { useNavigation } from "./navigation-context";

export function NavigationProgress() {
  const { isNavigating } = useNavigation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    let completeTimeout: NodeJS.Timeout;

    if (isNavigating) {
      // Start a new progress sequence
      setVisible(true);
      setProgress(0);

      // Simulate progress during navigation
      setIntervalId(
        setInterval(() => {
          setProgress((prev) => {
            // Increment progressively slower as we approach 90%
            if (prev >= 90) return 90;
            if (prev >= 70) return prev + 2;
            if (prev >= 50) return prev + 5;
            return prev + 10;
          });
        }, 100)
      );
    } else if (visible) {
      // Complete the progress when navigation is done
      setProgress(100);
      if (intervalId) {
        clearInterval(intervalId);
      }

      // Hide the progress bar after animation completes
      completeTimeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(completeTimeout);
    };
  }, [isNavigating, visible]);

  if (!visible && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <Progress value={progress} className="h-1 rounded-none bg-transparent" />
    </div>
  );
}

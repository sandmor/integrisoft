import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  className?: string;
  size?: "small" | "medium" | "large";
}

export function Spinner({ className, size = "medium" }: SpinnerProps) {
  const sizeClasses = {
    small: "h-4 w-4",
    medium: "h-6 w-6",
    large: "h-8 w-8",
  };

  return (
    <Loader2
      className={cn("animate-spin text-primary", sizeClasses[size], className)}
    />
  );
}

export function TableLoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-8">
      <Spinner size="medium" />
      <span className="ml-2 text-sm text-muted-foreground">
        Loading data...
      </span>
    </div>
  );
}

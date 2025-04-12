import { toast } from "sonner";

type ErrorWithMessage = {
  message: string;
  name?: string;
  code?: string;
  status?: number;
};

export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

export function toErrorWithMessage(error: unknown): ErrorWithMessage {
  if (isErrorWithMessage(error)) return error;

  try {
    // Try to convert error to string and create an object
    return { message: String(error) };
  } catch {
    // Fallback for cases where we can't stringify the error
    return { message: "An unknown error occurred" };
  }
}

export function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message;
}

/**
 * Handle errors consistently across the application with proper toast notifications
 */
export function handleError(error: unknown, customMessage?: string): void {
  console.error(error);
  const errorMessage = customMessage || getErrorMessage(error);

  // Display error toast notification
  toast.error(errorMessage, {
    description:
      isErrorWithMessage(error) && error.code
        ? `Error code: ${error.code}`
        : undefined,
    duration: 4000,
  });
}

/**
 * Try/catch wrapper with automatic error handling
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  options?: {
    customErrorMessage?: string;
    successMessage?: string;
    onError?: (error: unknown) => void;
    onSuccess?: (result: T) => void;
  }
): Promise<T | null> {
  try {
    const result = await fn();

    if (options?.successMessage) {
      toast.success(options.successMessage);
    }

    options?.onSuccess?.(result);
    return result;
  } catch (error) {
    handleError(error, options?.customErrorMessage);
    options?.onError?.(error);
    return null;
  }
}

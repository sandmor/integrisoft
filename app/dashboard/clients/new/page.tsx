import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ClientForm } from "@/components/dashboard/clients/client-form";
import { tryCatch } from "@/lib/error-handler";
import { getAccountManagers } from "@/lib/actions/clients";

async function NewClientFormContainer() {
  const accountManagers =
    (await tryCatch(() => getAccountManagers(), {
      customErrorMessage: "Failed to load account managers",
    })) || [];

  return <ClientForm accountManagers={accountManagers} />;
}

export default function NewClientPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Suspense
        fallback={
          <div className="w-full flex justify-center items-center py-12">
            <Spinner size="large" />
            <span className="ml-3 text-lg">Loading form...</span>
          </div>
        }
      >
        <NewClientFormContainer />
      </Suspense>
    </div>
  );
}

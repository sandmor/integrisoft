import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { ClientForm } from "@/components/dashboard/clients/client-form";
import { tryCatch } from "@/lib/error-handler";
import { getClientById, getAccountManagers } from "@/lib/actions/clients";

interface EditClientPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function EditClientFormContainer({ id }: { id: string }) {
  const [client, accountManagers] = await Promise.all([
    tryCatch(() => getClientById(id), {
      customErrorMessage: "Failed to load client details",
    }),
    tryCatch(() => getAccountManagers(), {
      customErrorMessage: "Failed to load account managers",
    }) || [],
  ]);

  if (!client) {
    notFound();
  }

  return <ClientForm client={client} accountManagers={accountManagers!} />;
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { id } = await params;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Suspense
        fallback={
          <div className="w-full flex justify-center items-center py-12">
            <Spinner size="large" />
            <span className="ml-3 text-lg">Loading client data...</span>
          </div>
        }
      >
        <EditClientFormContainer id={id} />
      </Suspense>
    </div>
  );
}

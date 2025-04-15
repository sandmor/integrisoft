import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, Globe, Mail, MapPin, Phone, Plus, Users } from "lucide-react";
import { tryCatch } from "@/lib/error-handler";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientContactsTab } from "@/components/dashboard/clients/client-contacts-tab";
import { ClientInteractionsTab } from "@/components/dashboard/clients/client-interactions-tab";
import { ClientProjectsTab } from "@/components/dashboard/clients/client-projects-tab";
import { getClientById } from "@/lib/actions/clients";

interface ClientDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function ClientDetailContainer({ id }: { id: string }) {
  const client = await tryCatch(() => getClientById(id), {
    customErrorMessage: "Failed to load client details",
  });

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          {client.industry && (
            <p className="text-muted-foreground">{client.industry}</p>
          )}
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/clients/${id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Client
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.website && (
              <div className="flex items-center">
                <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                <a
                  href={
                    client.website.startsWith("http")
                      ? client.website
                      : `https://${client.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {client.website}
                </a>
              </div>
            )}

            {client.address && (
              <div className="flex items-start">
                <MapPin className="mr-2 h-4 w-4 text-muted-foreground mt-1" />
                <span>{client.address}</span>
              </div>
            )}

            {client.accountManager && (
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>
                  Account Manager:{" "}
                  <Link
                    href={`/dashboard/employees/${client.accountManager.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {client.accountManager.name}
                  </Link>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="col-span-1 md:col-span-2">
          <Tabs defaultValue="contacts">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="interactions">Interactions</TabsTrigger>
            </TabsList>

            <TabsContent value="contacts" className="mt-4">
              <ClientContactsTab clientId={id} contacts={client.contacts} />
            </TabsContent>

            <TabsContent value="projects" className="mt-4">
              <ClientProjectsTab clientId={id} projects={client.projects} />
            </TabsContent>

            <TabsContent value="interactions" className="mt-4">
              <ClientInteractionsTab
                clientId={id}
                interactions={client.interactions}
                contacts={client.contacts}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default async function ClientDetailPage({
  params,
}: ClientDetailPageProps) {
  const { id } = await params;

  return (
    <div className="p-6">
      <Suspense
        fallback={
          <div className="w-full flex justify-center items-center py-12">
            <Spinner size="large" />
            <span className="ml-3 text-lg">Loading client details...</span>
          </div>
        }
      >
        <ClientDetailContainer id={id} />
      </Suspense>
    </div>
  );
}

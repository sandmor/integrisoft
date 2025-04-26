import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProductById, getProductEmployees } from "@/lib/actions/products";
import { getVersionsByProductId } from "@/lib/actions/productVersions";
import { tryCatch } from "@/lib/error-handler";
import { ProductForm } from "@/components/dashboard/products/product-form";
import { VersionForm } from "@/components/dashboard/products/version-form";
import { DataTable } from "@/components/ui/data-table";
import { versionColumns } from "@/components/dashboard/products/version-columns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Box, GitBranchPlus, List } from "lucide-react";

interface ProductDetailPageProps {
  params: { id: string };
}

async function ProductDetails({ productId }: { productId: string }) {
  const product = await tryCatch(() => getProductById(productId), {
    customErrorMessage: "Failed to load product details",
  });

  if (!product) {
    notFound();
  }

  const employees =
    (await tryCatch(() => getProductEmployees(), {
      customErrorMessage: "Failed to load employees",
    })) || [];

  const versions =
    (await tryCatch(() => getVersionsByProductId(productId), {
      customErrorMessage: "Failed to load product versions",
    })) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Box className="mr-2 h-5 w-5" />
            Edit Product Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm product={product} employees={employees} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <GitBranchPlus className="mr-2 h-5 w-5" />
            Add New Version
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VersionForm productId={productId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <List className="mr-2 h-5 w-5" />
            Existing Versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length > 0 ? (
            <DataTable columns={versionColumns} data={versions} />
          ) : (
            <p className="text-muted-foreground text-sm">
              No versions found for this product yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Suspense
        fallback={
          <div className="flex justify-center items-center py-12">
            <Spinner size="large" />
            <span className="ml-3 text-lg">Loading product details...</span>
          </div>
        }
      >
        <ProductDetails productId={params.id} />
      </Suspense>
    </div>
  );
}

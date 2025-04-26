import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ProductForm } from "@/components/dashboard/products/product-form";
import { tryCatch } from "@/lib/error-handler";
import { getProductEmployees } from "@/lib/actions/products";

async function NewProductFormContainer() {
  const employees =
    (await tryCatch(() => getProductEmployees(), {
      customErrorMessage: "Failed to load employees",
    })) || [];

  return <ProductForm employees={employees} />;
}

export default function NewProductPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Suspense
        fallback={
          <div className="flex justify-center items-center py-12">
            <Spinner size="large" />
            <span className="ml-3 text-lg">Loading form...</span>
          </div>
        }
      >
        <NewProductFormContainer />
      </Suspense>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { ProductEditor } from "@/components/apex/ProductEditor";

export const Route = createFileRoute("/inventory/$productId")({
  component: EditProduct,
});

function EditProduct() {
  const { productId } = Route.useParams();
  return <ProductEditor productId={productId} />;
}

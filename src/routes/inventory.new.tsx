import { createFileRoute } from "@tanstack/react-router";
import { ProductEditor } from "@/components/apex/ProductEditor";

export const Route = createFileRoute("/inventory/new")({
  component: ProductEditor,
});

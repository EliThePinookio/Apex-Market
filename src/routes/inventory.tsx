import { createFileRoute } from "@tanstack/react-router";
import { InventoryView } from "@/components/apex/InventoryView";

export const Route = createFileRoute("/inventory")({
  validateSearch: (s: Record<string, unknown>): { cat?: string } =>
    typeof s.cat === "string" ? { cat: s.cat } : {},
  component: InventoryView,
});

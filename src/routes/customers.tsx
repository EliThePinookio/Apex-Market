import { createFileRoute } from "@tanstack/react-router";
import { CustomersView } from "@/components/apex/CustomersView";

export const Route = createFileRoute("/customers")({
  validateSearch: (s: Record<string, unknown>): { q?: string } =>
    typeof s.q === "string" ? { q: s.q } : {},
  component: CustomersView,
});

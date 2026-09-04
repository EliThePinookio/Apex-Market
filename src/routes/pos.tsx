import { createFileRoute } from "@tanstack/react-router";
import { POSView } from "@/components/apex/POSView";

export const Route = createFileRoute("/pos")({
  validateSearch: (s: Record<string, unknown>): { sku?: string } =>
    typeof s.sku === "string" ? { sku: s.sku } : {},
  component: POSView,
});

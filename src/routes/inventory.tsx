import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/inventory")({
  validateSearch: (s: Record<string, unknown>): { cat?: string } =>
    typeof s.cat === "string" ? { cat: s.cat } : {},
  component: InventoryLayout,
});

function InventoryLayout() {
  return <Outlet />;
}

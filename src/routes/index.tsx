import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "@/components/apex/DashboardView";

export const Route = createFileRoute("/")({
  component: DashboardView,
});

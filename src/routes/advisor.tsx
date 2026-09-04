import { createFileRoute } from "@tanstack/react-router";
import { AdvisorView } from "@/components/apex/AdvisorView";

export const Route = createFileRoute("/advisor")({
  component: AdvisorView,
});

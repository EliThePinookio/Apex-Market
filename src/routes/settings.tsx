import { createFileRoute } from "@tanstack/react-router";
import { SettingsView } from "@/components/apex/SettingsView";

export const Route = createFileRoute("/settings")({
  component: SettingsView,
});

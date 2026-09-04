import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/beannel/AuthScreen";

export const Route = createFileRoute("/login")({
  component: AuthScreen,
});

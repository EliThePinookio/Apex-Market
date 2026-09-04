import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/beannel/AuthScreen";

type LoginSearch = { as?: "staff" | "customer"; next?: string; mode?: "signin" | "signup" | "forgot" };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    const next: LoginSearch = {};
    if (search.as === "staff" || search.as === "customer") next.as = search.as;
    if (typeof search.next === "string") next.next = search.next;
    if (search.mode === "signin" || search.mode === "signup" || search.mode === "forgot") next.mode = search.mode;
    return next;
  },
  component: AuthScreen,
});

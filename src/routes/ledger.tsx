import { createFileRoute } from "@tanstack/react-router";
import { LedgerView } from "@/components/apex/LedgerView";

export const Route = createFileRoute("/ledger")({
  component: LedgerView,
});

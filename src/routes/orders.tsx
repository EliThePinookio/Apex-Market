import { createFileRoute } from "@tanstack/react-router";
import { OrdersView } from "@/components/apex/OrdersView";

export const Route = createFileRoute("/orders")({
  component: OrdersView,
});

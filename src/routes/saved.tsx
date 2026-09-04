import { createFileRoute } from "@tanstack/react-router";
import { ShopSaved } from "@/components/shop/ShopSaved";

export const Route = createFileRoute("/saved")({
  component: ShopSaved,
});

import { createFileRoute } from "@tanstack/react-router";
import { ShopCheckout } from "@/components/shop/ShopCheckout";

export const Route = createFileRoute("/checkout")({
  component: ShopCheckout,
});

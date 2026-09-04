import { createFileRoute } from "@tanstack/react-router";
import { ShopCart } from "@/components/shop/ShopCart";

export const Route = createFileRoute("/cart")({
  component: ShopCart,
});

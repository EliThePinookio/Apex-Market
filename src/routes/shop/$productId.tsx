import { createFileRoute } from "@tanstack/react-router";
import { ShopProduct } from "@/components/shop/ShopProduct";

export const Route = createFileRoute("/shop/$productId")({
  component: ShopProduct,
});

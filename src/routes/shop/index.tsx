import { createFileRoute } from "@tanstack/react-router";
import { ShopHome } from "@/components/shop/ShopHome";

export const Route = createFileRoute("/shop/")({
  component: ShopHome,
});

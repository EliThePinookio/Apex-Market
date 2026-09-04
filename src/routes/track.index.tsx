import { createFileRoute } from "@tanstack/react-router";
import { ShopOrders } from "@/components/shop/ShopOrders";
import { ShopPageError } from "@/lib/error-component";

export const Route = createFileRoute("/track/")({
  component: ShopOrders,
  errorComponent: ShopPageError,
});

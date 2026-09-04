import { createFileRoute } from "@tanstack/react-router";
import { ShopOrderDetail } from "@/components/shop/ShopOrderDetail";
import { ShopPageError } from "@/lib/error-component";

export const Route = createFileRoute("/account/order/$orderId")({
  component: ShopOrderDetail,
  errorComponent: ShopPageError,
});

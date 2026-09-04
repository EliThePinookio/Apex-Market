import { createFileRoute } from "@tanstack/react-router";
import { ShopAccount } from "@/components/shop/ShopAccount";

export const Route = createFileRoute("/account")({
  component: ShopAccount,
});

import { createFileRoute } from "@tanstack/react-router";
import { ShopAccount } from "@/components/shop/ShopAccount";
import { ShopPageError } from "@/lib/error-component";

export const Route = createFileRoute("/account/")({
  component: ShopAccount,
  errorComponent: ShopPageError,
});

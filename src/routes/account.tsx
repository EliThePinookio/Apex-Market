import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ShopPageError } from "@/lib/error-component";

export const Route = createFileRoute("/account")({
  component: AccountLayout,
  errorComponent: ShopPageError,
});

function AccountLayout() {
  return <Outlet />;
}

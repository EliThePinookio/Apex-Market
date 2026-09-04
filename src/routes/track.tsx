import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ShopPageError } from "@/lib/error-component";

export const Route = createFileRoute("/track")({
  component: TrackLayout,
  errorComponent: ShopPageError,
});

function TrackLayout() {
  return <Outlet />;
}

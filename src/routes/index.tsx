import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "@/components/apex/DashboardView";
import { ShopHome } from "@/components/shop/ShopHome";
import { useBeannelAuth } from "@/lib/beannel/auth";

export const Route = createFileRoute("/")({
  component: HomeGate,
});

function HomeGate() {
  const { user } = useBeannelAuth();
  if (!user) return <ShopHome />;
  return <DashboardView />;
}

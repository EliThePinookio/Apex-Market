import { createFileRoute } from "@tanstack/react-router";
import { ShopHome } from "@/components/shop/ShopHome";

type ShopSearch = { q?: string; cat?: string };

export const Route = createFileRoute("/shop/")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => {
    const next: ShopSearch = {};
    if (typeof search.q === "string" && search.q) next.q = search.q;
    if (typeof search.cat === "string" && search.cat) next.cat = search.cat;
    return next;
  },
  component: ShopHome,
});

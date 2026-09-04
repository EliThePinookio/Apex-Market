import { createFileRoute } from "@tanstack/react-router";
import { ShopHome } from "@/components/shop/ShopHome";

type ShopSearch = { q?: string; cat?: string; sort?: string; stock?: string };

export const Route = createFileRoute("/shop/")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => {
    const next: ShopSearch = {};
    if (typeof search.q === "string" && search.q) next.q = search.q;
    if (typeof search.cat === "string" && search.cat) next.cat = search.cat;
    if (typeof search.sort === "string" && search.sort) next.sort = search.sort;
    if (typeof search.stock === "string" && search.stock) next.stock = search.stock;
    return next;
  },
  component: ShopHome,
});

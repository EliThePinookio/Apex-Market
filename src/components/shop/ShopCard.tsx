import { Link, useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { memo } from "react";
import { toast } from "sonner";
import { money } from "@/lib/apex/money";
import { addToBag } from "@/lib/beannel/cart";
import { slugProduct } from "@/lib/beannel/shop-meta";
import type { ShopGroup } from "@/lib/beannel/shop";
import { toggleSaved } from "@/lib/beannel/wishlist";
import { cn } from "@/lib/cn";

export const ShopCard = memo(function ShopCard({
  group,
  currency,
  saved = false,
}: {
  group: ShopGroup;
  currency: string;
  saved?: boolean;
}) {
  const navigate = useNavigate();
  const v = group.variants.find((x) => x.stock > 0) || group.variants[0];
  const slug = group.slug || slugProduct(group.name, group.category);

  return (
    <article className="mall-card">
      <Link to="/shop/$productId" params={{ productId: slug }} className="mall-photo">
        <img src={group.image} alt="" loading="lazy" decoding="async" />
        {group.stock <= 0 && <span className="shop-sold">Out of stock</span>}
      </Link>
      {v && (
        <button
          type="button"
          className={cn("mall-heart", saved && "is-on")}
          aria-label={saved ? "Remove from saved" : "Save"}
          onClick={() => {
            const on = toggleSaved({
              productId: v.productId,
              listingId: v.listingId,
              slug,
              name: v.name,
              sku: v.sku,
              size: v.size,
              price: v.price,
              image: v.image,
              category: v.category,
            });
            toast.success(on ? "Saved" : "Removed from saved");
          }}
        >
          <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
        </button>
      )}
      <div className="mall-body">
        <p className="mall-cat">{group.category}</p>
        <Link to="/shop/$productId" params={{ productId: slug }} className="mall-name">
          {group.name}
        </Link>
        <p className="mall-price">
          {group.compareAt && group.compareAt > group.priceFrom ? (
            <>
              <s className="mall-compare">{money(group.compareAt, currency)}</s>
              {group.variants.length > 1 ? "From " : ""}
              {money(group.priceFrom, currency)}
            </>
          ) : (
            <>
              {group.variants.length > 1 ? "From " : ""}
              {money(group.priceFrom, currency)}
            </>
          )}
        </p>
        <button
          type="button"
          className="mall-add"
          disabled={!v || v.stock <= 0}
          onClick={() => {
            if (!v || v.stock <= 0) return;
            addToBag({
              productId: v.productId,
              listingId: v.listingId,
              name: v.name,
              sku: v.sku,
              size: v.size,
              price: v.price,
              image: v.image,
              category: v.category,
            });
            toast.success("Added to cart", {
              action: {
                label: "Cart",
                onClick: () => void navigate({ to: "/cart" }),
              },
            });
          }}
        >
          Add to cart
        </button>
      </div>
    </article>
  );
});

import { coverFor, shortFor } from "@/lib/beannel/catalog";
import { cn } from "@/lib/cn";
import { LiquidGlass } from "@/components/liquid-glass";

export function CategoryTile({
  name,
  kicker,
  detail,
  onClick,
  className,
}: {
  name: string;
  kicker?: string;
  detail?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <LiquidGlass as="button" type="button" onClick={onClick} className={cn("cat-tile", className)} title={name} host>
      <img src={coverFor(name)} alt="" />
      <span className="cat-tile-scrim" />
      <span className="cat-tile-body">
        <span className="cat-tile-name">{name}</span>
        {kicker ? <span className="cat-tile-kicker">{kicker}</span> : null}
        {detail ? <span className="cat-tile-detail">{detail}</span> : null}
      </span>
    </LiquidGlass>
  );
}

export function CategoryChip({
  name,
  active,
  onClick,
  plain,
}: {
  name: string;
  active?: boolean;
  onClick: () => void;
  plain?: boolean;
}) {
  const label = plain ? name : shortFor(name);
  return (
    <LiquidGlass as="button" type="button" className="cat-chip" data-active={active} onClick={onClick} title={name} host>
      {!plain && <img src={coverFor(name)} alt="" />}
      <span className="cat-chip-label">{label}</span>
    </LiquidGlass>
  );
}
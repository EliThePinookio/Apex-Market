import { coverFor } from "@/lib/beannel/catalog";
import { cn } from "@/lib/cn";

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
    <button type="button" onClick={onClick} className={cn("cat-tile", className)}>
      <img src={coverFor(name)} alt="" />
      <span className="cat-tile-scrim" />
      <span className="cat-tile-body">
        <span className="cat-tile-name">{name}</span>
        {kicker ? <span className="cat-tile-kicker">{kicker}</span> : null}
        {detail ? <span className="cat-tile-detail">{detail}</span> : null}
      </span>
    </button>
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
  return (
    <button type="button" className="cat-chip" data-active={active} onClick={onClick}>
      {!plain && <img src={coverFor(name)} alt="" />}
      <span>{name}</span>
    </button>
  );
}

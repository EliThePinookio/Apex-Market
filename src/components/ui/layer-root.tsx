import { useRouter } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { withLayer } from "@/lib/layer";

function internalHref(anchor: HTMLAnchorElement): URL | null {
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return null;
  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    return url;
  } catch {
    return null;
  }
}

export function LayerRoot({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const url = internalHref(anchor);
      if (!url) return;
      const here = window.location.pathname + window.location.search;
      const next = url.pathname + url.search;
      if (here === next) return;
      event.preventDefault();
      withLayer(() => {
        void router.navigate({
          to: url.pathname as never,
          search: Object.fromEntries(url.searchParams.entries()) as never,
        });
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  return children;
}

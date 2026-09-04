import { useSyncExternalStore } from "react";

export interface SavedItem {
  productId: string;
  listingId: string;
  slug: string;
  name: string;
  sku: string;
  size: string;
  price: number;
  image: string;
  category: string;
}

const KEY = "beannel_saved";

function read(): SavedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let cache = read();
const listeners = new Set<() => void>();

function emit(next: SavedItem[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  listeners.forEach((l) => l());
}

export function getSaved(): SavedItem[] {
  return cache;
}

export function isSaved(listingId: string): boolean {
  return cache.some((i) => i.listingId === listingId || i.slug === listingId);
}

export function toggleSaved(item: SavedItem): boolean {
  const exists = cache.some((i) => i.listingId === item.listingId);
  emit(exists ? cache.filter((i) => i.listingId !== item.listingId) : [item, ...cache]);
  return !exists;
}

export function removeSaved(listingId: string): void {
  emit(cache.filter((i) => i.listingId !== listingId));
}

export function useSaved(): SavedItem[] {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => cache,
    () => cache,
  );
}

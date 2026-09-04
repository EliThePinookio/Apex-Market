import { useSyncExternalStore } from "react";

export interface BagItem {
  productId: string;
  listingId: string;
  name: string;
  sku: string;
  size: string;
  price: number;
  qty: number;
  image: string;
  category: string;
}

const KEY = "beannel_bag";

function read(): BagItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as BagItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let cache = read();
const listeners = new Set<() => void>();

function emit(next: BagItem[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  listeners.forEach((l) => l());
}

export function getBag(): BagItem[] {
  return cache;
}

export function bagCount(): number {
  return cache.reduce((s, i) => s + i.qty, 0);
}

export function bagTotal(): number {
  return cache.reduce((s, i) => s + i.price * i.qty, 0);
}

export function addToBag(item: Omit<BagItem, "qty">, qty = 1): void {
  const add = Math.min(20, Math.max(1, Math.floor(qty) || 1));
  const items = [...cache];
  const idx = items.findIndex((i) => i.listingId === item.listingId);
  if (idx >= 0) items[idx] = { ...items[idx], qty: Math.min(20, items[idx].qty + add) };
  else items.push({ ...item, qty: add });
  emit(items.slice(0, 30));
}

export function setBagQty(listingId: string, qty: number): void {
  const next = Math.floor(qty);
  if (next <= 0) emit(cache.filter((i) => i.listingId !== listingId));
  else emit(cache.map((i) => (i.listingId === listingId ? { ...i, qty: Math.min(20, next) } : i)));
}

export function clearBag(): void {
  emit([]);
}

export function useBag(): BagItem[] {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => cache,
    () => cache,
  );
}

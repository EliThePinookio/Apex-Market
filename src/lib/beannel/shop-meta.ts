export const FASHION_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "One size"] as const;
export const GARMENT_TYPES = ["Casual", "Formal", "Traditional", "Sport", "Lounge", "Work"] as const;

export interface ShopMeta {
  size?: string;
  garmentType?: string;
  imageUrl?: string;
  listed?: boolean;
  businessId?: string;
}

const PREFIX = "BEANNEL_SHOP:";

export function parseShopMeta(raw?: string | null): { meta: ShopMeta; notes: string } {
  const text = raw || "";
  if (!text.startsWith(PREFIX)) return { meta: { listed: true }, notes: text };
  const nl = text.indexOf("\n");
  const json = nl === -1 ? text.slice(PREFIX.length) : text.slice(PREFIX.length, nl);
  const notes = nl === -1 ? "" : text.slice(nl + 1);
  try {
    const parsed = JSON.parse(json) as ShopMeta;
    return { meta: { listed: parsed.listed !== false, ...parsed }, notes };
  } catch {
    return { meta: { listed: true }, notes: text };
  }
}

export function writeShopMeta(notes: string, meta: ShopMeta): string {
  const payload: ShopMeta = {
    listed: meta.listed !== false,
  };
  if (meta.size) payload.size = meta.size;
  if (meta.garmentType) payload.garmentType = meta.garmentType;
  if (meta.imageUrl) payload.imageUrl = meta.imageUrl;
  if (meta.businessId) payload.businessId = meta.businessId;
  const body = `${PREFIX}${JSON.stringify(payload)}`;
  const rest = notes.trim();
  return rest ? `${body}\n${rest}` : body;
}

export function listingIdFor(productId: string): string {
  return `list-${productId}`;
}

export function sourceIdFromListing(listingId: string): string {
  return listingId.startsWith("list-") ? listingId.slice(5) : listingId;
}

export function shopInfoId(businessId: string): string {
  return `info-${businessId}`;
}

export function slugProduct(name: string, category: string): string {
  const base = `${name} ${category}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
  return base || "piece";
}

export function waDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `233${digits.slice(1)}`;
  return digits;
}

export async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that photo"));
      el.src = url;
    });
    const max = 900;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process that photo");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  } finally {
    URL.revokeObjectURL(url);
  }
}

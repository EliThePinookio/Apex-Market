import { createServerFn } from "@tanstack/react-start";
import { rateLimit } from "@/lib/beannel/guard";

export const MAX_PRODUCT_IMAGES = 5;
export const MIN_PRODUCT_IMAGES = 3;

const MODELS = ["google/gemini-2.5-flash-image", "google/gemini-3.1-flash-image"];

function usableKey(value: string | undefined | null): string | null {
  const trimmed = (value || "").trim();
  if (trimmed.length < 8 || trimmed === "MY_OPENROUTER_API_KEY") return null;
  return trimmed;
}

function asDataUrl(body: Record<string, unknown>): string | null {
  const data = body.data as Array<Record<string, unknown>> | undefined;
  const row = data?.[0];
  if (row?.b64_json) {
    const mt = String(row.media_type || "image/jpeg");
    return `data:${mt};base64,${row.b64_json}`;
  }
  if (typeof row?.url === "string" && row.url) return row.url;
  const message = (body.choices as Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }> | undefined)?.[0]
    ?.message;
  const url = message?.images?.[0]?.image_url?.url;
  return url || null;
}

async function renderShot(apiKey: string, prompt: string, source?: string): Promise<string | null> {
  const input_references =
    source && source.length < 420_000
      ? [{ type: "image_url", image_url: { url: source } }]
      : undefined;
  for (const model of MODELS) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/images", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "https://beannel.app",
          "X-Title": "BEANNEL",
        },
        body: JSON.stringify({
          model,
          prompt,
          aspect_ratio: "3:4",
          output_format: "jpeg",
          n: 1,
          ...(input_references ? { input_references } : {}),
        }),
      });
      if (!res.ok) continue;
      const body = (await res.json()) as Record<string, unknown>;
      const url = asDataUrl(body);
      if (url) return url;
    } catch {
      continue;
    }
  }
  return null;
}

function shotPrompts(args: {
  name: string;
  size: string;
  category: string;
  audience: string;
}): string[] {
  const who = args.audience === "women" ? "women's" : args.audience === "men" ? "men's" : "fashion";
  const piece = `${args.name}${args.size ? `, size ${args.size}` : ""}, ${who} ${args.category}`.trim();
  return [
    `Luxury catalog photo of this exact ${piece}. Same product, same colours, same materials. Sharpen the photo, correct exposure, remove blur and noise, beautiful studio lighting, Accra boutique quality. Do not invent a different item. Vertical 3:4.`,
    `Same exact ${piece}, three-quarter studio angle on a clean parchment/gold set. Keep identity. Vertical 3:4.`,
    `Same exact ${piece}, close-up of the best detail (fabric, clasp, face, stitching). Sharp, appealing. Vertical 3:4.`,
    `Same exact ${piece} in a tasteful lifestyle shot a customer would want to buy. Keep the product true. Vertical 3:4.`,
    `Same exact ${piece}, alternate hero angle, luxury still life, gold and cream, no text. Vertical 3:4.`,
  ];
}

export const finishProductPhotos = createServerFn({ method: "POST" })
  .validator(
    (input: {
      name: string;
      size?: string;
      category?: string;
      audience?: string;
      source?: string;
      have?: number;
      openrouterKey?: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const key = usableKey(process.env.OPENROUTER_API_KEY) || usableKey(data.openrouterKey);
    if (!key) return { ok: false as const, reason: "key", cover: null as string | null, extras: [] as string[] };
    if (!rateLimit("studio-photos", 12, 10 * 60_000, 45_000)) {
      return { ok: false as const, reason: "slow", cover: null as string | null, extras: [] as string[] };
    }
    const name = (data.name || "").trim().slice(0, 80);
    if (!name) return { ok: false as const, reason: "name", cover: null as string | null, extras: [] as string[] };
    const have = Math.max(0, Math.min(MAX_PRODUCT_IMAGES, Number(data.have) || 0));
    const prompts = shotPrompts({
      name,
      size: (data.size || "").trim(),
      category: data.category || "Apparels",
      audience: data.audience || "unisex",
    });
    const source = (data.source || "").trim() || undefined;
    let cover: string | null = null;
    if (source) {
      cover = await renderShot(key, prompts[0], source);
    }
    const extrasWanted = have <= 1 ? MAX_PRODUCT_IMAGES - Math.max(have, 1) : have < MIN_PRODUCT_IMAGES ? MIN_PRODUCT_IMAGES - have : 0;
    const extras: string[] = [];
    for (const prompt of prompts.slice(1)) {
      if (extras.length >= extrasWanted) break;
      const shot = await renderShot(key, prompt, source || cover || undefined);
      if (shot) extras.push(shot);
    }
    return { ok: true as const, reason: null as string | null, cover, extras };
  });

import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const url = z.url().refine((v) => { const u = new URL(v); return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password; }, "Use a public HTTP(S) source URL");
const date = z.iso.datetime({ offset: true }).refine((v) => Number.isFinite(Date.parse(v)) && Date.parse(v) <= Date.now(), "Review date must be valid and not in the future");
const key = text(200).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const currencies = new Set(Intl.supportedValuesOf("currency"));
const currency = z.string().regex(/^[A-Z]{3}$/).refine((v) => currencies.has(v), "Unknown ISO currency").refine((v) => new Intl.NumberFormat("en", { style: "currency", currency: v }).resolvedOptions().maximumFractionDigits === 2, "This cents importer requires a two-decimal currency");
const image = z.string().max(500).regex(/^[a-zA-Z0-9/_\-.]+$/).refine((v) => !v.includes("..") && !v.startsWith("/"), "Use a safe storage object path").nullable().default(null);
const dish = z.strictObject({
  seed_key: key, name: text(200), slug: key, category: text(80), description: text(2000).nullable().default(null),
  price_cents: z.number().int().min(0).max(2147483647).nullable(), currency, image_path: image,
  source_url: url.optional(), source_checked_at: date.optional(), is_active: z.boolean().default(true),
});
const restaurant = z.strictObject({
  seed_key: key, name: text(200), slug: key, address: text(500), city: text(200), region: text(200),
  country: z.string().regex(/^[A-Z]{2}$/), cuisine: text(200).nullable().default(null),
  price_level: z.number().int().min(1).max(4).nullable().default(null), website_url: url.nullable().default(null),
  menu_source_url: url, source_checked_at: date, menu_coverage: z.enum(["selected", "full"]), image_path: image,
  is_active: z.boolean().default(true), menu: z.array(dish).min(1).max(100),
}).transform((r) => ({ ...r, menu: r.menu.map((d) => ({ ...d, source_url: d.source_url ?? r.menu_source_url, source_checked_at: d.source_checked_at ?? r.source_checked_at })) }));
export type SeedRestaurant = z.output<typeof restaurant>;

export function validateSeed(inputs: unknown[]): SeedRestaurant[] {
  if (!inputs.length) throw new Error("No verified seed files found");
  const parsed = z.array(restaurant).max(20).parse(inputs);
  const checkUnique = (values: string[], name: string) => { if (new Set(values).size !== values.length) throw new Error(`Duplicate ${name}`); };
  checkUnique(parsed.map((r) => r.seed_key), "restaurant seed_key");
  checkUnique(parsed.map((r) => r.slug), "restaurant slug");
  for (const r of parsed) {
    // Fictional examples are rejected in every environment, not merely production.
    if (/example[ -]only|example\.com|replace|fictional|synthetic/i.test(JSON.stringify(r))) throw new Error(`Fictional placeholder in ${r.seed_key}`);
    checkUnique(r.menu.map((d) => d.seed_key), "dish seed_key");
    checkUnique(r.menu.map((d) => d.slug), "dish slug");
    if (new Set(r.menu.map((d) => d.currency)).size !== 1) throw new Error(`Mixed menu currencies in ${r.seed_key}`);
  }
  return parsed;
}

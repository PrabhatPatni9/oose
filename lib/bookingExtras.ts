export const ADDON_CATALOG = [
  { key: "duct" as const, label: "AC Duct Cleaning", amount: 45, icon: "wind_power" },
  { key: "windows" as const, label: "Exterior Windows", amount: 20, icon: "window" },
  { key: "soap" as const, label: "Eco-Friendly Soap", amount: 10, icon: "sanitizer" },
];

export type AddonKey = (typeof ADDON_CATALOG)[number]["key"];

export type AddonSelection = Record<AddonKey, boolean>;

export type BookingExtras = {
  duration_hours: number;
  time_window: string;
  addons: AddonSelection;
  addon_lines: { key: string; label: string; amount: number }[];
  base_price: number;
  duration_charge: number;
  addons_total: number;
  subtotal: number;
  promo_discount: number;
  promo_label: string;
  tax_rate: number;
  tax_amount: number;
  total: number;
  pricing_version: number;
};

const TAX_RATE = 0.085;
const PROMO_CAP = 19.5;

export function computeBookingPricing(
  basePrice: number,
  durationHours: number,
  addons: AddonSelection,
): BookingExtras {
  const addon_lines = ADDON_CATALOG.filter((a) => addons[a.key]).map((a) => ({
    key: a.key,
    label: a.label,
    amount: a.amount,
  }));
  const addons_total = addon_lines.reduce((s, l) => s + l.amount, 0);
  const duration_charge = Math.max(0, (durationHours - 2) * 10);
  const subtotal = basePrice + duration_charge + addons_total;
  const promo_discount = Math.min(PROMO_CAP, Math.max(0, subtotal * 0.12));
  const afterPromo = subtotal - promo_discount;
  const tax_amount = afterPromo * TAX_RATE;
  const total = afterPromo + tax_amount;

  return {
    duration_hours: durationHours,
    time_window: "" as string,
    addons: { ...addons },
    addon_lines,
    base_price: basePrice,
    duration_charge,
    addons_total,
    subtotal,
    promo_discount,
    promo_label: "New customer savings",
    tax_rate: TAX_RATE,
    tax_amount,
    total,
    pricing_version: 1,
  };
}

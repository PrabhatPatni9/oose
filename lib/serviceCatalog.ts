export interface ServiceItem {
  id: number;
  name: string;
  category: string;
  base_price: number;
}

export const fallbackServices: ServiceItem[] = [
  { id: 1, name: "Deep Home Cleaning", category: "Cleaning", base_price: 120 },
  { id: 2, name: "Kitchen Deep Cleaning", category: "Cleaning", base_price: 85 },
  { id: 3, name: "Bathroom Sanitization", category: "Cleaning", base_price: 70 },
  { id: 4, name: "Sofa Shampooing", category: "Cleaning", base_price: 60 },
  { id: 5, name: "AC Servicing", category: "AC Repair", base_price: 90 },
  { id: 6, name: "AC Gas Refill", category: "AC Repair", base_price: 110 },
  { id: 7, name: "Leakage Fix", category: "Plumbing", base_price: 75 },
  { id: 8, name: "Drain Unclogging", category: "Plumbing", base_price: 65 },
  { id: 9, name: "General Pest Control", category: "Pest Control", base_price: 95 },
  { id: 10, name: "Termite Treatment", category: "Pest Control", base_price: 150 },
  { id: 11, name: "Salon at Home", category: "Beauty Services", base_price: 80 },
  { id: 12, name: "Home Spa Session", category: "Beauty Services", base_price: 100 },
];

const iconByCategory: Record<string, string> = {
  cleaning: "cleaning_services",
  "ac repair": "ac_unit",
  plumbing: "plumbing",
  "pest control": "pest_control",
  beauty: "spa",
  "beauty services": "spa",
};

export function getCategoryIcon(category: string) {
  return iconByCategory[category.toLowerCase()] ?? "home_repair_service";
}

export function uniqueCategories(services: ServiceItem[]) {
  return Array.from(new Set(services.map((s) => s.category)));
}

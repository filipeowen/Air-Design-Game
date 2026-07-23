import type { Region } from "@/game/types";

export interface FactoryCountryOption {
  name: string;
  region: Region;
}

export const FACTORY_COUNTRIES: FactoryCountryOption[] = [
  { name: "United States", region: "north-america" },
  { name: "Canada", region: "north-america" },
  { name: "Mexico", region: "north-america" },
  { name: "Brazil", region: "latin-america" },
  { name: "United Kingdom", region: "europe" },
  { name: "France", region: "europe" },
  { name: "Germany", region: "europe" },
  { name: "Netherlands", region: "europe" },
  { name: "Spain", region: "europe" },
  { name: "Italy", region: "europe" },
  { name: "Soviet Union", region: "soviet-market" },
  { name: "Japan", region: "asia-pacific" },
  { name: "China", region: "asia-pacific" },
  { name: "India", region: "asia-pacific" },
  { name: "Australia", region: "asia-pacific" },
  { name: "United Arab Emirates", region: "middle-east" },
  { name: "South Africa", region: "africa" }
];

export function getFactoryRegionForCountry(country: string): Region {
  return FACTORY_COUNTRIES.find((option) => option.name === country)?.region ?? "north-america";
}

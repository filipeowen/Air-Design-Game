import type { AircraftCategory, MarketSegment } from "@/game/types";

export const STARTING_MARKETS: Record<AircraftCategory, MarketSegment> = {
  "regional-jet": {
    id: "regional-jet",
    name: "Regional jet",
    monthlyDemand: 18,
    growthRate: 0.002,
    fuelPriceIndex: 1,
    pricePressure: 44,
    airportConstraint: 30
  },
  "narrow-body": {
    id: "narrow-body",
    name: "Narrow-body",
    monthlyDemand: 28,
    growthRate: 0.003,
    fuelPriceIndex: 1,
    pricePressure: 52,
    airportConstraint: 45
  },
  "wide-body": {
    id: "wide-body",
    name: "Wide-body",
    monthlyDemand: 10,
    growthRate: 0.004,
    fuelPriceIndex: 1,
    pricePressure: 38,
    airportConstraint: 68
  }
};

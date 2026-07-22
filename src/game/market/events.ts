import type { HistoricalEvent, MarketSegment } from "@/game/types";
import type { RandomSource } from "@/game/utils/prng";

export interface MarketProcessResult {
  events: HistoricalEvent[];
}

export function processMarketAndEvents(
  marketSegments: Record<string, MarketSegment>,
  rng: RandomSource,
  turn: number,
  year: number
): MarketProcessResult {
  const events: HistoricalEvent[] = [];

  for (const market of Object.values(marketSegments)) {
    const fuelNoise = rng.nextBetween(-0.015, 0.018);
    market.monthlyDemand = Math.max(2, market.monthlyDemand * (1 + market.growthRate + rng.nextBetween(-0.01, 0.012)));
    market.fuelPriceIndex = clamp(market.fuelPriceIndex * (1 + fuelNoise), 0.72, 2.4);
  }

  if (year === 1973 && turn % 12 >= 8) {
    for (const market of Object.values(marketSegments)) {
      market.fuelPriceIndex = Math.min(2.4, market.fuelPriceIndex * 1.08);
      market.pricePressure = Math.min(100, market.pricePressure + 1.2);
    }
    events.push({
      id: `event-oil-pressure-${turn}`,
      type: "fixed-global",
      title: "Fuel prices surge",
      description: "Airlines are placing more weight on efficient aircraft and are delaying some marginal fleet growth.",
      turn,
      severity: 68,
      effects: ["Fuel efficiency preference rises", "Price pressure increases", "Marginal demand softens"]
    });
  }

  if (year === 1978 && turn % 12 === 9) {
    for (const market of Object.values(marketSegments)) {
      market.pricePressure = Math.min(100, market.pricePressure + 8);
      market.monthlyDemand *= market.id === "narrow-body" ? 1.08 : 0.98;
    }
    events.push({
      id: `event-deregulation-${turn}`,
      type: "fixed-global",
      title: "Route deregulation wave",
      description: "New competition pushes airlines toward lower operating costs and higher aircraft utilization.",
      turn,
      severity: 54,
      effects: ["Narrow-body demand improves", "Airlines become more price sensitive"]
    });
  }

  return { events };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

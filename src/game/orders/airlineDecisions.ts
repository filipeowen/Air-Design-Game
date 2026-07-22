import type { AircraftModel, AircraftOrder, Airline, Manufacturer, MarketSegment } from "@/game/types";
import type { FinancialDraft } from "@/game/finance/calculations";
import type { RandomSource } from "@/game/utils/prng";

export interface AirlineDecisionResult {
  orders: string[];
}

export function scoreAircraftForAirline(
  airline: Airline,
  manufacturer: Manufacturer,
  model: AircraftModel,
  market: MarketSegment,
  randomModifier: number
): number {
  const relationship = manufacturer.relationships[airline.id]?.score ?? airline.relationshipScore[manufacturer.id] ?? 50;
  const categoryFit = model.category === airline.preferredCategory ? 18 : -8;
  const priceScore = (100 - airline.priceSensitivity) * 0.08 + (100 - market.pricePressure) * 0.06 - (model.listPrice / model.productionCost - 1.35) * airline.priceSensitivity * 0.08;
  const reliabilityScore = (model.reliability - 55) * (airline.reliabilityPreference / 100) * 0.38;
  const fuelScore = (model.fuelEfficiencyScore - 50) * (airline.fuelEfficiencyPreference / 100) * market.fuelPriceIndex * 0.35;
  const capacityFit = Math.max(0, 14 - Math.abs(model.capacity - preferredCapacity(airline.preferredCategory)) / 12);
  const rangeFit = Math.max(0, 12 - Math.abs(model.rangeNm - preferredRange(airline.preferredCategory)) / 450);
  const reputationScore = manufacturer.reputation.customerService * 0.06 + manufacturer.reputation.deliveryPerformance * 0.08;

  return categoryFit + priceScore + reliabilityScore + fuelScore + capacityFit + rangeFit + relationship * 0.16 + reputationScore + randomModifier;
}

export function processAirlineOrders(
  manufacturers: Record<string, Manufacturer>,
  airlines: Record<string, Airline>,
  marketSegments: Record<string, MarketSegment>,
  orders: Record<string, AircraftOrder>,
  rng: RandomSource,
  financials: Map<string, FinancialDraft>,
  turn: number
): AirlineDecisionResult {
  const orderMessages: string[] = [];
  const models = Object.values(manufacturers).flatMap((manufacturer) =>
    manufacturer.aircraftModels.filter((model) => model.active && !manufacturer.bankrupt)
  );

  if (models.length === 0) {
    return { orders: orderMessages };
  }

  for (const airline of Object.values(airlines)) {
    const elapsed = turn - airline.lastOrderTurn;
    const market = marketSegments[airline.preferredCategory];
    const orderChance = Math.min(0.72, 0.08 + elapsed * 0.035 + market.monthlyDemand / 220);

    if (elapsed < 3 || !rng.chance(orderChance)) {
      continue;
    }

    const scored = models
      .filter((model) => model.category === airline.preferredCategory || rng.chance(0.12))
      .map((model) => {
        const manufacturer = manufacturers[model.manufacturerId];
        const randomModifier = rng.nextBetween(-5, 5);
        return {
          manufacturer,
          model,
          score: manufacturer ? scoreAircraftForAirline(airline, manufacturer, model, market, randomModifier) : -999
        };
      })
      .filter((candidate) => candidate.manufacturer !== undefined)
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (!best || best.score < 32) {
      continue;
    }

    const quantity = chooseOrderQuantity(airline, best.model, market, rng);
    const negotiatedPrice = Math.round(best.model.listPrice * (1 - airline.priceSensitivity / 1_000 - best.manufacturer.strategy.priceAggressiveness / 1_400));
    const totalValue = negotiatedPrice * quantity;
    const deposit = Math.round(totalValue * 0.1);
    const order: AircraftOrder = {
      id: `order-${airline.id}-${best.model.id}-${turn}-${Object.keys(orders).length}`,
      manufacturerId: best.manufacturer.id,
      airlineId: airline.id,
      modelId: best.model.id,
      quantity,
      delivered: 0,
      pricePerAircraft: negotiatedPrice,
      orderTurn: turn,
      deliveryStartTurn: turn + rng.nextInt(6, 18),
      depositPaid: deposit,
      progressPaid: 0,
      remainingBalance: totalValue - deposit,
      status: "active"
    };

    orders[order.id] = order;
    airline.lastOrderTurn = turn;
    best.manufacturer.cash += deposit;
    financials.get(best.manufacturer.id)!.airlineDeposits += deposit;

    const relationship = best.manufacturer.relationships[airline.id];
    if (relationship) {
      relationship.score = Math.min(100, relationship.score + 2);
    }

    orderMessages.push(`${airline.name} ordered ${quantity} ${best.model.name} aircraft from ${best.manufacturer.name}.`);
  }

  return { orders: orderMessages };
}

export function processProgressPayments(
  manufacturers: Record<string, Manufacturer>,
  orders: Record<string, AircraftOrder>,
  financials: Map<string, FinancialDraft>,
  turn: number
): void {
  for (const order of Object.values(orders)) {
    if (order.status === "cancelled" || order.status === "completed" || turn < order.orderTurn + 5) {
      continue;
    }

    const manufacturer = manufacturers[order.manufacturerId];
    if (!manufacturer) {
      continue;
    }

    const monthlyPayment = Math.min(order.remainingBalance * 0.08, order.pricePerAircraft * order.quantity * 0.018);
    if (monthlyPayment <= 0) {
      continue;
    }

    order.progressPaid += monthlyPayment;
    order.remainingBalance -= monthlyPayment;
    manufacturer.cash += monthlyPayment;
    financials.get(manufacturer.id)!.progressPayments += monthlyPayment;
  }
}

function preferredCapacity(category: AircraftModel["category"]): number {
  if (category === "regional-jet") {
    return 72;
  }
  if (category === "narrow-body") {
    return 160;
  }
  return 290;
}

function preferredRange(category: AircraftModel["category"]): number {
  if (category === "regional-jet") {
    return 1200;
  }
  if (category === "narrow-body") {
    return 3000;
  }
  return 6200;
}

function chooseOrderQuantity(airline: Airline, model: AircraftModel, market: MarketSegment, rng: RandomSource): number {
  const base = model.category === "wide-body" ? rng.nextInt(2, 8) : model.category === "narrow-body" ? rng.nextInt(6, 24) : rng.nextInt(4, 18);
  const strength = 0.6 + airline.financialStrength / 140;
  const demand = 0.65 + market.monthlyDemand / 70;
  return Math.max(1, Math.round(base * strength * demand));
}

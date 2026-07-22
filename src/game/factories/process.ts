import { AIRCRAFT_CATEGORIES } from "@/data/aircraftCategories";
import type { AircraftModel, AircraftOrder, Factory, Manufacturer } from "@/game/types";
import type { FinancialDraft } from "@/game/finance/calculations";
import type { RandomSource } from "@/game/utils/prng";

export interface ProductionProcessResult {
  deliveries: string[];
}

export function processFactoryExpenses(manufacturer: Manufacturer, financial: FinancialDraft): void {
  for (const factory of manufacturer.factories) {
    manufacturer.cash -= factory.monthlyCost;
    financial.factoryExpenses += factory.monthlyCost;
  }
}

export function processProduction(
  manufacturer: Manufacturer,
  orders: Record<string, AircraftOrder>,
  rng: RandomSource,
  financial: FinancialDraft
): ProductionProcessResult {
  const deliveries: string[] = [];
  const workerGroup = manufacturer.employees.factoryWorkers;
  const orderQueue = Object.values(orders)
    .filter((order) => order.manufacturerId === manufacturer.id && (order.status === "active" || order.status === "delivering"))
    .sort((a, b) => a.orderTurn - b.orderTurn);

  for (const factory of manufacturer.factories) {
    let capacityRemaining = factory.capacity;

    for (const line of factory.productionLines) {
      if (line.status !== "active" || line.targetMonthlyRate <= 0) {
        continue;
      }

      const model = manufacturer.aircraftModels.find((candidate) => candidate.id === line.modelId && candidate.active);
      if (!model) {
        continue;
      }

      const categoryCapacity = AIRCRAFT_CATEGORIES[model.category].factoryCapacityRequired;
      const capacityLimitedRate = Math.min(line.targetMonthlyRate, Math.floor(capacityRemaining / categoryCapacity));
      if (capacityLimitedRate <= 0) {
        continue;
      }

      const workerNeed = Math.max(1, capacityLimitedRate * categoryCapacity * 95);
      const workerEffect = Math.min(1.15, line.workersAssigned / workerNeed);
      const productivityEffect = workerGroup.productivity / 70;
      const toolingEffect = line.toolingReadiness / 100;
      const produced = Math.max(
        0,
        Math.floor(capacityLimitedRate * workerEffect * productivityEffect * toolingEffect * rng.nextBetween(0.88, 1.08))
      );

      if (produced <= 0) {
        continue;
      }

      const productionCost = produced * model.productionCost;
      manufacturer.cash -= productionCost;
      financial.productionExpenses += productionCost;
      capacityRemaining -= produced * categoryCapacity;

      let remainingProduced = produced;
      for (const order of orderQueue) {
        if (remainingProduced <= 0 || order.modelId !== model.id || order.status === "completed" || order.status === "cancelled") {
          continue;
        }

        const needed = order.quantity - order.delivered;
        const deliveredNow = Math.min(needed, remainingProduced);
        if (deliveredNow <= 0) {
          continue;
        }

        remainingProduced -= deliveredNow;
        order.delivered += deliveredNow;
        order.status = order.delivered >= order.quantity ? "completed" : "delivering";
        const finalPayment = Math.min(order.remainingBalance, deliveredNow * order.pricePerAircraft * 0.82);
        order.remainingBalance -= finalPayment;
        manufacturer.cash += finalPayment;
        financial.finalDeliveryPayments += finalPayment;
        deliveries.push(`${manufacturer.name} delivered ${deliveredNow} ${model.name} aircraft.`);

        const relationship = manufacturer.relationships[order.airlineId];
        if (relationship) {
          relationship.score = Math.min(100, relationship.score + deliveredNow * 0.8);
          relationship.deliveryTrust = Math.min(100, relationship.deliveryTrust + 1.5);
        }
      }
    }

    factory.idleSpace = Math.max(0, capacityRemaining);
  }

  return { deliveries };
}

export function createProductionLine(model: AircraftModel, targetMonthlyRate: number) {
  return {
    id: `line-${model.id}`,
    modelId: model.id,
    category: model.category,
    targetMonthlyRate,
    status: "active" as const,
    workersAssigned: Math.max(120, targetMonthlyRate * AIRCRAFT_CATEGORIES[model.category].factoryCapacityRequired * 120),
    toolingReadiness: 82
  };
}

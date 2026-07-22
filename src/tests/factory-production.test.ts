import { describe, expect, it } from "vitest";
import { createFinancialDraft } from "@/game/finance/calculations";
import { processProduction } from "@/game/factories/process";
import type { AircraftOrder } from "@/game/types";
import { createNewGame } from "@/game/simulation/createGame";
import { createRandomSource } from "@/game/utils/prng";

describe("factory production", () => {
  it("produces aircraft and records deliveries against orders", () => {
    const state = createNewGame({ seed: 456 });
    const manufacturer = state.manufacturers["pacific-aeroworks"]!;
    const model = manufacturer.aircraftModels[0]!;
    const order: AircraftOrder = {
      id: "test-order",
      manufacturerId: manufacturer.id,
      airlineId: "continental-crown",
      modelId: model.id,
      quantity: 3,
      delivered: 0,
      pricePerAircraft: model.listPrice,
      orderTurn: 0,
      deliveryStartTurn: 0,
      depositPaid: 0,
      progressPaid: 0,
      remainingBalance: model.listPrice * 3,
      status: "active"
    };
    const orders = { [order.id]: order };
    const draft = createFinancialDraft(manufacturer.id, 1);

    const result = processProduction(manufacturer, orders, createRandomSource(456), draft);

    expect(result.deliveries.length).toBeGreaterThan(0);
    expect(order.delivered).toBeGreaterThan(0);
    expect(draft.productionExpenses).toBeGreaterThan(0);
  });
});

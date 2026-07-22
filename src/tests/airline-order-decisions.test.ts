import { describe, expect, it } from "vitest";
import { createFinancialDraft } from "@/game/finance/calculations";
import { processAirlineOrders } from "@/game/orders/airlineDecisions";
import { createNewGame } from "@/game/simulation/createGame";
import { createRandomSource } from "@/game/utils/prng";

describe("airline order decisions", () => {
  it("creates orders when airlines evaluate attractive available models", () => {
    const state = createNewGame({ seed: 123 });
    for (const airline of Object.values(state.airlines)) {
      airline.lastOrderTurn = -20;
    }
    const financials = new Map(Object.values(state.manufacturers).map((manufacturer) => [manufacturer.id, createFinancialDraft(manufacturer.id, 1)]));

    const result = processAirlineOrders(
      state.manufacturers,
      state.airlines,
      state.marketSegments,
      state.orders,
      createRandomSource(123),
      financials,
      12
    );

    expect(result.orders.length).toBeGreaterThan(0);
    expect(Object.keys(state.orders).length).toBeGreaterThan(0);
  });
});

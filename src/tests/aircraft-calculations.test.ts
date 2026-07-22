import { describe, expect, it } from "vitest";
import { calculateAircraftDesign, createDefaultDesignInput } from "@/game/aircraft/design";

describe("aircraft calculations", () => {
  it("shows heavier, more expensive aircraft when range is increased", () => {
    const base = createDefaultDesignInput("narrow-body", "Test 160");
    const longRange = { ...base, rangeNm: base.rangeNm + 1_200 };

    const baseResult = calculateAircraftDesign(base);
    const longRangeResult = calculateAircraftDesign(longRange);

    expect(longRangeResult.metrics.fuelCapacityKg).toBeGreaterThan(baseResult.metrics.fuelCapacityKg);
    expect(longRangeResult.metrics.maximumTakeoffWeightKg).toBeGreaterThan(baseResult.metrics.maximumTakeoffWeightKg);
    expect(longRangeResult.metrics.developmentCost).toBeGreaterThan(baseResult.metrics.developmentCost);
    expect(longRangeResult.tradeoffs.join(" ")).toContain("Long range");
  });
});

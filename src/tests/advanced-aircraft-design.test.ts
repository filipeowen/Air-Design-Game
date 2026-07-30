import { describe, expect, it } from "vitest";
import {
  buildAircraftDesignInputFromStudio,
  calculateAircraftPerformance,
  calculateCabinGeometry,
  createDefaultAircraftStudioDesign,
  sanitizeAircraftStudioDesign
} from "@/game/aircraft/advancedDesign";

describe("advanced aircraft design studio", () => {
  it("derives passenger capacity from cabin layout rather than direct stat input", () => {
    const design = createDefaultAircraftStudioDesign("narrow-body", "Calculated Cabin");
    const baseline = calculateAircraftPerformance(design);
    const stretched = {
      ...design,
      fuselage: { ...design.fuselage, usableCabinLengthM: 32, totalLengthM: 42 },
      cabin: {
        ...design.cabin,
        zones: design.cabin.zones.map((zone) => (zone.cabinClass === "economy" ? { ...zone, zoneLengthM: 26 } : zone))
      }
    };

    const stretchedResult = calculateAircraftPerformance(stretched);

    expect(stretchedResult.typicalPassengerCapacity).toBeGreaterThan(baseline.typicalPassengerCapacity);
    expect(buildAircraftDesignInputFromStudio(stretched).passengerCapacity).toBe(stretchedResult.typicalPassengerCapacity);
  });

  it("blocks impossible cabin widths", () => {
    const design = createDefaultAircraftStudioDesign("regional-jet", "Wide Cabin Bug");
    const impossible = {
      ...design,
      cabin: {
        ...design.cabin,
        zones: design.cabin.zones.map((zone) => (zone.cabinClass === "economy" ? { ...zone, seatsAcross: 5, seatWidthM: 0.55 } : zone))
      }
    };

    const result = calculateAircraftPerformance(impossible);

    expect(result.validation.status).toBe("invalid");
    expect(result.validation.items.some((item) => item.title === "Cabin does not fit")).toBe(true);
  });

  it("keeps regional jets from certifying extreme passenger counts", () => {
    const design = createDefaultAircraftStudioDesign("regional-jet", "Crowded Regional");
    const crowded = {
      ...design,
      fuselage: { ...design.fuselage, totalLengthM: 34, usableCabinLengthM: 24, exitCount: 10 },
      cabin: {
        ...design.cabin,
        zones: design.cabin.zones.map((zone) => (zone.cabinClass === "economy" ? { ...zone, zoneLengthM: 24, seatsAcross: 5, seatPitchM: 0.71 } : zone))
      }
    };

    const result = calculateAircraftPerformance(crowded);

    expect(calculateCabinGeometry(crowded).physicalPassengerCapacity).toBeGreaterThan(115);
    expect(result.maximumCertifiedCapacity).toBeLessThanOrEqual(115);
    expect(result.validation.items.some((item) => item.title === "Too many seats for category")).toBe(true);
  });

  it("blocks wide bodies that are sized like tiny aircraft", () => {
    const design = createDefaultAircraftStudioDesign("wide-body", "Tiny Widebody");
    const tiny = {
      ...design,
      cabin: {
        ...design.cabin,
        zones: design.cabin.zones.map((zone) => ({ ...zone, zoneLengthM: zone.cabinClass === "economy" ? 8 : 0, seatsAcross: 6 }))
      }
    };

    const result = calculateAircraftPerformance(tiny);

    expect(result.typicalPassengerCapacity).toBeLessThan(100);
    expect(result.validation.items.some((item) => item.title === "Too few seats for category")).toBe(true);
  });

  it("falls back from locked engine and material choices", () => {
    const design = createDefaultAircraftStudioDesign("narrow-body", "Locked Studio Tech");
    const locked = {
      ...design,
      intendedEntryIntoServiceYear: 1995,
      propulsion: { ...design.propulsion, engineModelId: "cfm56-3" as const },
      structure: { ...design.structure, wingMaterial: "primary-composite" as const },
      systems: { ...design.systems, avionics: "digital-i" as const }
    };

    const sanitized = sanitizeAircraftStudioDesign(locked, ["improved-aluminum-alloys"], 1995);

    expect(sanitized.propulsion.engineModelId).toBe("jt8d-9");
    expect(sanitized.structure.wingMaterial).toBe("improved-aluminum");
    expect(sanitized.systems.avionics).toBe("analog");
  });

  it("surfaces overweight and underpowered designs as invalid", () => {
    const design = createDefaultAircraftStudioDesign("wide-body", "Underpowered Heavy");
    const bad = {
      ...design,
      fuelSystem: { ...design.fuelSystem, mtowTargetKg: 120_000, centerTankVolumeM3: 90, auxiliaryTankVolumeM3: 20 },
      propulsion: { ...design.propulsion, engineCount: 2, thrustDeratePercent: 18 }
    };

    const result = calculateAircraftPerformance(bad);
    const titles = result.validation.items.map((item) => item.title);

    expect(result.validation.status).toBe("invalid");
    expect(titles).toContain("Aircraft exceeds MTOW");
    expect(titles).toContain("Installed thrust is too low");
  });

  it("is deterministic for the same design draft", () => {
    const design = createDefaultAircraftStudioDesign("narrow-body", "Repeatable");
    const first = calculateAircraftPerformance(design);
    const second = calculateAircraftPerformance(structuredClone(design));

    expect(second).toEqual(first);
  });
});

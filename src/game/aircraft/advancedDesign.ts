import { AIRCRAFT_CATEGORIES } from "@/data/aircraftCategories";
import {
  CABIN_CLASS_DEFAULTS,
  DESIGN_CATEGORY_LIMITS,
  ENGINE_OPTIONS,
  FUEL_DENSITY_KG_PER_M3,
  HIGH_LIFT_FACTORS,
  MATERIAL_FACTORS,
  SYSTEM_FACTORS,
  WEIGHT_ASSUMPTIONS,
  WINGTIP_FACTORS,
  type EngineOption
} from "@/game/aircraft/designConfig";
import type {
  AircraftCalculatedPerformance,
  AircraftCategory,
  AircraftDesignInput,
  AircraftStudioDesign,
  AircraftValidationItem,
  AircraftValidationResult,
  AvionicsGeneration,
  CabinClass,
  CabinZone,
  EnginePosition,
  FlightControlSystem,
  StructuralMaterialChoice
} from "@/game/types";

export interface CabinGeometryResult {
  zoneCapacities: Record<CabinClass, number>;
  physicalPassengerCapacity: number;
  maximumCertifiedCapacity: number;
  usedPassengerLengthM: number;
  passengerLengthAvailableM: number;
  widestRequiredCabinM: number;
  density: number;
}

export function createDefaultAircraftStudioDesign(
  category: AircraftCategory,
  programName = "New aircraft",
  intendedEntryIntoServiceYear = 1974
): AircraftStudioDesign {
  if (category === "regional-jet") {
    return {
      programName,
      familyName: programName,
      designation: "RJ-100",
      category,
      missionProfile: "short-haul",
      intendedEntryIntoServiceYear,
      fuselage: {
        externalDiameterM: 2.95,
        internalCabinWidthM: 2.55,
        totalLengthM: 27.5,
        usableCabinLengthM: 18.5,
        noseLengthM: 4,
        tailLengthM: 5,
        cargoVolumeM3: 10,
        doorCount: 2,
        exitCount: 4,
        deckCount: 1,
        cargoDeckConfiguration: "bulk"
      },
      cabin: {
        zones: [
          cabinZone("economy", 16.2, 4, 0.46, 0.79, "2-2"),
          cabinZone("premium-economy", 0, 4, 0.49, 0.91, "2-2"),
          cabinZone("business", 0, 3, 0.55, 1.18, "1-2"),
          cabinZone("first", 0, 2, 0.65, 1.7, "1-1")
        ],
        aisleCount: 1,
        aisleWidthM: 0.42,
        lavatoryCount: 1,
        galleyCount: 1,
        galleySizeM2: 2,
        crewRestAreaM2: 0,
        storageAreaM2: 1.2,
        accessibleSeatingShare: 2,
        cargoSpaceSacrificeM3: 0
      },
      wing: {
        wingspanM: 26,
        wingAreaM2: 72,
        sweepDeg: 22,
        thicknessRatio: 0.12,
        highLiftSystem: "simple-flaps",
        wingtipDevice: "none",
        wingFuelVolumeM3: 9,
        mountingPosition: "low"
      },
      propulsion: {
        engineModelId: "jt8d-9",
        engineCount: 2,
        position: "rear-fuselage",
        thrustDeratePercent: 4,
        commonalityPreference: 25,
        maintenancePriority: "balanced"
      },
      fuelSystem: {
        centerTankVolumeM3: 2,
        auxiliaryTankVolumeM3: 0,
        reservePolicyPercent: 16,
        payloadPriority: "balanced",
        mtowTargetKg: 34_000,
        structuralFuelReinforcement: 4
      },
      structure: defaultStructure("classic-aluminum"),
      systems: defaultSystems("analog", "mechanical"),
      technologyPackage: [],
      commonality: 25,
      designVersion: 2,
      status: "draft"
    };
  }

  if (category === "wide-body") {
    return {
      programName,
      familyName: programName,
      designation: "WB-300",
      category,
      missionProfile: "long-haul",
      intendedEntryIntoServiceYear,
      fuselage: {
        externalDiameterM: 6.05,
        internalCabinWidthM: 5.55,
        totalLengthM: 56,
        usableCabinLengthM: 42,
        noseLengthM: 6,
        tailLengthM: 8,
        cargoVolumeM3: 112,
        doorCount: 8,
        exitCount: 10,
        deckCount: 1,
        cargoDeckConfiguration: "widebody-containers"
      },
      cabin: {
        zones: [
          cabinZone("economy", 28, 9, 0.46, 0.81, "3-3-3"),
          cabinZone("premium-economy", 4, 8, 0.49, 0.91, "2-4-2"),
          cabinZone("business", 6, 6, 0.55, 1.2, "2-2-2"),
          cabinZone("first", 2, 4, 0.65, 1.7, "1-2-1")
        ],
        aisleCount: 2,
        aisleWidthM: 0.51,
        lavatoryCount: 7,
        galleyCount: 4,
        galleySizeM2: 9,
        crewRestAreaM2: 2,
        storageAreaM2: 5,
        accessibleSeatingShare: 2,
        cargoSpaceSacrificeM3: 4
      },
      wing: {
        wingspanM: 54,
        wingAreaM2: 292,
        sweepDeg: 31,
        thicknessRatio: 0.11,
        highLiftSystem: "simple-flaps",
        wingtipDevice: "none",
        wingFuelVolumeM3: 78,
        mountingPosition: "low"
      },
      propulsion: {
        engineModelId: "jt3d-3b",
        engineCount: 4,
        position: "under-wing",
        thrustDeratePercent: 3,
        commonalityPreference: 18,
        maintenancePriority: "reliability"
      },
      fuelSystem: {
        centerTankVolumeM3: 32,
        auxiliaryTankVolumeM3: 4,
        reservePolicyPercent: 17,
        payloadPriority: "range",
        mtowTargetKg: 180_000,
        structuralFuelReinforcement: 10
      },
      structure: defaultStructure("classic-aluminum"),
      systems: defaultSystems("analog", "hydraulic-boosted"),
      technologyPackage: [],
      commonality: 18,
      designVersion: 2,
      status: "draft"
    };
  }

  return {
    programName,
    familyName: programName,
    designation: "NB-160",
    category,
    missionProfile: "medium-haul",
    intendedEntryIntoServiceYear,
    fuselage: {
      externalDiameterM: 3.75,
      internalCabinWidthM: 3.54,
      totalLengthM: 36,
      usableCabinLengthM: 27,
      noseLengthM: 4.5,
      tailLengthM: 5.5,
      cargoVolumeM3: 24,
      doorCount: 4,
      exitCount: 6,
      deckCount: 1,
      cargoDeckConfiguration: "standard-containers"
    },
    cabin: {
      zones: [
        cabinZone("economy", 21.5, 6, 0.46, 0.79, "3-3"),
        cabinZone("premium-economy", 1.8, 6, 0.49, 0.91, "3-3"),
        cabinZone("business", 2.4, 4, 0.55, 1.18, "2-2"),
        cabinZone("first", 0, 4, 0.65, 1.7, "2-2")
      ],
      aisleCount: 1,
      aisleWidthM: 0.48,
      lavatoryCount: 3,
      galleyCount: 2,
      galleySizeM2: 4.8,
      crewRestAreaM2: 0,
      storageAreaM2: 2.6,
      accessibleSeatingShare: 2,
      cargoSpaceSacrificeM3: 1
    },
    wing: {
      wingspanM: 31,
      wingAreaM2: 124,
      sweepDeg: 27,
      thicknessRatio: 0.115,
      highLiftSystem: "simple-flaps",
      wingtipDevice: "none",
      wingFuelVolumeM3: 21,
      mountingPosition: "low"
    },
    propulsion: {
      engineModelId: "jt8d-9",
      engineCount: 2,
      position: "under-wing",
      thrustDeratePercent: 3,
      commonalityPreference: 30,
      maintenancePriority: "balanced"
    },
    fuelSystem: {
      centerTankVolumeM3: 6,
      auxiliaryTankVolumeM3: 0,
      reservePolicyPercent: 16,
      payloadPriority: "balanced",
      mtowTargetKg: 62_000,
      structuralFuelReinforcement: 6
    },
    structure: defaultStructure("classic-aluminum"),
    systems: defaultSystems("analog", "hydraulic-boosted"),
    technologyPackage: [],
    commonality: 30,
    designVersion: 2,
    status: "draft"
  };
}

export function sanitizeAircraftStudioDesign(
  input: AircraftStudioDesign,
  unlockedTechnologyIds: string[],
  fallbackYear = input.intendedEntryIntoServiceYear
): AircraftStudioDesign {
  const unlocked = new Set(unlockedTechnologyIds);
  const limits = DESIGN_CATEGORY_LIMITS[input.category];
  const intendedYear = clamp(Math.round(input.intendedEntryIntoServiceYear || fallbackYear), 1970, 2040);
  const technologyPackage = input.technologyPackage.filter((technologyId) => unlocked.has(technologyId));
  const position = input.propulsion.position;
  const availableEngines = getAvailableEngineOptions(input.category, position, unlockedTechnologyIds, intendedYear);
  const categoryEngines = getAvailableEngineOptions(input.category, undefined, unlockedTechnologyIds, intendedYear);
  const selectedEngine = ENGINE_OPTIONS.find((engine) => engine.id === input.propulsion.engineModelId);
  const engine =
    selectedEngine && isEngineUsable(selectedEngine, input.category, position, unlocked, intendedYear)
      ? selectedEngine
      : availableEngines[0] ?? categoryEngines[0] ?? ENGINE_OPTIONS[0]!;

  return {
    ...input,
    intendedEntryIntoServiceYear: intendedYear,
    fuselage: {
      ...input.fuselage,
      externalDiameterM: clampToStep(input.fuselage.externalDiameterM, limits.externalDiameterM[0], limits.externalDiameterM[1], 0.05),
      internalCabinWidthM: clampToStep(input.fuselage.internalCabinWidthM, limits.cabinWidthM[0], limits.cabinWidthM[1], 0.05),
      totalLengthM: clampToStep(input.fuselage.totalLengthM, limits.fuselageLengthM[0], limits.fuselageLengthM[1], 0.1),
      usableCabinLengthM: clampToStep(input.fuselage.usableCabinLengthM, limits.usableCabinLengthM[0], limits.usableCabinLengthM[1], 0.1),
      noseLengthM: clampToStep(input.fuselage.noseLengthM, 3, 9, 0.1),
      tailLengthM: clampToStep(input.fuselage.tailLengthM, 4, 12, 0.1),
      cargoVolumeM3: clampToStep(input.fuselage.cargoVolumeM3, 3, input.category === "wide-body" ? 180 : input.category === "narrow-body" ? 46 : 20, 1),
      doorCount: clampInteger(input.fuselage.doorCount, input.category === "wide-body" ? 6 : 2, input.category === "wide-body" ? 12 : 8),
      exitCount: clampInteger(input.fuselage.exitCount, input.category === "wide-body" ? 6 : 2, input.category === "wide-body" ? 16 : 10),
      deckCount: input.category === "wide-body" ? clampInteger(input.fuselage.deckCount, 1, 2) : 1
    },
    cabin: {
      ...input.cabin,
      zones: normalizeCabinZones(input.cabin.zones, input.category),
      aisleCount: clampInteger(input.cabin.aisleCount, 1, input.category === "wide-body" ? 3 : 2),
      aisleWidthM: clampToStep(input.cabin.aisleWidthM, 0.38, 0.68, 0.01),
      lavatoryCount: clampInteger(input.cabin.lavatoryCount, 1, input.category === "wide-body" ? 14 : 7),
      galleyCount: clampInteger(input.cabin.galleyCount, 1, input.category === "wide-body" ? 8 : 4),
      galleySizeM2: clampToStep(input.cabin.galleySizeM2, 1.5, input.category === "wide-body" ? 18 : 8, 0.1),
      crewRestAreaM2: clampToStep(input.cabin.crewRestAreaM2, 0, input.category === "wide-body" ? 12 : 4, 0.1),
      storageAreaM2: clampToStep(input.cabin.storageAreaM2, 0.5, input.category === "wide-body" ? 12 : 5, 0.1),
      accessibleSeatingShare: clampToStep(input.cabin.accessibleSeatingShare, 0, 12, 0.5),
      cargoSpaceSacrificeM3: clampToStep(input.cabin.cargoSpaceSacrificeM3, 0, input.fuselage.cargoVolumeM3, 0.5)
    },
    wing: {
      ...input.wing,
      wingspanM: clampToStep(input.wing.wingspanM, limits.wingSpanM[0], limits.wingSpanM[1], 0.1),
      wingAreaM2: clampToStep(input.wing.wingAreaM2, limits.wingAreaM2[0], limits.wingAreaM2[1], 1),
      sweepDeg: clampToStep(input.wing.sweepDeg, 10, 38, 1),
      thicknessRatio: clampToStep(input.wing.thicknessRatio, 0.09, 0.15, 0.005),
      highLiftSystem: isTechnologyUnlocked(HIGH_LIFT_FACTORS[input.wing.highLiftSystem].requiredTechnologyId, unlocked)
        ? input.wing.highLiftSystem
        : "simple-flaps",
      wingtipDevice: isTechnologyUnlocked(WINGTIP_FACTORS[input.wing.wingtipDevice].requiredTechnologyId, unlocked) ? input.wing.wingtipDevice : "none",
      wingFuelVolumeM3: clampToStep(input.wing.wingFuelVolumeM3, 0, limits.fuelVolumeM3[1], 0.5)
    },
    propulsion: {
      ...input.propulsion,
      engineModelId: engine.id,
      position: engine.allowedPositions.includes(input.propulsion.position) ? input.propulsion.position : engine.allowedPositions[0]!,
      engineCount: clampInteger(
        input.propulsion.engineCount,
        2,
        input.category === "wide-body" && engine.maxThrustKn < 160 ? 4 : input.category === "wide-body" ? 4 : 3
      ),
      thrustDeratePercent: clampToStep(input.propulsion.thrustDeratePercent, 0, 18, 1),
      commonalityPreference: clampToStep(input.propulsion.commonalityPreference, 0, 100, 1)
    },
    fuelSystem: {
      ...input.fuelSystem,
      centerTankVolumeM3: clampToStep(input.fuelSystem.centerTankVolumeM3, 0, limits.fuelVolumeM3[1], 0.5),
      auxiliaryTankVolumeM3: clampToStep(input.fuelSystem.auxiliaryTankVolumeM3, 0, input.category === "wide-body" ? 32 : 12, 0.5),
      reservePolicyPercent: clampToStep(input.fuelSystem.reservePolicyPercent, 8, 28, 1),
      mtowTargetKg: clampToStep(input.fuelSystem.mtowTargetKg, minimumMtow(input.category), maximumMtow(input.category), 500),
      structuralFuelReinforcement: clampToStep(input.fuelSystem.structuralFuelReinforcement, 0, 25, 1)
    },
    structure: {
      fuselageMaterial: sanitizeMaterial(input.structure.fuselageMaterial, unlocked),
      wingMaterial: sanitizeMaterial(input.structure.wingMaterial, unlocked),
      tailMaterial: sanitizeMaterial(input.structure.tailMaterial, unlocked),
      controlSurfaceMaterial: sanitizeMaterial(input.structure.controlSurfaceMaterial, unlocked),
      interiorMaterial: input.structure.interiorMaterial,
      landingGearMaterial: input.structure.landingGearMaterial
    },
    systems: {
      ...input.systems,
      avionics: sanitizeAvionics(input.systems.avionics, unlocked),
      cockpit: input.systems.cockpit === "glass-cockpit" && !unlocked.has("electronic-flight-instrument-displays") ? "two-crew-analog" : input.systems.cockpit,
      flightControls: sanitizeFlightControls(input.systems.flightControls, unlocked),
      fireProtection:
        input.systems.fireProtection !== "standard" && !unlocked.has("improved-fire-protection") ? "standard" : input.systems.fireProtection,
      diagnostics:
        input.systems.diagnostics === "predictive" && !unlocked.has("predictive-aircraft-health-monitoring")
          ? unlocked.has("advanced-fault-isolation")
            ? "fault-isolation"
            : "manual"
          : input.systems.diagnostics === "fault-isolation" && !unlocked.has("advanced-fault-isolation")
            ? "manual"
            : input.systems.diagnostics,
      reliabilityGoal: clampToStep(input.systems.reliabilityGoal, 50, 98, 1)
    },
    technologyPackage,
    commonality: clampToStep(input.commonality, 0, 100, 1),
    designVersion: Math.max(2, input.designVersion)
  };
}

export function getAvailableEngineOptions(
  category: AircraftCategory,
  position: EnginePosition | undefined,
  unlockedTechnologyIds: string[],
  year: number
): EngineOption[] {
  const unlocked = new Set(unlockedTechnologyIds);
  return ENGINE_OPTIONS.filter((engine) => isEngineUsable(engine, category, position, unlocked, year)).sort(
    (a, b) =>
      a.suitableCategories.length - b.suitableCategories.length ||
      b.fuelEfficiency - a.fuelEfficiency ||
      b.maxThrustKn - a.maxThrustKn ||
      a.availableYear - b.availableYear
  );
}

export function calculateCabinGeometry(design: AircraftStudioDesign): CabinGeometryResult {
  const passengerLengthAvailableM = Math.max(0, design.fuselage.usableCabinLengthM - cabinServiceLength(design));
  const zoneCapacities = Object.fromEntries(design.cabin.zones.map((zone) => [zone.cabinClass, 0])) as Record<CabinClass, number>;
  let usedPassengerLengthM = 0;
  let physicalPassengerCapacity = 0;
  let widestRequiredCabinM = 0;

  for (const zone of design.cabin.zones) {
    const rows = Math.max(0, Math.floor(zone.zoneLengthM / Math.max(0.1, zone.seatPitchM)));
    const capacity = rows * zone.seatsAcross;
    zoneCapacities[zone.cabinClass] = (zoneCapacities[zone.cabinClass] ?? 0) + capacity;
    physicalPassengerCapacity += capacity;
    usedPassengerLengthM += zone.zoneLengthM;
    widestRequiredCabinM = Math.max(widestRequiredCabinM, requiredCabinWidthM(design, zone));
  }

  const limits = DESIGN_CATEGORY_LIMITS[design.category];
  const exitLimit = design.fuselage.exitCount * 45;
  const maximumCertifiedCapacity = Math.max(
    0,
    Math.min(physicalPassengerCapacity, limits.categoryCapacityLimit, limits.floorLoadPassengerLimit, exitLimit)
  );

  return {
    zoneCapacities,
    physicalPassengerCapacity,
    maximumCertifiedCapacity,
    usedPassengerLengthM: round(usedPassengerLengthM, 1),
    passengerLengthAvailableM: round(passengerLengthAvailableM, 1),
    widestRequiredCabinM: round(widestRequiredCabinM, 2),
    density: round(physicalPassengerCapacity / Math.max(1, design.fuselage.usableCabinLengthM), 2)
  };
}

export function calculatePassengerCapacity(design: AircraftStudioDesign): number {
  return calculateCabinGeometry(design).maximumCertifiedCapacity;
}

export function calculateCabinComfort(design: AircraftStudioDesign, cabin: CabinGeometryResult): number {
  if (cabin.physicalPassengerCapacity <= 0) {
    return 0;
  }

  let weightedComfort = 0;
  for (const zone of design.cabin.zones) {
    const rows = Math.max(0, Math.floor(zone.zoneLengthM / Math.max(0.1, zone.seatPitchM)));
    const seats = rows * zone.seatsAcross;
    const defaults = CABIN_CLASS_DEFAULTS[zone.cabinClass];
    const widthScore = (zone.seatWidthM - 0.43) * 130;
    const pitchScore = (zone.seatPitchM - 0.76) * 82;
    const classScore = 56 + defaults.comfortBonus + widthScore + pitchScore;
    weightedComfort += seats * classScore;
  }

  const densityPenalty = Math.max(0, cabin.density - categoryComfortDensity(design.category)) * 4.5;
  const amenities =
    Math.min(8, design.cabin.lavatoryCount * 0.7 + design.cabin.galleyCount * 0.5 + design.cabin.storageAreaM2 * 0.35) +
    (design.cabin.crewRestAreaM2 > 0 ? 2 : 0);
  const score = weightedComfort / cabin.physicalPassengerCapacity + amenities - densityPenalty;
  return round(clamp(score, 25, 98), 1);
}

export function calculateFuelCapacity(design: AircraftStudioDesign): number {
  return Math.round((design.wing.wingFuelVolumeM3 + design.fuelSystem.centerTankVolumeM3 + design.fuelSystem.auxiliaryTankVolumeM3) * FUEL_DENSITY_KG_PER_M3);
}

export function calculatePayloadWeight(design: AircraftStudioDesign, cabin: CabinGeometryResult): number {
  const passengerPayload =
    cabin.maximumCertifiedCapacity *
    (WEIGHT_ASSUMPTIONS.passengerWeightKg + WEIGHT_ASSUMPTIONS.checkedBaggagePerPassengerKg + WEIGHT_ASSUMPTIONS.carryOnPerPassengerKg);
  const crewCount = Math.max(3, Math.ceil(cabin.maximumCertifiedCapacity / WEIGHT_ASSUMPTIONS.cabinCrewPerPassengers) + 2);
  const crewPayload = crewCount * WEIGHT_ASSUMPTIONS.crewWeightKg;
  return Math.round(passengerPayload + crewPayload + calculateCargoCapacityKg(design) * cargoPayloadShare(design));
}

export function calculateStructuralWeight(
  design: AircraftStudioDesign,
  cabin: CabinGeometryResult,
  engine: EngineOption
): number {
  const limits = DESIGN_CATEGORY_LIMITS[design.category];
  const category = AIRCRAFT_CATEGORIES[design.category];
  const lengthRatio = design.fuselage.totalLengthM / ((limits.fuselageLengthM[0] + limits.fuselageLengthM[1]) / 2);
  const diameterRatio = design.fuselage.externalDiameterM / ((limits.externalDiameterM[0] + limits.externalDiameterM[1]) / 2);
  const materialBlend =
    MATERIAL_FACTORS[design.structure.fuselageMaterial].weight * 0.42 +
    MATERIAL_FACTORS[design.structure.wingMaterial].weight * 0.32 +
    MATERIAL_FACTORS[design.structure.tailMaterial].weight * 0.16 +
    MATERIAL_FACTORS[design.structure.controlSurfaceMaterial].weight * 0.1;
  const shellWeight = limits.baseStructuralWeightKg * (0.46 + lengthRatio * 0.34 + diameterRatio * 0.2) * materialBlend;
  const wingWeight = design.wing.wingAreaM2 * 86 * MATERIAL_FACTORS[design.structure.wingMaterial].weight;
  const engineWeight = engine.dryWeightKg * design.propulsion.engineCount;
  const cabinWeight = cabin.physicalPassengerCapacity * averageSeatWeight(design) + serviceAreaWeight(design);
  const systemsWeight =
    category.unitCostBase / 7_800 +
    (design.systems.redundancy === "triple-redundant" ? 2_800 : design.systems.redundancy === "enhanced" ? 1_500 : 500) +
    (design.systems.flightControls === "digital-fly-by-wire" ? 950 : 0);
  const gearWeight =
    design.fuelSystem.mtowTargetKg *
    (design.structure.landingGearMaterial === "advanced-alloy" ? 0.038 : design.structure.landingGearMaterial === "reinforced-steel" ? 0.047 : 0.043);
  const fuelReinforcement = design.fuelSystem.structuralFuelReinforcement * 85;
  return Math.round((shellWeight + wingWeight + engineWeight + cabinWeight + systemsWeight + gearWeight + fuelReinforcement) * SYSTEM_FACTORS.redundancy[design.systems.redundancy].weight);
}

export function calculateAerodynamicEfficiency(design: AircraftStudioDesign): { aspectRatio: number; liftToDragRatio: number } {
  const aspectRatio = design.wing.wingspanM ** 2 / Math.max(1, design.wing.wingAreaM2);
  const sweepSweetSpot = design.category === "regional-jet" ? 23 : 30;
  const sweepPenalty = Math.abs(design.wing.sweepDeg - sweepSweetSpot) * 0.11;
  const diameterDrag = Math.max(0, design.fuselage.externalDiameterM - (design.category === "wide-body" ? 5.9 : design.category === "narrow-body" ? 3.7 : 2.8)) * 0.6;
  const wingtipBonus = WINGTIP_FACTORS[design.wing.wingtipDevice].efficiency / 2.5;
  const materialSmoothness = design.structure.wingMaterial.includes("composite") ? 0.8 : design.structure.wingMaterial === "aluminum-lithium" ? 0.4 : 0;
  const liftToDragRatio = clamp(10.5 + aspectRatio * 0.72 + wingtipBonus + materialSmoothness - sweepPenalty - diameterDrag, 9, 24);
  return { aspectRatio: round(aspectRatio, 2), liftToDragRatio: round(liftToDragRatio, 1) };
}

export function calculateEnginePerformance(design: AircraftStudioDesign, engine: EngineOption): { installedThrustKn: number; thrustToWeight: number } {
  const installedThrustKn = engine.maxThrustKn * design.propulsion.engineCount * (1 - design.propulsion.thrustDeratePercent / 100);
  return {
    installedThrustKn: round(installedThrustKn, 1),
    thrustToWeight: 0
  };
}

export function calculateRange(
  design: AircraftStudioDesign,
  emptyWeightKg: number,
  payloadWeightKg: number,
  fuelCapacityKg: number,
  engine: EngineOption,
  liftToDragRatio: number
): { typicalRangeNm: number; maximumPayloadRangeNm: number; maximumFuelRangeNm: number; ferryRangeNm: number; tripFuelBurnKg: number; fuelBurnPerSeatKg: number } {
  const reserveFuel = fuelCapacityKg * (design.fuelSystem.reservePolicyPercent / 100);
  const mtowLimitedFuel = Math.max(0, Math.min(fuelCapacityKg - reserveFuel, design.fuelSystem.mtowTargetKg - emptyWeightKg - payloadWeightKg));
  const averageMissionWeight = emptyWeightKg + payloadWeightKg + mtowLimitedFuel * 0.55;
  const speedFactor = design.category === "regional-jet" ? 0.95 : 1.03;
  const engineCountPenalty = 1 + Math.max(0, design.propulsion.engineCount - 2) * 0.12;
  const burnKgPerNm =
    (averageMissionWeight / 10_000) *
    (16 / Math.max(8, liftToDragRatio)) *
    (0.9 / engine.fuelEfficiency) *
    speedFactor *
    engineCountPenalty;
  const maximumPayloadRangeNm = Math.max(0, mtowLimitedFuel / Math.max(0.2, burnKgPerNm));
  const payloadReliefRange = Math.max(0, (fuelCapacityKg - reserveFuel) / Math.max(0.2, burnKgPerNm * 0.86));
  const ferryRangeNm = Math.max(0, (fuelCapacityKg - reserveFuel) / Math.max(0.2, burnKgPerNm * 0.62));
  const typicalRangeNm = Math.min(payloadReliefRange, maximumPayloadRangeNm * (design.fuelSystem.payloadPriority === "range" ? 1.06 : 0.96));
  const missionLength = Math.min(typicalRangeNm, missionReferenceRange(design.category, design.missionProfile));
  const tripFuelBurnKg = Math.round(missionLength * burnKgPerNm);
  const seats = Math.max(1, calculatePassengerCapacity(design));
  return {
    typicalRangeNm: Math.round(typicalRangeNm / 10) * 10,
    maximumPayloadRangeNm: Math.round(maximumPayloadRangeNm / 10) * 10,
    maximumFuelRangeNm: Math.round(payloadReliefRange / 10) * 10,
    ferryRangeNm: Math.round(ferryRangeNm / 10) * 10,
    tripFuelBurnKg,
    fuelBurnPerSeatKg: round(tripFuelBurnKg / seats, 1)
  };
}

export function calculateTakeoffPerformance(
  design: AircraftStudioDesign,
  mtowKg: number,
  engine: EngineOption
): { takeoffDistanceM: number; landingDistanceM: number; airportCompatibility: number } {
  const installedThrustKn = engine.maxThrustKn * design.propulsion.engineCount * (1 - design.propulsion.thrustDeratePercent / 100);
  const thrustToWeight = (installedThrustKn * 101.97) / Math.max(1, mtowKg);
  const wingLoading = mtowKg / Math.max(1, design.wing.wingAreaM2);
  const highLift = HIGH_LIFT_FACTORS[design.wing.highLiftSystem].lift;
  const takeoffDistanceM = clamp(760 + wingLoading * 2.45 / highLift - thrustToWeight * 980, 850, 4_500);
  const landingDistanceM = clamp(620 + wingLoading * 1.65 / highLift - design.fuselage.exitCount * 8, 720, 3_400);
  const spanPenalty = Math.max(0, design.wing.wingspanM + WINGTIP_FACTORS[design.wing.wingtipDevice].span - DESIGN_CATEGORY_LIMITS[design.category].gateSpanLimitM) * 2.8;
  const runwayScore = clamp(105 - takeoffDistanceM / 43 - landingDistanceM / 52 - spanPenalty, 5, 98);
  return {
    takeoffDistanceM: Math.round(takeoffDistanceM),
    landingDistanceM: Math.round(landingDistanceM),
    airportCompatibility: round(runwayScore, 1)
  };
}

export function calculateDevelopmentCost(design: AircraftStudioDesign, risk: number): number {
  const category = AIRCRAFT_CATEGORIES[design.category];
  const materialCost =
    MATERIAL_FACTORS[design.structure.fuselageMaterial].cost * 0.38 +
    MATERIAL_FACTORS[design.structure.wingMaterial].cost * 0.34 +
    MATERIAL_FACTORS[design.structure.tailMaterial].cost * 0.16 +
    MATERIAL_FACTORS[design.structure.controlSurfaceMaterial].cost * 0.12;
  const systemsCost = SYSTEM_FACTORS.avionics[design.systems.avionics].cost * SYSTEM_FACTORS.testing[design.systems.reliabilityTesting].cost;
  const ambition = 1 + Math.max(0, design.commonality - 40) / -500 + Math.max(0, 40 - design.commonality) / 280;
  return Math.round(category.developmentCostBase * (0.82 + risk / 145) * materialCost * systemsCost * ambition);
}

export function calculateDevelopmentTime(design: AircraftStudioDesign, risk: number): number {
  const category = AIRCRAFT_CATEGORIES[design.category];
  const testing = SYSTEM_FACTORS.testing[design.systems.reliabilityTesting].months;
  const commonalityRelief = 1 - Math.min(0.16, design.commonality / 650);
  return Math.round(category.developmentDurationBaseMonths * (0.82 + risk / 180) * testing * commonalityRelief);
}

export function calculateUnitProductionCost(
  design: AircraftStudioDesign,
  emptyWeightKg: number,
  engine: EngineOption,
  risk: number
): number {
  const category = AIRCRAFT_CATEGORIES[design.category];
  const materialCost =
    MATERIAL_FACTORS[design.structure.fuselageMaterial].cost * 0.4 +
    MATERIAL_FACTORS[design.structure.wingMaterial].cost * 0.35 +
    MATERIAL_FACTORS[design.structure.tailMaterial].cost * 0.15 +
    MATERIAL_FACTORS[design.structure.controlSurfaceMaterial].cost * 0.1;
  const engineCost = engine.purchaseCost * design.propulsion.engineCount;
  const structureCost = emptyWeightKg * (design.category === "wide-body" ? 530 : design.category === "narrow-body" ? 460 : 420) * materialCost;
  const systemsCost = category.unitCostBase * (SYSTEM_FACTORS.avionics[design.systems.avionics].cost - 0.74);
  const complexityCost = category.unitCostBase * (risk / 360);
  return Math.round((engineCost + structureCost + systemsCost + complexityCost) * (1 - design.commonality / 900));
}

export function calculateReliability(design: AircraftStudioDesign, engine: EngineOption, risk: number): number {
  const systems = SYSTEM_FACTORS.avionics[design.systems.avionics].reliability + SYSTEM_FACTORS.redundancy[design.systems.redundancy].reliability;
  const testing = SYSTEM_FACTORS.testing[design.systems.reliabilityTesting].reliability;
  const maintenance = design.propulsion.maintenancePriority === "reliability" ? 5 : design.propulsion.maintenancePriority === "cost" ? -2 : 1;
  const fireProtection = design.systems.fireProtection === "advanced" ? 4 : design.systems.fireProtection === "improved" ? 2 : 0;
  return round(clamp(engine.reliability * 0.42 + design.systems.reliabilityGoal * 0.3 + systems + testing + maintenance + fireProtection - risk * 0.08, 35, 99), 1);
}

export function calculateTechnicalRisk(design: AircraftStudioDesign, engine: EngineOption): number {
  const materialRisk =
    MATERIAL_FACTORS[design.structure.fuselageMaterial].risk * 0.32 +
    MATERIAL_FACTORS[design.structure.wingMaterial].risk * 0.32 +
    MATERIAL_FACTORS[design.structure.tailMaterial].risk * 0.18 +
    MATERIAL_FACTORS[design.structure.controlSurfaceMaterial].risk * 0.18;
  const highLiftRisk = HIGH_LIFT_FACTORS[design.wing.highLiftSystem].risk;
  const avionicsRisk = SYSTEM_FACTORS.avionics[design.systems.avionics].risk;
  const fuelRisk = Math.max(0, totalFuelVolumeM3(design) - DESIGN_CATEGORY_LIMITS[design.category].fuelVolumeM3[0]) * 0.16;
  const engineMaturityRisk = Math.max(0, 80 - engine.maturity) * 0.32;
  const flightControlRisk = design.systems.flightControls === "digital-fly-by-wire" ? 12 : design.systems.flightControls === "hydraulic-boosted" ? 3 : 0;
  return round(clamp(8 + materialRisk + highLiftRisk + avionicsRisk + fuelRisk + engineMaturityRisk + flightControlRisk, 5, 100), 1);
}

export function validateAircraftDesign(
  design: AircraftStudioDesign,
  performance?: Partial<AircraftCalculatedPerformance>,
  engine = ENGINE_OPTIONS.find((option) => option.id === design.propulsion.engineModelId) ?? ENGINE_OPTIONS[0]!
): AircraftValidationResult {
  const items: AircraftValidationItem[] = [];
  const cabin = calculateCabinGeometry(design);
  const limits = DESIGN_CATEGORY_LIMITS[design.category];
  const category = AIRCRAFT_CATEGORIES[design.category];
  const totalFuelM3 = totalFuelVolumeM3(design);
  const installedThrustKn = engine.maxThrustKn * design.propulsion.engineCount * (1 - design.propulsion.thrustDeratePercent / 100);
  const mtow = performance?.maximumTakeoffWeightKg ?? design.fuelSystem.mtowTargetKg;
  const thrustToWeight = (installedThrustKn * 101.97) / Math.max(1, mtow);
  const wingLoading = mtow / Math.max(1, design.wing.wingAreaM2);

  if (cabin.widestRequiredCabinM > design.fuselage.internalCabinWidthM + 0.01) {
    items.push(invalid("cabin", "Cabin does not fit", `The widest seating zone needs ${cabin.widestRequiredCabinM} m, but the cabin is ${design.fuselage.internalCabinWidthM.toFixed(2)} m wide.`, "Reduce seats across, narrow the seats, add a wider fuselage, or change the aisle plan."));
  }
  if (cabin.usedPassengerLengthM > cabin.passengerLengthAvailableM + 0.1) {
    items.push(invalid("cabin", "Cabin is too long", `Cabin zones use ${cabin.usedPassengerLengthM} m with ${cabin.passengerLengthAvailableM} m available after galleys, lavatories, storage, and crew space.`, "Shorten one or more cabin zones, extend usable cabin length, or reduce service areas."));
  }
  if (cabin.physicalPassengerCapacity < category.capacityRange[0]) {
    items.push(invalid("cabin", "Too few seats for category", `${AIRCRAFT_CATEGORIES[design.category].label} aircraft should carry at least ${category.capacityRange[0]} passengers in this simulation.`, "Increase usable cabin length, seats across, or choose a smaller aircraft category."));
  }
  if (cabin.physicalPassengerCapacity > limits.categoryCapacityLimit) {
    items.push(invalid("cabin", "Too many seats for category", `${cabin.physicalPassengerCapacity} physical seats exceeds the ${limits.categoryCapacityLimit}-seat design cap for ${AIRCRAFT_CATEGORIES[design.category].label.toLowerCase()} aircraft.`, "Choose a larger aircraft category or reduce cabin density."));
  }
  if (cabin.physicalPassengerCapacity > design.fuselage.exitCount * 45) {
    items.push(invalid("fuselage", "Emergency exits limit capacity", `${design.fuselage.exitCount} exits certify about ${design.fuselage.exitCount * 45} seats, below the current cabin layout.`, "Add exits or reduce seats."));
  }
  if (totalFuelM3 > limits.fuelVolumeM3[1]) {
    items.push(invalid("fuel", "Fuel volume exceeds airframe limit", `${totalFuelM3.toFixed(1)} m3 exceeds the ${limits.fuelVolumeM3[1]} m3 practical limit for this category.`, "Reduce wing, center, or auxiliary tank volume."));
  }
  if ((performance?.operatingEmptyWeightKg ?? 0) + (performance?.payloadWeightKg ?? 0) + (performance?.fuelCapacityKg ?? 0) > design.fuelSystem.mtowTargetKg * 1.01) {
    items.push(invalid("fuel", "Aircraft exceeds MTOW", "The chosen structure, payload, and fuel load are above the selected maximum takeoff weight.", "Raise MTOW, reduce fuel, lower cabin capacity, or choose lighter materials."));
  }
  if (thrustToWeight < minimumThrustToWeight(design.category)) {
    items.push(invalid("propulsion", "Installed thrust is too low", `Thrust-to-weight is ${thrustToWeight.toFixed(2)}, below the safe target for this category.`, "Use higher-thrust engines, reduce derate, reduce MTOW, or add engines."));
  }
  if (wingLoading > maximumWingLoading(design.category)) {
    items.push(invalid("wing", "Wing loading is too high", `${Math.round(wingLoading)} kg/m2 is above the practical target for field performance.`, "Increase wing area, reduce MTOW, or use stronger high-lift devices."));
  }
  if (!engine.suitableCategories.includes(design.category)) {
    items.push(invalid("propulsion", "Engine does not suit category", `${engine.family} is not configured for ${AIRCRAFT_CATEGORIES[design.category].label.toLowerCase()} aircraft.`, "Pick an engine from the available list for this aircraft category."));
  }
  if (!engine.allowedPositions.includes(design.propulsion.position)) {
    items.push(invalid("propulsion", "Engine position incompatible", `${engine.family} cannot be mounted in the selected position.`, "Move the engines or pick a compatible engine."));
  }
  if (engine.diameterM > 2.7 && design.propulsion.position === "under-wing" && design.structure.landingGearMaterial === "standard-steel") {
    items.push(warning("propulsion", "Large nacelle clearance risk", "This engine diameter strains under-wing ground clearance with standard landing gear.", "Use reinforced/taller landing gear or redesign the wing/engine installation."));
  }
  if ((performance?.typicalRangeNm ?? 0) < category.rangeRangeNm[0]) {
    items.push(warning("fuel", "Range below category market", `Calculated range is below the normal ${category.rangeRangeNm[0].toLocaleString()} nm floor for this segment.`, "Add fuel capacity, improve aerodynamics, or select more efficient engines."));
  }
  if ((performance?.cabinComfort ?? 100) < 45) {
    items.push(warning("cabin", "Cabin comfort is low", "Airlines may like the seat count, but passengers and premium carriers will push back.", "Increase pitch, seat width, amenities, or reduce density."));
  }
  if ((performance?.technicalRisk ?? 0) > 70) {
    items.push(warning("final", "Technical risk is very high", "The design combines enough novelty to make delays and overruns likely.", "Use more mature materials, systems, engines, or a stronger testing program."));
  }

  const hasInvalid = items.some((item) => item.level === "invalid");
  return {
    status: hasInvalid ? "invalid" : items.length > 0 ? "warning" : "valid",
    items
  };
}

export function calculateAircraftPerformance(design: AircraftStudioDesign): AircraftCalculatedPerformance {
  const engine = ENGINE_OPTIONS.find((option) => option.id === design.propulsion.engineModelId) ?? ENGINE_OPTIONS[0]!;
  const cabin = calculateCabinGeometry(design);
  const cabinComfort = calculateCabinComfort(design, cabin);
  const fuelCapacityKg = calculateFuelCapacity(design);
  const payloadWeightKg = calculatePayloadWeight(design, cabin);
  const emptyWeightKg = calculateStructuralWeight(design, cabin, engine);
  const maximumTakeoffWeightKg = Math.round(Math.max(design.fuelSystem.mtowTargetKg, emptyWeightKg + payloadWeightKg + fuelCapacityKg));
  const aero = calculateAerodynamicEfficiency(design);
  const range = calculateRange(design, emptyWeightKg, payloadWeightKg, fuelCapacityKg, engine, aero.liftToDragRatio);
  const field = calculateTakeoffPerformance(design, maximumTakeoffWeightKg, engine);
  const technicalRisk = calculateTechnicalRisk(design, engine);
  const predictedReliability = calculateReliability(design, engine, technicalRisk);
  const developmentCost = calculateDevelopmentCost(design, technicalRisk);
  const developmentMonths = calculateDevelopmentTime(design, technicalRisk);
  const unitProductionCost = calculateUnitProductionCost(design, emptyWeightKg, engine, technicalRisk);
  const certificationDifficulty = round(clamp(technicalRisk * 0.58 + AIRCRAFT_CATEGORIES[design.category].certificationDifficulty * 0.48, 15, 100), 1);
  const maintenanceCostPerFlightHour = Math.round(
    (unitProductionCost / (design.category === "wide-body" ? 16_000 : design.category === "narrow-body" ? 22_000 : 27_000)) *
      (1.42 - predictedReliability / 170) *
      (engine.maintenanceCost / 1_400)
  );
  const fuelScore = clamp(100 - range.fuelBurnPerSeatKg / (design.category === "wide-body" ? 28 : design.category === "narrow-body" ? 15 : 9), 5, 98);
  const airlineAppeal = round(
    clamp(
      fuelScore * 0.24 +
        predictedReliability * 0.24 +
        cabinComfort * 0.16 +
        field.airportCompatibility * 0.12 +
        (100 - certificationDifficulty) * 0.1 +
        categoryFitScore(cabin.maximumCertifiedCapacity, AIRCRAFT_CATEGORIES[design.category].capacityRange) * 0.08 +
        categoryFitScore(range.typicalRangeNm, AIRCRAFT_CATEGORIES[design.category].rangeRangeNm) * 0.06,
      1,
      100
    ),
    1
  );
  const estimatedSellingPrice = Math.round(unitProductionCost * (1.32 + airlineAppeal / 260 + (design.category === "wide-body" ? 0.12 : 0)));
  const profitPerUnit = Math.max(1, estimatedSellingPrice - unitProductionCost);
  const validation = validateAircraftDesign(
    design,
    {
      operatingEmptyWeightKg: emptyWeightKg,
      payloadWeightKg,
      fuelCapacityKg,
      maximumTakeoffWeightKg,
      typicalRangeNm: range.typicalRangeNm,
      cabinComfort,
      technicalRisk
    },
    engine
  );

  return {
    typicalPassengerCapacity: cabin.maximumCertifiedCapacity,
    maximumCertifiedCapacity: cabin.maximumCertifiedCapacity,
    cargoCapacityKg: calculateCargoCapacityKg(design),
    cabinComfort,
    comfortRating: comfortRating(cabinComfort),
    cabinDensity: cabin.density,
    operatingEmptyWeightKg: emptyWeightKg,
    payloadWeightKg,
    fuelCapacityKg,
    maximumTakeoffWeightKg,
    maximumLandingWeightKg: Math.round(maximumTakeoffWeightKg * 0.82),
    maximumPayloadRangeNm: range.maximumPayloadRangeNm,
    typicalRangeNm: range.typicalRangeNm,
    maximumFuelRangeNm: range.maximumFuelRangeNm,
    ferryRangeNm: range.ferryRangeNm,
    cruiseSpeedMach: design.category === "regional-jet" ? 0.74 : design.wing.sweepDeg >= 30 ? 0.82 : 0.79,
    takeoffDistanceM: field.takeoffDistanceM,
    landingDistanceM: field.landingDistanceM,
    tripFuelBurnKg: range.tripFuelBurnKg,
    fuelBurnPerSeatKg: range.fuelBurnPerSeatKg,
    wingAspectRatio: aero.aspectRatio,
    liftToDragRatio: aero.liftToDragRatio,
    gateCategory: gateCategory(design.wing.wingspanM + WINGTIP_FACTORS[design.wing.wingtipDevice].span),
    airportCompatibility: field.airportCompatibility,
    developmentCost,
    developmentMonths,
    unitProductionCost,
    estimatedSellingPrice,
    maintenanceCostPerFlightHour,
    predictedReliability,
    technicalRisk,
    certificationDifficulty,
    airlineAppeal,
    breakEvenUnits: Math.ceil(developmentCost / profitPerUnit),
    requiredFactorySize: design.category === "wide-body" ? "large" : design.category === "narrow-body" ? "medium" : "small",
    requiredEngineers: Math.round(AIRCRAFT_CATEGORIES[design.category].developmentDurationBaseMonths * (32 + technicalRisk * 0.55)),
    drivers: buildDrivers(design, engine, cabin, aero),
    validation
  };
}

export function buildAircraftDesignInputFromStudio(
  design: AircraftStudioDesign,
  unlockedTechnologyIds: string[] = []
): AircraftDesignInput {
  const sanitized = unlockedTechnologyIds.length > 0 ? sanitizeAircraftStudioDesign(design, unlockedTechnologyIds) : design;
  const calculated = calculateAircraftPerformance(sanitized);
  const engine = ENGINE_OPTIONS.find((option) => option.id === sanitized.propulsion.engineModelId) ?? ENGINE_OPTIONS[0]!;
  return {
    name: sanitized.programName,
    category: sanitized.category,
    familyName: sanitized.familyName,
    designation: sanitized.designation,
    missionProfile: sanitized.missionProfile,
    intendedEntryIntoServiceYear: sanitized.intendedEntryIntoServiceYear,
    studio: sanitized,
    calculated,
    validation: calculated.validation,
    passengerCapacity: calculated.typicalPassengerCapacity,
    rangeNm: calculated.typicalRangeNm,
    cruiseSpeedMach: calculated.cruiseSpeedMach,
    fuselageLengthM: sanitized.fuselage.totalLengthM,
    fuselageWidthM: sanitized.fuselage.externalDiameterM,
    wingAreaM2: sanitized.wing.wingAreaM2,
    wingSweepDeg: sanitized.wing.sweepDeg,
    engineCount: sanitized.propulsion.engineCount,
    engineType: legacyEngineType(engine),
    engineThrustKn: Math.round(engine.maxThrustKn * (1 - sanitized.propulsion.thrustDeratePercent / 100)),
    structuralMaterial: legacyMaterialType(sanitized.structure.fuselageMaterial, sanitized.structure.wingMaterial),
    cabinComfort: calculated.cabinComfort,
    seatingDensity: Math.round(clamp(100 - calculated.cabinDensity * 4.8, 20, 95)),
    reliabilityTarget: sanitized.systems.reliabilityGoal,
    avionicsPackage: legacyAvionicsType(sanitized.systems.avionics),
    landingGear:
      sanitized.wing.highLiftSystem === "advanced-high-lift"
        ? "short-field"
        : sanitized.structure.landingGearMaterial === "reinforced-steel" || sanitized.structure.landingGearMaterial === "advanced-alloy"
          ? "reinforced"
          : "standard",
    airportCompatibilityTarget: Math.round(calculated.airportCompatibility),
    technologyPackage: sanitized.technologyPackage,
    commonality: sanitized.commonality
  };
}

function cabinZone(
  cabinClass: CabinClass,
  zoneLengthM: number,
  seatsAcross: number,
  seatWidthM: number,
  seatPitchM: number,
  layoutPattern: string
): CabinZone {
  return { cabinClass, zoneLengthM, seatsAcross, seatWidthM, seatPitchM, layoutPattern };
}

function defaultStructure(material: StructuralMaterialChoice): AircraftStudioDesign["structure"] {
  return {
    fuselageMaterial: material,
    wingMaterial: material,
    tailMaterial: material,
    controlSurfaceMaterial: material,
    interiorMaterial: "standard",
    landingGearMaterial: "standard-steel"
  };
}

function defaultSystems(avionics: AvionicsGeneration, flightControls: FlightControlSystem): AircraftStudioDesign["systems"] {
  return {
    avionics,
    cockpit: "three-crew",
    flightControls,
    redundancy: "standard",
    hydraulics: "dual",
    electrical: "conventional",
    fireProtection: "standard",
    iceProtection: "standard",
    environmentalControl: "standard",
    diagnostics: "manual",
    reliabilityTesting: "standard",
    reliabilityGoal: 72
  };
}

function normalizeCabinZones(zones: CabinZone[], category: AircraftCategory): CabinZone[] {
  const byClass = new Map(zones.map((zone) => [zone.cabinClass, zone]));
  const maxSeatsAcross = category === "wide-body" ? 10 : category === "narrow-body" ? 6 : 5;
  return (["economy", "premium-economy", "business", "first"] as CabinClass[]).map((cabinClass) => {
    const defaults = CABIN_CLASS_DEFAULTS[cabinClass];
    const zone = byClass.get(cabinClass);
    return {
      cabinClass,
      zoneLengthM: clampToStep(zone?.zoneLengthM ?? 0, 0, category === "wide-body" ? 42 : category === "narrow-body" ? 30 : 20, 0.1),
      seatsAcross: clampInteger(zone?.seatsAcross ?? (category === "wide-body" ? 8 : category === "narrow-body" ? 6 : 4), 1, maxSeatsAcross),
      seatWidthM: clampToStep(zone?.seatWidthM ?? defaults.seatWidthM, 0.43, 0.72, 0.01),
      seatPitchM: clampToStep(zone?.seatPitchM ?? defaults.seatPitchM, 0.71, 2.05, 0.01),
      layoutPattern: zone?.layoutPattern ?? defaultLayoutPattern(category, cabinClass)
    };
  });
}

function defaultLayoutPattern(category: AircraftCategory, cabinClass: CabinClass): string {
  if (category === "wide-body") {
    return cabinClass === "economy" ? "3-3-3" : cabinClass === "business" ? "2-2-2" : "2-4-2";
  }
  if (category === "narrow-body") {
    return cabinClass === "business" || cabinClass === "first" ? "2-2" : "3-3";
  }
  return cabinClass === "first" ? "1-1" : "2-2";
}

function sanitizeMaterial(material: StructuralMaterialChoice, unlocked: Set<string>): StructuralMaterialChoice {
  if (isTechnologyUnlocked(MATERIAL_FACTORS[material].requiredTechnologyId, unlocked)) {
    return material;
  }
  return unlocked.has("improved-aluminum-alloys") ? "improved-aluminum" : "classic-aluminum";
}

function sanitizeAvionics(avionics: AvionicsGeneration, unlocked: Set<string>): AvionicsGeneration {
  if (isTechnologyUnlocked(SYSTEM_FACTORS.avionics[avionics].requiredTechnologyId, unlocked)) {
    return avionics;
  }
  return unlocked.has("improved-avionics") ? "improved-analog" : "analog";
}

function sanitizeFlightControls(flightControls: FlightControlSystem, unlocked: Set<string>): FlightControlSystem {
  if (flightControls === "digital-fly-by-wire" && !unlocked.has("digital-fly-by-wire")) {
    return "hydraulic-boosted";
  }
  return flightControls;
}

function isEngineUsable(
  engine: EngineOption,
  category: AircraftCategory,
  position: EnginePosition | undefined,
  unlocked: Set<string>,
  year: number
): boolean {
  return (
    engine.suitableCategories.includes(category) &&
    (!position || engine.allowedPositions.includes(position)) &&
    engine.availableYear <= year &&
    isTechnologyUnlocked(engine.requiredTechnologyId, unlocked)
  );
}

function isTechnologyUnlocked(requiredTechnologyId: string | undefined, unlocked: Set<string>): boolean {
  return !requiredTechnologyId || unlocked.has(requiredTechnologyId);
}

function requiredCabinWidthM(design: AircraftStudioDesign, zone: CabinZone): number {
  if (zone.zoneLengthM <= 0 || zone.seatsAcross <= 0) {
    return 0;
  }
  const sideClearance = design.category === "wide-body" ? 0.32 : design.category === "narrow-body" ? 0.27 : 0.22;
  return zone.seatsAcross * zone.seatWidthM + design.cabin.aisleCount * design.cabin.aisleWidthM + sideClearance;
}

function cabinServiceLength(design: AircraftStudioDesign): number {
  const lavatories = design.cabin.lavatoryCount * 0.48;
  const galleys = design.cabin.galleyCount * 0.55 + design.cabin.galleySizeM2 * 0.08;
  const storage = design.cabin.storageAreaM2 * 0.08;
  const crewRest = design.cabin.crewRestAreaM2 * 0.16;
  return lavatories + galleys + storage + crewRest;
}

function calculateCargoCapacityKg(design: AircraftStudioDesign): number {
  const usableVolume = Math.max(0, design.fuselage.cargoVolumeM3 - design.cabin.cargoSpaceSacrificeM3);
  const containerFactor = design.fuselage.cargoDeckConfiguration === "widebody-containers" ? 165 : design.fuselage.cargoDeckConfiguration === "standard-containers" ? 135 : 95;
  return Math.round(usableVolume * containerFactor);
}

function cargoPayloadShare(design: AircraftStudioDesign): number {
  return design.fuelSystem.payloadPriority === "payload" ? 0.82 : design.fuelSystem.payloadPriority === "range" ? 0.42 : 0.6;
}

function averageSeatWeight(design: AircraftStudioDesign): number {
  const cabin = calculateCabinGeometry(design);
  if (cabin.physicalPassengerCapacity <= 0) {
    return 0;
  }
  let weighted = 0;
  for (const zone of design.cabin.zones) {
    const rows = Math.max(0, Math.floor(zone.zoneLengthM / Math.max(0.1, zone.seatPitchM)));
    weighted += rows * zone.seatsAcross * CABIN_CLASS_DEFAULTS[zone.cabinClass].weightKg;
  }
  return weighted / cabin.physicalPassengerCapacity;
}

function serviceAreaWeight(design: AircraftStudioDesign): number {
  const interiorFactor = design.structure.interiorMaterial === "lightweight" ? 0.86 : design.structure.interiorMaterial === "premium" ? 1.18 : 1;
  return Math.round((design.cabin.lavatoryCount * 135 + design.cabin.galleyCount * 260 + design.cabin.galleySizeM2 * 38 + design.cabin.storageAreaM2 * 30) * interiorFactor);
}

function totalFuelVolumeM3(design: AircraftStudioDesign): number {
  return design.wing.wingFuelVolumeM3 + design.fuelSystem.centerTankVolumeM3 + design.fuelSystem.auxiliaryTankVolumeM3;
}

function categoryComfortDensity(category: AircraftCategory): number {
  return category === "wide-body" ? 8.2 : category === "narrow-body" ? 5.6 : 4.1;
}

function missionReferenceRange(category: AircraftCategory, mission: AircraftStudioDesign["missionProfile"]): number {
  const baseline = AIRCRAFT_CATEGORIES[category].rangeRangeNm;
  if (mission === "short-haul" || mission === "small-airport-operations") {
    return baseline[0] * 0.78;
  }
  if (mission === "long-haul" || mission === "premium-comfort") {
    return baseline[1] * 0.82;
  }
  if (mission === "high-capacity") {
    return (baseline[0] + baseline[1]) / 2;
  }
  return (baseline[0] + baseline[1]) / 2;
}

function minimumMtow(category: AircraftCategory): number {
  return category === "wide-body" ? 120_000 : category === "narrow-body" ? 43_000 : 24_000;
}

function maximumMtow(category: AircraftCategory): number {
  return category === "wide-body" ? 360_000 : category === "narrow-body" ? 115_000 : 58_000;
}

function minimumThrustToWeight(category: AircraftCategory): number {
  return category === "wide-body" ? 0.18 : category === "narrow-body" ? 0.23 : 0.27;
}

function maximumWingLoading(category: AircraftCategory): number {
  return category === "wide-body" ? 780 : category === "narrow-body" ? 720 : 620;
}

function gateCategory(spanM: number): AircraftCalculatedPerformance["gateCategory"] {
  if (spanM <= 32) {
    return "regional";
  }
  if (spanM <= 40) {
    return "narrow-body";
  }
  if (spanM <= 65) {
    return "wide-body";
  }
  return "large-wide-body";
}

function comfortRating(score: number): string {
  if (score >= 82) {
    return "Premium";
  }
  if (score >= 68) {
    return "Comfortable";
  }
  if (score >= 52) {
    return "Standard";
  }
  return "Dense";
}

function categoryFitScore(value: number, range: [number, number]): number {
  const midpoint = (range[0] + range[1]) / 2;
  const width = range[1] - range[0];
  return clamp(100 - Math.abs(value - midpoint) / width * 130, 0, 100);
}

function legacyEngineType(engine: EngineOption): AircraftDesignInput["engineType"] {
  if (engine.requiredTechnologyId === "advanced-turbofans" || engine.fuelEfficiency >= 1.05) {
    return "advanced-turbofan";
  }
  if (engine.requiredTechnologyId || engine.fuelEfficiency >= 0.86) {
    return "high-bypass-turbofan";
  }
  return "low-bypass-turbofan";
}

function legacyMaterialType(
  fuselageMaterial: StructuralMaterialChoice,
  wingMaterial: StructuralMaterialChoice
): AircraftDesignInput["structuralMaterial"] {
  if (fuselageMaterial.includes("composite") || wingMaterial.includes("composite")) {
    return "early-composite";
  }
  if (fuselageMaterial === "improved-aluminum" || wingMaterial === "improved-aluminum" || fuselageMaterial === "aluminum-lithium" || wingMaterial === "aluminum-lithium") {
    return "improved-aluminum";
  }
  return "classic-aluminum";
}

function legacyAvionicsType(avionics: AvionicsGeneration): AircraftDesignInput["avionicsPackage"] {
  if (avionics === "digital-i" || avionics === "integrated-modular") {
    return "digital";
  }
  return avionics;
}

function buildDrivers(
  design: AircraftStudioDesign,
  engine: EngineOption,
  cabin: CabinGeometryResult,
  aero: { aspectRatio: number; liftToDragRatio: number }
): Record<string, string[]> {
  return {
    Cabin: [
      `${cabin.physicalPassengerCapacity} physical seats from ${cabin.usedPassengerLengthM} m of cabin zones`,
      `${cabin.widestRequiredCabinM} m required cabin width against ${design.fuselage.internalCabinWidthM.toFixed(2)} m available`
    ],
    Wing: [
      `Aspect ratio ${aero.aspectRatio} and L/D ${aero.liftToDragRatio}`,
      `${design.wing.highLiftSystem.replaceAll("-", " ")} with ${design.wing.wingtipDevice.replaceAll("-", " ")} tips`
    ],
    Propulsion: [
      `${design.propulsion.engineCount}x ${engine.family} at ${Math.round(engine.maxThrustKn * (1 - design.propulsion.thrustDeratePercent / 100))} kN each`,
      `${engine.fuelEfficiency.toFixed(2)} relative fuel-efficiency factor`
    ],
    Structure: [
      `${design.structure.fuselageMaterial.replaceAll("-", " ")} fuselage`,
      `${design.structure.wingMaterial.replaceAll("-", " ")} wing`
    ]
  };
}

function invalid(stage: AircraftValidationItem["stage"], title: string, message: string, fix: string): AircraftValidationItem {
  return { level: "invalid", stage, title, message, fix };
}

function warning(stage: AircraftValidationItem["stage"], title: string, message: string, fix: string): AircraftValidationItem {
  return { level: "warning", stage, title, message, fix };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}

function clampToStep(value: number, min: number, max: number, step: number): number {
  const clamped = clamp(Number.isFinite(value) ? value : min, min, max);
  return round(Math.round(clamped / step) * step, step < 1 ? 3 : 0);
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

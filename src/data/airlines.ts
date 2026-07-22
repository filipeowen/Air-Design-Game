import type { Airline } from "@/game/types";

export const STARTING_AIRLINES: Airline[] = [
  {
    id: "continental-crown",
    name: "Continental Crown Airways",
    region: "north-america",
    fleetSize: 220,
    financialStrength: 76,
    preferredCategory: "narrow-body",
    priceSensitivity: 58,
    reliabilityPreference: 72,
    fuelEfficiencyPreference: 64,
    relationshipScore: {},
    lastOrderTurn: -6
  },
  {
    id: "aurora-international",
    name: "Aurora International",
    region: "europe",
    fleetSize: 165,
    financialStrength: 70,
    preferredCategory: "wide-body",
    priceSensitivity: 46,
    reliabilityPreference: 77,
    fuelEfficiencyPreference: 68,
    relationshipScore: {},
    lastOrderTurn: -4
  },
  {
    id: "sunbridge",
    name: "Sunbridge Air Lines",
    region: "asia-pacific",
    fleetSize: 125,
    financialStrength: 67,
    preferredCategory: "wide-body",
    priceSensitivity: 42,
    reliabilityPreference: 74,
    fuelEfficiencyPreference: 72,
    relationshipScore: {},
    lastOrderTurn: -2
  },
  {
    id: "andes-national",
    name: "Andes National",
    region: "latin-america",
    fleetSize: 70,
    financialStrength: 52,
    preferredCategory: "regional-jet",
    priceSensitivity: 75,
    reliabilityPreference: 62,
    fuelEfficiencyPreference: 58,
    relationshipScore: {},
    lastOrderTurn: -8
  },
  {
    id: "oasis-gulf",
    name: "Oasis Gulf Airways",
    region: "middle-east",
    fleetSize: 44,
    financialStrength: 82,
    preferredCategory: "wide-body",
    priceSensitivity: 35,
    reliabilityPreference: 70,
    fuelEfficiencyPreference: 61,
    relationshipScore: {},
    lastOrderTurn: -10
  },
  {
    id: "union-skies",
    name: "Union Skies",
    region: "soviet-market",
    fleetSize: 190,
    financialStrength: 61,
    preferredCategory: "narrow-body",
    priceSensitivity: 68,
    reliabilityPreference: 59,
    fuelEfficiencyPreference: 54,
    relationshipScore: {},
    lastOrderTurn: -5
  },
  {
    id: "savanna-link",
    name: "Savanna Link",
    region: "africa",
    fleetSize: 38,
    financialStrength: 43,
    preferredCategory: "regional-jet",
    priceSensitivity: 80,
    reliabilityPreference: 66,
    fuelEfficiencyPreference: 55,
    relationshipScore: {},
    lastOrderTurn: -9
  },
  {
    id: "nordic-route",
    name: "Nordic Route",
    region: "europe",
    fleetSize: 58,
    financialStrength: 63,
    preferredCategory: "regional-jet",
    priceSensitivity: 61,
    reliabilityPreference: 79,
    fuelEfficiencyPreference: 65,
    relationshipScore: {},
    lastOrderTurn: -7
  }
];

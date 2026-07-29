import { GAME_CONTENT_SETTINGS } from "@/data/contentSettings";
import { getAirlineIdentity } from "@/data/identities";
import type { Airline, NamingMode } from "@/game/types";

type AirlineProfile = Omit<Airline, "name" | "region" | "relationshipScore" | "identityId" | "country">;

const AIRLINE_PROFILES: AirlineProfile[] = [
  {
    id: "continental-crown",
    fleetSize: 220,
    financialStrength: 76,
    preferredCategory: "narrow-body",
    priceSensitivity: 58,
    reliabilityPreference: 72,
    fuelEfficiencyPreference: 64,
    lastOrderTurn: -6
  },
  {
    id: "aurora-international",
    fleetSize: 165,
    financialStrength: 70,
    preferredCategory: "wide-body",
    priceSensitivity: 46,
    reliabilityPreference: 77,
    fuelEfficiencyPreference: 68,
    lastOrderTurn: -4
  },
  {
    id: "sunbridge",
    fleetSize: 125,
    financialStrength: 67,
    preferredCategory: "wide-body",
    priceSensitivity: 42,
    reliabilityPreference: 74,
    fuelEfficiencyPreference: 72,
    lastOrderTurn: -2
  },
  {
    id: "andes-national",
    fleetSize: 70,
    financialStrength: 52,
    preferredCategory: "regional-jet",
    priceSensitivity: 75,
    reliabilityPreference: 62,
    fuelEfficiencyPreference: 58,
    lastOrderTurn: -8
  },
  {
    id: "oasis-gulf",
    fleetSize: 44,
    financialStrength: 82,
    preferredCategory: "wide-body",
    priceSensitivity: 35,
    reliabilityPreference: 70,
    fuelEfficiencyPreference: 61,
    lastOrderTurn: -10
  },
  {
    id: "union-skies",
    fleetSize: 190,
    financialStrength: 61,
    preferredCategory: "narrow-body",
    priceSensitivity: 68,
    reliabilityPreference: 59,
    fuelEfficiencyPreference: 54,
    lastOrderTurn: -5
  },
  {
    id: "savanna-link",
    fleetSize: 38,
    financialStrength: 43,
    preferredCategory: "regional-jet",
    priceSensitivity: 80,
    reliabilityPreference: 66,
    fuelEfficiencyPreference: 55,
    lastOrderTurn: -9
  },
  {
    id: "nordic-route",
    fleetSize: 58,
    financialStrength: 63,
    preferredCategory: "regional-jet",
    priceSensitivity: 61,
    reliabilityPreference: 79,
    fuelEfficiencyPreference: 65,
    lastOrderTurn: -7
  },
  {
    id: "atlantic-flagship",
    fleetSize: 245,
    financialStrength: 73,
    preferredCategory: "wide-body",
    priceSensitivity: 44,
    reliabilityPreference: 76,
    fuelEfficiencyPreference: 62,
    lastOrderTurn: -5
  },
  {
    id: "transworld-network",
    fleetSize: 185,
    financialStrength: 66,
    preferredCategory: "narrow-body",
    priceSensitivity: 55,
    reliabilityPreference: 70,
    fuelEfficiencyPreference: 60,
    lastOrderTurn: -4
  },
  {
    id: "american-mainline",
    fleetSize: 205,
    financialStrength: 75,
    preferredCategory: "narrow-body",
    priceSensitivity: 57,
    reliabilityPreference: 74,
    fuelEfficiencyPreference: 63,
    lastOrderTurn: -6
  },
  {
    id: "delta-mainline",
    fleetSize: 150,
    financialStrength: 68,
    preferredCategory: "narrow-body",
    priceSensitivity: 60,
    reliabilityPreference: 73,
    fuelEfficiencyPreference: 64,
    lastOrderTurn: -3
  },
  {
    id: "northwest-orient",
    fleetSize: 145,
    financialStrength: 64,
    preferredCategory: "wide-body",
    priceSensitivity: 52,
    reliabilityPreference: 71,
    fuelEfficiencyPreference: 61,
    lastOrderTurn: -7
  },
  {
    id: "eastern-mainline",
    fleetSize: 172,
    financialStrength: 60,
    preferredCategory: "narrow-body",
    priceSensitivity: 65,
    reliabilityPreference: 68,
    fuelEfficiencyPreference: 58,
    lastOrderTurn: -4
  },
  {
    id: "lufthansa-group",
    fleetSize: 126,
    financialStrength: 72,
    preferredCategory: "wide-body",
    priceSensitivity: 48,
    reliabilityPreference: 78,
    fuelEfficiencyPreference: 69,
    lastOrderTurn: -5
  },
  {
    id: "british-overseas",
    fleetSize: 118,
    financialStrength: 69,
    preferredCategory: "wide-body",
    priceSensitivity: 49,
    reliabilityPreference: 76,
    fuelEfficiencyPreference: 66,
    lastOrderTurn: -6
  },
  {
    id: "qantas-kangaroo",
    fleetSize: 72,
    financialStrength: 71,
    preferredCategory: "wide-body",
    priceSensitivity: 45,
    reliabilityPreference: 79,
    fuelEfficiencyPreference: 68,
    lastOrderTurn: -8
  },
  {
    id: "cathay-pacific",
    fleetSize: 54,
    financialStrength: 58,
    preferredCategory: "narrow-body",
    priceSensitivity: 61,
    reliabilityPreference: 70,
    fuelEfficiencyPreference: 63,
    lastOrderTurn: -5
  },
  {
    id: "air-canada",
    fleetSize: 108,
    financialStrength: 67,
    preferredCategory: "narrow-body",
    priceSensitivity: 56,
    reliabilityPreference: 75,
    fuelEfficiencyPreference: 62,
    lastOrderTurn: -7
  }
];

export function createStartingAirlines(mode: NamingMode = GAME_CONTENT_SETTINGS.namingMode): Airline[] {
  return AIRLINE_PROFILES.map((profile) => {
    const identity = getAirlineIdentity(profile.id, mode);
    return {
      ...profile,
      identityId: identity.id,
      name: identity.displayName,
      country: identity.country,
      region: identity.region,
      relationshipScore: {}
    };
  });
}

export const STARTING_AIRLINES: Airline[] = createStartingAirlines();

import type {
  AircraftCategory,
  AircraftIdentity,
  AirlineIdentity,
  ManufacturerIdentity,
  NamingMode
} from "@/game/types";

type IdentitySet<T> = Record<NamingMode, T[]>;

const MANUFACTURER_IDENTITIES: IdentitySet<ManufacturerIdentity> = {
  real_world: [
    {
      id: "player",
      displayName: "Boeing",
      shortName: "Boeing",
      country: "United States",
      historicalInspiration: "Boeing",
      isRealWorldName: true
    },
    {
      id: "pacific-aeroworks",
      displayName: "McDonnell Douglas",
      shortName: "McDonnell Douglas",
      country: "United States",
      historicalInspiration: "McDonnell Douglas",
      isRealWorldName: true
    },
    {
      id: "dominion-aircraft",
      displayName: "Lockheed",
      shortName: "Lockheed",
      country: "United States",
      historicalInspiration: "Lockheed",
      isRealWorldName: true
    },
    {
      id: "meridian-aviation",
      displayName: "Airbus",
      shortName: "Airbus",
      country: "France",
      historicalInspiration: "Airbus",
      isRealWorldName: true
    },
    {
      id: "euro-aerospace-consortium",
      displayName: "British Aircraft Corporation",
      shortName: "BAC",
      country: "United Kingdom",
      historicalInspiration: "British Aerospace",
      isRealWorldName: true
    },
    {
      id: "noord-aviation",
      displayName: "Fokker",
      shortName: "Fokker",
      country: "Netherlands",
      historicalInspiration: "Fokker",
      isRealWorldName: true
    },
    {
      id: "atlantico-aeronautics",
      displayName: "Embraer",
      shortName: "Embraer",
      country: "Brazil",
      historicalInspiration: "Embraer",
      isRealWorldName: true
    },
    {
      id: "sunrise-heavy",
      displayName: "Tupolev",
      shortName: "Tupolev",
      country: "Soviet Union",
      historicalInspiration: "Tupolev",
      isRealWorldName: true
    },
    {
      id: "bombardier",
      displayName: "Bombardier",
      shortName: "Bombardier",
      country: "Canada",
      historicalInspiration: "Bombardier",
      isRealWorldName: true
    },
    {
      id: "sud-aviation",
      displayName: "Sud Aviation",
      shortName: "Sud Aviation",
      country: "France",
      historicalInspiration: "Sud Aviation",
      isRealWorldName: true
    },
    {
      id: "ilyushin",
      displayName: "Ilyushin",
      shortName: "Ilyushin",
      country: "Soviet Union",
      historicalInspiration: "Ilyushin",
      isRealWorldName: true
    }
  ],
  fictional: [
    {
      id: "player",
      displayName: "Pioneer Commercial Aircraft",
      shortName: "Pioneer",
      country: "United States",
      historicalInspiration: "Boeing",
      isRealWorldName: false
    },
    {
      id: "pacific-aeroworks",
      displayName: "Pacific Aeroworks",
      shortName: "Pacific",
      country: "United States",
      historicalInspiration: "McDonnell Douglas",
      isRealWorldName: false
    },
    {
      id: "dominion-aircraft",
      displayName: "Dominion Aircraft",
      shortName: "Dominion",
      country: "United States",
      historicalInspiration: "Lockheed",
      isRealWorldName: false
    },
    {
      id: "meridian-aviation",
      displayName: "Meridian Aviation",
      shortName: "Meridian",
      country: "France",
      historicalInspiration: "Airbus",
      isRealWorldName: false
    },
    {
      id: "euro-aerospace-consortium",
      displayName: "European Aerospace Consortium",
      shortName: "EAC",
      country: "United Kingdom",
      historicalInspiration: "British Aerospace",
      isRealWorldName: false
    },
    {
      id: "noord-aviation",
      displayName: "Noord Aviation",
      shortName: "Noord",
      country: "Netherlands",
      historicalInspiration: "Fokker",
      isRealWorldName: false
    },
    {
      id: "atlantico-aeronautics",
      displayName: "Atlantico Aeronautics",
      shortName: "Atlantico",
      country: "Brazil",
      historicalInspiration: "Embraer",
      isRealWorldName: false
    },
    {
      id: "sunrise-heavy",
      displayName: "Sunrise Heavy Industries",
      shortName: "Sunrise",
      country: "Japan",
      historicalInspiration: "Tupolev",
      isRealWorldName: false
    },
    {
      id: "bombardier",
      displayName: "Boreal Aerospace",
      shortName: "Boreal",
      country: "Canada",
      historicalInspiration: "Bombardier",
      isRealWorldName: false
    },
    {
      id: "sud-aviation",
      displayName: "Sud Atlantique",
      shortName: "Sud Atlantique",
      country: "France",
      historicalInspiration: "Sud Aviation",
      isRealWorldName: false
    },
    {
      id: "ilyushin",
      displayName: "Volga Design Bureau",
      shortName: "Volga",
      country: "Soviet Union",
      historicalInspiration: "Ilyushin",
      isRealWorldName: false
    }
  ]
};

const AIRLINE_IDENTITIES: IdentitySet<AirlineIdentity> = {
  real_world: [
    {
      id: "continental-crown",
      displayName: "United Airlines",
      shortName: "United",
      country: "United States",
      region: "north-america",
      historicalInspiration: "United Airlines",
      isRealWorldName: true
    },
    {
      id: "aurora-international",
      displayName: "Air France",
      shortName: "Air France",
      country: "France",
      region: "europe",
      historicalInspiration: "Air France",
      isRealWorldName: true
    },
    {
      id: "sunbridge",
      displayName: "Japan Airlines",
      shortName: "JAL",
      country: "Japan",
      region: "asia-pacific",
      historicalInspiration: "Japan Airlines",
      isRealWorldName: true
    },
    {
      id: "andes-national",
      displayName: "Varig",
      shortName: "Varig",
      country: "Brazil",
      region: "latin-america",
      historicalInspiration: "Varig",
      isRealWorldName: true
    },
    {
      id: "oasis-gulf",
      displayName: "Middle East Airlines",
      shortName: "MEA",
      country: "Lebanon",
      region: "middle-east",
      historicalInspiration: "Middle East Airlines",
      isRealWorldName: true
    },
    {
      id: "union-skies",
      displayName: "Aeroflot",
      shortName: "Aeroflot",
      country: "Soviet Union",
      region: "soviet-market",
      historicalInspiration: "Aeroflot",
      isRealWorldName: true
    },
    {
      id: "savanna-link",
      displayName: "South African Airways",
      shortName: "SAA",
      country: "South Africa",
      region: "africa",
      historicalInspiration: "South African Airways",
      isRealWorldName: true
    },
    {
      id: "nordic-route",
      displayName: "KLM",
      shortName: "KLM",
      country: "Netherlands",
      region: "europe",
      historicalInspiration: "KLM",
      isRealWorldName: true
    },
    {
      id: "atlantic-flagship",
      displayName: "Pan Am",
      shortName: "Pan Am",
      country: "United States",
      region: "north-america",
      historicalInspiration: "Pan Am",
      isRealWorldName: true
    },
    {
      id: "transworld-network",
      displayName: "TWA",
      shortName: "TWA",
      country: "United States",
      region: "north-america",
      historicalInspiration: "TWA",
      isRealWorldName: true
    },
    {
      id: "american-mainline",
      displayName: "American Airlines",
      shortName: "American",
      country: "United States",
      region: "north-america",
      historicalInspiration: "American Airlines",
      isRealWorldName: true
    },
    {
      id: "delta-mainline",
      displayName: "Delta Air Lines",
      shortName: "Delta",
      country: "United States",
      region: "north-america",
      historicalInspiration: "Delta Air Lines",
      isRealWorldName: true
    },
    {
      id: "northwest-orient",
      displayName: "Northwest Orient",
      shortName: "Northwest",
      country: "United States",
      region: "north-america",
      historicalInspiration: "Northwest Airlines",
      isRealWorldName: true
    },
    {
      id: "eastern-mainline",
      displayName: "Eastern Air Lines",
      shortName: "Eastern",
      country: "United States",
      region: "north-america",
      historicalInspiration: "Eastern Air Lines",
      isRealWorldName: true
    },
    {
      id: "lufthansa-group",
      displayName: "Lufthansa",
      shortName: "Lufthansa",
      country: "West Germany",
      region: "europe",
      historicalInspiration: "Lufthansa",
      isRealWorldName: true
    },
    {
      id: "british-overseas",
      displayName: "BOAC",
      shortName: "BOAC",
      country: "United Kingdom",
      region: "europe",
      historicalInspiration: "British Airways",
      isRealWorldName: true
    },
    {
      id: "qantas-kangaroo",
      displayName: "Qantas",
      shortName: "Qantas",
      country: "Australia",
      region: "asia-pacific",
      historicalInspiration: "Qantas",
      isRealWorldName: true
    },
    {
      id: "cathay-pacific",
      displayName: "Cathay Pacific",
      shortName: "Cathay",
      country: "Hong Kong",
      region: "asia-pacific",
      historicalInspiration: "Cathay Pacific",
      isRealWorldName: true
    },
    {
      id: "air-canada",
      displayName: "Air Canada",
      shortName: "Air Canada",
      country: "Canada",
      region: "north-america",
      historicalInspiration: "Air Canada",
      isRealWorldName: true
    }
  ],
  fictional: [
    {
      id: "continental-crown",
      displayName: "Continental Crown Airways",
      shortName: "Continental Crown",
      country: "United States",
      region: "north-america",
      historicalInspiration: "United Airlines",
      isRealWorldName: false
    },
    {
      id: "aurora-international",
      displayName: "Aurora International",
      shortName: "Aurora",
      country: "France",
      region: "europe",
      historicalInspiration: "Air France",
      isRealWorldName: false
    },
    {
      id: "sunbridge",
      displayName: "Sunbridge Air Lines",
      shortName: "Sunbridge",
      country: "Japan",
      region: "asia-pacific",
      historicalInspiration: "Japan Airlines",
      isRealWorldName: false
    },
    {
      id: "andes-national",
      displayName: "Andes National",
      shortName: "Andes",
      country: "Brazil",
      region: "latin-america",
      historicalInspiration: "Varig",
      isRealWorldName: false
    },
    {
      id: "oasis-gulf",
      displayName: "Oasis Gulf Airways",
      shortName: "Oasis",
      country: "United Arab Emirates",
      region: "middle-east",
      historicalInspiration: "Middle East Airlines",
      isRealWorldName: false
    },
    {
      id: "union-skies",
      displayName: "Union Skies",
      shortName: "Union",
      country: "Soviet Union",
      region: "soviet-market",
      historicalInspiration: "Aeroflot",
      isRealWorldName: false
    },
    {
      id: "savanna-link",
      displayName: "Savanna Link",
      shortName: "Savanna",
      country: "South Africa",
      region: "africa",
      historicalInspiration: "South African Airways",
      isRealWorldName: false
    },
    {
      id: "nordic-route",
      displayName: "Nordic Route",
      shortName: "Nordic",
      country: "Netherlands",
      region: "europe",
      historicalInspiration: "KLM",
      isRealWorldName: false
    },
    {
      id: "atlantic-flagship",
      displayName: "Atlantic Flagship Airways",
      shortName: "Atlantic",
      country: "United States",
      region: "north-america",
      historicalInspiration: "Pan Am",
      isRealWorldName: false
    },
    {
      id: "transworld-network",
      displayName: "Transworld Network",
      shortName: "Transworld",
      country: "United States",
      region: "north-america",
      historicalInspiration: "TWA",
      isRealWorldName: false
    },
    {
      id: "american-mainline",
      displayName: "American Mainline",
      shortName: "American Mainline",
      country: "United States",
      region: "north-america",
      historicalInspiration: "American Airlines",
      isRealWorldName: false
    },
    {
      id: "delta-mainline",
      displayName: "Delta Mainline",
      shortName: "Delta Mainline",
      country: "United States",
      region: "north-america",
      historicalInspiration: "Delta Air Lines",
      isRealWorldName: false
    },
    {
      id: "northwest-orient",
      displayName: "Northwest Meridian",
      shortName: "Northwest",
      country: "United States",
      region: "north-america",
      historicalInspiration: "Northwest Airlines",
      isRealWorldName: false
    },
    {
      id: "eastern-mainline",
      displayName: "Eastern Mainline",
      shortName: "Eastern",
      country: "United States",
      region: "north-america",
      historicalInspiration: "Eastern Air Lines",
      isRealWorldName: false
    },
    {
      id: "lufthansa-group",
      displayName: "Rheinland Air Service",
      shortName: "Rheinland",
      country: "Germany",
      region: "europe",
      historicalInspiration: "Lufthansa",
      isRealWorldName: false
    },
    {
      id: "british-overseas",
      displayName: "British Overseas Airways",
      shortName: "British Overseas",
      country: "United Kingdom",
      region: "europe",
      historicalInspiration: "British Airways",
      isRealWorldName: false
    },
    {
      id: "qantas-kangaroo",
      displayName: "Southern Cross Airways",
      shortName: "Southern Cross",
      country: "Australia",
      region: "asia-pacific",
      historicalInspiration: "Qantas",
      isRealWorldName: false
    },
    {
      id: "cathay-pacific",
      displayName: "Pearl River Airways",
      shortName: "Pearl River",
      country: "Hong Kong",
      region: "asia-pacific",
      historicalInspiration: "Cathay Pacific",
      isRealWorldName: false
    },
    {
      id: "air-canada",
      displayName: "Maple Air",
      shortName: "Maple",
      country: "Canada",
      region: "north-america",
      historicalInspiration: "Air Canada",
      isRealWorldName: false
    }
  ]
};

const AIRCRAFT_IDENTITIES: IdentitySet<AircraftIdentity> = {
  real_world: [
    aircraft("boeing-707", "Boeing 707", "707", "player", "narrow-body", 1958),
    aircraft("boeing-727", "Boeing 727", "727", "player", "narrow-body", 1964),
    aircraft("boeing-737", "Boeing 737", "737", "player", "narrow-body", 1968),
    aircraft("boeing-747", "Boeing 747", "747", "player", "wide-body", 1970),
    aircraft("douglas-dc-8", "Douglas DC-8", "DC-8", "pacific-aeroworks", "narrow-body", 1959),
    aircraft("douglas-dc-9", "Douglas DC-9", "DC-9", "pacific-aeroworks", "regional-jet", 1965),
    aircraft("mcdonnell-douglas-dc-10", "McDonnell Douglas DC-10", "DC-10", "pacific-aeroworks", "wide-body", 1971),
    aircraft("mcdonnell-douglas-md-80", "McDonnell Douglas MD-80", "MD-80", "pacific-aeroworks", "narrow-body", 1980),
    aircraft("lockheed-l-1011-tristar", "Lockheed L-1011 TriStar", "L-1011", "dominion-aircraft", "wide-body", 1972),
    aircraft("airbus-a300", "Airbus A300", "A300", "meridian-aviation", "wide-body", 1974),
    aircraft("airbus-a310", "Airbus A310", "A310", "meridian-aviation", "wide-body", 1983),
    aircraft("airbus-a320", "Airbus A320", "A320", "meridian-aviation", "narrow-body", 1988),
    aircraft("bac-one-eleven", "BAC One-Eleven", "One-Eleven", "euro-aerospace-consortium", "regional-jet", 1965),
    aircraft("bae-146", "British Aerospace 146", "BAe 146", "euro-aerospace-consortium", "regional-jet", 1983),
    aircraft("fokker-f28", "Fokker F28", "F28", "noord-aviation", "regional-jet", 1969),
    aircraft("fokker-100", "Fokker 100", "100", "noord-aviation", "regional-jet", 1988),
    aircraft("embraer-110", "Embraer EMB 110", "EMB 110", "atlantico-aeronautics", "regional-jet", 1968),
    aircraft("embraer-120", "Embraer EMB 120", "EMB 120", "atlantico-aeronautics", "regional-jet", 1985),
    aircraft("embraer-erj-145", "Embraer ERJ 145", "ERJ 145", "atlantico-aeronautics", "regional-jet", 1996),
    aircraft("tupolev-tu-134", "Tupolev Tu-134", "Tu-134", "sunrise-heavy", "regional-jet", 1967),
    aircraft("tupolev-tu-154", "Tupolev Tu-154", "Tu-154", "sunrise-heavy", "narrow-body", 1972),
    aircraft("bombardier-crj100", "Bombardier CRJ100", "CRJ100", "bombardier", "regional-jet", 1992),
    aircraft("ilyushin-il-62", "Ilyushin Il-62", "Il-62", "ilyushin", "wide-body", 1967),
    aircraft("sud-aviation-caravelle", "Sud Aviation Caravelle", "Caravelle", "sud-aviation", "regional-jet", 1959)
  ],
  fictional: [
    aircraft("pioneer-n160", "Pioneer N-160", "N-160", "player", "narrow-body", 1970, false),
    aircraft("pioneer-w310", "Pioneer W-310", "W-310", "player", "wide-body", 1970, false),
    aircraft("pacific-r72", "Pacific R-72 Commuter", "R-72", "pacific-aeroworks", "regional-jet", 1970, false),
    aircraft("pacific-n160", "Pacific N-160 Meridian", "N-160", "pacific-aeroworks", "narrow-body", 1970, false),
    aircraft("pacific-w310", "Pacific W-310 Intercontinental", "W-310", "pacific-aeroworks", "wide-body", 1970, false),
    aircraft("dominion-r72", "Dominion R-72 Commuter", "R-72", "dominion-aircraft", "regional-jet", 1970, false),
    aircraft("dominion-n160", "Dominion N-160 Meridian", "N-160", "dominion-aircraft", "narrow-body", 1970, false),
    aircraft("meridian-w310", "Meridian W-310 Intercontinental", "W-310", "meridian-aviation", "wide-body", 1970, false),
    aircraft("eac-r72", "EAC R-72 Commuter", "R-72", "euro-aerospace-consortium", "regional-jet", 1970, false),
    aircraft("eac-n160", "EAC N-160 Meridian", "N-160", "euro-aerospace-consortium", "narrow-body", 1970, false),
    aircraft("eac-w310", "EAC W-310 Intercontinental", "W-310", "euro-aerospace-consortium", "wide-body", 1970, false),
    aircraft("noord-r72", "Noord R-72 Commuter", "R-72", "noord-aviation", "regional-jet", 1970, false),
    aircraft("atlantico-r72", "Atlantico R-72 Commuter", "R-72", "atlantico-aeronautics", "regional-jet", 1970, false),
    aircraft("sunrise-r72", "Sunrise R-72 Commuter", "R-72", "sunrise-heavy", "regional-jet", 1970, false),
    aircraft("sunrise-n160", "Sunrise N-160 Meridian", "N-160", "sunrise-heavy", "narrow-body", 1970, false)
  ]
};

export interface AircraftNameSelection {
  identityId?: string;
  displayName: string;
}

export function getManufacturerIdentities(mode: NamingMode): ManufacturerIdentity[] {
  return MANUFACTURER_IDENTITIES[mode];
}

export function getAirlineIdentities(mode: NamingMode): AirlineIdentity[] {
  return AIRLINE_IDENTITIES[mode];
}

export function getManufacturerIdentity(manufacturerId: string, mode: NamingMode): ManufacturerIdentity {
  return findById(MANUFACTURER_IDENTITIES[mode], manufacturerId) ?? fallbackManufacturerIdentity(manufacturerId, mode);
}

export function getAirlineIdentity(airlineId: string, mode: NamingMode): AirlineIdentity {
  return findById(AIRLINE_IDENTITIES[mode], airlineId) ?? fallbackAirlineIdentity(airlineId, mode);
}

export function getDefaultPlayerCompanyName(mode: NamingMode): string {
  return getManufacturerIdentity("player", mode).displayName;
}

export function getAircraftNameSelection(
  manufacturerId: string,
  category: AircraftCategory,
  year: number,
  mode: NamingMode,
  usedNames: string[] = []
): AircraftNameSelection {
  const normalizedUsed = new Set(usedNames.map((name) => name.toLowerCase()));
  const identity = AIRCRAFT_IDENTITIES[mode]
    .filter((candidate) => candidate.manufacturerId === manufacturerId)
    .filter((candidate) => candidate.category === category)
    .filter((candidate) => candidate.startYear <= year && (candidate.endYear === undefined || candidate.endYear >= year))
    .filter((candidate) => !normalizedUsed.has(candidate.displayName.toLowerCase()))
    .sort((a, b) => b.startYear - a.startYear || a.displayName.localeCompare(b.displayName))[0];

  if (identity) {
    return {
      identityId: identity.id,
      displayName: identity.displayName
    };
  }

  return {
    displayName: createFallbackAircraftName(manufacturerId, category, year, mode, usedNames)
  };
}

export function getAircraftIdentity(aircraftId: string, mode: NamingMode): AircraftIdentity | undefined {
  return findById(AIRCRAFT_IDENTITIES[mode], aircraftId);
}

export function getAircraftIdentityByDisplayName(displayName: string, mode: NamingMode): AircraftIdentity | undefined {
  return AIRCRAFT_IDENTITIES[mode].find((identity) => identity.displayName.toLowerCase() === displayName.toLowerCase());
}

function aircraft(
  id: string,
  displayName: string,
  shortName: string,
  manufacturerId: string,
  category: AircraftCategory,
  startYear: number,
  isRealWorldName = true
): AircraftIdentity {
  return {
    id,
    displayName,
    shortName,
    manufacturerId,
    category,
    startYear,
    historicalInspiration: displayName,
    isRealWorldName
  };
}

function findById<T extends { id: string }>(records: T[], id: string): T | undefined {
  return records.find((record) => record.id === id);
}

function fallbackManufacturerIdentity(manufacturerId: string, mode: NamingMode): ManufacturerIdentity {
  const displayName = titleFromId(manufacturerId);
  return {
    id: manufacturerId,
    displayName,
    shortName: displayName.split(" ")[0] ?? displayName,
    country: "Unknown",
    isRealWorldName: mode === "real_world"
  };
}

function fallbackAirlineIdentity(airlineId: string, mode: NamingMode): AirlineIdentity {
  const displayName = titleFromId(airlineId);
  return {
    id: airlineId,
    displayName,
    shortName: displayName.split(" ")[0] ?? displayName,
    country: "Unknown",
    region: "north-america",
    isRealWorldName: mode === "real_world"
  };
}

function createFallbackAircraftName(
  manufacturerId: string,
  category: AircraftCategory,
  year: number,
  mode: NamingMode,
  usedNames: string[]
): string {
  const manufacturer = getManufacturerIdentity(manufacturerId, mode);
  const baseNumber = category === "regional-jet" ? 70 : category === "narrow-body" ? 160 : 300;
  const generation = Math.max(0, year - 1970);
  const candidate = `${manufacturer.shortName} ${categoryPrefix(category)}-${baseNumber + (generation % 60)}`;

  if (!usedNames.includes(candidate)) {
    return candidate;
  }

  return `${candidate}-${usedNames.length + 1}`;
}

function categoryPrefix(category: AircraftCategory): string {
  if (category === "regional-jet") {
    return "RJ";
  }
  if (category === "narrow-body") {
    return "N";
  }
  return "W";
}

function titleFromId(id: string): string {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

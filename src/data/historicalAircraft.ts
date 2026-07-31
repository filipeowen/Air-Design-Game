import type { AircraftCategory, AircraftDesignInput, NamingMode } from "@/game/types";

export interface HistoricalAircraftRecord {
  identityId: string;
  manufacturerIdentityId: string;
  displayName: string;
  category: AircraftCategory;
  entryIntoServiceYear: number;
  productionEndYear?: number;
  capacity: number;
  rangeNm: number;
  cruiseSpeedMach?: number;
  engineCount?: number;
  engineType?: AircraftDesignInput["engineType"];
  engineThrustKn?: number;
  structuralMaterial?: AircraftDesignInput["structuralMaterial"];
  avionicsPackage?: AircraftDesignInput["avionicsPackage"];
  cabinComfort?: number;
  seatingDensity?: number;
  reliabilityTarget?: number;
  commonality?: number;
  initialProductionRate?: number;
}

export const HISTORICAL_AIRCRAFT: HistoricalAircraftRecord[] = [
  historical("boeing-707", "player", "Boeing 707", "narrow-body", 1958, 150, 4200, {
    productionEndYear: 1978,
    engineCount: 4,
    engineType: "low-bypass-turbofan",
    engineThrustKn: 82,
    reliabilityTarget: 67,
    initialProductionRate: 2
  }),
  historical("boeing-727", "player", "Boeing 727", "narrow-body", 1964, 145, 2400, {
    productionEndYear: 1984,
    engineCount: 3,
    engineType: "low-bypass-turbofan",
    engineThrustKn: 65,
    reliabilityTarget: 69,
    initialProductionRate: 3
  }),
  historical("boeing-737", "player", "Boeing 737", "narrow-body", 1968, 115, 1900, {
    engineType: "low-bypass-turbofan",
    engineThrustKn: 72,
    reliabilityTarget: 70,
    initialProductionRate: 3
  }),
  historical("boeing-747", "player", "Boeing 747", "wide-body", 1970, 366, 5300, {
    engineCount: 4,
    engineType: "high-bypass-turbofan",
    engineThrustKn: 205,
    cabinComfort: 68,
    reliabilityTarget: 66,
    initialProductionRate: 1
  }),
  historical("boeing-757", "player", "Boeing 757", "narrow-body", 1983, 200, 3900, {
    engineType: "high-bypass-turbofan",
    engineThrustKn: 176,
    avionicsPackage: "improved-analog",
    reliabilityTarget: 74,
    initialProductionRate: 2
  }),
  historical("boeing-767", "player", "Boeing 767", "wide-body", 1982, 245, 5900, {
    engineType: "high-bypass-turbofan",
    engineThrustKn: 215,
    avionicsPackage: "improved-analog",
    reliabilityTarget: 74,
    initialProductionRate: 1
  }),
  historical("boeing-777", "player", "Boeing 777", "wide-body", 1995, 314, 7400, {
    engineType: "advanced-turbofan",
    engineThrustKn: 410,
    avionicsPackage: "digital",
    reliabilityTarget: 80,
    initialProductionRate: 1
  }),
  historical("boeing-787", "player", "Boeing 787", "wide-body", 2011, 290, 7600, {
    engineType: "advanced-turbofan",
    engineThrustKn: 330,
    structuralMaterial: "early-composite",
    avionicsPackage: "digital",
    reliabilityTarget: 78,
    initialProductionRate: 1
  }),
  historical("douglas-dc-8", "pacific-aeroworks", "Douglas DC-8", "narrow-body", 1959, 176, 4200, {
    productionEndYear: 1972,
    engineCount: 4,
    engineType: "low-bypass-turbofan",
    engineThrustKn: 85,
    reliabilityTarget: 68,
    initialProductionRate: 2
  }),
  historical("douglas-dc-9", "pacific-aeroworks", "Douglas DC-9", "regional-jet", 1965, 90, 1500, {
    productionEndYear: 1982,
    engineType: "low-bypass-turbofan",
    engineThrustKn: 64,
    reliabilityTarget: 69,
    initialProductionRate: 3
  }),
  historical("mcdonnell-douglas-dc-10", "pacific-aeroworks", "McDonnell Douglas DC-10", "wide-body", 1971, 270, 5200, {
    productionEndYear: 1989,
    engineCount: 3,
    engineType: "high-bypass-turbofan",
    engineThrustKn: 225,
    reliabilityTarget: 66,
    initialProductionRate: 1
  }),
  historical("mcdonnell-douglas-md-80", "pacific-aeroworks", "McDonnell Douglas MD-80", "narrow-body", 1980, 155, 2550, {
    productionEndYear: 1999,
    engineType: "high-bypass-turbofan",
    engineThrustKn: 82,
    avionicsPackage: "improved-analog",
    reliabilityTarget: 73,
    initialProductionRate: 3
  }),
  historical("mcdonnell-douglas-md-11", "pacific-aeroworks", "McDonnell Douglas MD-11", "wide-body", 1990, 293, 6900, {
    productionEndYear: 2000,
    engineCount: 3,
    engineType: "advanced-turbofan",
    engineThrustKn: 275,
    avionicsPackage: "digital",
    reliabilityTarget: 76,
    initialProductionRate: 1
  }),
  historical("boeing-717", "pacific-aeroworks", "Boeing 717", "narrow-body", 1999, 110, 2060, {
    productionEndYear: 2006,
    engineType: "advanced-turbofan",
    engineThrustKn: 82,
    avionicsPackage: "digital",
    reliabilityTarget: 77,
    initialProductionRate: 2
  }),
  historical("lockheed-l-1011-tristar", "dominion-aircraft", "Lockheed L-1011 TriStar", "wide-body", 1972, 256, 5400, {
    productionEndYear: 1984,
    engineCount: 3,
    engineType: "high-bypass-turbofan",
    engineThrustKn: 220,
    cabinComfort: 70,
    reliabilityTarget: 72,
    initialProductionRate: 1
  }),
  historical("airbus-a300", "meridian-aviation", "Airbus A300", "wide-body", 1974, 266, 4200, {
    productionEndYear: 2007,
    engineType: "high-bypass-turbofan",
    engineThrustKn: 220,
    cabinComfort: 68,
    reliabilityTarget: 70,
    initialProductionRate: 1
  }),
  historical("airbus-a310", "meridian-aviation", "Airbus A310", "wide-body", 1983, 230, 5150, {
    productionEndYear: 1998,
    engineType: "high-bypass-turbofan",
    engineThrustKn: 215,
    avionicsPackage: "improved-analog",
    reliabilityTarget: 73,
    initialProductionRate: 1
  }),
  historical("airbus-a320", "meridian-aviation", "Airbus A320", "narrow-body", 1988, 150, 3300, {
    engineType: "high-bypass-turbofan",
    engineThrustKn: 120,
    avionicsPackage: "digital",
    reliabilityTarget: 75,
    initialProductionRate: 3
  }),
  historical("airbus-a340", "meridian-aviation", "Airbus A340", "wide-body", 1993, 295, 7400, {
    productionEndYear: 2011,
    engineCount: 4,
    engineType: "advanced-turbofan",
    engineThrustKn: 145,
    avionicsPackage: "digital",
    reliabilityTarget: 77,
    initialProductionRate: 1
  }),
  historical("airbus-a321", "meridian-aviation", "Airbus A321", "narrow-body", 1994, 185, 3200, {
    engineType: "high-bypass-turbofan",
    engineThrustKn: 133,
    avionicsPackage: "digital",
    reliabilityTarget: 76,
    initialProductionRate: 2
  }),
  historical("airbus-a330", "meridian-aviation", "Airbus A330", "wide-body", 1994, 277, 6350, {
    engineType: "advanced-turbofan",
    engineThrustKn: 300,
    avionicsPackage: "digital",
    reliabilityTarget: 78,
    initialProductionRate: 1
  }),
  historical("airbus-a319", "meridian-aviation", "Airbus A319", "narrow-body", 1996, 124, 3700, {
    engineType: "high-bypass-turbofan",
    engineThrustKn: 120,
    avionicsPackage: "digital",
    reliabilityTarget: 76,
    initialProductionRate: 2
  }),
  historical("airbus-a380", "meridian-aviation", "Airbus A380", "wide-body", 2007, 420, 8000, {
    productionEndYear: 2021,
    engineCount: 4,
    engineType: "advanced-turbofan",
    engineThrustKn: 310,
    avionicsPackage: "digital",
    reliabilityTarget: 78,
    initialProductionRate: 1
  }),
  historical("airbus-a350", "meridian-aviation", "Airbus A350", "wide-body", 2015, 315, 8100, {
    engineType: "advanced-turbofan",
    engineThrustKn: 330,
    structuralMaterial: "early-composite",
    avionicsPackage: "digital",
    reliabilityTarget: 80,
    initialProductionRate: 1
  }),
  historical("bac-one-eleven", "euro-aerospace-consortium", "BAC One-Eleven", "regional-jet", 1965, 89, 1600, {
    productionEndYear: 1982,
    engineType: "low-bypass-turbofan",
    engineThrustKn: 62,
    reliabilityTarget: 68,
    initialProductionRate: 2
  }),
  historical("bae-146", "euro-aerospace-consortium", "British Aerospace 146", "regional-jet", 1983, 95, 1500, {
    productionEndYear: 2001,
    engineCount: 4,
    engineType: "high-bypass-turbofan",
    engineThrustKn: 32,
    avionicsPackage: "improved-analog",
    reliabilityTarget: 74,
    initialProductionRate: 2
  }),
  historical("fokker-f28", "noord-aviation", "Fokker F28", "regional-jet", 1969, 85, 1000, {
    productionEndYear: 1987,
    engineType: "low-bypass-turbofan",
    engineThrustKn: 45,
    reliabilityTarget: 69,
    initialProductionRate: 2
  }),
  historical("fokker-100", "noord-aviation", "Fokker 100", "regional-jet", 1988, 95, 1700, {
    productionEndYear: 1997,
    engineType: "high-bypass-turbofan",
    engineThrustKn: 62,
    avionicsPackage: "digital",
    reliabilityTarget: 74,
    initialProductionRate: 2
  }),
  historical("fokker-70", "noord-aviation", "Fokker 70", "regional-jet", 1994, 80, 1750, {
    productionEndYear: 1997,
    engineType: "high-bypass-turbofan",
    engineThrustKn: 62,
    avionicsPackage: "digital",
    reliabilityTarget: 74,
    initialProductionRate: 1
  }),
  historical("embraer-110", "atlantico-aeronautics", "Embraer EMB 110", "regional-jet", 1973, 45, 1050, {
    productionEndYear: 1990,
    engineType: "low-bypass-turbofan",
    cruiseSpeedMach: 0.55,
    engineThrustKn: 28,
    reliabilityTarget: 68,
    initialProductionRate: 2
  }),
  historical("embraer-120", "atlantico-aeronautics", "Embraer EMB 120", "regional-jet", 1985, 45, 950, {
    productionEndYear: 2001,
    engineType: "low-bypass-turbofan",
    cruiseSpeedMach: 0.58,
    engineThrustKn: 35,
    avionicsPackage: "improved-analog",
    reliabilityTarget: 72,
    initialProductionRate: 2
  }),
  historical("embraer-erj-145", "atlantico-aeronautics", "Embraer ERJ 145", "regional-jet", 1996, 50, 1550, {
    engineType: "high-bypass-turbofan",
    engineThrustKn: 33,
    avionicsPackage: "digital",
    reliabilityTarget: 75,
    initialProductionRate: 3
  }),
  historical("embraer-e170", "atlantico-aeronautics", "Embraer E170", "regional-jet", 2004, 70, 2100, {
    engineType: "advanced-turbofan",
    engineThrustKn: 62,
    avionicsPackage: "digital",
    reliabilityTarget: 77,
    initialProductionRate: 2
  }),
  historical("embraer-e190", "atlantico-aeronautics", "Embraer E190", "regional-jet", 2005, 95, 2450, {
    engineType: "advanced-turbofan",
    engineThrustKn: 82,
    avionicsPackage: "digital",
    reliabilityTarget: 77,
    initialProductionRate: 2
  }),
  historical("tupolev-tu-134", "sunrise-heavy", "Tupolev Tu-134", "regional-jet", 1967, 80, 1200, {
    productionEndYear: 1989,
    engineType: "low-bypass-turbofan",
    engineThrustKn: 68,
    reliabilityTarget: 66,
    initialProductionRate: 2
  }),
  historical("tupolev-tu-154", "sunrise-heavy", "Tupolev Tu-154", "narrow-body", 1972, 164, 2850, {
    productionEndYear: 2013,
    engineCount: 3,
    engineType: "low-bypass-turbofan",
    engineThrustKn: 93,
    reliabilityTarget: 68,
    initialProductionRate: 2
  }),
  historical("tupolev-tu-204", "sunrise-heavy", "Tupolev Tu-204", "narrow-body", 1995, 210, 4200, {
    engineType: "advanced-turbofan",
    engineThrustKn: 155,
    avionicsPackage: "digital",
    reliabilityTarget: 73,
    initialProductionRate: 1
  }),
  historical("ilyushin-il-62", "ilyushin", "Ilyushin Il-62", "narrow-body", 1967, 186, 4200, {
    productionEndYear: 1995,
    engineCount: 4,
    engineType: "low-bypass-turbofan",
    engineThrustKn: 105,
    reliabilityTarget: 66,
    initialProductionRate: 1
  }),
  historical("ilyushin-il-86", "ilyushin", "Ilyushin Il-86", "wide-body", 1980, 350, 2500, {
    productionEndYear: 1995,
    engineCount: 4,
    engineType: "high-bypass-turbofan",
    engineThrustKn: 127,
    cabinComfort: 64,
    reliabilityTarget: 67,
    initialProductionRate: 1
  }),
  historical("ilyushin-il-96", "ilyushin", "Ilyushin Il-96", "wide-body", 1992, 300, 6200, {
    engineCount: 4,
    engineType: "advanced-turbofan",
    engineThrustKn: 160,
    avionicsPackage: "digital",
    reliabilityTarget: 72,
    initialProductionRate: 1
  }),
  historical("sud-aviation-caravelle", "sud-aviation", "Sud Aviation Caravelle", "regional-jet", 1959, 80, 1700, {
    productionEndYear: 1972,
    engineType: "low-bypass-turbofan",
    engineThrustKn: 55,
    cabinComfort: 65,
    reliabilityTarget: 67,
    initialProductionRate: 1
  }),
  historical("bombardier-crj100", "bombardier", "Bombardier CRJ100", "regional-jet", 1992, 50, 1650, {
    productionEndYear: 2006,
    engineType: "high-bypass-turbofan",
    engineThrustKn: 41,
    avionicsPackage: "digital",
    reliabilityTarget: 75,
    initialProductionRate: 2
  }),
  historical("bombardier-crj700", "bombardier", "Bombardier CRJ700", "regional-jet", 2001, 70, 1700, {
    productionEndYear: 2020,
    engineType: "advanced-turbofan",
    engineThrustKn: 61,
    avionicsPackage: "digital",
    reliabilityTarget: 76,
    initialProductionRate: 2
  }),
  historical("bombardier-crj900", "bombardier", "Bombardier CRJ900", "regional-jet", 2003, 90, 1550, {
    productionEndYear: 2020,
    engineType: "advanced-turbofan",
    engineThrustKn: 65,
    avionicsPackage: "digital",
    reliabilityTarget: 76,
    initialProductionRate: 2
  }),
  historical("bombardier-cseries-cs100", "bombardier", "Bombardier CSeries CS100", "narrow-body", 2016, 110, 3300, {
    engineType: "advanced-turbofan",
    engineThrustKn: 105,
    structuralMaterial: "early-composite",
    avionicsPackage: "digital",
    reliabilityTarget: 78,
    initialProductionRate: 1
  }),
  historical("bombardier-cseries-cs300", "bombardier", "Bombardier CSeries CS300", "narrow-body", 2016, 130, 3300, {
    engineType: "advanced-turbofan",
    engineThrustKn: 105,
    structuralMaterial: "early-composite",
    avionicsPackage: "digital",
    reliabilityTarget: 78,
    initialProductionRate: 1
  })
];

export function getHistoricalAircraftThroughYear(
  manufacturerIdentityId: string,
  year: number,
  mode: NamingMode
): HistoricalAircraftRecord[] {
  if (mode !== "real_world") {
    return [];
  }

  return HISTORICAL_AIRCRAFT
    .filter((record) => record.manufacturerIdentityId === manufacturerIdentityId)
    .filter((record) => record.entryIntoServiceYear <= year)
    .sort((a, b) => a.entryIntoServiceYear - b.entryIntoServiceYear || a.displayName.localeCompare(b.displayName));
}

export function getHistoricalAircraftForYear(
  manufacturerIdentityId: string,
  year: number,
  mode: NamingMode
): HistoricalAircraftRecord[] {
  if (mode !== "real_world") {
    return [];
  }

  return HISTORICAL_AIRCRAFT
    .filter((record) => record.manufacturerIdentityId === manufacturerIdentityId)
    .filter((record) => record.entryIntoServiceYear === year)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function historical(
  identityId: string,
  manufacturerIdentityId: string,
  displayName: string,
  category: AircraftCategory,
  entryIntoServiceYear: number,
  capacity: number,
  rangeNm: number,
  overrides: Omit<
    HistoricalAircraftRecord,
    "identityId" | "manufacturerIdentityId" | "displayName" | "category" | "entryIntoServiceYear" | "capacity" | "rangeNm"
  > = {}
): HistoricalAircraftRecord {
  return {
    identityId,
    manufacturerIdentityId,
    displayName,
    category,
    entryIntoServiceYear,
    capacity,
    rangeNm,
    ...overrides
  };
}

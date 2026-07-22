import type { Technology } from "@/game/types";

export const TECHNOLOGIES: Technology[] = [
  {
    id: "improved-aluminum-alloys",
    name: "Improved aluminum alloys",
    area: "materials",
    researchCost: 150_000_000,
    researchPointsRequired: 420,
    prerequisites: [],
    benefits: { weight: 4, development: 2 },
    risks: ["Supplier qualification adds early schedule risk."],
    availableFromYear: 1970
  },
  {
    id: "high-bypass-turbofans",
    name: "High-bypass turbofans",
    area: "engines",
    researchCost: 260_000_000,
    researchPointsRequired: 620,
    prerequisites: [],
    benefits: { fuel: 9, noise: 5 },
    risks: ["Engine nacelle integration can slow flight testing."],
    availableFromYear: 1970
  },
  {
    id: "improved-aerodynamics",
    name: "Improved aerodynamics",
    area: "aerodynamics",
    researchCost: 180_000_000,
    researchPointsRequired: 500,
    prerequisites: [],
    benefits: { fuel: 5, development: 2 },
    risks: [],
    availableFromYear: 1970
  },
  {
    id: "noise-reduction",
    name: "Noise reduction packages",
    area: "operations",
    researchCost: 120_000_000,
    researchPointsRequired: 360,
    prerequisites: ["high-bypass-turbofans"],
    benefits: { noise: 10 },
    risks: ["Adds weight if retrofitted to older nacelles."],
    availableFromYear: 1972
  },
  {
    id: "better-pressurization",
    name: "Better pressurization",
    area: "operations",
    researchCost: 95_000_000,
    researchPointsRequired: 300,
    prerequisites: [],
    benefits: { reliability: 2, safety: 2 },
    risks: [],
    availableFromYear: 1970
  },
  {
    id: "improved-landing-gear",
    name: "Improved landing gear",
    area: "operations",
    researchCost: 110_000_000,
    researchPointsRequired: 330,
    prerequisites: [],
    benefits: { safety: 3, production: 1 },
    risks: [],
    availableFromYear: 1970
  },
  {
    id: "reliability-growth-testing",
    name: "Reliability growth testing",
    area: "reliability",
    researchCost: 130_000_000,
    researchPointsRequired: 380,
    prerequisites: [],
    benefits: { reliability: 6, safety: 2 },
    risks: [],
    availableFromYear: 1970
  },
  {
    id: "fuel-efficiency-program",
    name: "Fuel efficiency program",
    area: "engines",
    researchCost: 210_000_000,
    researchPointsRequired: 540,
    prerequisites: ["improved-aerodynamics"],
    benefits: { fuel: 6 },
    risks: ["May increase maintenance complexity."],
    availableFromYear: 1974
  },
  {
    id: "improved-avionics",
    name: "Improved avionics",
    area: "avionics",
    researchCost: 175_000_000,
    researchPointsRequired: 470,
    prerequisites: [],
    benefits: { safety: 4, reliability: 2 },
    risks: [],
    availableFromYear: 1971
  },
  {
    id: "early-composites",
    name: "Early composites",
    area: "materials",
    researchCost: 300_000_000,
    researchPointsRequired: 720,
    prerequisites: ["improved-aluminum-alloys"],
    benefits: { weight: 8, fuel: 2 },
    risks: ["Composite repairs are unfamiliar to airlines."],
    availableFromYear: 1976
  },
  {
    id: "automated-manufacturing",
    name: "Automated manufacturing",
    area: "manufacturing",
    researchCost: 240_000_000,
    researchPointsRequired: 650,
    prerequisites: [],
    benefits: { production: 8 },
    risks: ["Tooling investment is high."],
    availableFromYear: 1977
  },
  {
    id: "digital-cockpits",
    name: "Digital cockpits",
    area: "avionics",
    researchCost: 360_000_000,
    researchPointsRequired: 820,
    prerequisites: ["improved-avionics"],
    benefits: { safety: 7, weight: 2 },
    risks: ["Pilot training requirements can affect early sales."],
    availableFromYear: 1979
  },
  {
    id: "winglets",
    name: "Winglets",
    area: "aerodynamics",
    researchCost: 190_000_000,
    researchPointsRequired: 520,
    prerequisites: ["improved-aerodynamics"],
    benefits: { fuel: 6 },
    risks: ["Adds structural loads to older wing designs."],
    availableFromYear: 1980
  },
  {
    id: "safety-monitoring",
    name: "Safety monitoring systems",
    area: "reliability",
    researchCost: 160_000_000,
    researchPointsRequired: 450,
    prerequisites: ["improved-avionics"],
    benefits: { safety: 8, reliability: 3 },
    risks: [],
    availableFromYear: 1978
  },
  {
    id: "extended-range-operations",
    name: "Extended-range operations",
    area: "operations",
    researchCost: 260_000_000,
    researchPointsRequired: 700,
    prerequisites: ["reliability-growth-testing", "high-bypass-turbofans"],
    benefits: { reliability: 5, fuel: 2 },
    risks: ["Certification standards are demanding."],
    availableFromYear: 1981
  },
  {
    id: "advanced-noise-compliance",
    name: "Advanced noise compliance",
    area: "operations",
    researchCost: 210_000_000,
    researchPointsRequired: 560,
    prerequisites: ["noise-reduction"],
    benefits: { noise: 14 },
    risks: [],
    availableFromYear: 1982
  },
  {
    id: "lean-final-assembly",
    name: "Lean final assembly",
    area: "manufacturing",
    researchCost: 220_000_000,
    researchPointsRequired: 590,
    prerequisites: ["automated-manufacturing"],
    benefits: { production: 7, development: 2 },
    risks: [],
    availableFromYear: 1984
  },
  {
    id: "advanced-turbofans",
    name: "Advanced turbofans",
    area: "engines",
    researchCost: 420_000_000,
    researchPointsRequired: 920,
    prerequisites: ["high-bypass-turbofans", "fuel-efficiency-program"],
    benefits: { fuel: 12, noise: 6 },
    risks: ["Engine development dependence can delay aircraft programs."],
    availableFromYear: 1985
  },
  {
    id: "maintenance-diagnostics",
    name: "Maintenance diagnostics",
    area: "reliability",
    researchCost: 240_000_000,
    researchPointsRequired: 620,
    prerequisites: ["digital-cockpits"],
    benefits: { reliability: 7, safety: 3 },
    risks: [],
    availableFromYear: 1986
  },
  {
    id: "composite-secondary-structures",
    name: "Composite secondary structures",
    area: "materials",
    researchCost: 390_000_000,
    researchPointsRequired: 880,
    prerequisites: ["early-composites"],
    benefits: { weight: 7, fuel: 3 },
    risks: ["Higher certification scrutiny."],
    availableFromYear: 1987
  }
];

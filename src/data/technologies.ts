import type { ResearchEraId, Technology, TechnologyBranch } from "@/game/types";

export interface ResearchEraDefinition {
  id: ResearchEraId;
  label: string;
  startYear: number;
  endYear?: number;
}

export interface TechnologyBranchDefinition {
  id: TechnologyBranch;
  label: string;
  accent: string;
}

export const RESEARCH_ERAS: ResearchEraDefinition[] = [
  { id: "first-generation-jet-age", label: "First-Generation Jet Age", startYear: 1970, endYear: 1974 },
  { id: "efficiency-deregulation", label: "Efficiency and Deregulation Era", startYear: 1975, endYear: 1984 },
  { id: "digital-aviation", label: "Digital Aviation Era", startYear: 1985, endYear: 1994 },
  { id: "global-twinjet", label: "Global Twinjet Era", startYear: 1995, endYear: 2004 },
  { id: "composite-aviation", label: "Composite Aviation Era", startYear: 2005, endYear: 2014 },
  { id: "sustainable-aviation", label: "Sustainable Aviation Era", startYear: 2015 }
];

export const TECHNOLOGY_BRANCHES: TechnologyBranchDefinition[] = [
  { id: "propulsion", label: "Propulsion", accent: "#2f7d73" },
  { id: "aerodynamics", label: "Aerodynamics and Wing Design", accent: "#5d7cbe" },
  { id: "structures", label: "Structures and Materials", accent: "#a66f2b" },
  { id: "avionics", label: "Avionics and Flight Controls", accent: "#6f5fb5" },
  { id: "manufacturing", label: "Manufacturing and Industrial Systems", accent: "#55735d" },
  { id: "safety", label: "Reliability, Safety, and Certification", accent: "#b06052" },
  { id: "cabin-operations", label: "Cabin, Airline Economics, and Operations", accent: "#9a6b91" }
];

interface RawTechnology {
  id: string;
  name: string;
  branch: TechnologyBranch;
  year: number;
  prerequisites?: string[];
  benefits?: Technology["benefits"];
  effects: string[];
  risks?: string[];
  breakthroughPenaltyReduction?: number;
  mutuallyExclusiveWith?: string[];
}

const RAW_TECHNOLOGIES: RawTechnology[] = [
  tech("high-bypass-turbofans", "First-Generation High-Bypass Turbofans", "propulsion", 1970, [], { fuel: 10, noise: 5 }, [
    "10% lower fuel consumption than early turbofans",
    "Reduced engine noise",
    "Enables efficient wide-body aircraft",
    "Slightly higher engine purchase price"
  ], ["Engine nacelle integration can slow flight testing."]),
  tech("improved-turbine-materials", "Improved Turbine Materials", "propulsion", 1974, ["high-bypass-turbofans"], { reliability: 5, fuel: 3, maintenance: 3 }, [
    "5% better engine reliability",
    "3% lower fuel consumption",
    "Reduced engine maintenance cost"
  ]),
  tech("second-generation-high-bypass-turbofans", "Second-Generation High-Bypass Turbofans", "propulsion", 1978, ["improved-turbine-materials"], { fuel: 8, thrust: 6, complexity: -3 }, [
    "8% lower fuel burn",
    "Increased available thrust",
    "Improved wide-body performance",
    "Increased development complexity"
  ], ["Engine integration adds development complexity."]),
  tech("full-authority-digital-engine-control", "Full-Authority Digital Engine Control", "propulsion", 1983, ["second-generation-high-bypass-turbofans", "digital-avionics-i"], { fuel: 4, reliability: 4, operations: 3 }, [
    "Improved engine efficiency",
    "Improved engine monitoring",
    "Reduced pilot workload",
    "Improved dispatch reliability"
  ]),
  tech("high-reliability-twinjet-engines", "High-Reliability Twinjet Engines", "propulsion", 1988, ["full-authority-digital-engine-control", "reliability-growth-testing"], { reliability: 8, maintenance: 5, safety: 4 }, [
    "Enables long-range twin-engine aircraft",
    "Improves engine-out reliability",
    "Required for advanced extended-range operations",
    "Reduces maintenance incidents"
  ]),
  tech("advanced-turbofans", "Third-Generation High-Bypass Turbofans", "propulsion", 1994, ["high-reliability-twinjet-engines"], { fuel: 8, noise: 7, thrust: 5 }, [
    "8% lower fuel burn",
    "7% lower noise",
    "Increased thrust range",
    "Improved long-haul economics"
  ]),
  tech("swept-fan-advanced-compressor-design", "Swept Fan and Advanced Compressor Design", "propulsion", 2001, ["advanced-turbofans", "computational-fluid-dynamics"], { fuel: 5, weight: 2, noise: 3 }, [
    "5% lower engine fuel consumption",
    "Lower engine weight",
    "Reduced noise"
  ]),
  tech("composite-fan-systems", "Composite Fan Systems", "propulsion", 2008, ["swept-fan-advanced-compressor-design", "primary-composite-structures"], { fuel: 3, weight: 4, supplierRisk: -3 }, [
    "Lower engine weight",
    "Improved fuel efficiency",
    "Increased engine development cost",
    "Increased supplier complexity"
  ], ["Supplier maturity can affect engine availability."]),
  tech("geared-turbofan-architecture", "Geared Turbofan Architecture", "propulsion", 2014, ["composite-fan-systems"], { fuel: 12, noise: 9, maintenance: -2 }, [
    "Major fuel-burn reduction for regional jets and narrow-bodies",
    "Reduced noise",
    "Higher initial maintenance risk",
    "Increased engine acquisition cost"
  ], ["Early gear reliability risk."]),
  tech("ultra-high-bypass-engines", "Ultra-High-Bypass Engines", "propulsion", 2020, ["geared-turbofan-architecture", "advanced-lightweight-structures"], { fuel: 10, airport: -4, complexity: -4 }, [
    "Significant fuel-burn reduction",
    "Increased engine diameter",
    "Requires taller landing gear or redesigned wings",
    "Increased airport compatibility challenges"
  ], ["Airport compatibility and landing gear integration are harder."]),
  tech("advanced-acoustic-engineering", "Advanced Acoustic Engineering", "propulsion", 2024, ["ultra-high-bypass-engines"], { noise: 10, certification: 3 }, [
    "Reduces perceived cabin and airport noise",
    "Improves community acceptance for radical propulsion",
    "Lowers noise-certification risk"
  ], [], 1),
  tech("open-rotor-propulsion", "Open-Rotor Propulsion", "propulsion", 2028, ["ultra-high-bypass-engines", "advanced-acoustic-engineering"], { fuel: 18, noise: -8, certification: -7, airlineAppeal: -4 }, [
    "Very large fuel-efficiency improvement",
    "Major noise and passenger-acceptance challenges",
    "Requires specialized airframe design",
    "High research and certification risk"
  ], ["High public-acceptance and certification risk."]),

  tech("improved-aerodynamics", "Improved Subsonic Aerodynamics", "aerodynamics", 1970, [], { fuel: 3, development: 2 }, [
    "3% reduction in drag",
    "Improved range",
    "Small development-cost reduction"
  ]),
  tech("supercritical-wing-research", "Supercritical Wing Research", "aerodynamics", 1974, ["improved-aerodynamics"], { fuel: 5, development: 2 }, [
    "Improved high-speed efficiency",
    "Lower transonic drag",
    "Enables more efficient jet transports"
  ]),
  tech("advanced-high-lift-devices", "Advanced High-Lift Devices", "aerodynamics", 1978, ["supercritical-wing-research"], { airport: 8, maintenance: -2 }, [
    "Shorter takeoff distance",
    "Shorter landing distance",
    "Improved airport compatibility",
    "Slight increase in maintenance cost"
  ]),
  tech("early-wingtip-devices", "Early Wingtip Devices", "aerodynamics", 1982, ["supercritical-wing-research"], { fuel: 4, airport: -2 }, [
    "Improved range",
    "Reduced cruise drag",
    "Increased wingspan and airport restrictions"
  ]),
  tech("computational-fluid-dynamics", "Computational Fluid Dynamics", "aerodynamics", 1987, ["supercritical-wing-research", "computer-aided-engineering"], { fuel: 4, development: 6 }, [
    "Reduced aerodynamic-development time",
    "Improved design accuracy",
    "Reduced prototype-testing requirements",
    "Unlocks later aerodynamic technologies"
  ], [], 2),
  tech("advanced-winglets", "Advanced Winglets", "aerodynamics", 1993, ["early-wingtip-devices", "computational-fluid-dynamics"], { fuel: 7, airport: -2 }, [
    "Improved range",
    "Reduced fuel burn",
    "Increased aircraft purchase cost"
  ]),
  tech("laminar-flow-optimization", "Laminar-Flow Optimization", "aerodynamics", 1998, ["computational-fluid-dynamics"], { fuel: 7, production: -3, maintenance: -2 }, [
    "Reduced drag",
    "Increased manufacturing precision requirements",
    "Increased sensitivity to surface condition"
  ], ["Surface condition and production precision become more important."]),
  tech("raked-wingtips", "Raked Wingtips", "aerodynamics", 2005, ["advanced-winglets", "laminar-flow-optimization"], { fuel: 8, airport: -3 }, [
    "Strong long-range efficiency benefit",
    "Increased wingspan",
    "Best suited to wide-body aircraft"
  ]),
  tech("adaptive-wing-control", "Adaptive Wing Control", "aerodynamics", 2012, ["raked-wingtips", "advanced-flight-control-computers"], { fuel: 5, safety: 3, cabin: 2, complexity: -3 }, [
    "Reduced structural loads",
    "Improved fuel economy",
    "Improved ride quality",
    "Increased software complexity"
  ], ["Flight-control software complexity rises."]),
  tech("natural-laminar-flow-wings", "Natural Laminar-Flow Wings", "aerodynamics", 2020, ["laminar-flow-optimization", "precision-composite-manufacturing"], { fuel: 11, production: -5, maintenance: -3 }, [
    "Major drag reduction",
    "Higher cleanliness and maintenance requirements",
    "Increased manufacturing difficulty"
  ], ["Manufacturing and maintenance tolerances are demanding."]),
  tech("active-morphing-surfaces", "Active Morphing Surfaces", "aerodynamics", 2028, ["adaptive-wing-control", "smart-structural-materials"], { fuel: 10, weight: 3, reliability: -4, complexity: -8 }, [
    "Improved efficiency across several flight conditions",
    "Reduced need for conventional control surfaces",
    "Very high research and reliability risk"
  ], ["Reliability and certification risk are very high."]),

  tech("improved-aluminum-alloys", "Improved Aluminum Alloys", "structures", 1970, [], { weight: 4, reliability: 2 }, [
    "Reduced structural weight",
    "Improved fatigue life",
    "Slightly increased material cost"
  ]),
  tech("advanced-corrosion-protection", "Advanced Corrosion Protection", "structures", 1975, ["improved-aluminum-alloys"], { maintenance: 5, airlineAppeal: 3, reliability: 2 }, [
    "Lower maintenance costs",
    "Longer aircraft service life",
    "Improved airline appeal in humid and coastal regions"
  ]),
  tech("early-composite-secondary-structures", "Early Composite Secondary Structures", "structures", 1979, ["improved-aluminum-alloys"], { weight: 5, production: -2 }, [
    "Reduced weight for fairings, control surfaces, and interior components",
    "Increased manufacturing cost",
    "Unlocks later composite research"
  ], ["Composite repairs are unfamiliar to many airlines."]),
  tech("aluminum-lithium-alloys", "Aluminum-Lithium Alloys", "structures", 1984, ["improved-aluminum-alloys", "advanced-corrosion-protection"], { weight: 6, production: -2, tooling: -2 }, [
    "Lower structural weight",
    "Increased material expense",
    "Greater manufacturing difficulty"
  ]),
  tech("composite-tail-control-surfaces", "Composite Tail and Control Surfaces", "structures", 1989, ["early-composite-secondary-structures"], { weight: 5, maintenance: 2, certification: -2 }, [
    "Reduced aircraft weight",
    "Improved corrosion resistance",
    "Increased inspection complexity"
  ]),
  tech("advanced-bonded-structures", "Advanced Bonded Structures", "structures", 1995, ["composite-tail-control-surfaces", "precision-manufacturing"], { weight: 4, production: 2, tooling: -3 }, [
    "Reduced fastener count",
    "Lower weight",
    "Increased quality-control requirements"
  ]),
  tech("primary-composite-structures", "Primary Composite Structures", "structures", 2001, ["composite-tail-control-surfaces", "advanced-bonded-structures"], { weight: 12, fuel: 3, tooling: -6, complexity: -6 }, [
    "Enables composite wings and major fuselage sections",
    "Significant weight reduction",
    "High development and tooling cost",
    "Higher program risk"
  ], ["High tooling cost and certification scrutiny."]),
  tech("composite-fuselage-barrels", "Composite Fuselage Barrels", "structures", 2007, ["primary-composite-structures", "automated-composite-manufacturing"], { weight: 10, maintenance: 3, tooling: -5 }, [
    "Major weight reduction",
    "Improved corrosion resistance",
    "Expensive specialized factories",
    "Increased repair complexity"
  ], ["Factory investment and repair complexity are high."]),
  tech("computational-structural-analysis", "Computational Structural Analysis", "structures", 2009, ["computer-aided-engineering", "advanced-bonded-structures"], { development: 5, safety: 3 }, [
    "Improves fatigue and load prediction",
    "Reduces late structural redesigns",
    "Supports lightweight airframe optimization"
  ], [], 1),
  tech("advanced-lightweight-structures", "Advanced Lightweight Structures", "structures", 2013, ["composite-fuselage-barrels", "computational-structural-analysis"], { weight: 9, reliability: 3, fuel: 3 }, [
    "Reduced empty weight",
    "Improved payload-range performance",
    "Improved fatigue life"
  ]),
  tech("thermoplastic-composites", "Thermoplastic Composites", "structures", 2020, ["advanced-lightweight-structures", "automated-composite-manufacturing"], { production: 6, tooling: -4, weight: 3 }, [
    "Faster composite production",
    "Improved recyclability",
    "Lower long-term manufacturing costs",
    "High initial tooling expense"
  ]),
  tech("smart-materials", "Smart Materials", "structures", 2025, ["thermoplastic-composites"], { weight: 4, safety: 4, reliability: 2 }, [
    "Enables adaptive structures and sensors",
    "Improves fatigue management",
    "Raises supplier and inspection complexity"
  ], ["Supplier and inspection complexity rises."]),
  tech("smart-structural-materials", "Smart Structural Materials", "structures", 2028, ["thermoplastic-composites", "structural-health-monitoring"], { safety: 8, maintenance: 5, complexity: -4 }, [
    "Continuous damage monitoring",
    "Reduced inspection time",
    "Improved safety",
    "High sensor and manufacturing complexity"
  ]),

  tech("improved-avionics", "Improved Analog Avionics", "avionics", 1970, [], { reliability: 2, safety: 3, operations: 2 }, [
    "Improved navigation accuracy",
    "Improved aircraft reliability",
    "Reduced pilot workload"
  ]),
  tech("inertial-navigation-systems", "Inertial Navigation Systems", "avionics", 1975, ["improved-avionics"], { operations: 5, airlineAppeal: 3 }, [
    "Improved long-range navigation",
    "Increased aircraft purchase cost",
    "Increased airline appeal for international operations"
  ]),
  tech("digital-avionics-i", "Digital Avionics I", "avionics", 1979, ["inertial-navigation-systems"], { weight: 2, safety: 4, maintenance: 3 }, [
    "Enables digital engine and system monitoring",
    "Reduces avionics weight",
    "Improves fault detection"
  ]),
  tech("flight-management-computers", "Flight Management Computers", "avionics", 1981, ["digital-avionics-i"], { operations: 5, fuel: 2, safety: 2 }, [
    "Automates route and performance calculations",
    "Improves fuel planning",
    "Unlocks advanced flight management systems"
  ]),
  tech("electronic-flight-instrument-displays", "Electronic Flight Instrument Displays", "avionics", 1982, ["digital-avionics-i"], { weight: 2, safety: 3, operations: 2 }, [
    "Begins transition toward glass cockpits",
    "Reduced cockpit instrument weight",
    "Improved situational awareness"
  ]),
  tech("redundant-flight-computers", "Redundant Flight Computers", "avionics", 1983, ["digital-avionics-i"], { safety: 5, reliability: 3, certification: -2 }, [
    "Adds fault-tolerant flight-control computing",
    "Improves system redundancy",
    "Supports digital fly-by-wire certification"
  ]),
  tech("two-pilot-wide-body-cockpit", "Two-Pilot Wide-Body Cockpit", "avionics", 1985, ["electronic-flight-instrument-displays", "flight-management-computers"], { crewCost: 8, airlineAppeal: 5, certification: -3 }, [
    "Removes flight-engineer requirement",
    "Reduces airline crew costs",
    "Improves airline appeal",
    "Increases certification difficulty"
  ]),
  tech("digital-fly-by-wire", "Digital Fly-by-Wire", "avionics", 1987, ["digital-avionics-i", "redundant-flight-computers", "electronic-flight-instrument-displays"], { weight: 4, safety: 5, commonality: 6, complexity: -5 }, [
    "Reduces mechanical-control weight",
    "Enables flight-envelope protection",
    "Improves aircraft-family commonality",
    "Increases software and certification complexity"
  ], ["Software and certification complexity rises."]),
  tech("advanced-flight-management-systems", "Advanced Flight Management Systems", "avionics", 1992, ["digital-fly-by-wire", "flight-management-computers"], { fuel: 3, operations: 5, safety: 2 }, [
    "Better route efficiency",
    "Lower airline operating cost",
    "Improved navigation accuracy"
  ]),
  tech("integrated-modular-avionics", "Integrated Modular Avionics", "avionics", 1998, ["advanced-flight-management-systems", "digital-fly-by-wire"], { weight: 4, commonality: 5, maintenance: 4, complexity: -3 }, [
    "Reduced avionics weight",
    "Improved commonality",
    "Reduced maintenance burden",
    "Increased software-development risk"
  ], ["Software-development risk rises."]),
  tech("advanced-flight-control-computers", "Advanced Flight-Control Computers", "avionics", 2005, ["integrated-modular-avionics"], { safety: 5, reliability: 3, operations: 3 }, [
    "Improved flight-envelope protection",
    "Enables adaptive wing systems",
    "Improves automatic fault handling"
  ]),
  tech("electronic-flight-bags-connected-cockpits", "Electronic Flight Bags and Connected Cockpits", "avionics", 2011, ["integrated-modular-avionics"], { operations: 4, maintenance: 2, cybersecurity: -1 }, [
    "Reduced paper documentation",
    "Improved maintenance information",
    "Better operational planning",
    "Small cybersecurity risk"
  ], ["Small cybersecurity risk."]),
  tech("predictive-aircraft-health-monitoring", "Predictive Aircraft Health Monitoring", "avionics", 2017, ["electronic-flight-bags-connected-cockpits", "structural-health-monitoring"], { reliability: 8, maintenance: 6, operations: 4 }, [
    "Predicts component failures",
    "Reduces unscheduled maintenance",
    "Improves dispatch reliability",
    "Requires airline data integration"
  ]),
  tech("assisted-single-pilot-operations", "Assisted Single-Pilot Operations", "avionics", 2025, ["predictive-aircraft-health-monitoring", "advanced-flight-control-computers", "automated-emergency-systems"], { crewCost: 10, certification: -10, safety: -4, airlineAppeal: -5 }, [
    "Reduces airline crew costs",
    "Very high certification and public-acceptance barriers",
    "Significant safety-reputation risk"
  ], ["Very high certification and public-acceptance barriers."]),

  tech("improved-assembly-line-organization", "Improved Assembly-Line Organization", "manufacturing", 1970, [], { production: 5, cost: 2 }, [
    "Increased factory throughput",
    "Reduced unit labor cost"
  ]),
  tech("numerical-controlled-machining", "Numerical-Controlled Machining", "manufacturing", 1974, ["improved-assembly-line-organization"], { production: 4, tooling: -2 }, [
    "Improved part accuracy",
    "Reduced production waste",
    "Increased equipment cost"
  ]),
  tech("computer-aided-design", "Computer-Aided Design", "manufacturing", 1979, ["numerical-controlled-machining"], { development: 5, reliability: 2 }, [
    "Reduced design time",
    "Improved engineering productivity",
    "Reduced drawing errors"
  ]),
  tech("computer-aided-engineering", "Computer-Aided Engineering", "manufacturing", 1984, ["computer-aided-design"], { development: 6, safety: 3 }, [
    "Improves structural and aerodynamic analysis",
    "Reduces prototype requirements",
    "Unlocks computational fluid dynamics"
  ], [], 1),
  tech("automated-manufacturing", "Automated Manufacturing I", "manufacturing", 1988, ["computer-aided-design", "numerical-controlled-machining"], { production: 8, tooling: -4 }, [
    "Increased factory productivity",
    "Reduced worker requirements",
    "Increased factory investment cost"
  ], ["Tooling investment is high."]),
  tech("precision-manufacturing", "Precision Manufacturing", "manufacturing", 1990, ["computer-aided-engineering", "numerical-controlled-machining"], { production: 4, tooling: 3, weight: 2 }, [
    "Improves tolerance control",
    "Enables bonded and laminar-flow structures",
    "Reduces late production defects"
  ]),
  tech("lean-manufacturing", "Lean Manufacturing", "manufacturing", 1993, ["automated-manufacturing"], { production: 7, cost: 4, supplierRisk: -2 }, [
    "Reduced inventory costs",
    "Shorter production time",
    "Increased vulnerability to supplier interruptions"
  ], ["More vulnerable to supplier interruptions."]),
  tech("digital-product-definition", "Digital Product Definition", "manufacturing", 1998, ["computer-aided-engineering", "lean-manufacturing"], { commonality: 6, development: 4, supplierRisk: 2 }, [
    "Improves supplier coordination",
    "Reduces engineering changes",
    "Improves program commonality"
  ], [], 1),
  tech("globalized-supply-networks", "Globalized Supply Networks", "manufacturing", 2003, ["digital-product-definition", "lean-manufacturing"], { cost: 5, supplierRisk: -5, production: 4 }, [
    "Reduces component costs",
    "Increases available supplier capacity",
    "Raises delay and coordination risk"
  ], ["Coordination and supplier-delay risk rise."]),
  tech("automated-composite-manufacturing", "Automated Composite Manufacturing", "manufacturing", 2007, ["primary-composite-structures", "automated-manufacturing"], { production: 6, tooling: -5, weight: 3 }, [
    "Enables large composite components",
    "Reduces composite production time",
    "Requires specialized factory investment"
  ]),
  tech("precision-composite-manufacturing", "Precision Composite Manufacturing", "manufacturing", 2010, ["automated-composite-manufacturing", "precision-manufacturing"], { production: 4, fuel: 2, tooling: -3 }, [
    "Improves composite surface quality",
    "Supports natural laminar-flow wings",
    "Raises tooling precision requirements"
  ]),
  tech("digital-factory-integration", "Digital Factory Integration", "manufacturing", 2012, ["digital-product-definition", "automated-composite-manufacturing"], { production: 6, reliability: 3 }, [
    "Improves production visibility",
    "Reduces factory delays",
    "Improves quality control"
  ]),
  tech("industrial-robotics-ii", "Industrial Robotics II", "manufacturing", 2018, ["digital-factory-integration"], { production: 8, tooling: -5 }, [
    "Further reduces labor requirements",
    "Improves assembly precision",
    "High factory conversion cost"
  ]),
  tech("additive-manufacturing", "Additive Manufacturing", "manufacturing", 2025, ["industrial-robotics-ii", "advanced-lightweight-structures"], { weight: 4, production: 5, certification: -3 }, [
    "Reduces part count",
    "Reduces spare-parts inventory",
    "Enables complex lightweight components",
    "Requires advanced certification"
  ]),

  tech("reliability-growth-testing", "Reliability Growth Testing", "safety", 1970, [], { reliability: 6, safety: 2, development: -1 }, [
    "Improved dispatch reliability",
    "Reduced early service failures",
    "Increased testing cost"
  ]),
  tech("improved-fire-protection", "Improved Fire Protection", "safety", 1974, ["reliability-growth-testing"], { safety: 6, weight: -1 }, [
    "Improves safety rating",
    "Reduces accident probability",
    "Slightly increases weight"
  ]),
  tech("damage-tolerant-structural-design", "Damage-Tolerant Structural Design", "safety", 1978, ["reliability-growth-testing", "improved-aluminum-alloys"], { safety: 6, reliability: 3, certification: -2 }, [
    "Improved fatigue safety",
    "Longer airframe life",
    "Increased structural testing requirements"
  ]),
  tech("advanced-fault-isolation", "Advanced Fault Isolation", "safety", 1982, ["digital-avionics-i", "reliability-growth-testing"], { maintenance: 5, reliability: 5 }, [
    "Faster maintenance troubleshooting",
    "Reduced aircraft downtime",
    "Improved dispatch reliability"
  ]),
  tech("extended-range-twin-operations-i", "Extended-Range Twin Operations I", "safety", 1985, ["high-reliability-twinjet-engines", "advanced-fault-isolation", "improved-fire-protection"], { operations: 7, airlineAppeal: 5, certification: -4 }, [
    "Enables moderate overwater twin-engine operations",
    "Improves twinjet airline appeal",
    "Increases certification and maintenance requirements"
  ]),
  tech("traffic-collision-avoidance-systems", "Traffic Collision Avoidance Systems", "safety", 1989, ["digital-avionics-i", "advanced-fault-isolation"], { safety: 8, airlineAppeal: 2 }, [
    "Improves safety reputation",
    "Reduces midair-collision risk",
    "Increases avionics cost"
  ]),
  tech("extended-range-twin-operations-ii", "Extended-Range Twin Operations II", "safety", 1993, ["extended-range-twin-operations-i", "advanced-turbofans"], { operations: 10, airlineAppeal: 8 }, [
    "Enables long-range transoceanic twins",
    "Strongly improves long-range twinjet demand",
    "Reduces commercial value of three- and four-engine aircraft"
  ]),
  tech("enhanced-ground-proximity-warning", "Enhanced Ground-Proximity Warning", "safety", 1998, ["advanced-flight-management-systems", "traffic-collision-avoidance-systems"], { safety: 9, airlineAppeal: 3 }, [
    "Improves safety",
    "Reduces controlled-flight-into-terrain risk",
    "Improves airline and regulator confidence"
  ]),
  tech("structural-health-monitoring", "Structural Health Monitoring", "safety", 2004, ["advanced-fault-isolation", "primary-composite-structures"], { maintenance: 6, safety: 5, reliability: 4 }, [
    "Improves composite inspection",
    "Reduces maintenance downtime",
    "Enables smart structural materials"
  ]),
  tech("predictive-engine-monitoring", "Predictive Engine Monitoring", "safety", 2007, ["full-authority-digital-engine-control", "advanced-fault-isolation"], { maintenance: 5, reliability: 5 }, [
    "Predicts engine trends before in-service failures",
    "Improves dispatch reliability",
    "Supports very long-range twin operations"
  ]),
  tech("extended-range-operations-iii", "Extended-Range Operations III", "safety", 2009, ["extended-range-twin-operations-ii", "predictive-engine-monitoring"], { operations: 12, reliability: 4, airlineAppeal: 6 }, [
    "Enables very long diversion times",
    "Allows twinjets to replace four-engine aircraft on most routes",
    "Requires exceptional engine and system reliability"
  ]),
  tech("runway-overrun-prevention", "Runway Overrun Prevention", "safety", 2015, ["advanced-flight-control-computers", "enhanced-ground-proximity-warning"], { safety: 8, airport: 4 }, [
    "Improves landing safety",
    "Improves airport compatibility",
    "Increases avionics expense"
  ]),
  tech("automated-emergency-systems", "Automated Emergency Systems", "safety", 2022, ["advanced-flight-control-computers", "predictive-aircraft-health-monitoring"], { safety: 9, certification: -4, complexity: -3 }, [
    "Improves response to system failures",
    "Reduces severe-incident probability",
    "Increases software certification burden"
  ]),

  tech("improved-cabin-pressurization", "Improved Cabin Pressurization", "cabin-operations", 1970, [], { cabin: 5, operations: 2, weight: -1 }, [
    "Improved passenger comfort",
    "Improved high-altitude performance",
    "Slightly increased structural cost"
  ]),
  tech("wide-body-cabin-systems", "Wide-Body Cabin Systems", "cabin-operations", 1974, ["improved-cabin-pressurization"], { cabin: 5, airlineAppeal: 4, complexity: -2 }, [
    "Enables efficient large cabins",
    "Improves boarding and passenger appeal",
    "Increases aircraft complexity"
  ]),
  tech("noise-suppression-packages", "Noise-Suppression Packages", "cabin-operations", 1978, ["high-bypass-turbofans"], { noise: 10, cabin: 3, airport: 4 }, [
    "Improves airport access",
    "Improves passenger comfort",
    "Helps meet noise regulations"
  ]),
  tech("standardized-cargo-containers", "Standardized Cargo Containers", "cabin-operations", 1982, ["wide-body-cabin-systems"], { operations: 5, airlineAppeal: 4 }, [
    "Reduces turnaround time",
    "Improves cargo revenue",
    "Improves airline appeal"
  ]),
  tech("aircraft-family-commonality", "Aircraft-Family Commonality", "cabin-operations", 1986, ["digital-fly-by-wire", "digital-product-definition"], { commonality: 10, maintenance: 5, airlineAppeal: 5 }, [
    "Reduced pilot-training cost",
    "Reduced maintenance cost",
    "Increased value of aircraft families",
    "Makes variants more commercially attractive"
  ]),
  tech("advanced-cabin-management-systems", "Advanced Cabin Management Systems", "cabin-operations", 1992, ["digital-avionics-i", "wide-body-cabin-systems"], { cabin: 6, airlineAppeal: 4, cost: -2 }, [
    "Improved passenger experience",
    "Improved airline customization",
    "Increased aircraft price"
  ]),
  tech("modular-cabin-architecture", "Modular Cabin Architecture", "cabin-operations", 1998, ["advanced-cabin-management-systems", "digital-product-definition"], { production: 4, cabin: 4, airlineAppeal: 3 }, [
    "Faster cabin installation",
    "Easier airline customization",
    "Reduced delivery time"
  ]),
  tech("in-flight-connectivity-i", "In-Flight Connectivity I", "cabin-operations", 2004, ["advanced-cabin-management-systems", "integrated-modular-avionics"], { cabin: 5, maintenance: -2, airlineAppeal: 4 }, [
    "Improves passenger appeal",
    "Increases maintenance and installation cost"
  ]),
  tech("led-cabin-advanced-environmental-control", "LED Cabin and Advanced Environmental Control", "cabin-operations", 2010, ["modular-cabin-architecture", "advanced-lightweight-structures"], { weight: 2, cabin: 5, fuel: 1 }, [
    "Reduced cabin weight",
    "Lower electrical consumption",
    "Improved passenger comfort"
  ]),
  tech("computational-cabin-modeling", "Computational Cabin Modeling", "cabin-operations", 2012, ["modular-cabin-architecture", "digital-product-definition"], { cabin: 4, development: 3 }, [
    "Improves cabin layout modeling",
    "Helps balance seating density and comfort",
    "Supports high-density optimization"
  ]),
  tech("high-density-cabin-optimization", "High-Density Cabin Optimization", "cabin-operations", 2016, ["modular-cabin-architecture", "computational-cabin-modeling"], { airlineAppeal: 5, cabin: -3, cost: 4 }, [
    "More seats without proportional fuselage growth",
    "Increased airline revenue",
    "Possible passenger-comfort penalty"
  ], ["Passenger comfort can suffer if pushed too far."]),
  tech("connected-cabin-systems", "Connected Cabin Systems", "cabin-operations", 2022, ["in-flight-connectivity-i", "predictive-aircraft-health-monitoring"], { cabin: 4, maintenance: 4, cybersecurity: -3 }, [
    "Improved airline service information",
    "Better cabin maintenance",
    "Increased cybersecurity exposure"
  ], ["Cybersecurity exposure increases."])
];

export const TECHNOLOGIES: Technology[] = RAW_TECHNOLOGIES.map((technology) => {
  const branchIndex = TECHNOLOGY_BRANCHES.findIndex((branch) => branch.id === technology.branch);
  const siblingIndex = RAW_TECHNOLOGIES.filter((candidate) => candidate.branch === technology.branch && candidate.year <= technology.year).length - 1;

  return {
    id: technology.id,
    name: technology.name,
    branch: technology.branch,
    era: eraForYear(technology.year),
    area: areaForBranch(technology.branch),
    historicalYear: technology.year,
    researchCost: estimateResearchCost(technology),
    researchPointsRequired: estimateResearchPoints(technology),
    prerequisites: technology.prerequisites ?? [],
    benefits: technology.benefits ?? {},
    effects: technology.effects,
    risks: technology.risks ?? [],
    breakthroughPenaltyReduction: technology.breakthroughPenaltyReduction,
    mutuallyExclusiveWith: technology.mutuallyExclusiveWith,
    position: {
      x: technology.year,
      y: siblingIndex + branchIndex * 20
    }
  };
});

function tech(
  id: string,
  name: string,
  branch: TechnologyBranch,
  year: number,
  prerequisites: string[],
  benefits: Technology["benefits"],
  effects: string[],
  risks: string[] = [],
  breakthroughPenaltyReduction?: number,
  mutuallyExclusiveWith?: string[]
): RawTechnology {
  return { id, name, branch, year, prerequisites, benefits, effects, risks, breakthroughPenaltyReduction, mutuallyExclusiveWith };
}

function eraForYear(year: number): ResearchEraId {
  const era = RESEARCH_ERAS.find((candidate) => year >= candidate.startYear && (candidate.endYear === undefined || year <= candidate.endYear));
  return era?.id ?? "sustainable-aviation";
}

function areaForBranch(branch: TechnologyBranch): Technology["area"] {
  if (branch === "propulsion") {
    return "engines";
  }
  if (branch === "structures") {
    return "materials";
  }
  if (branch === "safety") {
    return "reliability";
  }
  if (branch === "cabin-operations") {
    return "operations";
  }
  return branch;
}

function estimateResearchCost(technology: RawTechnology): number {
  const eraIndex = RESEARCH_ERAS.findIndex((era) => era.id === eraForYear(technology.year));
  const riskCost = (technology.risks?.length ?? 0) * 35_000_000;
  const prereqCost = (technology.prerequisites?.length ?? 0) * 22_000_000;
  const branchPremium = technology.branch === "propulsion" || technology.branch === "structures" ? 35_000_000 : 0;
  return Math.round((145_000_000 + eraIndex * 92_000_000 + riskCost + prereqCost + branchPremium) / 5_000_000) * 5_000_000;
}

function estimateResearchPoints(technology: RawTechnology): number {
  const eraIndex = RESEARCH_ERAS.findIndex((era) => era.id === eraForYear(technology.year));
  const riskPoints = (technology.risks?.length ?? 0) * 70;
  const prereqPoints = (technology.prerequisites?.length ?? 0) * 45;
  return 360 + eraIndex * 180 + riskPoints + prereqPoints + Math.round(technology.effects.length * 18);
}

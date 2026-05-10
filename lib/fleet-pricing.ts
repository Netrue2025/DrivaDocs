import { pricingCatalog, vehiclePaperRenewalBreakdowns, type PricingItem } from "@/lib/pricing-catalog";

export type FleetPricingRow = {
  serviceType: string;
  serviceName: string;
  vehicleType?: string | null;
  engineCategory?: string | null;
  usage?: string | null;
  state?: string | null;
  amount: number;
  notes?: string | null;
};

export const adminVehicleCategories = ["Motorcycle", "Tricycle", "Car", "SUV", "Bus", "Pickup", "Lorry", "Truck"] as const;
export const categoryEngineOptions: Record<string, string[]> = {
  Motorcycle: ["Motorcycle"],
  Tricycle: ["Tricycle"],
  Car: ["1.0L - 2.0L", "2.1L - 3.0L"],
  SUV: ["3.1L - 12.0L"],
  Bus: ["3.1L - 12.0L"],
  Pickup: ["3.1L - 12.0L"],
  Lorry: ["3.1L - 12.0L"],
  Truck: ["3.1L - 12.0L"]
};
export const statePriceOptions = ["Oyo", "Lagos", "Abuja"] as const;
export const privateCommercialOptions = ["PRIVATE", "COMMERCIAL"] as const;

export function resolveFleetAmount(
  serviceType: string,
  rows: FleetPricingRow[],
  vehicleType?: string,
  engineCategory?: string | null,
  usage?: string | null
) {
  return resolveFleetPrice(serviceType, rows, vehicleType, engineCategory, usage)?.amount ?? 0;
}

export function resolveFleetPrice(
  serviceType: string,
  rows: FleetPricingRow[],
  vehicleType?: string,
  engineCategory?: string | null,
  usage?: string | null,
  state = "Lagos"
) {
  const source = rows.length ? rows : pricingCatalog.filter((item) => item.serviceType === serviceType);
  const matchingService = source.filter((item) => item.serviceType === serviceType);
  const candidates = fleetPricingVehicleCandidates(serviceType, vehicleType, engineCategory, usage);
  const preferredUsage = normalize(usage) || "private";
  const preferredState = state || "Lagos";

  if (serviceType === "NEW_VEHICLE_REGISTRATION") {
    return (
      findByCandidates(matchingService, candidates, { state: preferredState, usage: preferredUsage, engineCategory, exactBroad: true }) ??
      findByCandidates(matchingService, candidates, { usage: preferredUsage, engineCategory, exactBroad: true }) ??
      findByCandidates(matchingService, candidates, { state: preferredState, engineCategory }) ??
      findByCandidates(matchingService, candidates, { usage: preferredUsage, engineCategory }) ??
      findByCandidates(matchingService, candidates) ??
      matchingService[0]
    );
  }

  if (serviceType === "VEHICLE_PAPER_RENEWAL") {
    return (
      findByCandidates(matchingService, candidates, { emptyState: true, usage: preferredUsage, engineCategory, exactBroad: true }) ??
      findByCandidates(matchingService, candidates, { emptyState: true, engineCategory, exactBroad: true }) ??
      findByCandidates(matchingService, candidates, { emptyState: true, emptyEngineCategory: true, emptyUsage: true }) ??
      findByCandidates(matchingService, candidates) ??
      matchingService[0]
    );
  }

  return (
    findByCandidates(matchingService, candidates) ??
    matchingService.find((item) => item.state === "Lagos") ??
    matchingService[0]
  );
}

function findByCandidates(
  rows: FleetPricingRow[],
  candidates: string[],
  options: { state?: string; usage?: string; engineCategory?: string | null; emptyState?: boolean; emptyEngineCategory?: boolean; emptyUsage?: boolean; exactBroad?: boolean } = {}
) {
  return rows.find((item) => {
    if (!item.vehicleType || !candidates.includes(normalize(item.vehicleType))) return false;
    if (options.exactBroad && !adminVehicleCategories.map(normalize).includes(normalize(item.vehicleType))) return false;
    if (options.state && item.state && normalize(item.state) !== normalize(options.state)) return false;
    if (options.engineCategory && item.engineCategory && normalize(item.engineCategory) !== normalize(options.engineCategory)) return false;
    if (options.usage && item.usage && !["privatecommercial", options.usage].includes(normalize(item.usage))) return false;
    if (options.emptyState && item.state) return false;
    if (options.emptyEngineCategory && item.engineCategory) return false;
    if (options.emptyUsage && item.usage) return false;
    return true;
  });
}

function fleetPricingVehicleCandidates(serviceType: string, vehicleType?: string, engineCategory?: string | null, usage?: string | null) {
  const type = normalize(vehicleType);
  const engine = normalize(engineCategory);
  const privateUse = normalize(usage) !== "commercial";
  const useSuffix = privateUse ? "private" : "commercial";
  const carRange = engine.includes("21") || engine.includes("30") ? "21" : "16";
  const categories: string[] = [];

  if (type) categories.push(type);
  if (type === "motorcycle") categories.push("motorcycle");
  if (type === "car") {
    if (serviceType === "NEW_VEHICLE_REGISTRATION") {
      categories.push(carRange === "21" ? "salooncar2130l" : "salooncar1020l");
    } else {
      categories.push(carRange === "21" ? `salooncar2130l${useSuffix}` : `salooncar1620l${useSuffix}`);
    }
  }
  if (type === "suv" || type === "pickup") {
    categories.push(serviceType === "NEW_VEHICLE_REGISTRATION" ? "suvjeepsalooncarpickup31120l" : `suvjeepsalooncarpickup31120l${useSuffix}`);
  }
  if (type === "bus") {
    categories.push(serviceType === "NEW_VEHICLE_REGISTRATION" ? "buscoasterbus31120l" : `buscoasterbus31120l${useSuffix}`);
  }
  if (type === "lorry") categories.push("lorrytippertractor31120l");
  if (type === "truck") categories.push("tankertruck31120l");

  return Array.from(new Set(categories));
}

export function needsEngineCategory(vehicleType?: string) {
  const options = categoryEngineOptions[vehicleType || ""] || [];
  return options.length > 1 || Boolean(options[0] && !["Motorcycle", "Tricycle"].includes(options[0]));
}

export function needsUsageCategory(serviceType: string, vehicleType?: string) {
  const normalized = normalize(vehicleType);
  if (serviceType === "NEW_VEHICLE_REGISTRATION") return ["car", "suv", "bus", "pickup"].includes(normalized);
  if (serviceType === "VEHICLE_PAPER_RENEWAL") return ["car", "suv", "bus", "pickup"].includes(normalized);
  return false;
}

export function engineOptionsForVehicle(
  rows: FleetPricingRow[],
  serviceType: string | string[] | undefined,
  vehicleType?: string
) {
  const serviceTypes = Array.isArray(serviceType) ? serviceType : serviceType ? [serviceType] : [];
  const managed = rows
    .filter((item) =>
      (!serviceTypes.length || serviceTypes.includes(item.serviceType)) &&
      normalize(item.vehicleType) === normalize(vehicleType) &&
      Boolean(item.engineCategory)
    )
    .map((item) => item.engineCategory || "");
  return uniqueOptions([...managed, ...(categoryEngineOptions[vehicleType || ""] || [])]);
}

export function usageOptionsForVehicle(
  rows: FleetPricingRow[],
  serviceType: string | string[] | undefined,
  vehicleType?: string
) {
  const serviceTypes = Array.isArray(serviceType) ? serviceType : serviceType ? [serviceType] : [];
  const managed = rows
    .filter((item) =>
      (!serviceTypes.length || serviceTypes.includes(item.serviceType)) &&
      normalize(item.vehicleType) === normalize(vehicleType) &&
      Boolean(item.usage)
    )
    .map((item) => item.usage || "");
  return uniqueOptions([...managed, ...privateCommercialOptions]);
}

export function stateOptionsForService(rows: FleetPricingRow[], serviceType: string, fallback: readonly string[] = statePriceOptions) {
  const managed = rows
    .filter((item) => item.serviceType === serviceType && Boolean(item.state))
    .map((item) => item.state || "");
  return uniqueOptions([...managed, ...fallback]);
}

export function defaultRenewalBreakdownItemsForVehicle(vehicleType?: string | null, engineCategory?: string | null, usage?: string | null) {
  if (vehicleType === "Pickup") return pickupRenewalBreakdowns;
  const key = legacyRenewalVehicleType(vehicleType, engineCategory, usage);
  return vehiclePaperRenewalBreakdowns[key as keyof typeof vehiclePaperRenewalBreakdowns] || [];
}

const pickupRenewalBreakdowns = [
  { label: "Vehicle license", amount: 3600 },
  { label: "Radio license", amount: 1000 },
  { label: "Road worthiness", amount: 13500 },
  { label: "Third party insurance", amount: 20000 },
  { label: "Hackney permit", amount: 2500 },
  { label: "Proof of ownership", amount: 1500 }
];

function legacyRenewalVehicleType(vehicleType?: string | null, engineCategory?: string | null, usage?: string | null) {
  const type = vehicleType || "";
  const use = usage || "PRIVATE";
  const engine = engineCategory || "";
  if (type === "Motorcycle") return "MOTORCYCLE";
  if (type === "Tricycle") return "TRICYCLE";
  if (type === "Car") return engine.includes("2.1") ? `SALOON CAR (2.1 - 3.0L) ${use}` : `SALOON CAR (1.6 - 2.0L) ${use}`;
  if (type === "SUV" || type === "Pickup") return `SUV/JEEP/SALOON CAR/PICKUP (3.1 - 12.0L) ${use}`;
  if (type === "Bus") return `BUS/COASTER BUS (3.1 - 12.0L) ${use}`;
  if (type === "Lorry") return "LORRY/TIPPER/TRACTOR (3.1 - 12.0L)";
  if (type === "Truck") return "TANKER/TRUCK (3.1 - 12.0L)";
  return type;
}

function uniqueOptions(options: readonly string[]) {
  return Array.from(new Set(options.map((item) => item.trim()).filter(Boolean)));
}

function normalize(value?: string | null) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

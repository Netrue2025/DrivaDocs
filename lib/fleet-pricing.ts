import { pricingCatalog, serviceLabels, vehiclePaperRenewalBreakdowns, type PricingItem } from "@/lib/pricing-catalog";

export type FleetPricingRow = {
  serviceType: string;
  serviceName: string;
  vehicleType?: string | null;
  engineCategory?: string | null;
  usage?: string | null;
  state?: string | null;
  location?: string | null;
  amount: number;
  notes?: string | null;
  active?: boolean | null;
};

export const adminVehicleCategories = ["Motorcycle", "Tricycle", "Car", "SUV", "Bus", "Pickup", "Lorry", "Truck"] as const;
const renewalEngineOptions: Record<string, string[]> = {
  Car: ["0.1L - 1.59L", "1.6L - 2.0L", "2.1L - 3.0L", "3.1L - 12.0L"],
  SUV: ["1.6L - 2.0L", "2.1L - 3.0L", "3.1L - 12.0L"],
  Pickup: ["1.6L - 2.0L", "2.1L - 3.0L", "3.1L - 12.0L"],
  Bus: ["3.1L - 12.0L"]
};
const newVehicleRegistrationEngineOptions: Record<string, string[]> = {
  Car: ["0.1L - 1.59L", "1.6L - 2.0L", "2.1L - 3.0L", "3.1L - 12.0L"],
  SUV: ["1.6L - 2.0L", "2.1L - 3.0L", "3.1L - 12.0L"],
  Bus: ["1.6L - 2.0L", "2.1L - 3.0L", "3.1L - 12.0L"]
};
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
  const source = rows.length ? rows.filter((item) => item.active !== false) : pricingCatalog.filter((item) => item.serviceType === serviceType);
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
    const renewalTotals = matchingService.filter((item) => item.serviceName === serviceLabels.VEHICLE_PAPER_RENEWAL);
    const renewalRows = renewalTotals.length ? renewalTotals : matchingService;
    return (
      findByCandidates(renewalRows, candidates, { emptyState: true, usage: preferredUsage, engineCategory, exactBroad: true }) ??
      findByCandidates(renewalRows, candidates, { emptyState: true, engineCategory, exactBroad: true }) ??
      findByCandidates(renewalRows, candidates, { emptyState: true, emptyEngineCategory: true, emptyUsage: true }) ??
      findByCandidates(renewalRows, candidates) ??
      renewalRows[0]
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
  const carRange = engine.includes("31") || engine.includes("120")
    ? "31"
    : engine.includes("21") || engine.includes("30")
      ? "21"
      : "16";
  const categories: string[] = [];

  if (type) categories.push(type);
  if (type === "motorcycle") categories.push("motorcycle");
  if (type === "car") {
    if (serviceType === "NEW_VEHICLE_REGISTRATION") {
      categories.push(
        carRange === "31"
          ? "suvjeepsalooncarpickup31120l"
          : carRange === "21"
            ? "salooncar2130l"
            : "salooncar1020l"
      );
    } else {
      categories.push(
        carRange === "31"
          ? `suvjeepsalooncarpickup31120l${useSuffix}`
          : carRange === "21"
            ? `salooncar2130l${useSuffix}`
            : `salooncar1620l${useSuffix}`
      );
    }
  }
  if (type === "suv" || type === "pickup") {
    if (serviceType === "VEHICLE_PAPER_RENEWAL" && type === "suv") {
      categories.push(
        carRange === "31"
          ? `suvjeepsalooncarpickup31120l${useSuffix}`
          : carRange === "21"
            ? `salooncar2130l${useSuffix}`
            : `salooncar1620l${useSuffix}`
      );
    } else {
      categories.push(serviceType === "NEW_VEHICLE_REGISTRATION" ? "suvjeepsalooncarpickup31120l" : `suvjeepsalooncarpickup31120l${useSuffix}`);
    }
  }
  if (type === "bus") {
    if (serviceType === "NEW_VEHICLE_REGISTRATION") {
      categories.push(
        carRange === "31"
          ? "buscoasterbus31120l"
          : carRange === "21"
            ? "salooncar2130l"
            : "salooncar1020l"
      );
    } else {
      categories.push(`buscoasterbus31120l${useSuffix}`);
    }
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
  if (serviceType === "VEHICLE_PAPER_RENEWAL") return ["car", "suv", "pickup", "bus", "lorry", "truck"].includes(normalized);
  return false;
}

export function engineOptionsForVehicle(
  rows: FleetPricingRow[],
  serviceType: string | string[] | undefined,
  vehicleType?: string
) {
  const serviceTypes = Array.isArray(serviceType) ? serviceType : serviceType ? [serviceType] : [];
  const fallback = serviceSpecificEngineOptions(serviceTypes, vehicleType) || categoryEngineOptions[vehicleType || ""] || [];
  if (serviceSpecificEngineOptions(serviceTypes, vehicleType)) return fallback;
  const managed = rows
    .filter((item) =>
      item.active !== false &&
      (!serviceTypes.length || serviceTypes.includes(item.serviceType)) &&
      normalize(item.vehicleType) === normalize(vehicleType) &&
      Boolean(item.engineCategory)
    )
    .map((item) => item.engineCategory || "");
  return uniqueOptions([...managed, ...fallback]);
}

export function usageOptionsForVehicle(
  rows: FleetPricingRow[],
  serviceType: string | string[] | undefined,
  vehicleType?: string
) {
  const serviceTypes = Array.isArray(serviceType) ? serviceType : serviceType ? [serviceType] : [];
  const managed = rows
    .filter((item) =>
      item.active !== false &&
      (!serviceTypes.length || serviceTypes.includes(item.serviceType)) &&
      normalize(item.vehicleType) === normalize(vehicleType) &&
      Boolean(item.usage)
    )
    .map((item) => item.usage || "");
  return uniqueOptions([...managed, ...privateCommercialOptions]);
}

export function stateOptionsForService(rows: FleetPricingRow[], serviceType: string, fallback: readonly string[] = statePriceOptions) {
  const managed = rows
    .filter((item) => item.active !== false && item.serviceType === serviceType && Boolean(item.state))
    .map((item) => item.state || "");
  return uniqueOptions([...managed, ...fallback]);
}

export function defaultRenewalBreakdownItemsForVehicle(vehicleType?: string | null, engineCategory?: string | null, usage?: string | null) {
  if (vehicleType === "Pickup") return pickupRenewalBreakdowns;
  const key = legacyRenewalVehicleType(vehicleType, engineCategory, usage);
  return vehiclePaperRenewalBreakdowns[key as keyof typeof vehiclePaperRenewalBreakdowns] || [];
}

export function renewalBreakdownItemsForVehicle(
  rows: FleetPricingRow[],
  vehicleType?: string | null,
  engineCategory?: string | null,
  usage?: string | null
) {
  const defaults = defaultRenewalBreakdownItemsForVehicle(vehicleType, engineCategory, usage);
  const candidates = fleetPricingVehicleCandidates("VEHICLE_PAPER_RENEWAL", vehicleType || undefined, engineCategory, usage);
  const preferredUsage = normalize(usage) || "private";
  const matchingManagedRows = rows
    .filter((item) =>
      item.serviceType === "VEHICLE_PAPER_RENEWAL" &&
      item.serviceName !== serviceLabels.VEHICLE_PAPER_RENEWAL &&
      renewalItemMatches(item, candidates, engineCategory, preferredUsage)
    );
  const excludedLabels = new Set(matchingManagedRows.filter((item) => item.active === false).map((item) => normalize(item.serviceName)));
  const managed = matchingManagedRows
    .filter((item) => item.active !== false)
    .map((item) => ({ label: item.serviceName, amount: item.amount }));

  if (!defaults.length) return uniqueRenewalItems(managed);

  const managedByLabel = new Map(managed.map((item) => [normalize(item.label), item]));
  const mergedDefaults = defaults
    .filter((item) => !excludedLabels.has(normalize(item.label)))
    .map((item) => managedByLabel.get(normalize(item.label)) ?? item);
  const defaultLabels = new Set(defaults.map((item) => normalize(item.label)));
  const customItems = managed.filter((item) => !defaultLabels.has(normalize(item.label)));
  return uniqueRenewalItems([...mergedDefaults, ...customItems]);
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
  if (type === "Car") {
    if (engine.includes("3.1")) return `SUV/JEEP/SALOON CAR/PICKUP (3.1 - 12.0L) ${use}`;
    return engine.includes("2.1") ? `SALOON CAR (2.1 - 3.0L) ${use}` : `SALOON CAR (1.6 - 2.0L) ${use}`;
  }
  if (type === "SUV") {
    if (engine.includes("1.6")) return `SALOON CAR (1.6 - 2.0L) ${use}`;
    if (engine.includes("2.1")) return `SALOON CAR (2.1 - 3.0L) ${use}`;
    return `SUV/JEEP/SALOON CAR/PICKUP (3.1 - 12.0L) ${use}`;
  }
  if (type === "Pickup") return `SUV/JEEP/SALOON CAR/PICKUP (3.1 - 12.0L) ${use}`;
  if (type === "Bus") return `BUS/COASTER BUS (3.1 - 12.0L) ${use}`;
  if (type === "Lorry") return "LORRY/TIPPER/TRACTOR (3.1 - 12.0L)";
  if (type === "Truck") return "TANKER/TRUCK (3.1 - 12.0L)";
  return type;
}

function uniqueOptions(options: readonly string[]) {
  return Array.from(new Set(options.map((item) => item.trim()).filter(Boolean)));
}

function serviceSpecificEngineOptions(serviceTypes: string[], vehicleType?: string) {
  if (serviceTypes.includes("VEHICLE_PAPER_RENEWAL")) return renewalEngineOptions[vehicleType || ""];
  if (serviceTypes.includes("NEW_VEHICLE_REGISTRATION")) return newVehicleRegistrationEngineOptions[vehicleType || ""];
  return undefined;
}

function renewalItemMatches(
  item: FleetPricingRow,
  candidates: string[],
  engineCategory?: string | null,
  preferredUsage = "private"
) {
  if (item.state || item.location) return false;
  if (!item.vehicleType || !candidates.includes(normalize(item.vehicleType))) return false;
  if (item.engineCategory && engineCategory && normalize(item.engineCategory) !== normalize(engineCategory)) return false;
  if (item.usage && !["privatecommercial", preferredUsage].includes(normalize(item.usage))) return false;
  return true;
}

function uniqueRenewalItems(items: { label: string; amount: number }[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalize(item.label);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalize(value?: string | null) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

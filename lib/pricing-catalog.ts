export type PricingItem = {
  serviceType:
    | "VEHICLE_PAPER_RENEWAL"
    | "NEW_VEHICLE_REGISTRATION"
    | "CHANGE_OF_OWNERSHIP"
    | "OTHER_PERMIT"
    | "FADED_NUMBER_PLATE_REPRINT"
    | "NEW_DRIVERS_LICENSE"
    | "DRIVERS_LICENSE_RENEWAL"
    | "INTERNATIONAL_DRIVERS_LICENSE"
    | "NEW_MOTORCYCLE_RIDERS_LICENSE"
    | "MOTORCYCLE_RIDERS_LICENSE_RENEWAL"
    | "DELIVERY";
  serviceName: string;
  vehicleType?: string;
  engineCategory?: string;
  usage?: string;
  state?: string;
  location?: string;
  amount: number;
  notes?: string;
};

type PricingKeyFields = Pick<PricingItem, "serviceType" | "serviceName" | "vehicleType" | "engineCategory" | "usage" | "state" | "location">;

export const serviceLabels: Record<PricingItem["serviceType"], string> = {
  VEHICLE_PAPER_RENEWAL: "Vehicle paper renewal",
  NEW_VEHICLE_REGISTRATION: "New vehicle registration",
  CHANGE_OF_OWNERSHIP: "Change of ownership",
  OTHER_PERMIT: "Other papers and permits",
  FADED_NUMBER_PLATE_REPRINT: "Reprint of faded number plate",
  NEW_DRIVERS_LICENSE: "New driver's license",
  DRIVERS_LICENSE_RENEWAL: "Driver's license renewal",
  INTERNATIONAL_DRIVERS_LICENSE: "International driver's license",
  NEW_MOTORCYCLE_RIDERS_LICENSE: "New motorcycle rider's license",
  MOTORCYCLE_RIDERS_LICENSE_RENEWAL: "Motorcycle rider's license renewal",
  DELIVERY: "Delivery"
};

export const otherDocumentServices = [
  "Rider's Permit Motorcycle",
  "Heavy and Light Duty Permit",
  "All Route Local Government Papers/Basket",
  "Local Government Papers (South West)/Basket",
  "Signage (Half Branding)",
  "Signage (Full Branding)",
  "Haulage"
] as const;

export const legacyOtherDocumentServices = ["Local government papers", "Signage"];

export const pricingCatalog: PricingItem[] = [
  {
    serviceType: "VEHICLE_PAPER_RENEWAL",
    serviceName: serviceLabels.VEHICLE_PAPER_RENEWAL,
    vehicleType: "Car",
    engineCategory: "1.6L - 2.0L",
    usage: "PRIVATE",
    state: "Lagos",
    amount: 68000
  },
  {
    serviceType: "VEHICLE_PAPER_RENEWAL",
    serviceName: serviceLabels.VEHICLE_PAPER_RENEWAL,
    vehicleType: "SUV",
    engineCategory: "2.1L - 3.0L",
    usage: "PRIVATE",
    state: "Lagos",
    amount: 82000
  },
  {
    serviceType: "VEHICLE_PAPER_RENEWAL",
    serviceName: serviceLabels.VEHICLE_PAPER_RENEWAL,
    vehicleType: "Bus",
    engineCategory: "Commercial",
    usage: "COMMERCIAL",
    state: "Lagos",
    amount: 95000
  },
  {
    serviceType: "NEW_VEHICLE_REGISTRATION",
    serviceName: serviceLabels.NEW_VEHICLE_REGISTRATION,
    vehicleType: "Car",
    engineCategory: "1.6L - 2.0L",
    usage: "PRIVATE",
    state: "Lagos",
    amount: 245000
  },
  {
    serviceType: "NEW_VEHICLE_REGISTRATION",
    serviceName: serviceLabels.NEW_VEHICLE_REGISTRATION,
    vehicleType: "SUV",
    engineCategory: "2.1L - 3.0L",
    usage: "PRIVATE",
    state: "Lagos",
    amount: 295000
  },
  {
    serviceType: "CHANGE_OF_OWNERSHIP",
    serviceName: serviceLabels.CHANGE_OF_OWNERSHIP,
    vehicleType: "Car",
    usage: "PRIVATE",
    state: "Lagos",
    location: "Lagos to Lagos",
    amount: 110000
  },
  {
    serviceType: "CHANGE_OF_OWNERSHIP",
    serviceName: serviceLabels.CHANGE_OF_OWNERSHIP,
    vehicleType: "Car",
    usage: "PRIVATE",
    state: "Oyo",
    location: "Lagos to Oyo",
    amount: 135000
  },
  {
    serviceType: "CHANGE_OF_OWNERSHIP",
    serviceName: serviceLabels.CHANGE_OF_OWNERSHIP,
    vehicleType: "Car",
    usage: "PRIVATE",
    state: "Oyo",
    location: "Oyo to Oyo",
    amount: 98000
  },
  {
    serviceType: "OTHER_PERMIT",
    serviceName: "Rider's Permit Motorcycle",
    amount: 1000
  },
  {
    serviceType: "OTHER_PERMIT",
    serviceName: "Heavy and Light Duty Permit",
    amount: 5000
  },
  {
    serviceType: "OTHER_PERMIT",
    serviceName: "All Route Local Government Papers/Basket",
    amount: 40000
  },
  {
    serviceType: "OTHER_PERMIT",
    serviceName: "Local Government Papers (South West)/Basket",
    amount: 35000
  },
  {
    serviceType: "OTHER_PERMIT",
    serviceName: "Signage (Half Branding)",
    amount: 20000
  },
  {
    serviceType: "OTHER_PERMIT",
    serviceName: "Signage (Full Branding)",
    amount: 40000
  },
  {
    serviceType: "OTHER_PERMIT",
    serviceName: "Haulage",
    amount: 0,
    notes: "Negotiation based"
  },
  {
    serviceType: "FADED_NUMBER_PLATE_REPRINT",
    serviceName: serviceLabels.FADED_NUMBER_PLATE_REPRINT,
    vehicleType: "Car",
    state: "Lagos",
    amount: 75000
  },
  {
    serviceType: "NEW_DRIVERS_LICENSE",
    serviceName: serviceLabels.NEW_DRIVERS_LICENSE,
    state: "Lagos",
    amount: 70000
  },
  {
    serviceType: "DRIVERS_LICENSE_RENEWAL",
    serviceName: serviceLabels.DRIVERS_LICENSE_RENEWAL,
    state: "Lagos",
    amount: 48000
  },
  {
    serviceType: "INTERNATIONAL_DRIVERS_LICENSE",
    serviceName: serviceLabels.INTERNATIONAL_DRIVERS_LICENSE,
    state: "Lagos",
    amount: 85000
  },
  {
    serviceType: "NEW_MOTORCYCLE_RIDERS_LICENSE",
    serviceName: serviceLabels.NEW_MOTORCYCLE_RIDERS_LICENSE,
    state: "Lagos",
    amount: 42000
  },
  {
    serviceType: "MOTORCYCLE_RIDERS_LICENSE_RENEWAL",
    serviceName: serviceLabels.MOTORCYCLE_RIDERS_LICENSE_RENEWAL,
    state: "Lagos",
    amount: 30000
  },
  {
    serviceType: "DELIVERY",
    serviceName: "Lagos mainland delivery",
    state: "Lagos",
    location: "Mainland",
    amount: 5000
  },
  {
    serviceType: "DELIVERY",
    serviceName: "Lagos island delivery",
    state: "Lagos",
    location: "Island",
    amount: 8000
  },
  {
    serviceType: "DELIVERY",
    serviceName: "Oyo delivery",
    state: "Oyo",
    location: "Ibadan",
    amount: 7000
  }
];

export const vehicleTypes = ["Car", "SUV", "Bus", "Van", "Motorcycle"];
export const engineCategories = ["1.6L - 2.0L", "2.1L - 3.0L", "Commercial", "Motorcycle"];
export const usageTypes = ["PRIVATE", "COMMERCIAL"];
export const states = ["Lagos", "Oyo"];

export function pricingKey(item: PricingKeyFields) {
  return [
    item.serviceType,
    item.serviceName,
    item.vehicleType || "",
    item.engineCategory || "",
    item.usage || "",
    item.state || "",
    item.location || ""
  ].join("::");
}

export function mergePricingWithCatalog(rows: PricingItem[]) {
  const byKey = new Map(rows.map((item) => [pricingKey(item), item]));
  const merged = pricingCatalog.map((item) => byKey.get(pricingKey(item)) ?? item);
  const catalogKeys = new Set(pricingCatalog.map(pricingKey));
  return [...merged, ...rows.filter((item) => !catalogKeys.has(pricingKey(item)))];
}

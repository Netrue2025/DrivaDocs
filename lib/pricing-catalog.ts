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
  active?: boolean;
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
export const driverLicenseDurationOptions = ["3 years", "5 years"] as const;

export const newVehicleRegistrationLocations = ["Oyo", "Lagos", "Abuja"] as const;
export const vehicleTypes = ["Motorcycle", "Tricycle", "Car", "SUV", "Bus", "Pickup", "Lorry", "Truck"];

export const nonRegionalPricingServiceTypes = [
  "FADED_NUMBER_PLATE_REPRINT",
  "NEW_DRIVERS_LICENSE",
  "DRIVERS_LICENSE_RENEWAL",
  "INTERNATIONAL_DRIVERS_LICENSE",
  "NEW_MOTORCYCLE_RIDERS_LICENSE",
  "MOTORCYCLE_RIDERS_LICENSE_RENEWAL"
] as const;

export function normalizeNonRegionalPricingScope<T extends Pick<PricingItem, "serviceType" | "state">>(item: T): T {
  return nonRegionalPricingServiceTypes.includes(item.serviceType as (typeof nonRegionalPricingServiceTypes)[number])
    ? { ...item, state: undefined }
    : item;
}

export const newVehicleRegistrationCategories = [
  "MOTORCYCLE",
  "TRICYCLE",
  "SALOON CAR (1.0 - 2.0 L)",
  "SALOON CAR (2.1 - 3.0 L)",
  "SUV/JEEP/SALOON CAR/PICKUP (3.1 - 12.0 L)",
  "BUS/COASTER BUS (3.1 - 12.0 L)",
  "LUXURY BUS (3.1 - 12.0 L)",
  "LORRY/TIPPER/TRACTOR (3.1 - 12.0 L)",
  "TANKER/TRUCK (3.1 - 12.0 L)",
  "ARTICULATED TRAILER (3.1 - 12.0 L)"
] as const;

const newRegistrationPricingMatrix: Array<{
  vehicleType: (typeof newVehicleRegistrationCategories)[number];
  usage?: "PRIVATE" | "COMMERCIAL" | "PRIVATE/COMMERCIAL";
  prices: Partial<Record<(typeof newVehicleRegistrationLocations)[number], number>>;
}> = [
  { vehicleType: "MOTORCYCLE", usage: "PRIVATE/COMMERCIAL", prices: { Oyo: 41000, Lagos: 41000, Abuja: 41000 } },
  { vehicleType: "TRICYCLE", usage: "PRIVATE/COMMERCIAL", prices: { Oyo: 42000, Lagos: 42000, Abuja: 42000 } },
  { vehicleType: "SALOON CAR (1.0 - 2.0 L)", usage: "PRIVATE", prices: { Oyo: 85000, Lagos: 95000, Abuja: 105000 } },
  { vehicleType: "SALOON CAR (1.0 - 2.0 L)", usage: "COMMERCIAL", prices: { Oyo: 92000, Lagos: 102000, Abuja: 112000 } },
  { vehicleType: "SALOON CAR (2.1 - 3.0 L)", usage: "PRIVATE", prices: { Oyo: 86000, Lagos: 96000, Abuja: 106000 } },
  { vehicleType: "SALOON CAR (2.1 - 3.0 L)", usage: "COMMERCIAL", prices: { Oyo: 93000, Lagos: 103000, Abuja: 113000 } },
  { vehicleType: "SUV/JEEP/SALOON CAR/PICKUP (3.1 - 12.0 L)", usage: "PRIVATE", prices: { Oyo: 86500, Lagos: 98500, Abuja: 108500 } },
  { vehicleType: "SUV/JEEP/SALOON CAR/PICKUP (3.1 - 12.0 L)", usage: "COMMERCIAL", prices: { Oyo: 96500, Lagos: 108500, Abuja: 109000 } },
  { vehicleType: "BUS/COASTER BUS (3.1 - 12.0 L)", usage: "PRIVATE", prices: { Oyo: 97000, Lagos: 110500, Abuja: 112000 } },
  { vehicleType: "BUS/COASTER BUS (3.1 - 12.0 L)", usage: "COMMERCIAL", prices: { Oyo: 100000, Lagos: 113500, Abuja: 114000 } },
  { vehicleType: "LUXURY BUS (3.1 - 12.0 L)", prices: { Oyo: 102000, Lagos: 115000, Abuja: 118000 } },
  { vehicleType: "LORRY/TIPPER/TRACTOR (3.1 - 12.0 L)", prices: { Oyo: 110000, Lagos: 125000, Abuja: 125000 } },
  { vehicleType: "TANKER/TRUCK (3.1 - 12.0 L)", prices: { Oyo: 115000, Lagos: 205000, Abuja: 155000 } },
  { vehicleType: "ARTICULATED TRAILER (3.1 - 12.0 L)", prices: { Oyo: 125000, Lagos: 215000, Abuja: 175000 } }
];

export const newVehicleRegistrationPricing = newRegistrationPricingMatrix.flatMap((row) =>
  newVehicleRegistrationLocations.map((state) => ({
    serviceType: "NEW_VEHICLE_REGISTRATION" as const,
    serviceName: serviceLabels.NEW_VEHICLE_REGISTRATION,
    vehicleType: row.vehicleType,
    usage: row.usage,
    state,
    amount: row.prices[state] || 0
  }))
);

export const vehiclePaperRenewalCategories = [
  "MOTORCYCLE",
  "TRICYCLE",
  "SALOON CAR (1.6 - 2.0L) PRIVATE",
  "SALOON CAR (1.6 - 2.0L) COMMERCIAL",
  "SALOON CAR (2.1 - 3.0L) PRIVATE",
  "SALOON CAR (2.1 - 3.0L) COMMERCIAL",
  "SUV/JEEP/SALOON CAR/PICKUP (3.1 - 12.0L) PRIVATE",
  "SUV/JEEP/SALOON CAR/PICKUP (3.1 - 12.0L) COMMERCIAL",
  "BUS/COASTER BUS (3.1 - 12.0L) PRIVATE",
  "BUS/COASTER BUS (3.1 - 12.0L) COMMERCIAL",
  "LUXURY BUS (3.1 - 12.0L)",
  "LORRY/TIPPER/TRACTOR (3.1 - 12.0L)",
  "TANKER/TRUCK (3.1 - 12.0L)",
  "ARTICULATED TRAILER (3.1 - 12.0L)"
] as const;

export const vehiclePaperRenewalBreakdowns: Record<(typeof vehiclePaperRenewalCategories)[number], { label: string; amount: number }[]> = {
  MOTORCYCLE: [
    { label: "Vehicle license", amount: 2000 },
    { label: "Radio license", amount: 1000 },
    { label: "Road worthiness", amount: 3500 },
    { label: "Third party insurance", amount: 5000 },
    { label: "Hackney permit", amount: 500 },
    { label: "Rider's permit", amount: 1000 },
    { label: "Proof of ownership", amount: 1500 }
  ],
  TRICYCLE: [
    { label: "Vehicle license", amount: 2000 },
    { label: "Radio license", amount: 1000 },
    { label: "Road worthiness", amount: 3500 },
    { label: "Third party insurance", amount: 5000 },
    { label: "Hackney permit", amount: 1500 },
    { label: "Rider's permit", amount: 1000 },
    { label: "Proof of ownership", amount: 1500 }
  ],
  "SALOON CAR (1.6 - 2.0L) PRIVATE": [
    { label: "Vehicle license", amount: 2500 },
    { label: "Radio license", amount: 1000 },
    { label: "Road worthiness", amount: 7900 },
    { label: "Third party insurance", amount: 15000 },
    { label: "Hackney permit", amount: 1500 },
    { label: "Proof of ownership", amount: 1500 }
  ],
  "SALOON CAR (1.6 - 2.0L) COMMERCIAL": [
    { label: "Vehicle license", amount: 2500 },
    { label: "Radio license", amount: 1000 },
    { label: "Road worthiness", amount: 6900 },
    { label: "Third party insurance", amount: 20000 },
    { label: "Hackney permit", amount: 1500 },
    { label: "Proof of ownership", amount: 1500 }
  ],
  "SALOON CAR (2.1 - 3.0L) PRIVATE": [
    { label: "Vehicle license", amount: 3000 },
    { label: "Radio license", amount: 1000 },
    { label: "Road worthiness", amount: 7500 },
    { label: "Third party insurance", amount: 15000 },
    { label: "Hackney permit", amount: 2500 },
    { label: "Proof of ownership", amount: 1500 }
  ],
  "SALOON CAR (2.1 - 3.0L) COMMERCIAL": [
    { label: "Vehicle license", amount: 3000 },
    { label: "Radio license", amount: 1000 },
    { label: "Road worthiness", amount: 7500 },
    { label: "Third party insurance", amount: 20000 },
    { label: "Hackney permit", amount: 2500 },
    { label: "Proof of ownership", amount: 1500 }
  ],
  "SUV/JEEP/SALOON CAR/PICKUP (3.1 - 12.0L) PRIVATE": [
    { label: "Vehicle license", amount: 3600 },
    { label: "Radio license", amount: 1000 },
    { label: "Road worthiness", amount: 8500 },
    { label: "Third party insurance", amount: 15000 },
    { label: "Hackney permit", amount: 2500 }
  ],
  "SUV/JEEP/SALOON CAR/PICKUP (3.1 - 12.0L) COMMERCIAL": [
    { label: "Vehicle license", amount: 3600 },
    { label: "Radio license", amount: 1000 },
    { label: "Road worthiness", amount: 8500 },
    { label: "Third party insurance", amount: 20000 },
    { label: "Hackney permit", amount: 2500 },
    { label: "Proof of ownership", amount: 1500 }
  ],
  "BUS/COASTER BUS (3.1 - 12.0L) PRIVATE": [
    { label: "Vehicle license", amount: 3600 },
    { label: "Radio license", amount: 1000 },
    { label: "Road worthiness", amount: 10500 },
    { label: "Third party insurance", amount: 15000 },
    { label: "Hackney permit", amount: 2500 },
    { label: "Proof of ownership", amount: 1500 }
  ],
  "BUS/COASTER BUS (3.1 - 12.0L) COMMERCIAL": [
    { label: "Vehicle license", amount: 3600 },
    { label: "Radio license", amount: 1000 },
    { label: "Road worthiness", amount: 10500 },
    { label: "Third party insurance", amount: 20000 },
    { label: "Hackney permit", amount: 3600 },
    { label: "Proof of ownership", amount: 1500 }
  ],
  "LUXURY BUS (3.1 - 12.0L)": [
    { label: "Vehicle license", amount: 3600 },
    { label: "Radio license", amount: 1000 },
    { label: "Road worthiness", amount: 11000 },
    { label: "Third party insurance", amount: 20000 },
    { label: "Hackney permit", amount: 3600 },
    { label: "Proof of ownership", amount: 1500 }
  ],
  "LORRY/TIPPER/TRACTOR (3.1 - 12.0L)": [
    { label: "Vehicle license", amount: 4300 },
    { label: "Radio license", amount: 1000 },
    { label: "Road worthiness", amount: 13500 },
    { label: "Third party insurance", amount: 20000 },
    { label: "Hackney permit", amount: 3600 },
    { label: "Proof of ownership", amount: 1500 }
  ],
  "TANKER/TRUCK (3.1 - 12.0L)": [
    { label: "Vehicle license", amount: 6800 },
    { label: "Radio license", amount: 1000 },
    { label: "Road worthiness", amount: 13500 },
    { label: "Third party insurance", amount: 20000 },
    { label: "Hackney permit", amount: 3600 },
    { label: "Proof of ownership", amount: 1500 }
  ],
  "ARTICULATED TRAILER (3.1 - 12.0L)": [
    { label: "Vehicle license", amount: 9300 },
    { label: "Radio license", amount: 1000 },
    { label: "Road worthiness", amount: 14500 },
    { label: "Third party insurance", amount: 20000 },
    { label: "Hackney permit", amount: 3600 },
    { label: "Proof of ownership", amount: 1500 }
  ]
};

export const vehiclePaperRenewalPricing = vehiclePaperRenewalCategories.map((vehicleType) => ({
  serviceType: "VEHICLE_PAPER_RENEWAL" as const,
  serviceName: serviceLabels.VEHICLE_PAPER_RENEWAL,
  vehicleType,
  amount: vehiclePaperRenewalBreakdowns[vehicleType].reduce((sum, item) => sum + item.amount, 0)
}));

export const pricingCatalog: PricingItem[] = [
  ...vehiclePaperRenewalPricing,
  ...newVehicleRegistrationPricing,
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
  ...vehicleTypes.map((vehicleType) => ({
    serviceType: "FADED_NUMBER_PLATE_REPRINT" as const,
    serviceName: serviceLabels.FADED_NUMBER_PLATE_REPRINT,
    vehicleType,
    amount: 75000
  })),
  {
    serviceType: "NEW_DRIVERS_LICENSE",
    serviceName: serviceLabels.NEW_DRIVERS_LICENSE,
    location: "3 years",
    amount: 47000
  },
  {
    serviceType: "NEW_DRIVERS_LICENSE",
    serviceName: serviceLabels.NEW_DRIVERS_LICENSE,
    location: "5 years",
    amount: 52000
  },
  {
    serviceType: "DRIVERS_LICENSE_RENEWAL",
    serviceName: serviceLabels.DRIVERS_LICENSE_RENEWAL,
    location: "3 years",
    amount: 24500
  },
  {
    serviceType: "DRIVERS_LICENSE_RENEWAL",
    serviceName: serviceLabels.DRIVERS_LICENSE_RENEWAL,
    location: "5 years",
    amount: 29500
  },
  {
    serviceType: "INTERNATIONAL_DRIVERS_LICENSE",
    serviceName: serviceLabels.INTERNATIONAL_DRIVERS_LICENSE,
    amount: 85000
  },
  {
    serviceType: "NEW_MOTORCYCLE_RIDERS_LICENSE",
    serviceName: serviceLabels.NEW_MOTORCYCLE_RIDERS_LICENSE,
    amount: 42000
  },
  {
    serviceType: "MOTORCYCLE_RIDERS_LICENSE_RENEWAL",
    serviceName: serviceLabels.MOTORCYCLE_RIDERS_LICENSE_RENEWAL,
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
  },
  {
    serviceType: "DELIVERY",
    serviceName: "Abuja delivery",
    state: "Abuja",
    location: "Abuja",
    amount: 10000
  }
];

export const engineCategories = ["Motorcycle", "Tricycle", "1.0L - 2.0L", "1.6L - 2.0L", "2.1L - 3.0L", "3.1L - 12.0L"];
export const usageTypes = ["PRIVATE", "COMMERCIAL"];
export const states = ["Lagos", "Oyo", "Abuja"];

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
  const activeRows = rows
    .filter((item) => item.active !== false && !isLegacyDriverLicensePrice(item))
    .map(normalizeNonRegionalPricingScope);
  const inactiveKeys = new Set(rows.filter((item) => item.active === false).map(normalizeNonRegionalPricingScope).map(pricingKey));
  const byKey = new Map(activeRows.map((item) => [pricingKey(item), item]));
  const merged = pricingCatalog
    .filter((item) => !inactiveKeys.has(pricingKey(item)))
    .map((item) => byKey.get(pricingKey(item)) ?? item);
  const catalogKeys = new Set(pricingCatalog.map(pricingKey));
  const customActiveRows = activeRows.filter((item) => !catalogKeys.has(pricingKey(item)));
  const inactiveRenewalDocumentRows = rows.filter((item) =>
    item.active === false &&
    item.serviceType === "VEHICLE_PAPER_RENEWAL" &&
    item.serviceName !== serviceLabels.VEHICLE_PAPER_RENEWAL
  );
  return [...merged, ...customActiveRows, ...inactiveRenewalDocumentRows];
}

export function isLegacyDriverLicensePrice(item: Pick<PricingItem, "serviceType" | "location">) {
  return (
    (item.serviceType === "NEW_DRIVERS_LICENSE" || item.serviceType === "DRIVERS_LICENSE_RENEWAL") &&
    !item.location
  );
}

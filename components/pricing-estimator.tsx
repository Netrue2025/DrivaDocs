"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { adminVehicleCategories, categoryEngineOptions, defaultRenewalBreakdownItemsForVehicle, engineOptionsForVehicle, needsEngineCategory, needsUsageCategory, resolveFleetPrice, stateOptionsForService, usageOptionsForVehicle } from "@/lib/fleet-pricing";
import { engineCategories, newVehicleRegistrationLocations, otherDocumentServices, serviceLabels, states as deliveryStates, usageTypes, vehicleTypes, type PricingItem } from "@/lib/pricing-catalog";
import { getServiceDeliveryPeriod } from "@/lib/service-delivery";
import { formatNaira, splitPayment } from "@/lib/utils";

type ServiceType = keyof typeof serviceLabels;
type DeliveryMethod = "PHYSICAL_DELIVERY" | "SCAN_TO_ME" | "PICKUP_OFFICE";

const serviceTypes = Object.keys(serviceLabels).filter((item) => item !== "DELIVERY") as ServiceType[];

const serviceFieldRules: Record<
  ServiceType,
  {
    vehicleType?: boolean;
    engineCategory?: boolean;
    usage?: boolean;
    state?: boolean;
    ownershipRoute?: boolean;
    deliveryLocation?: boolean;
    otherDocument?: boolean;
  }
> = {
  VEHICLE_PAPER_RENEWAL: {
    vehicleType: true,
    engineCategory: true,
    usage: true,
    state: true,
    deliveryLocation: true
  },
  NEW_VEHICLE_REGISTRATION: {
    vehicleType: true,
    engineCategory: true,
    usage: true,
    state: true,
    deliveryLocation: true
  },
  CHANGE_OF_OWNERSHIP: {
    vehicleType: true,
    usage: true,
    state: true,
    ownershipRoute: true,
    deliveryLocation: true
  },
  OTHER_PERMIT: {
    otherDocument: true,
    state: true,
    deliveryLocation: true
  },
  FADED_NUMBER_PLATE_REPRINT: {
    vehicleType: true,
    state: true,
    deliveryLocation: true
  },
  NEW_DRIVERS_LICENSE: {
    state: true,
    deliveryLocation: true
  },
  DRIVERS_LICENSE_RENEWAL: {
    state: true,
    deliveryLocation: true
  },
  INTERNATIONAL_DRIVERS_LICENSE: {
    state: true,
    deliveryLocation: true
  },
  NEW_MOTORCYCLE_RIDERS_LICENSE: {
    state: true,
    deliveryLocation: true
  },
  MOTORCYCLE_RIDERS_LICENSE_RENEWAL: {
    state: true,
    deliveryLocation: true
  },
  DELIVERY: {}
};

const ownershipRoutes = ["Lagos to Lagos", "Lagos to Oyo", "Oyo to Oyo"];
const deliveryMethods: { value: DeliveryMethod; label: string }[] = [
  { value: "PHYSICAL_DELIVERY", label: "Physical delivery" },
  { value: "SCAN_TO_ME", label: "Scan to me (online)" },
  { value: "PICKUP_OFFICE", label: "Pickup from our office" }
];

export function PricingEstimator({ prices }: { prices: PricingItem[] }) {
  const [serviceType, setServiceType] = useState<ServiceType | "">("");
  const [vehicleType, setVehicleType] = useState("Car");
  const [engineCategory, setEngineCategory] = useState("1.6L - 2.0L");
  const [usage, setUsage] = useState("PRIVATE");
  const [state, setState] = useState("Lagos");
  const [otherState, setOtherState] = useState("");
  const [ownershipRoute, setOwnershipRoute] = useState("Lagos to Lagos");
  const [deliveryState, setDeliveryState] = useState("Lagos");
  const [deliveryLocation, setDeliveryLocation] = useState("Mainland");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("PHYSICAL_DELIVERY");
  const [otherDocument, setOtherDocument] = useState("");
  const [estimateOpen, setEstimateOpen] = useState(false);

  const rules = serviceType ? serviceFieldRules[serviceType] : null;
  const showPreferredStatePlate = serviceType === "NEW_VEHICLE_REGISTRATION";
  const otherDocumentReady = serviceType !== "OTHER_PERMIT" || Boolean(otherDocument);
  const preferredStateReady = serviceType !== "NEW_VEHICLE_REGISTRATION" || state !== "Others State" || Boolean(otherState.trim());
  const engineOptions = useMemo(() => engineOptionsForVehicle(prices, serviceType || undefined, vehicleType), [prices, serviceType, vehicleType]);
  const usageOptions = useMemo(() => usageOptionsForVehicle(prices, serviceType || undefined, vehicleType), [prices, serviceType, vehicleType]);
  const preferredPlateOptions = useMemo(() => [...stateOptionsForService(prices, "NEW_VEHICLE_REGISTRATION", newVehicleRegistrationLocations), "Others State"], [prices]);
  const deliveryStateOptions = useMemo(() => stateOptionsForService(prices, "DELIVERY", deliveryStates), [prices]);
  const deliveryOptions = useMemo(() => deliveryOptionsForState(prices, deliveryState), [deliveryState, prices]);
  const selectedDeliveryLocation = deliveryOptions.some((item) => item.location === deliveryLocation)
    ? deliveryLocation
    : deliveryOptions[0]?.location || deliveryState;
  const servicePricingState = serviceType === "NEW_VEHICLE_REGISTRATION" && state === "Others State" ? otherState.trim() : state;

  const servicePrice = useMemo(() => {
    if (!serviceType) return undefined;
    const preferredState = servicePricingState;
    const effectiveEngineCategory = engineCategory || engineOptions[0] || categoryEngineOptions[vehicleType]?.[0] || (vehicleType === "Motorcycle" ? "Motorcycle" : engineCategories[0]);

    if (serviceType === "OTHER_PERMIT") {
      return prices.find((item) => item.serviceType === serviceType && item.serviceName === otherDocument);
    }

    if (serviceType === "NEW_VEHICLE_REGISTRATION") {
      return resolveFleetPrice(serviceType, prices, vehicleType, effectiveEngineCategory, usage, preferredState);
    }

    if (serviceType === "VEHICLE_PAPER_RENEWAL") {
      return resolveFleetPrice(serviceType, prices, vehicleType, effectiveEngineCategory, usage, state);
    }

    return (
      prices.find(
        (item) =>
          item.serviceType === serviceType &&
          (!item.location || item.location === ownershipRoute) &&
          (!item.vehicleType || item.vehicleType === vehicleType) &&
          (!item.engineCategory || item.engineCategory === effectiveEngineCategory) &&
          (!item.usage || item.usage === usage) &&
          (!item.state || item.state === preferredState)
      ) ??
      prices.find((item) => item.serviceType === serviceType && (!item.state || item.state === preferredState)) ??
      prices.find((item) => item.serviceType === serviceType)
    );
  }, [engineCategory, engineOptions, otherDocument, ownershipRoute, prices, servicePricingState, serviceType, state, usage, vehicleType]);
  const effectiveEngineCategory = engineCategory || engineOptions[0] || categoryEngineOptions[vehicleType]?.[0] || (vehicleType === "Motorcycle" ? "Motorcycle" : engineCategories[0]);
  const renewalBreakdown = useMemo(() => {
    if (serviceType !== "VEHICLE_PAPER_RENEWAL") return [];
    const managed = prices
      .filter((item) =>
        item.serviceType === "VEHICLE_PAPER_RENEWAL" &&
        item.serviceName !== serviceLabels.VEHICLE_PAPER_RENEWAL &&
        item.vehicleType === vehicleType &&
        sameOption(item.engineCategory, effectiveEngineCategory) &&
        sameOption(item.usage, usage) &&
        !item.state &&
        !item.location
      )
      .map((item) => ({ label: item.serviceName, amount: item.amount }));
    return managed.length ? managed : defaultRenewalBreakdownItemsForVehicle(vehicleType, effectiveEngineCategory, usage);
  }, [effectiveEngineCategory, prices, serviceType, usage, vehicleType]);

  const delivery = useMemo(() => {
    return (
      prices.find((item) => item.serviceType === "DELIVERY" && item.state === deliveryState && item.location === selectedDeliveryLocation) ??
      prices.find((item) => item.serviceType === "DELIVERY" && item.state === deliveryState)
    );
  }, [deliveryState, prices, selectedDeliveryLocation]);

  const base = renewalBreakdown.length ? renewalBreakdown.reduce((sum, item) => sum + item.amount, 0) : servicePrice?.amount ?? 0;
  const deliveryCost = deliveryMethod === "PHYSICAL_DELIVERY" ? delivery?.amount ?? 0 : 0;
  const isNegotiated = Boolean(servicePrice?.notes && servicePrice.amount === 0);
  const total = isNegotiated ? 0 : base + deliveryCost;
  const split = splitPayment(total);
  const deliveryPeriod = getServiceDeliveryPeriod(serviceType || undefined);
  const canEstimate = Boolean(serviceType && otherDocumentReady && preferredStateReady);
  const startUrl = useMemo(() => {
    if (!serviceType) return "/dashboard/requests/new";

    const params = new URLSearchParams({
      serviceType,
      state: serviceType === "NEW_VEHICLE_REGISTRATION" && state === "Others State" ? otherState.trim() || "Others State" : state,
      vehicleType
    });
    if (serviceType === "OTHER_PERMIT" && otherDocument) params.set("otherDocument", otherDocument);
    return `/dashboard/requests/new?${params.toString()}`;
  }, [otherDocument, otherState, serviceType, state, vehicleType]);

  function showEstimate() {
    if (!canEstimate) return;
    setEstimateOpen(true);
  }

  return (
    <div className="mt-12 mb-20">
      <div className="mx-auto max-w-4xl rounded border border-brand-900/10 bg-white shadow-soft">
        <div className="border-b border-brand-900/10 bg-brand-50 px-5 py-4 sm:px-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-700">Select service type</p>
          {/* <p className="mt-1 text-sm font-semibold text-ink/62">
            Start with the service you need. The matching details will open below.
          </p> */}
        </div>
        <div className="grid gap-6 p-5 sm:p-7">
          <label className="grid gap-3">
            {/* <span className="text-sm font-black text-brand-800 ">Which service do you want to check?</span> */}
            <select
              value={serviceType}
              onChange={(event) => {
                const nextService = event.target.value as ServiceType;
                const nextVehicleType = defaultVehicleTypeForService(nextService);
                setServiceType(nextService);
                setVehicleType(nextVehicleType);
                setEngineCategory(engineOptionsForVehicle(prices, nextService, nextVehicleType)[0] || categoryEngineOptions[nextVehicleType]?.[0] || engineCategories[0]);
                setOtherDocument("");
                setState("Lagos");
                setOtherState("");
                setDeliveryState("Lagos");
                setDeliveryLocation("Mainland");
                setEstimateOpen(false);
              }}
              className="field min-h-14 text-base font-bold"
            >
              <option value="">Select service to check price</option>
              {serviceTypes.map((item) => (
                <option key={item} value={item}>
                  {serviceLabels[item]}
                </option>
              ))}
            </select>
          </label>

          {rules ? (
            <div className="animate-rise grid gap-5 border-t border-brand-900/10 pt-6 md:grid-cols-2">
              {rules.otherDocument ? (
                <Field label="Other document service">
                  <select
                    value={otherDocument}
                    onChange={(event) => {
                      setOtherDocument(event.target.value);
                      setEstimateOpen(false);
                    }}
                    className="field"
                  >
                    <option value="">Select other document service</option>
                    {otherDocumentServices.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {rules.vehicleType ? (
                <Field label="Vehicle type">
                  <select
                    value={vehicleType}
                    onChange={(event) => {
                      const nextVehicleType = event.target.value;
                      setVehicleType(nextVehicleType);
                      setEngineCategory(engineOptionsForVehicle(prices, serviceType, nextVehicleType)[0] || categoryEngineOptions[nextVehicleType]?.[0] || engineCategories[0]);
                      setEstimateOpen(false);
                    }}
                    className="field"
                  >
                    {vehicleOptionsForService(serviceType).map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {(serviceType === "NEW_VEHICLE_REGISTRATION" || serviceType === "VEHICLE_PAPER_RENEWAL") && needsEngineCategory(vehicleType) ? (
                <Field label="Engine/category">
                  <select
                    value={engineCategory || engineOptions[0] || categoryEngineOptions[vehicleType]?.[0] || engineCategories[0]}
                    onChange={(event) => {
                      setEngineCategory(event.target.value);
                      setEstimateOpen(false);
                    }}
                    className="field"
                  >
                    {(engineOptions.length ? engineOptions : categoryEngineOptions[vehicleType] || engineCategories.filter((item) => item !== "Motorcycle")).map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {rules.usage && (serviceType !== "VEHICLE_PAPER_RENEWAL" || needsUsageCategory(serviceType, vehicleType)) ? (
                <Field label="Private or commercial">
                  <select
                    value={usage}
                    onChange={(event) => {
                      setUsage(event.target.value);
                      setEstimateOpen(false);
                    }}
                    className="field"
                  >
                    {usageOptions.map((item) => (
                      <option key={item} value={item}>
                        {item === "PRIVATE" ? "Private" : item === "COMMERCIAL" ? "Commercial" : item}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {rules.ownershipRoute ? (
                <Field label="Ownership transfer route">
                  <select
                    value={ownershipRoute}
                    onChange={(event) => {
                      setOwnershipRoute(event.target.value);
                      setEstimateOpen(false);
                    }}
                    className="field"
                  >
                    {ownershipRoutes.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {rules.state && otherDocumentReady && showPreferredStatePlate ? (
                <Field label="Preferred state plate">
                  <select
                    value={state}
                    onChange={(event) => {
                      setState(event.target.value);
                      setOtherState("");
                      setEstimateOpen(false);
                    }}
                    className="field"
                  >
                    {preferredPlateOptions.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {rules.state && otherDocumentReady && showPreferredStatePlate && state === "Others State" ? (
                <Field label="Other preferred state">
                  <input
                    value={otherState}
                    onChange={(event) => {
                      setOtherState(event.target.value);
                      setEstimateOpen(false);
                    }}
                    className="field"
                    placeholder="Type preferred state"
                  />
                </Field>
              ) : null}
              {rules.deliveryLocation && otherDocumentReady ? (
                <Field label="Delivery option">
                  <select
                    value={deliveryMethod}
                    onChange={(event) => {
                      setDeliveryMethod(event.target.value as DeliveryMethod);
                      setEstimateOpen(false);
                    }}
                    className="field"
                  >
                    {deliveryMethods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </Field>
              ) : null}
              {rules.deliveryLocation && otherDocumentReady && deliveryMethod === "PHYSICAL_DELIVERY" ? (
                <Field label="Delivery state">
                  <select
                    value={deliveryState}
                    onChange={(event) => {
                      const nextState = event.target.value;
                      setDeliveryState(nextState);
                      setDeliveryLocation(deliveryOptionsForState(prices, nextState)[0]?.location || nextState);
                      setEstimateOpen(false);
                    }}
                    className="field"
                  >
                    {deliveryStateOptions.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {rules.deliveryLocation && otherDocumentReady && deliveryMethod === "PHYSICAL_DELIVERY" ? (
                <Field label="Delivery location">
                  <select
                    value={selectedDeliveryLocation}
                    onChange={(event) => {
                      setDeliveryLocation(event.target.value);
                      setEstimateOpen(false);
                    }}
                    className="field"
                  >
                    {deliveryOptions.map((item) => (
                      <option key={item.location} value={item.location}>
                        {item.location} - {formatNaira(item.amount)}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={showEstimate}
                  disabled={!canEstimate}
                  className="button-motion min-h-12 w-full rounded bg-brand-700 px-5 text-sm font-black text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
                >
                  Show estimated price
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <style jsx>{`
          .field {
            width: 100%;
            min-height: 46px;
            border-radius: 4px;
            border: 1px solid rgba(17, 63, 56, 0.18);
            background: white;
            padding: 0 12px;
            color: #17211d;
          }
        `}</style>
      </div>

      {estimateOpen && serviceType ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/70 px-4 py-8 backdrop-blur-sm">
          <aside className="animate-rise max-h-[90vh] w-full max-w-lg overflow-y-auto rounded border border-white/10 bg-ink p-6 text-white shadow-soft">
            <p className="text-sm font-black uppercase text-road">Estimate</p>
            <h2 className="mt-2 text-2xl font-black">{servicePrice?.serviceName ?? serviceLabels[serviceType]}</h2>
            <div className="mt-6 grid gap-4">
              <Row label="Base service cost" value={isNegotiated ? servicePrice?.notes || "Negotiation based" : formatNaira(base)} />
              <Row label="Delivery cost" value={formatNaira(deliveryCost)} />
              <div className="h-px bg-white/15" />
              <Row label="Total cost" value={isNegotiated ? servicePrice?.notes || "Negotiation based" : formatNaira(total)} strong />
              {!isNegotiated ? (
                <>
                  <Row label="75% upfront" value={formatNaira(split.upfront)} />
                  <Row label="25% balance on delivery" value={formatNaira(split.balance)} />
                </>
              ) : null}
            </div>
            <div className="mt-5 rounded border border-road/25 bg-road/10 p-3 text-sm font-semibold leading-6 text-white/82">
              {deliveryPeriod}
            </div>
            <p className="mt-5 text-sm leading-6 text-white/60">
              Final amount can be adjusted by an admin if agency or state-specific requirements change.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setEstimateOpen(false)}
                className="min-h-11 rounded bg-white px-5 text-sm font-black text-brand-800 transition-colors hover:text-brand-600"
              >
                Close
              </button>
              <Link
                href={startUrl}
                className="button-motion inline-flex min-h-11 items-center justify-center rounded bg-road px-5 text-sm font-black text-ink hover:bg-road/85"
              >
                Start process
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-ink/75">
      {label}
      {children}
    </label>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/65">{label}</span>
      <span className={strong ? "text-2xl font-black text-road" : "font-bold"}>{value}</span>
    </div>
  );
}

function vehicleOptionsForService(serviceType: ServiceType | "") {
  if (serviceType === "NEW_VEHICLE_REGISTRATION" || serviceType === "VEHICLE_PAPER_RENEWAL") return adminVehicleCategories;
  return vehicleTypes;
}

function defaultVehicleTypeForService(serviceType: ServiceType | "") {
  return vehicleOptionsForService(serviceType)[0] || "Car";
}

function deliveryOptionsForState(prices: PricingItem[], state: string) {
  return prices
    .filter((item) => item.serviceType === "DELIVERY" && item.state === state)
    .map((item) => ({
      location: item.location || item.state || "Delivery",
      amount: item.amount
    }))
    .filter((item, index, source) => source.findIndex((candidate) => candidate.location === item.location) === index);
}

function sameOption(left?: string | null, right?: string | null) {
  return (left || "") === (right || "");
}

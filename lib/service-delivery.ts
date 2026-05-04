import type { PricingItem } from "@/lib/pricing-catalog";

type ServiceType = Exclude<PricingItem["serviceType"], "DELIVERY">;

export const serviceDeliveryPeriods: Record<ServiceType, string> = {
  VEHICLE_PAPER_RENEWAL: "Delivery period: within 24-48 hours after complete document submission.",
  NEW_VEHICLE_REGISTRATION: "Delivery period: 3-5 days for South West states; 3-4 weeks for Abuja plate.",
  CHANGE_OF_OWNERSHIP: "Delivery period: Lagos to Lagos - 2 weeks; Lagos to Oyo - 1 week; Oyo to Oyo - 1 week.",
  OTHER_PERMIT: "Delivery period: confirmed after the selected permit or paper type is reviewed.",
  FADED_NUMBER_PLATE_REPRINT: "Delivery period: 2-4 weeks.",
  NEW_DRIVERS_LICENSE: "Delivery period: 6 weeks before temporary driver's license is issued, valid for 3 months.",
  DRIVERS_LICENSE_RENEWAL: "Delivery period: 2-3 months for original license; stamped and signed payment approval is delivered within 48 hours.",
  INTERNATIONAL_DRIVERS_LICENSE: "Delivery period: 1 week.",
  NEW_MOTORCYCLE_RIDERS_LICENSE: "Delivery period: 4 weeks before temporary motorcycle rider's license is issued, valid for 3 months.",
  MOTORCYCLE_RIDERS_LICENSE_RENEWAL: "Delivery period: 2-3 months for original license; stamped and signed payment approval is delivered within 48 hours."
};

export function getServiceDeliveryPeriod(serviceType?: string) {
  if (!serviceType || !(serviceType in serviceDeliveryPeriods)) {
    return "Delivery period will be confirmed after the service details are reviewed.";
  }

  return serviceDeliveryPeriods[serviceType as ServiceType];
}

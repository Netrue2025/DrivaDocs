import { z } from "zod";

export const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  registrationNo: z.string().optional().or(z.literal("")),
  chassisNo: z.string().optional().or(z.literal("")),
  engineNo: z.string().optional().or(z.literal("")),
  color: z.string().optional().or(z.literal("")),
  vehicleType: z.string().min(1),
  engineCategory: z.string().optional().or(z.literal("")),
  usage: z.string().default("PRIVATE"),
  licenseExpiry: z.string().optional().or(z.literal("")),
  roadWorthinessExpiry: z.string().optional().or(z.literal("")),
  insuranceExpiry: z.string().optional().or(z.literal(""))
});

export const driverSchema = z.object({
  surname: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  mothersMaidenName: z.string().optional().or(z.literal("")),
  nextOfKinPhone: z.string().optional().or(z.literal("")),
  facialMark: z.string().optional().or(z.literal("")),
  disability: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  stateOfOrigin: z.string().optional().or(z.literal("")),
  localGovernment: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  nin: z.string().optional().or(z.literal(""))
});

export function toVehicleData(data: z.infer<typeof vehicleSchema>, businessAccountId: string | null) {
  return {
    businessAccountId,
    make: data.make,
    model: data.model,
    registrationNo: data.registrationNo || null,
    chassisNo: data.chassisNo || null,
    engineNo: data.engineNo || null,
    color: data.color || null,
    vehicleType: data.vehicleType,
    engineCategory: data.engineCategory || null,
    usage: data.usage,
    licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : null,
    roadWorthinessExpiry: data.roadWorthinessExpiry ? new Date(data.roadWorthinessExpiry) : null,
    insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : null
  };
}

export function toDriverData(data: z.infer<typeof driverSchema>, businessAccountId: string | null) {
  return {
    businessAccountId,
    surname: data.surname,
    firstName: data.firstName,
    lastName: data.lastName || null,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
    mothersMaidenName: data.mothersMaidenName || null,
    nextOfKinPhone: data.nextOfKinPhone || null,
    facialMark: data.facialMark || null,
    disability: data.disability || null,
    phone: data.phone || null,
    stateOfOrigin: data.stateOfOrigin || null,
    localGovernment: data.localGovernment || null,
    address: data.address || null,
    nin: data.nin || null
  };
}

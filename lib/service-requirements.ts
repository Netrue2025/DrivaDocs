import type { PricingItem } from "@/lib/pricing-catalog";

export type RequirementField = {
  name: string;
  label: string;
  type?: "text" | "date" | "textarea" | "file";
  accept?: "document" | "image";
  required?: boolean;
};

export const serviceRequirements: Record<Exclude<PricingItem["serviceType"], "DELIVERY">, RequirementField[]> = {
  VEHICLE_PAPER_RENEWAL: [
    { name: "expiredVehicleLicense", label: "Expired vehicle license", type: "file", accept: "document", required: true },
    { name: "roadWorthinessCertificate", label: "Road worthiness certificate", type: "file", accept: "document" },
    { name: "proofOfOwnership", label: "Proof of ownership", type: "file", accept: "document" },
    { name: "insurancePolicy", label: "Insurance certificate", type: "file", accept: "document" },
    { name: "documentName", label: "Name on document", required: true },
    { name: "registrationNumber", label: "Registration number", required: true },
    { name: "documentAddress", label: "Address on document", type: "textarea", required: true },
    { name: "documentPhone", label: "Phone number on document", required: true }
  ],
  NEW_VEHICLE_REGISTRATION: [
    { name: "customPaper", label: "Custom paper containing chassis number", type: "file", accept: "document", required: true },
    { name: "chassisPhoto", label: "Chassis photo on vehicle body", type: "file", accept: "image", required: true },
    { name: "salesReceipt", label: "Sales receipt", type: "file", accept: "document" },
    { name: "documentName", label: "Name you want on the documents", required: true },
    { name: "nin", label: "NIN", required: true },
    { name: "address", label: "Address", type: "textarea", required: true },
    { name: "phone", label: "Phone number you want on the documents", required: true },
    { name: "chassisNumber", label: "Chassis number", required: true },
    { name: "engineNumber", label: "Engine number" },
    { name: "makeModel", label: "Make and model", required: true },
    { name: "color", label: "Color", required: true },
    { name: "secondPhone", label: "Second phone number", required: true }
  ],
  CHANGE_OF_OWNERSHIP: [
    { name: "ownershipRoute", label: "Route: Lagos-to-Lagos, Lagos-to-Oyo, or Oyo-to-Oyo", required: true },
    { name: "vehicleLicense", label: "Valid vehicle license", type: "file", accept: "document", required: true },
    { name: "allocationPaper", label: "Allocation/registration/assessment paper", type: "file", accept: "document", required: true },
    { name: "cmr", label: "CMR where applicable", type: "file", accept: "document" },
    { name: "proofOfOwnership", label: "Proof of ownership", type: "file", accept: "document", required: true },
    { name: "affidavit", label: "Affidavit for change of ownership/re-registration", type: "file", accept: "document" },
    { name: "policeReport", label: "Police report for change of ownership/re-registration", type: "file", accept: "document" },
    { name: "ownershipAgreement", label: "Sales/Purchase/Transfer of ownership agreement", type: "file", accept: "document" },
    { name: "chassisPhoto", label: "Picture of chassis on vehicle", type: "file", accept: "image", required: true },
    { name: "governmentId", label: "Government ID card of new owner", type: "file", accept: "document", required: true },
    { name: "newOwnerName", label: "New name you want on the document", required: true },
    { name: "newOwnerAddress", label: "New address you want on the document", type: "textarea", required: true },
    { name: "newOwnerPhoneOne", label: "New owner phone number 1", required: true },
    { name: "newOwnerPhoneTwo", label: "New owner phone number 2", required: true },
    { name: "oldOwnerPhone", label: "Phone number of old owner", required: true }
  ],
  OTHER_PERMIT: [
    { name: "permitType", label: "Other document service", required: true },
    { name: "vehicleLicense", label: "Valid vehicle license", type: "file", accept: "document", required: true }
  ],
  FADED_NUMBER_PLATE_REPRINT: [
    { name: "vehicleLicense", label: "Vehicle license", type: "file", accept: "document", required: true },
    { name: "allocationAssessmentPaper", label: "Allocation/assessment paper", type: "file", accept: "document", required: true },
    { name: "proofOfOwnership", label: "Proof of ownership", type: "file", accept: "document", required: true }
  ],
  NEW_DRIVERS_LICENSE: [
    { name: "surname", label: "Surname", required: true },
    { name: "firstName", label: "First name", required: true },
    { name: "lastName", label: "Last name" },
    { name: "dateOfBirth", label: "Date of birth", type: "date", required: true },
    { name: "mothersMaidenName", label: "Mother's maiden name", required: true },
    { name: "nextOfKinPhone", label: "Next of kin phone number", required: true },
    { name: "facialMark", label: "Facial mark" },
    { name: "disability", label: "Disability" },
    { name: "phone", label: "Phone number", required: true },
    { name: "stateOfOrigin", label: "State of origin", required: true },
    { name: "localGovernment", label: "Local government", required: true },
    { name: "address", label: "Address", type: "textarea", required: true },
    { name: "birthCertificate", label: "Birth certificate or declaration of age", type: "file", accept: "document", required: true },
    { name: "nin", label: "NIN", required: true }
  ],
  DRIVERS_LICENSE_RENEWAL: [
    { name: "licenseNumber", label: "Driver's license number", required: true },
    { name: "nameOnLicense", label: "Name on license", required: true },
    { name: "currentDriverLicense", label: "Current driver's license", type: "file", accept: "document", required: true },
    { name: "passportPhotograph", label: "Passport photograph", type: "file", accept: "image", required: true }
  ],
  INTERNATIONAL_DRIVERS_LICENSE: [
    { name: "surname", label: "Surname", required: true },
    { name: "firstName", label: "First name", required: true },
    { name: "lastName", label: "Last name", required: true },
    { name: "nigerianAddress", label: "Nigerian address", type: "textarea", required: true },
    { name: "dateOfBirth", label: "Date of birth", type: "date", required: true },
    { name: "nigerianPhoneNumber", label: "Nigerian phone number", required: true },
    { name: "passportPhotograph", label: "Passport photograph with red background", type: "file", accept: "image", required: true },
    { name: "signatureWhitePaper", label: "Signature on white paper", type: "file", accept: "image", required: true }
  ],
  NEW_MOTORCYCLE_RIDERS_LICENSE: [
    { name: "surname", label: "Surname", required: true },
    { name: "firstName", label: "First name", required: true },
    { name: "lastName", label: "Last name", required: true },
    { name: "dateOfBirth", label: "Date of birth", type: "date", required: true },
    { name: "mothersMaidenName", label: "Mother's maiden name", required: true },
    { name: "nextOfKinPhone", label: "Next of kin phone number", required: true },
    { name: "facialMark", label: "Do you have facial mark?", required: true },
    { name: "disability", label: "Do you have any form of disability?", required: true },
    { name: "phone", label: "Phone number", required: true },
    { name: "stateOfOrigin", label: "State of origin", required: true },
    { name: "localGovernment", label: "Local government", required: true },
    { name: "address", label: "Address", type: "textarea", required: true },
    { name: "birthCertificate", label: "Birth certificate or declaration of age", type: "file", accept: "document", required: true }
  ],
  MOTORCYCLE_RIDERS_LICENSE_RENEWAL: [
    { name: "licenseNumber", label: "Driver's/rider's license number", required: true },
    { name: "nameOnLicense", label: "Name on license", required: true },
    { name: "currentRiderLicense", label: "Current rider's license", type: "file", accept: "document", required: true },
    { name: "passportPhotograph", label: "Passport photograph", type: "file", accept: "image", required: true }
  ]
};

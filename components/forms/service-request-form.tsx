"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminVehicleCategories, categoryEngineOptions, defaultRenewalBreakdownItemsForVehicle, engineOptionsForVehicle, needsEngineCategory, needsUsageCategory, resolveFleetPrice, stateOptionsForService, usageOptionsForVehicle } from "@/lib/fleet-pricing";
import { engineCategories, newVehicleRegistrationLocations, otherDocumentServices, pricingCatalog, serviceLabels, states, usageTypes, vehicleTypes, type PricingItem } from "@/lib/pricing-catalog";
import { getServiceDeliveryPeriod } from "@/lib/service-delivery";
import { serviceRequirements, type RequirementField } from "@/lib/service-requirements";
import { formatNaira, splitPayment } from "@/lib/utils";

type ServiceType = keyof typeof serviceRequirements;
type WizardStep = 0 | 1 | 2;
type PaymentChoice = "FULL" | "UPFRONT_75";
type BusyAction = "PAY_LATER" | "PAY" | "SAVE_EXIT" | null;
type DeliveryMethod = "PHYSICAL_DELIVERY" | "SCAN_TO_ME" | "PICKUP_OFFICE";
export type CachedFile = {
  name: string;
  size: number;
  type: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  storageKey?: string;
  publicUrl?: string;
  persisted?: boolean;
};
type UploadedFile = CachedFile & { storageKey: string; fileName: string; mimeType: string; fileSize: number; publicUrl?: string };
export type InitialServiceDraft = {
  id?: string;
  serviceType?: ServiceType;
  state?: string;
  vehicleType?: string;
  values?: Record<string, string>;
  fileMeta?: Record<string, CachedFile>;
  step?: WizardStep;
};

const serviceTypes = Object.keys(serviceRequirements) as ServiceType[];
const cacheKey = "DrivaDocs:new-service:draft";
const maxFileSize = 5 * 1024 * 1024;
const preferredPlateStates = [...newVehicleRegistrationLocations, "Others State"];
const deliveryMethods: { value: DeliveryMethod; label: string }[] = [
  { value: "PHYSICAL_DELIVERY", label: "Physical delivery" },
  { value: "SCAN_TO_ME", label: "Scan to me (online)" },
  { value: "PICKUP_OFFICE", label: "Pickup from our office" }
];

export function ServiceRequestForm({
  initialDraft,
  initialServiceType,
  initialState,
  initialVehicleType,
  initialOtherDocument,
  prices = pricingCatalog,
  freshStart
}: {
  initialDraft?: InitialServiceDraft;
  initialServiceType?: string;
  initialState?: string;
  initialVehicleType?: string;
  initialOtherDocument?: string;
  prices?: PricingItem[];
  freshStart?: boolean;
}) {
  const router = useRouter();
  const initialServiceCandidate = initialDraft?.serviceType || initialServiceType;
  const initialService = serviceTypes.includes(initialServiceCandidate as ServiceType)
    ? (initialServiceCandidate as ServiceType)
    : "";
  const initialOtherDocumentValue = otherDocumentServices.includes(initialOtherDocument as (typeof otherDocumentServices)[number])
    ? initialOtherDocument
    : "";
  const initialValues = useMemo(() => ({
    ...(initialDraft?.values || {}),
    ...(initialService === "OTHER_PERMIT" && initialOtherDocumentValue ? { permitType: initialOtherDocumentValue } : {}),
    ...(initialService === "NEW_VEHICLE_REGISTRATION" && initialState
      ? preferredPlateStates.includes(initialState)
        ? { preferredStatePlate: initialState }
        : { preferredStatePlate: "Others State", otherPreferredStatePlate: initialState }
      : {})
  }), [initialDraft?.values, initialOtherDocumentValue, initialService, initialState]);
  const [step, setStep] = useState<WizardStep>(freshStart ? (initialService ? 1 : 0) : initialDraft?.step ?? (initialService ? 1 : 0));
  const [serviceType, setServiceType] = useState<ServiceType | "">(initialService);
  const [state, setState] = useState(initialDraft?.state || initialState || "Lagos");
  const [vehicleType, setVehicleType] = useState(initialDraft?.vehicleType || initialVehicleType || defaultVehicleTypeForService(initialService));
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [fileMeta, setFileMeta] = useState<Record<string, CachedFile>>(initialDraft?.fileMeta || {});
  const [requestId, setRequestId] = useState(initialDraft?.id || "");
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>("UPFRONT_75");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [exitPrompt, setExitPrompt] = useState<{ href: string } | null>(null);
  const [success, setSuccess] = useState<{ message: string; requestId: string; amount: number } | null>(null);
  const [status, setStatus] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [hydrated, setHydrated] = useState(false);
  const allowExitRef = useRef(false);

  const requirements = serviceType ? serviceRequirements[serviceType] : [];
  const engineOptions = useMemo(() => engineOptionsForVehicle(prices, serviceType || undefined, vehicleType), [prices, serviceType, vehicleType]);
  const usageOptions = useMemo(() => usageOptionsForVehicle(prices, serviceType || undefined, vehicleType), [prices, serviceType, vehicleType]);
  const preferredPlateOptions = useMemo(() => [...stateOptionsForService(prices, "NEW_VEHICLE_REGISTRATION", newVehicleRegistrationLocations), "Others State"], [prices]);
  const deliveryStateOptions = useMemo(() => stateOptionsForService(prices, "DELIVERY", states), [prices]);
  const effectiveEngineCategory = values.engineCategory || engineOptions[0] || categoryEngineOptions[vehicleType]?.[0] || (vehicleType === "Motorcycle" ? "Motorcycle" : engineCategories[0]);
  const effectivePricingState = serviceType === "NEW_VEHICLE_REGISTRATION" ? resolvePreferredPlate(values) : state;
  const effectiveUsage = values.usage || "PRIVATE";
  const price = useMemo(() => {
    if (!serviceType) return undefined;

    if (serviceType === "OTHER_PERMIT") {
      return (
        prices.find((item) => item.serviceType === serviceType && item.serviceName === values.permitType) ??
        prices.find((item) => item.serviceType === serviceType)
      );
    }

    if (serviceType === "NEW_VEHICLE_REGISTRATION") {
      return resolveFleetPrice(serviceType, prices, vehicleType, effectiveEngineCategory, effectiveUsage, effectivePricingState);
    }

    if (serviceType === "VEHICLE_PAPER_RENEWAL") {
      return resolveFleetPrice(serviceType, prices, vehicleType, effectiveEngineCategory, effectiveUsage, state);
    }

    return (
      prices.find(
        (item) =>
          item.serviceType === serviceType &&
          (!item.vehicleType || item.vehicleType === vehicleType) &&
          (!item.state || item.state === state)
      ) ?? prices.find((item) => item.serviceType === serviceType)
    );
  }, [effectiveEngineCategory, effectivePricingState, effectiveUsage, prices, serviceType, state, values.permitType, vehicleType]);

  const deliveryMethod = resolveDeliveryMethod(values);
  const deliveryOptions = useMemo(() => deliveryOptionsForState(prices, state), [prices, state]);
  const requestedDeliveryLocation = values.deliveryLocation || "";
  const deliveryLocation = deliveryOptions.some((item) => item.location === requestedDeliveryLocation)
    ? requestedDeliveryLocation
    : deliveryOptions[0]?.location || state;
  const delivery = useMemo(
    () =>
      prices.find((item) => item.serviceType === "DELIVERY" && item.state === state && item.location === deliveryLocation) ??
      prices.find((item) => item.serviceType === "DELIVERY" && item.state === state),
    [deliveryLocation, prices, state]
  );
  const deliveryFee = deliveryMethod === "PHYSICAL_DELIVERY" ? delivery?.amount || 0 : 0;
  const deliveryPeriod = getServiceDeliveryPeriod(serviceType || undefined);
  const renewalBreakdown = useMemo(() => {
    if (serviceType !== "VEHICLE_PAPER_RENEWAL") return [];
    const managed = prices
      .filter((item) =>
        item.serviceType === "VEHICLE_PAPER_RENEWAL" &&
        item.serviceName !== serviceLabels.VEHICLE_PAPER_RENEWAL &&
        item.vehicleType === vehicleType &&
        sameOption(item.engineCategory, effectiveEngineCategory) &&
        sameOption(item.usage, effectiveUsage) &&
        !item.state &&
        !item.location
      )
      .map((item) => ({ label: item.serviceName, amount: item.amount }));
    return managed.length ? managed : defaultRenewalBreakdownItemsForVehicle(vehicleType, effectiveEngineCategory, effectiveUsage);
  }, [effectiveEngineCategory, effectiveUsage, prices, serviceType, vehicleType]);
  const serviceSubtotal = renewalBreakdown.length
    ? renewalBreakdown.reduce((sum, item) => sum + item.amount, 0)
    : price?.amount || 0;
  const total = serviceSubtotal + deliveryFee;
  const split = splitPayment(total);
  const amountToPay = paymentChoice === "FULL" ? total : split.upfront;
  const hasDraftData = Boolean(
    serviceType ||
      Object.values(values).some((value) => Boolean(value?.trim())) ||
      Object.keys(fileMeta).length ||
      requestId
  );
  const saveDraft = useCallback((nextStep = step) => {
    window.localStorage.setItem(
      cacheKey,
      JSON.stringify({ requestId, serviceType, state, vehicleType, values, fileMeta, paymentChoice, step: nextStep })
    );
  }, [fileMeta, paymentChoice, requestId, serviceType, state, step, values, vehicleType]);

  useEffect(() => {
    try {
      if (freshStart) {
        window.localStorage.removeItem(cacheKey);
        setStep(initialService ? 1 : 0);
        setServiceType(initialService);
        setState(initialState || "Lagos");
        setVehicleType(initialVehicleType || defaultVehicleTypeForService(initialService));
        setValues(initialValues);
        setFiles({});
        setFileMeta({});
        setPaymentChoice("UPFRONT_75");
        window.history.replaceState(null, "", "/dashboard/requests/new");
        return;
      }

      if (initialDraft) {
        setRequestId(initialDraft.id || "");
        setServiceType(initialDraft.serviceType || "");
        setStep(initialDraft.step ?? 2);
        setState(initialDraft.state || initialState || "Lagos");
        setVehicleType(initialDraft.vehicleType || initialVehicleType || defaultVehicleTypeForService(initialDraft.serviceType || ""));
        setValues({
          ...(initialDraft.values || {}),
          ...(initialDraft.serviceType === "OTHER_PERMIT" && initialOtherDocumentValue ? { permitType: initialOtherDocumentValue } : {}),
          ...(initialDraft.serviceType === "NEW_VEHICLE_REGISTRATION" && initialState && !initialDraft.values?.preferredStatePlate
            ? preferredPlateStates.includes(initialState)
              ? { preferredStatePlate: initialState }
              : { preferredStatePlate: "Others State", otherPreferredStatePlate: initialState }
            : {})
        });
        setFileMeta(initialDraft.fileMeta || {});
        return;
      }

      const raw = window.localStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw) as {
          serviceType?: ServiceType;
          requestId?: string;
          state?: string;
          vehicleType?: string;
          values?: Record<string, string>;
          fileMeta?: Record<string, CachedFile>;
          paymentChoice?: PaymentChoice;
          step?: WizardStep;
        };

        setRequestId(cached.requestId || "");
        if (initialService) {
          setServiceType(initialService);
          setStep(1);
        } else if (cached.serviceType) {
          setServiceType(cached.serviceType);
          setStep(cached.step ?? 1);
        }
        setState(initialState || cached.state || "Lagos");
        setVehicleType(initialVehicleType || cached.vehicleType || defaultVehicleTypeForService(initialService));
        setValues({
          ...(cached.values || {}),
          ...(initialService === "OTHER_PERMIT" && initialOtherDocumentValue ? { permitType: initialOtherDocumentValue } : {}),
          ...(initialService === "NEW_VEHICLE_REGISTRATION" && initialState && !cached.values?.preferredStatePlate
            ? preferredPlateStates.includes(initialState)
              ? { preferredStatePlate: initialState }
              : { preferredStatePlate: "Others State", otherPreferredStatePlate: initialState }
            : {})
        });
        setFileMeta(cached.fileMeta || {});
        setPaymentChoice(cached.paymentChoice || "UPFRONT_75");
      } else if (initialService === "OTHER_PERMIT" && initialOtherDocumentValue) {
        setValues((current) => ({ ...current, permitType: initialOtherDocumentValue }));
      }
    } catch {
      window.localStorage.removeItem(cacheKey);
    } finally {
      setHydrated(true);
    }
  }, [freshStart, initialDraft, initialOtherDocumentValue, initialService, initialState, initialValues, initialVehicleType]);

  useEffect(() => {
    if (!hydrated) return;
    saveDraft(step);
  }, [fileMeta, hydrated, paymentChoice, requestId, saveDraft, serviceType, state, step, values, vehicleType]);

  useEffect(() => {
    function canWarnOnExit() {
      return hydrated && hasDraftData && !success && !allowExitRef.current;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!canWarnOnExit()) return;
      event.preventDefault();
      event.returnValue = "Are you sure you want to exit this page, you may loose the data on this page?";
    }

    function handleDocumentClick(event: MouseEvent) {
      if (!canWarnOnExit()) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const targetUrl = new URL(anchor.href);
      if (targetUrl.href === window.location.href) return;

      event.preventDefault();
      event.stopPropagation();
      saveDraft(step);
      setExitPrompt({ href: targetUrl.href });
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [fileMeta, hasDraftData, hydrated, paymentChoice, saveDraft, serviceType, state, step, success, values, vehicleType]);

  const canContinue = step === 0
    ? Boolean(serviceType)
    : step === 1
      ? requirementsComplete(requirements, values, files, fileMeta) && preferredPlateComplete(serviceType, values)
      : deliveryComplete(values);

  function updateValue(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function selectService(value: string) {
    const nextVehicleType = defaultVehicleTypeForService(value as ServiceType);
    const nextEngineOptions = engineOptionsForVehicle(prices, value || undefined, nextVehicleType);
    setServiceType(value as ServiceType);
    setVehicleType(nextVehicleType);
    setValues((current) => ({
      ...current,
      engineCategory: nextEngineOptions[0] || categoryEngineOptions[nextVehicleType]?.[0] || engineCategories[0],
      usage: current.usage || "PRIVATE"
    }));
    setStatus("");
    setReviewOpen(false);
    if (value !== "OTHER_PERMIT") {
      setValues((current) => {
        const next = { ...current };
        delete next.permitType;
        return next;
      });
    }
    if (value) setStep(1);
  }

  function handleFileChange(field: RequirementField, file?: File) {
    setStatus("");
    if (!file) {
      setFiles((current) => ({ ...current, [field.name]: undefined }));
      setFileMeta((current) => {
        const next = { ...current };
        delete next[field.name];
        return next;
      });
      return;
    }

    const validType =
      field.accept === "image"
        ? file.type === "image/jpeg" || file.type === "image/png"
        : file.type === "application/pdf" || file.type === "image/jpeg" || file.type === "image/png";

    if (!validType || file.size > maxFileSize) {
      setStatus("Upload PDF/JPG/PNG files only, up to 5MB each.");
      return;
    }

    setFiles((current) => ({ ...current, [field.name]: file }));
    setFileMeta((current) => ({
      ...current,
      [field.name]: { name: file.name, size: file.size, type: file.type }
    }));
  }

  function goNext() {
    if (!canContinue) return;
    const nextStep = Math.min(2, step + 1) as WizardStep;
    saveDraft(nextStep);
    setStep(nextStep);
  }

  async function uploadDocuments() {
    const uploadable = requirements.filter((field) => field.type === "file" && (files[field.name] || fileMeta[field.name]));
    const uploaded: UploadedFile[] = [];

    for (const field of uploadable) {
      const file = files[field.name];
      const cached = fileMeta[field.name];

      if (!file && cached && !cached.persisted) {
        uploaded.push({
          ...cached,
          fileName: cached.fileName || cached.name,
          mimeType: cached.mimeType || cached.type || "application/octet-stream",
          fileSize: cached.fileSize || cached.size || 0,
          storageKey: cached.storageKey || `cached/${Date.now()}-${cached.name}`,
          publicUrl: cached.publicUrl
        });
        continue;
      }

      if (!file) continue;

      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      if (!response.ok) throw new Error(await readApiError(response, "File upload failed. Please check the file and try again."));
      const body = await response.json();
      uploaded.push({
        name: file.name,
        size: file.size,
        type: file.type,
        fileName: body.fileName,
        mimeType: body.mimeType,
        fileSize: body.fileSize,
        storageKey: body.storageKey,
        publicUrl: body.publicUrl
      });
    }

    return uploaded;
  }

  async function createRequest(mode: "PAY_LATER" | "PAY") {
    if (!serviceType || !deliveryComplete(values) || !requirementsComplete(requirements, values, files, fileMeta)) return;

    setBusyAction(mode);
    setReviewError("");
    setStatus(mode === "PAY_LATER" ? "Submitting request..." : "Preparing payment...");
    try {
      const documents = await uploadDocuments();
      const requirementPayload = buildRequirementPayload(requirements, values, fileMeta, deliveryPeriod, vehicleType);
      if (serviceType === "NEW_VEHICLE_REGISTRATION") {
        requirementPayload.engineCategory = effectiveEngineCategory;
        requirementPayload.usage = effectiveUsage;
      }
      if (serviceType === "NEW_VEHICLE_REGISTRATION") {
        requirementPayload.preferredStatePlate = resolvePreferredPlate(values);
      }

      const response = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType,
          title: serviceLabels[serviceType],
          state,
          vehicleType,
          requestId: requestId || undefined,
          requirements: requirementPayload,
          documents,
          estimateSubtotal: serviceSubtotal,
          deliveryFee,
          totalAmount: total,
          upfrontAmount: split.upfront,
          balanceAmount: split.balance,
          submissionMode: mode,
          deliveryAddress: buildDeliveryAddressPayload(values, state, deliveryLocation)
        })
      });

      if (!response.ok) throw new Error(await readApiError(response, "Unable to create request."));
      const created = await response.json();
      window.localStorage.removeItem(cacheKey);
      setRequestId(created.id);

      if (mode === "PAY_LATER") {
        setReviewOpen(false);
        setSuccess({
          message:
            "Your service request have been submitted successfuly but will only be processed after payment is completed.",
          requestId: created.id,
          amount: split.upfront || total
        });
        allowExitRef.current = true;
        setBusyAction(null);
        router.refresh();
        return;
      }

      allowExitRef.current = true;
      const paymentForm = document.createElement("form");
      paymentForm.method = "post";
      paymentForm.action = "/api/payments/initialize";
      addHidden(paymentForm, "serviceRequestId", created.id);
      addHidden(paymentForm, "amount", String(amountToPay));
      addHidden(paymentForm, "paymentType", paymentChoice);
      document.body.appendChild(paymentForm);
      paymentForm.submit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete request. Please review the form and try again.";
      setBusyAction(null);
      setReviewError(message);
      setStatus(message);
    }
  }

  async function saveDatabaseDraftAndExit(href: string) {
    saveDraft(step);

    if (!serviceType) {
      allowExitRef.current = true;
      setBusyAction("SAVE_EXIT");
      window.location.href = href;
      return;
    }

    setBusyAction("SAVE_EXIT");
    setStatus("Saving draft...");
    try {
      const documents = await uploadDocuments();
      const requirementPayload = buildRequirementPayload(requirements, values, fileMeta, deliveryPeriod, vehicleType);
      if (serviceType === "NEW_VEHICLE_REGISTRATION") {
        requirementPayload.engineCategory = effectiveEngineCategory;
        requirementPayload.usage = effectiveUsage;
      }
      if (serviceType === "NEW_VEHICLE_REGISTRATION") {
        requirementPayload.preferredStatePlate = resolvePreferredPlate(values);
      }
      const response = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType,
          title: serviceLabels[serviceType],
          state,
          vehicleType,
          requestId: requestId || undefined,
          requirements: requirementPayload,
          documents,
          estimateSubtotal: serviceSubtotal,
          deliveryFee,
          totalAmount: total,
          upfrontAmount: split.upfront,
          balanceAmount: split.balance,
          submissionMode: "SAVE",
          deliveryAddress: deliveryComplete(values) ? buildDeliveryAddressPayload(values, state, deliveryLocation) : undefined
        })
      });

      if (!response.ok) throw new Error("Unable to save draft");
      const saved = await response.json();
      setRequestId(saved.id);
      window.localStorage.removeItem(cacheKey);
      allowExitRef.current = true;
      window.location.href = href;
    } catch {
      setBusyAction(null);
      setStatus("Unable to save draft. Please try again before leaving this page.");
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (step === 2 && canContinue) setReviewOpen(true);
      }}
      className="min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5"
    >
      <Progress step={step} onGoBack={(target) => setStep(target)} serviceSelected={Boolean(serviceType)} />

      {step === 0 ? (
        <div className="mt-6 min-w-0 rounded border border-brand-900/10 bg-brand-50 p-4 sm:p-5">
          <p className="text-sm font-black uppercase text-brand-700">Select service</p>
          <h2 className="mt-2 break-words text-xl font-black sm:text-2xl">What would you like DrivaDocs to handle?</h2>
          <p className="mt-2 text-sm leading-6 text-ink/62">
            Choose one service first. The page will then show only the requirements needed for that service.
          </p>
          <select
            value={serviceType}
            onChange={(event) => selectService(event.target.value)}
            className="mt-5 min-h-12 w-full min-w-0 rounded border border-brand-900/15 bg-white px-3 font-bold focus-ring"
          >
            <option value="">Select a service</option>
            {serviceTypes.map((item) => (
              <option key={item} value={item}>
                {serviceLabels[item]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {step === 1 && serviceType ? (
        <div className="mt-6 grid min-w-0 gap-4 md:grid-cols-2">
          <div className="rounded border border-road/30 bg-road/10 p-4 md:col-span-2">
            <p className="text-sm font-black text-ink">Requirements for {serviceLabels[serviceType]}</p>
            <p className="mt-1 text-sm leading-6 text-ink/64">{deliveryPeriod}</p>
          </div>
          {serviceType !== "OTHER_PERMIT" ? (
            <Select
                label="Vehicle type"
                value={vehicleType}
                onChange={(value) => {
                  setVehicleType(value);
                  updateValue("engineCategory", engineOptionsForVehicle(prices, serviceType, value)[0] || categoryEngineOptions[value]?.[0] || engineCategories[0]);
                }}
              options={vehicleOptionsForService(serviceType).map((item) => ({ value: item, label: item }))}
            />
          ) : null}
          {serviceType === "NEW_VEHICLE_REGISTRATION" ? (
            <>
              <Select
                label="Private or commercial"
                value={values.usage || "PRIVATE"}
                onChange={(value) => updateValue("usage", value)}
                options={usageOptions.map((item) => ({ value: item, label: item === "PRIVATE" ? "Private" : item === "COMMERCIAL" ? "Commercial" : item }))}
              />
              {needsEngineCategory(vehicleType) ? (
                <Select
                  label="Engine/category"
                  value={values.engineCategory || engineOptions[0] || categoryEngineOptions[vehicleType]?.[0] || engineCategories[0]}
                  onChange={(value) => updateValue("engineCategory", value)}
                  options={(engineOptions.length ? engineOptions : categoryEngineOptions[vehicleType] || engineCategories.filter((item) => item !== "Motorcycle")).map((item) => ({ value: item, label: item }))}
                />
              ) : null}
              <Select
                label="Preferred state plate"
                value={values.preferredStatePlate || "Lagos"}
                onChange={(value) => {
                  updateValue("preferredStatePlate", value);
                  if (value !== "Others State") updateValue("otherPreferredStatePlate", "");
                }}
                options={preferredPlateOptions.map((item) => ({ value: item, label: item }))}
              />
              {values.preferredStatePlate === "Others State" ? (
                <Input
                  name="otherPreferredStatePlate"
                  label="Other preferred state"
                  value={values.otherPreferredStatePlate || ""}
                  onChange={updateValue}
                  required
                />
              ) : null}
            </>
          ) : null}
          {serviceType === "VEHICLE_PAPER_RENEWAL" ? (
            <>
              {needsUsageCategory(serviceType, vehicleType) ? (
                <Select
                  label="Private or commercial"
                  value={values.usage || "PRIVATE"}
                  onChange={(value) => updateValue("usage", value)}
                  options={usageOptions.map((item) => ({ value: item, label: item === "PRIVATE" ? "Private" : item === "COMMERCIAL" ? "Commercial" : item }))}
                />
              ) : null}
              {needsEngineCategory(vehicleType) ? (
                <Select
                  label="Engine/category"
                  value={values.engineCategory || engineOptions[0] || categoryEngineOptions[vehicleType]?.[0] || engineCategories[0]}
                  onChange={(value) => updateValue("engineCategory", value)}
                  options={(engineOptions.length ? engineOptions : categoryEngineOptions[vehicleType] || engineCategories.filter((item) => item !== "Motorcycle")).map((item) => ({ value: item, label: item }))}
                />
              ) : null}
            </>
          ) : null}
          {requirements.map((field) => (
            <RequirementControl
              key={field.name}
              field={field}
              value={values[field.name] || ""}
              file={fileMeta[field.name]}
              hasLiveFile={Boolean(files[field.name])}
              onValue={updateValue}
              onFile={handleFileChange}
            />
          ))}
        </div>
      ) : null}

      {step === 2 && serviceType ? (
        <div className="mt-6 grid min-w-0 gap-4 md:grid-cols-2">
          <Select
            label="Delivery option"
            value={deliveryMethod}
            onChange={(value) => updateValue("deliveryMethod", value)}
            options={deliveryMethods}
          />
          {deliveryMethod === "PHYSICAL_DELIVERY" ? (
            <>
              <Select
                label="State to deliver to"
                value={state}
                onChange={(value) => {
                  setState(value);
                  setValues((current) => {
                    const nextLocation = deliveryOptionsForState(prices, value)[0]?.location || value;
                    return { ...current, deliveryLocation: nextLocation };
                  });
                }}
                options={deliveryStateOptions.map((item) => ({ value: item, label: item }))}
              />
              {deliveryOptions.length ? (
                <Select
                  label="Delivery location"
                  value={deliveryLocation}
                  onChange={(value) => updateValue("deliveryLocation", value)}
                  options={deliveryOptions.map((item) => ({
                    value: item.location,
                    label: `${item.location} - ${formatNaira(item.amount)}`
                  }))}
                />
              ) : null}
              <Input name="city" label="City to deliver to" value={values.city || ""} onChange={updateValue} required />
              <Input name="deliveryPhone" label="Recipient phone number" value={values.deliveryPhone || ""} onChange={updateValue} required />
              <label className="grid min-w-0 gap-2 text-sm font-bold text-ink/75 md:col-span-2">
                Delivery address
                <textarea
                  value={values.deliveryAddress || ""}
                  onChange={(event) => updateValue("deliveryAddress", event.target.value)}
                  rows={3}
                  required
                  className="min-w-0 rounded border border-brand-900/15 p-3 focus-ring"
                />
              </label>
            </>
          ) : deliveryMethod === "SCAN_TO_ME" ? (
            <Input name="onlineDeliveryContact" label="WhatsApp number or email" value={values.onlineDeliveryContact || ""} onChange={updateValue} required />
          ) : (
            <div className="rounded border border-road/35 bg-road/10 p-4 text-sm font-semibold leading-6 text-ink/72 md:col-span-2">
              Delivery fee is removed. Our team will notify you when the document is ready for office pickup.
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(0, current - 1) as WizardStep)}
          disabled={step === 0}
          className="min-h-11 rounded border border-brand-900/15 px-5 font-bold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        {step < 2 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canContinue}
            className="min-h-11 rounded bg-brand-700 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canContinue}
            className="min-h-11 rounded bg-brand-700 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            Submit request
          </button>
        )}
      </div>
      {status ? <p className="mt-4 text-sm font-bold text-brand-700">{status}</p> : null}

      {reviewOpen && serviceType ? (
        <ReviewModal
          serviceName={serviceLabels[serviceType]}
          deliveryPeriod={deliveryPeriod}
          total={total}
          upfront={split.upfront}
          balance={split.balance}
          amountToPay={amountToPay}
          paymentChoice={paymentChoice}
          state={state}
          vehicleType={vehicleType}
          deliveryPhone={values.deliveryPhone || ""}
          deliveryCity={values.city || ""}
          deliveryAddress={values.deliveryAddress || ""}
          deliveryMethod={deliveryMethod}
          deliveryLocation={deliveryLocation}
          onlineDeliveryContact={values.onlineDeliveryContact || ""}
          deliveryFee={deliveryFee}
          documentCount={requirements.filter((field) => field.type === "file").length}
          renewalBreakdown={renewalBreakdown}
          onPaymentChoice={setPaymentChoice}
          onClose={() => setReviewOpen(false)}
          onSave={() => createRequest("PAY_LATER")}
          onPay={() => createRequest("PAY")}
          busyAction={busyAction}
          errorMessage={reviewError}
        />
      ) : null}

      {exitPrompt ? (
        <ExitPromptModal
          onStay={() => setExitPrompt(null)}
          onDiscard={() => {
            allowExitRef.current = true;
            window.localStorage.removeItem(cacheKey);
            window.location.href = exitPrompt.href;
          }}
          onSaveAndExit={() => {
            saveDatabaseDraftAndExit(exitPrompt.href);
          }}
          saving={busyAction === "SAVE_EXIT"}
        />
      ) : null}

      {success ? (
        <SuccessModal
          message={success.message}
          onCompletePayment={() => {
            allowExitRef.current = true;
            const paymentForm = document.createElement("form");
            paymentForm.method = "post";
            paymentForm.action = "/api/payments/initialize";
            addHidden(paymentForm, "serviceRequestId", success.requestId);
            addHidden(paymentForm, "amount", String(success.amount));
            addHidden(paymentForm, "paymentType", "UPFRONT_75");
            document.body.appendChild(paymentForm);
            paymentForm.submit();
          }}
          onClose={() => {
            allowExitRef.current = true;
            router.push("/dashboard/requests");
          }}
        />
      ) : null}
    </form>
  );
}

function Progress({
  step,
  serviceSelected,
  onGoBack
}: {
  step: WizardStep;
  serviceSelected: boolean;
  onGoBack: (step: WizardStep) => void;
}) {
  const items = ["Service", "Requirements", "Delivery & review"];

  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-3">
      {items.map((label, index) => {
        const target = index as WizardStep;
        const isPrevious = index < step;
        const isActive = index === step;
        const canClick = isPrevious && (target === 0 || serviceSelected);
        return (
          <button
            key={label}
            type="button"
            onClick={() => canClick && onGoBack(target)}
            disabled={!canClick}
            className={`rounded px-3 py-3 text-sm font-black ${
              isActive ? "bg-brand-700 text-white" : isPrevious ? "bg-brand-50 text-brand-800" : "bg-slate-100 text-ink/45"
            } ${canClick ? "cursor-pointer" : "cursor-default"}`}
          >
            {index + 1}. {label}
          </button>
        );
      })}
    </div>
  );
}

function RequirementControl({
  field,
  value,
  file,
  hasLiveFile,
  onValue,
  onFile
}: {
  field: RequirementField;
  value: string;
  file?: CachedFile;
  hasLiveFile: boolean;
  onValue: (name: string, value: string) => void;
  onFile: (field: RequirementField, file?: File) => void;
}) {
  const accept = field.accept === "image" ? "image/png,image/jpeg" : "application/pdf,image/png,image/jpeg";

  if (field.type === "file") {
    return (
      <label className="grid min-w-0 gap-2 rounded border border-brand-900/10 bg-brand-50/45 p-4 text-sm font-bold text-ink/75">
        {field.label} {field.required ? <span className="text-red-700">*</span> : null}
        <input
          type="file"
          accept={accept}
          required={field.required}
          onChange={(event) => onFile(field, event.target.files?.[0])}
          className="w-full min-w-0 rounded border border-brand-900/15 bg-white p-3 text-sm focus-ring"
        />
        <span className="text-xs font-semibold text-ink/52">
          {field.accept === "image" ? "JPG or PNG, max 5MB." : "PDF, JPG, or PNG, max 5MB."}
          {file && hasLiveFile ? ` Selected: ${file.name}` : ""}
          {file && !hasLiveFile ? ` Previously selected: ${file.name}. Re-select this file to continue.` : ""}
        </span>
      </label>
    );
  }

  return (
    <label className={`grid min-w-0 gap-2 text-sm font-bold text-ink/75 ${field.type === "textarea" ? "md:col-span-2" : ""}`}>
      {field.label} {field.required ? <span className="text-red-700">*</span> : null}
      {field.name === "permitType" ? (
        <select
          value={value}
          onChange={(event) => onValue(field.name, event.target.value)}
          required={field.required}
          className="min-h-11 min-w-0 rounded border border-brand-900/15 bg-white px-3 focus-ring"
        >
          <option value="">Select other document service</option>
          {otherDocumentServices.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(event) => onValue(field.name, event.target.value)}
          required={field.required}
          rows={3}
          className="min-w-0 rounded border border-brand-900/15 p-3 focus-ring"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onValue(field.name, event.target.value)}
          type={field.type || "text"}
          required={field.required}
          className="min-h-11 min-w-0 rounded border border-brand-900/15 px-3 focus-ring"
        />
      )}
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-bold text-ink/75">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 min-w-0 rounded border border-brand-900/15 px-3 focus-ring">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  required
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-bold text-ink/75">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        required={required}
        className="min-h-11 min-w-0 rounded border border-brand-900/15 px-3 focus-ring"
      />
    </label>
  );
}

function ReviewModal({
  serviceName,
  deliveryPeriod,
  total,
  upfront,
  balance,
  amountToPay,
  paymentChoice,
  state,
  vehicleType,
  deliveryPhone,
  deliveryCity,
  deliveryAddress,
  deliveryMethod,
  deliveryLocation,
  onlineDeliveryContact,
  deliveryFee,
  documentCount,
  renewalBreakdown,
  onPaymentChoice,
  onClose,
  onSave,
  onPay,
  busyAction,
  errorMessage
}: {
  serviceName: string;
  deliveryPeriod: string;
  total: number;
  upfront: number;
  balance: number;
  amountToPay: number;
  paymentChoice: PaymentChoice;
  state: string;
  vehicleType: string;
  deliveryPhone: string;
  deliveryCity: string;
  deliveryAddress: string;
  deliveryMethod: DeliveryMethod;
  deliveryLocation: string;
  onlineDeliveryContact: string;
  deliveryFee: number;
  documentCount: number;
  renewalBreakdown: { label: string; amount: number }[];
  onPaymentChoice: (choice: PaymentChoice) => void;
  onClose: () => void;
  onSave: () => void;
  onPay: () => void;
  busyAction: BusyAction;
  errorMessage: string;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isBusy = Boolean(busyAction);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-ink/70 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
      <div className="animate-rise max-h-[90vh] w-full max-w-xl overflow-y-auto rounded border border-white/10 bg-white p-4 shadow-soft sm:p-6">
        <p className="text-sm font-black uppercase text-brand-700">Request overview</p>
        <h2 className="mt-2 break-words text-xl font-black sm:text-2xl">{serviceName}</h2>
        <div className="mt-5 grid gap-3 rounded bg-brand-50 p-4 text-sm">
          <RowLight label="Total estimate" value={formatNaira(total)} strong />
          <RowLight label="Delivery fee" value={formatNaira(deliveryFee)} />
          <RowLight label="75% upfront" value={formatNaira(upfront)} />
          <RowLight label="25% balance" value={formatNaira(balance)} />
        </div>
        <div className="mt-4 rounded border border-brand-900/10 bg-white">
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus-ring"
            aria-expanded={detailsOpen}
          >
            <span>
              <span className="block text-sm font-black text-ink">Service details</span>
              <span className="mt-1 block text-xs font-semibold text-ink/52">State, city, vehicle type, delivery contact and uploads</span>
            </span>
            {detailsOpen ? <ChevronDown className="h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" /> : <ChevronRight className="h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />}
          </button>
          {detailsOpen ? (
            <div className="grid min-w-0 gap-3 border-t border-brand-900/10 p-4 text-sm sm:grid-cols-2">
              <RowLight label="State" value={state} />
              <RowLight label="Vehicle type" value={vehicleType} />
              <RowLight label="Delivery option" value={deliveryMethodLabel(deliveryMethod)} />
              {deliveryMethod === "PHYSICAL_DELIVERY" ? (
                <>
                  <RowLight label="Delivery location" value={deliveryLocation} />
                  <RowLight label="City" value={deliveryCity} />
                  <RowLight label="Recipient phone" value={deliveryPhone} />
                </>
              ) : null}
              {deliveryMethod === "SCAN_TO_ME" ? <RowLight label="Online delivery contact" value={onlineDeliveryContact} /> : null}
              <RowLight label="Uploads needed" value={String(documentCount)} />
              <RowLight label="Delivery address" value={deliveryMethod === "PHYSICAL_DELIVERY" ? deliveryAddress : deliveryMethodLabel(deliveryMethod)} />
              {renewalBreakdown.length ? (
                <div className="rounded bg-brand-50 p-3 sm:col-span-2">
                  <p className="text-xs font-black uppercase text-brand-700">Document price breakdown</p>
                  <div className="mt-3 grid gap-2">
                    {renewalBreakdown.map((item) => (
                      <RowLight key={item.label} label={item.label} value={formatNaira(item.amount)} />
                    ))}
                    <div className="border-t border-brand-900/10 pt-2">
                      <RowLight label="Documents subtotal" value={formatNaira(renewalBreakdown.reduce((sum, item) => sum + item.amount, 0))} strong />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mt-4 rounded border border-road/35 bg-road/10 p-3 text-sm font-semibold leading-6 text-ink/72">
          {deliveryPeriod}
        </div>
        <fieldset className="mt-5 grid gap-3">
          <legend className="font-black">Payment option</legend>
          <label className="flex cursor-pointer items-center gap-3 rounded border border-brand-900/10 p-3">
            <input
              type="radio"
              name="paymentChoice"
              value="UPFRONT_75"
              checked={paymentChoice === "UPFRONT_75"}
              onChange={() => onPaymentChoice("UPFRONT_75")}
            />
            <span className="font-bold">Pay 75% now, balance on delivery</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded border border-brand-900/10 p-3">
            <input
              type="radio"
              name="paymentChoice"
              value="FULL"
              checked={paymentChoice === "FULL"}
              onChange={() => onPaymentChoice("FULL")}
            />
            <span className="font-bold">Pay full amount now</span>
          </label>
        </fieldset>
        <p className="mt-4 break-words text-xl font-black text-brand-800">Amount to pay now: {formatNaira(amountToPay)}</p>
        {errorMessage ? (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm font-bold leading-6 text-red-800">
            {errorMessage}
          </div>
        ) : null}
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          <button type="button" onClick={onClose} disabled={isBusy} className="min-h-11 rounded border border-brand-900/15 px-5 font-black disabled:opacity-60">
            Close
          </button>
          <button type="button" onClick={onSave} disabled={isBusy} className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded bg-brand-50 px-4 font-black text-brand-800 disabled:opacity-60">
            {busyAction === "PAY_LATER" ? <ButtonSpinner /> : null}
            {busyAction === "PAY_LATER" ? "Submitting..." : "Submit & pay later"}
          </button>
          <button type="button" onClick={onPay} disabled={isBusy} className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded bg-brand-700 px-4 font-black text-white disabled:opacity-60">
            {busyAction === "PAY" ? <ButtonSpinner /> : null}
            {busyAction === "PAY" ? "Preparing..." : "Pay now"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExitPromptModal({
  onStay,
  onDiscard,
  onSaveAndExit,
  saving
}: {
  onStay: () => void;
  onDiscard: () => void;
  onSaveAndExit: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-ink/70 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
      <div className="w-full max-w-lg rounded border border-white/10 bg-white p-4 shadow-soft sm:p-6">
        <p className="text-sm font-black uppercase text-brand-700">Leave this service request?</p>
        <h2 className="mt-2 text-xl font-black sm:text-2xl">Are you sure you want to exit this page?</h2>
        <p className="mt-3 leading-7 text-ink/68">
          Are you sure you want to exit this page, you may loose the data on this page?
        </p>
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          <button type="button" onClick={onStay} disabled={saving} className="min-h-11 rounded border border-brand-900/15 px-4 font-black disabled:opacity-60">
            No, stay
          </button>
          <button type="button" onClick={onSaveAndExit} disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded bg-brand-50 px-4 font-black text-brand-800 disabled:opacity-60">
            {saving ? <ButtonSpinner /> : null}
            {saving ? "Saving..." : "Save & exit"}
          </button>
          <button type="button" onClick={onDiscard} disabled={saving} className="min-h-11 whitespace-nowrap rounded bg-red-700 px-4 font-black text-white disabled:opacity-60">
            Yes, exit
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessModal({
  message,
  onCompletePayment,
  onClose
}: {
  message: string;
  onCompletePayment: () => void;
  onClose: () => void;
}) {
  const [paying, setPaying] = useState(false);
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-ink/70 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
      <div className="w-full max-w-lg rounded border border-white/10 bg-white p-4 shadow-soft sm:p-6">
        <p className="text-sm font-black uppercase text-brand-700">Request submitted</p>
        <h2 className="mt-2 text-xl font-black sm:text-2xl">Awaiting payment</h2>
        <p className="mt-3 leading-7 text-ink/68">{message}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onClose} className="min-h-11 rounded border border-brand-900/15 px-4 font-black">
            View services
          </button>
          <button
            type="button"
            onClick={() => {
              setPaying(true);
              onCompletePayment();
            }}
            disabled={paying}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded bg-road px-4 font-black text-ink disabled:opacity-60"
          >
            {paying ? <ButtonSpinner /> : null}
            {paying ? "Preparing..." : "Complete payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ButtonSpinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />;
}

function RowLight({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:gap-4">
      <span className="text-ink/62">{label}</span>
      <span className={strong ? "break-words text-lg font-black text-brand-800" : "break-words font-bold"}>{value}</span>
    </div>
  );
}

function buildRequirementPayload(
  requirements: RequirementField[],
  values: Record<string, string>,
  fileMeta: Record<string, CachedFile>,
  deliveryPeriod: string,
  vehicleType: string
) {
  const requirementPayload: Record<string, unknown> = { deliveryPeriod, vehicleType };
  for (const field of requirements) {
    requirementPayload[field.name] =
      field.type === "file" ? fileMeta[field.name]?.name || "" : values[field.name] || "";
  }

  return requirementPayload;
}

function requirementsComplete(
  requirements: RequirementField[],
  values: Record<string, string>,
  files: Record<string, File | undefined>,
  fileMeta: Record<string, CachedFile>
) {
  return requirements.every((field) => {
    if (!field.required) return true;
    if (field.type === "file") return Boolean(files[field.name] || fileMeta[field.name]);
    return Boolean(values[field.name]?.trim());
  });
}

function deliveryComplete(values: Record<string, string>) {
  const method = resolveDeliveryMethod(values);
  if (method === "SCAN_TO_ME") return Boolean(values.onlineDeliveryContact?.trim());
  if (method === "PICKUP_OFFICE") return true;
  return ["deliveryPhone", "city", "deliveryAddress"].every((key) => Boolean(values[key]?.trim()));
}

function resolveDeliveryMethod(values: Record<string, string>): DeliveryMethod {
  const value = values.deliveryMethod;
  return value === "SCAN_TO_ME" || value === "PICKUP_OFFICE" ? value : "PHYSICAL_DELIVERY";
}

function deliveryMethodLabel(method: DeliveryMethod) {
  return deliveryMethods.find((item) => item.value === method)?.label || "Physical delivery";
}

function buildDeliveryAddressPayload(values: Record<string, string>, state: string, selectedDeliveryLocation?: string) {
  const method = resolveDeliveryMethod(values);
  const deliveryLocation = selectedDeliveryLocation || values.deliveryLocation || state;
  if (method === "SCAN_TO_ME") {
    return {
      label: "Online",
      phone: values.onlineDeliveryContact || "Online delivery",
      addressLine: "Scan to me (online)",
      city: "Online",
      state,
      deliveryMethod: method
    };
  }
  if (method === "PICKUP_OFFICE") {
    return {
      label: "Office pickup",
      phone: "Office pickup",
      addressLine: "Pickup from our office",
      city: "Office pickup",
      state,
      deliveryMethod: method
    };
  }
  return {
    label: deliveryLocation,
    phone: values.deliveryPhone,
    addressLine: values.deliveryAddress,
    city: values.city,
    state,
    deliveryMethod: method
  };
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

function preferredPlateComplete(serviceType: ServiceType | "", values: Record<string, string>) {
  if (serviceType !== "NEW_VEHICLE_REGISTRATION") return true;
  const choice = values.preferredStatePlate || "Lagos";
  return choice !== "Others State" || Boolean(values.otherPreferredStatePlate?.trim());
}

function resolvePreferredPlate(values: Record<string, string>) {
  return values.preferredStatePlate === "Others State"
    ? values.otherPreferredStatePlate?.trim() || "Others State"
    : values.preferredStatePlate || "Lagos";
}

function sameOption(left?: string | null, right?: string | null) {
  return (left || "") === (right || "");
}

function vehicleOptionsForService(serviceType: ServiceType | "") {
  if (serviceType === "NEW_VEHICLE_REGISTRATION" || serviceType === "VEHICLE_PAPER_RENEWAL") return adminVehicleCategories;
  return vehicleTypes;
}

function defaultVehicleTypeForService(serviceType: ServiceType | "") {
  return vehicleOptionsForService(serviceType)[0] || "Car";
}

function addHidden(form: HTMLFormElement, name: string, value: string) {
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  input.value = value;
  form.appendChild(input);
}

async function readApiError(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    if (payload?.error) return String(payload.error);
  } catch {
    try {
      const text = await response.text();
      if (text) return `${fallback} Server returned ${response.status}.`;
    } catch {
      return `${fallback} Server returned ${response.status}.`;
    }
  }
  return `${fallback} Server returned ${response.status}.`;
}

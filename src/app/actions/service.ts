'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdminPermission } from "@/lib/admin/auth"

const DEFAULT_SERVICE_IMAGE =
  "https://images.unsplash.com/photo-1562664377-709f2c337eb2?q=80&w=2070&auto=format&fit=crop"

const ALLOWED_SERVICE_PRICING_MODES = [
  "fixed",
  "quantity_tiers",
  "area",
  "option_based",
  "custom_quote",
] as const

type SupportedServicePricingMode = (typeof ALLOWED_SERVICE_PRICING_MODES)[number]

type ServiceQuantityTierConfig = {
  label: string
  quantity: number
  price: number
}

type ServiceAreaPricingConfig = {
  pricePerSqm: number
  minimumAreaSqm: number
  widthLabel: string
  heightLabel: string
}

type ServiceUploadFieldConfig = {
  label: string
  key: string
  helperText?: string
  required: boolean
  allowedFileTypesText: string
  accept: string
  maxFiles: number
  maxFileSizeMb?: number
  allowCustomerFileLabel: boolean
  order: number
}

type ServiceConfigPayload = {
  quantityTiers?: ServiceQuantityTierConfig[]
  area?: ServiceAreaPricingConfig
  uploadFields?: ServiceUploadFieldConfig[]
}

function getTrimmedString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function getCheckboxValue(formData: FormData, key: string): boolean {
  return formData.get(key) === "on"
}

function getFloatValue(formData: FormData, key: string, fallback = 0): number {
  const rawValue = getTrimmedString(formData, key)
  const parsedValue = Number.parseFloat(rawValue)

  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

function getIntegerValue(formData: FormData, key: string, fallback = 0): number {
  const rawValue = getTrimmedString(formData, key)
  const parsedValue = Number.parseInt(rawValue, 10)

  if (!Number.isFinite(parsedValue)) {
    return fallback
  }

  return Math.max(0, parsedValue)
}

function normalizeDesignerType(value: string): string {
  return value === "tshirt" ? "tshirt" : "none"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getObjectString(
  source: Record<string, unknown>,
  key: string,
): string | null {
  const value = source[key]
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null
}

function getObjectNumber(
  source: Record<string, unknown>,
  key: string,
): number | null {
  const value = source[key]

  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsedValue = Number.parseFloat(value)
    return Number.isFinite(parsedValue) ? parsedValue : null
  }

  return null
}

function getObjectBoolean(
  source: Record<string, unknown>,
  key: string,
): boolean | null {
  const value = source[key]
  return typeof value === "boolean" ? value : null
}

function normalizePositiveInteger(value: number | null, fallback: number): number {
  if (value === null || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(1, Math.trunc(value))
}

function normalizeNonNegativeNumber(value: number | null, fallback = 0): number {
  if (value === null || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(0, value)
}

function slugifyKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function normalizeAllowedFileTypesText(value: string | null): string {
  return value ?? "Alle Dateitypen"
}

function normalizeAcceptString(value: string | null): string {
  if (!value) {
    return "*/*"
  }

  const segments = value
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "")

  if (segments.length === 0) {
    return "*/*"
  }

  const normalizedSegments = segments.map((segment) => {
    if (segment === "*/*" || segment.endsWith("/*")) {
      return segment
    }

    if (segment.startsWith(".")) {
      return segment.toLowerCase()
    }

    if (segment.includes("/")) {
      return segment.toLowerCase()
    }

    return `.${segment.toLowerCase()}`
  })

  return normalizedSegments.join(",")
}

function normalizeServicePricingMode(
  value: string,
): SupportedServicePricingMode {
  return ALLOWED_SERVICE_PRICING_MODES.includes(
    value as SupportedServicePricingMode,
  )
    ? (value as SupportedServicePricingMode)
    : "fixed"
}

function parseRecordJson(rawValue: string): Record<string, unknown> | null {
  if (!rawValue) {
    return null
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue)
    return isRecord(parsedValue) ? parsedValue : null
  } catch {
    return null
  }
}

function parsePricingConfig(
  formData: FormData,
  pricingMode: SupportedServicePricingMode,
): Partial<ServiceConfigPayload> {
  const rawConfig = getTrimmedString(formData, "pricingConfigJson")
  const parsedValue = parseRecordJson(rawConfig)

  if (pricingMode === "quantity_tiers") {
    const rawTiers = parsedValue?.quantityTiers
    const quantityTiers = Array.isArray(rawTiers)
      ? rawTiers
          .map((tier) => {
            if (!isRecord(tier)) {
              return null
            }

            const quantity = getObjectNumber(tier, "quantity")
            const price = getObjectNumber(tier, "price")

            if (
              quantity === null ||
              !Number.isFinite(quantity) ||
              quantity <= 0 ||
              price === null ||
              !Number.isFinite(price) ||
              price < 0
            ) {
              return null
            }

            return {
              label:
                getObjectString(tier, "label") ??
                `${Math.trunc(quantity)} Stueck`,
              quantity: Math.max(1, Math.trunc(quantity)),
              price,
            }
          })
          .filter(
            (
              tier,
            ): tier is ServiceQuantityTierConfig => tier !== null,
          )
      : []

    return { quantityTiers }
  }

  if (pricingMode === "area") {
    const areaSource = parsedValue && isRecord(parsedValue.area)
      ? parsedValue.area
      : parsedValue

    const pricePerSqm = normalizeNonNegativeNumber(
      areaSource ? getObjectNumber(areaSource, "pricePerSqm") : null,
      0,
    )
    const minimumAreaSqm = normalizeNonNegativeNumber(
      areaSource ? getObjectNumber(areaSource, "minimumAreaSqm") : null,
      0,
    )

    return {
      area: {
        pricePerSqm,
        minimumAreaSqm,
        widthLabel:
          areaSource ? getObjectString(areaSource, "widthLabel") ?? "Breite (cm)" : "Breite (cm)",
        heightLabel:
          areaSource ? getObjectString(areaSource, "heightLabel") ?? "Hoehe (cm)" : "Hoehe (cm)",
      },
    }
  }

  return {}
}

function parseUploadConfig(
  formData: FormData,
): Partial<ServiceConfigPayload> {
  const rawConfig = getTrimmedString(formData, "uploadConfigJson")
  const parsedValue = parseRecordJson(rawConfig)

  if (!parsedValue) {
    return {}
  }

  const rawUploadFields = parsedValue.uploadFields
  if (!Array.isArray(rawUploadFields)) {
    return { uploadFields: [] }
  }

  const uploadFields = rawUploadFields
    .map((field, index): ServiceUploadFieldConfig | null => {
      if (!isRecord(field)) {
        return null
      }

      const label = getObjectString(field, "label")
      if (!label) {
        return null
      }

      const requestedKey = getObjectString(field, "key")
      const normalizedKey = slugifyKey(requestedKey ?? label) || `upload_${index + 1}`
      const allowedFileTypesText = normalizeAllowedFileTypesText(
        getObjectString(field, "allowedFileTypesText") ??
          getObjectString(field, "allowedFileTypes"),
      )
      const accept = normalizeAcceptString(
        getObjectString(field, "accept") ?? allowedFileTypesText,
      )
      const helperText = getObjectString(field, "helperText")
      const maxFileSizeMb = getObjectNumber(field, "maxFileSizeMb")
      const uploadField: ServiceUploadFieldConfig = {
        label,
        key: normalizedKey,
        required: getObjectBoolean(field, "required") ?? false,
        allowedFileTypesText,
        accept,
        maxFiles: normalizePositiveInteger(
          getObjectNumber(field, "maxFiles"),
          1,
        ),
        allowCustomerFileLabel:
          getObjectBoolean(field, "allowCustomerFileLabel") ?? false,
        order: Math.max(
          1,
          Math.trunc(getObjectNumber(field, "order") ?? index + 1),
        ),
      }

      if (helperText) {
        uploadField.helperText = helperText
      }

      if (
        maxFileSizeMb !== null &&
        Number.isFinite(maxFileSizeMb) &&
        maxFileSizeMb > 0
      ) {
        uploadField.maxFileSizeMb = maxFileSizeMb
      }

      return uploadField
    })
    .filter(
      (
        field,
      ): field is ServiceUploadFieldConfig => field !== null,
    )
    .sort((left, right) => left.order - right.order)

  return { uploadFields }
}

function buildServiceConfigJson(
  formData: FormData,
  pricingMode: SupportedServicePricingMode,
): string | null {
  const pricingConfig = parsePricingConfig(formData, pricingMode)
  const uploadConfig = parseUploadConfig(formData)
  const configPayload: ServiceConfigPayload = {
    ...pricingConfig,
    ...uploadConfig,
  }

  return Object.keys(configPayload).length > 0
    ? JSON.stringify(configPayload)
    : null
}

function buildServiceInput(formData: FormData) {
  const image = getTrimmedString(formData, "image")
  const pricingMode = normalizeServicePricingMode(
    getTrimmedString(formData, "pricingMode"),
  )

  return {
    name: getTrimmedString(formData, "name"),
    slug: getTrimmedString(formData, "slug"),
    description: getTrimmedString(formData, "description"),
    image: image || DEFAULT_SERVICE_IMAGE,
    basePrice: getFloatValue(formData, "basePrice"),
    designerType: normalizeDesignerType(
      getTrimmedString(formData, "designerType"),
    ),
    hasDesigner: getCheckboxValue(formData, "hasDesigner"),
    hasColorPicker: getCheckboxValue(formData, "hasColorPicker"),
    fileLimit: getIntegerValue(formData, "fileLimit"),
    pricingMode,
    configJson: buildServiceConfigJson(formData, pricingMode),
    isActive: getCheckboxValue(formData, "isActive"),
  }
}

function slugifyServiceSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function resolveUniqueServiceSlug(
  baseSlug: string,
  excludeServiceId?: string,
): Promise<string> {
  const normalizedBaseSlug = slugifyServiceSlug(baseSlug) || "service";
  const existingServices = await prisma.service.findMany({
    where: excludeServiceId
      ? {
          id: {
            not: excludeServiceId,
          },
        }
      : undefined,
    select: {
      slug: true,
    },
  })

  const usedSlugs = new Set(
    existingServices.map((service) => service.slug.toLowerCase()),
  )

  if (!usedSlugs.has(normalizedBaseSlug)) {
    return normalizedBaseSlug
  }

  let suffix = 2
  let candidateSlug = `${normalizedBaseSlug}-${suffix}`

  while (usedSlugs.has(candidateSlug)) {
    suffix += 1
    candidateSlug = `${normalizedBaseSlug}-${suffix}`
  }

  return candidateSlug
}

function revalidateServiceViews(serviceId?: string, slug?: string | null): void {
  revalidatePath("/admin")
  revalidatePath("/admin/services")
  revalidatePath("/services")

  if (serviceId) {
    revalidatePath(`/admin/services/${serviceId}`)
    revalidatePath(`/admin/services/${serviceId}/edit`)
  }

  if (slug) {
    revalidatePath(`/services/${slug}`)
  }
}

export async function createService(formData: FormData): Promise<void> {
  await requireAdminPermission("canManageServices")
  const serviceInput = buildServiceInput(formData)

  await prisma.service.create({
    data: serviceInput,
  })

  revalidateServiceViews(undefined, serviceInput.slug)
  redirect('/admin/services')
}

export async function updateService(id: string, formData: FormData): Promise<void> {
  await requireAdminPermission("canManageServices")
  const serviceInput = buildServiceInput(formData)

  const previousService = await prisma.service.findUnique({
    where: { id },
    select: { slug: true },
  })

  await prisma.service.update({
    where: { id },
    data: serviceInput,
  })

  revalidateServiceViews(id, serviceInput.slug)

  if (previousService?.slug && previousService.slug !== serviceInput.slug) {
    revalidateServiceViews(undefined, previousService.slug)
  }

  redirect('/admin/services')
}

export async function toggleServiceVisibility(formData: FormData): Promise<void> {
  await requireAdminPermission("canManageServices")
  const serviceId = getTrimmedString(formData, "serviceId")
  const nextIsActive = getTrimmedString(formData, "nextIsActive") === "true"

  if (!serviceId) {
    return
  }

  const updatedService = await prisma.service.update({
    where: { id: serviceId },
    data: {
      isActive: nextIsActive,
    },
    select: {
      id: true,
      slug: true,
    },
  })

  revalidateServiceViews(updatedService.id, updatedService.slug)
}

export async function duplicateService(formData: FormData): Promise<void> {
  await requireAdminPermission("canManageServices")
  const serviceId = getTrimmedString(formData, "serviceId")

  if (!serviceId) {
    return
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      options: {
        include: {
          values: {
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
    },
  })

  if (!service) {
    return
  }

  const duplicateSlug = await resolveUniqueServiceSlug(`${service.slug}-copy`)
  const duplicateName = `${service.name} Kopie`

  const duplicatedService = await prisma.service.create({
    data: {
      name: duplicateName,
      slug: duplicateSlug,
      description: service.description,
      image: service.image,
      basePrice: service.basePrice,
      isActive: false,
      order: service.order,
      hasDesigner: service.hasDesigner,
      hasColorPicker: service.hasColorPicker,
      fileLimit: service.fileLimit,
      designerType: service.designerType,
      pricingMode: service.pricingMode,
      configJson: service.configJson,
      options: {
        create: service.options.map((option) => ({
          key: option.key,
          name: option.name,
          type: option.type,
          isRequired: option.isRequired,
          order: option.order,
          helperText: option.helperText,
          pricingMode: option.pricingMode,
          configJson: option.configJson,
          values: {
            create: option.values.map((value) => ({
              name: value.name,
              price: value.price,
              order: value.order,
              metadataJson: value.metadataJson,
            })),
          },
        })),
      },
    },
    select: {
      id: true,
      slug: true,
    },
  })

  revalidateServiceViews(duplicatedService.id, duplicatedService.slug)
  revalidateServiceViews(service.id, service.slug)
}

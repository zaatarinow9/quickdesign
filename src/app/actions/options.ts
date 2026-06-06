'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAdminPermission } from "@/lib/admin/auth"

const OPTION_TYPE_MAP = {
  select: { storedType: "select", usesValues: true },
  radio: { storedType: "radio", usesValues: true },
  text: { storedType: "text", usesValues: false },
  number: { storedType: "number", usesValues: false },
  file: { storedType: "file", usesValues: false },
  color: { storedType: "color", usesValues: true },
  size: { storedType: "size", usesValues: true },
  textarea: { storedType: "textarea", usesValues: false },
} as const

const ALLOWED_PRICING_MODES = [
  "included",
  "additive",
  "override_base",
] as const

type SupportedOptionInputType = keyof typeof OPTION_TYPE_MAP
type SupportedPricingMode = (typeof ALLOWED_PRICING_MODES)[number]

type OptionValueInput = {
  id?: string | null
  metadataJson?: string | null
  name: string
  price: number
  order: number
}

type OptionConfigInput = {
  placeholder?: string
  accept?: string
}

type OptionData = {
  name: string
  key?: string | null
  type: string
  isRequired: boolean
  order: number
  helperText?: string
  pricingMode?: string | null
  config?: OptionConfigInput
  values: OptionValueInput[]
}

type NormalizedOptionData = {
  name: string
  key: string
  type: (typeof OPTION_TYPE_MAP)[SupportedOptionInputType]["storedType"]
  adminKind: SupportedOptionInputType
  isRequired: boolean
  order: number
  helperText: string | null
  pricingMode: SupportedPricingMode | null
  configJson: string | null
  values: {
    id: string | null
    name: string
    price: number
    order: number
    metadataJson: string | null
  }[]
}

type OptionActionResult =
  | { success: true }
  | { success: false; error: string }

type NormalizedOptionResult =
  | { success: true; data: Omit<NormalizedOptionData, "key">; requestedKey: string | null }
  | { success: false; error: string }

function isSupportedOptionType(value: string): value is SupportedOptionInputType {
  return Object.prototype.hasOwnProperty.call(OPTION_TYPE_MAP, value)
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : null
}

function normalizeOptionName(value: string): string | null {
  return normalizeOptionalString(value)
}

function normalizeOptionOrder(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.max(0, Math.trunc(value))
}

function normalizeOptionPrice(value: number): number {
  return Number.isFinite(value) ? value : 0
}

function normalizePricingMode(
  value: string | null | undefined,
): SupportedPricingMode | null | "invalid" {
  const normalizedValue = normalizeOptionalString(value)?.toLowerCase()

  if (!normalizedValue || normalizedValue === "automatic") {
    return null
  }

  return ALLOWED_PRICING_MODES.includes(normalizedValue as SupportedPricingMode)
    ? (normalizedValue as SupportedPricingMode)
    : "invalid"
}

function slugifyOptionKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

async function resolveUniqueOptionKey(
  serviceId: string,
  baseKey: string,
  excludeOptionId?: string,
): Promise<string> {
  const normalizedBaseKey = slugifyOptionKey(baseKey) || "field"
  const existingOptions = await prisma.serviceOption.findMany({
    where: {
      serviceId,
      ...(excludeOptionId
        ? {
            id: {
              not: excludeOptionId,
            },
          }
        : {}),
    },
    select: {
      key: true,
    },
  })

  const usedKeys = new Set(
    existingOptions
      .map((option) => normalizeOptionalString(option.key)?.toLowerCase())
      .filter((key): key is string => Boolean(key)),
  )

  if (!usedKeys.has(normalizedBaseKey)) {
    return normalizedBaseKey
  }

  let suffix = 2
  let candidateKey = `${normalizedBaseKey}_${suffix}`

  while (usedKeys.has(candidateKey)) {
    suffix += 1
    candidateKey = `${normalizedBaseKey}_${suffix}`
  }

  return candidateKey
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseConfigJsonRecord(
  configJson: string | null | undefined,
): Record<string, unknown> {
  const normalizedConfigJson = normalizeOptionalString(configJson)

  if (!normalizedConfigJson) {
    return {}
  }

  try {
    const parsedValue: unknown = JSON.parse(normalizedConfigJson)
    return isRecord(parsedValue) ? parsedValue : {}
  } catch {
    return {}
  }
}

function buildConfigJson(
  adminKind: SupportedOptionInputType,
  config: OptionConfigInput | undefined,
  existingConfigJson?: string | null,
): string {
  const configPayload: Record<string, unknown> = {
    ...parseConfigJsonRecord(existingConfigJson),
    adminKind,
  }
  const placeholder = normalizeOptionalString(config?.placeholder)
  const accept = normalizeOptionalString(config?.accept)

  if (placeholder) {
    configPayload.placeholder = placeholder
  } else {
    delete configPayload.placeholder
  }

  if (accept) {
    configPayload.accept = accept
  } else {
    delete configPayload.accept
  }

  return JSON.stringify(configPayload)
}

function normalizeOptionData(
  data: OptionData,
  existingConfigJson?: string | null,
): NormalizedOptionResult {
  const name = normalizeOptionName(data.name)
  if (!name) {
    return { success: false, error: "Bitte geben Sie einen Feldnamen ein." }
  }

  const normalizedType: SupportedOptionInputType = isSupportedOptionType(data.type)
    ? data.type
    : "select"
  const typeConfig = OPTION_TYPE_MAP[normalizedType]
  const pricingMode = normalizePricingMode(data.pricingMode)

  if (pricingMode === "invalid") {
    return {
      success: false,
      error: "Der ausgewahlte Pricing-Modus ist ungueltig.",
    }
  }

  const usesValues = typeConfig.usesValues
  const values = usesValues
    ? data.values
        .map((value, index) => ({
          id: normalizeOptionalString(value.id) ?? null,
          name: value.name.trim(),
          price: normalizeOptionPrice(value.price),
          order: normalizeOptionOrder(value.order, index + 1),
          metadataJson: normalizeOptionalString(value.metadataJson) ?? null,
        }))
        .filter((value) => value.name !== "")
    : []

  if (usesValues && values.length === 0) {
    return {
      success: false,
      error: "Bitte legen Sie mindestens einen gultigen Optionswert an.",
    }
  }

  return {
    success: true,
    requestedKey: normalizeOptionalString(data.key),
    data: {
      name,
      type: typeConfig.storedType,
      adminKind: normalizedType,
      isRequired: data.isRequired,
      order: normalizeOptionOrder(data.order),
      helperText: normalizeOptionalString(data.helperText),
      pricingMode,
      configJson: buildConfigJson(
        normalizedType,
        data.config,
        existingConfigJson,
      ),
      values,
    },
  }
}

function revalidateServiceOptionsPage(serviceId: string): void {
  revalidatePath(`/admin/services/${serviceId}`)
}

export async function createServiceOption(
  serviceId: string,
  data: OptionData,
): Promise<OptionActionResult> {
  await requireAdminPermission("canManageServices")
  const normalized = normalizeOptionData(data)
  if (!normalized.success) {
    return normalized
  }

  try {
    const optionKey = await resolveUniqueOptionKey(
      serviceId,
      normalized.requestedKey ?? normalized.data.name,
    )

    await prisma.serviceOption.create({
      data: {
        serviceId,
        key: optionKey,
        name: normalized.data.name,
        type: normalized.data.type,
        isRequired: normalized.data.isRequired,
        order: normalized.data.order,
        helperText: normalized.data.helperText,
        pricingMode: normalized.data.pricingMode,
        configJson: normalized.data.configJson,
        values:
          normalized.data.values.length > 0
            ? {
                create: normalized.data.values.map((value) => ({
                  name: value.name,
                  price: value.price,
                  order: value.order,
                  metadataJson: value.metadataJson,
                })),
              }
            : undefined,
      },
    })

    revalidateServiceOptionsPage(serviceId)
    return { success: true }
  } catch (error) {
    console.error("Create Service Option Error:", error)
    return {
      success: false,
      error: "Das Feld konnte nicht gespeichert werden.",
    }
  }
}

export async function updateServiceOption(
  serviceId: string,
  optionId: string,
  data: OptionData,
): Promise<OptionActionResult> {
  await requireAdminPermission("canManageServices")
  try {
    const existingOption = await prisma.serviceOption.findUnique({
      where: { id: optionId },
      select: {
        serviceId: true,
        configJson: true,
        values: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!existingOption || existingOption.serviceId !== serviceId) {
      return {
        success: false,
        error: "Das ausgewahlte Feld wurde nicht gefunden.",
      }
    }

    const normalized = normalizeOptionData(data, existingOption.configJson)
    if (!normalized.success) {
      return normalized
    }

    const optionKey = await resolveUniqueOptionKey(
      serviceId,
      normalized.requestedKey ?? normalized.data.name,
      optionId,
    )
    const existingValueIds = new Set(existingOption.values.map((value) => value.id))
    const retainedValueIds = normalized.data.values
      .map((value) => value.id)
      .filter(
        (valueId): valueId is string =>
          typeof valueId === "string" && existingValueIds.has(valueId),
      )

    await prisma.$transaction(async (tx) => {
      await tx.optionValue.deleteMany({
        where:
          retainedValueIds.length > 0
            ? {
                optionId,
                id: {
                  notIn: retainedValueIds,
                },
              }
            : { optionId },
      })

      await tx.serviceOption.update({
        where: { id: optionId },
        data: {
          key: optionKey,
          name: normalized.data.name,
          type: normalized.data.type,
          isRequired: normalized.data.isRequired,
          order: normalized.data.order,
          helperText: normalized.data.helperText,
          pricingMode: normalized.data.pricingMode,
          configJson: normalized.data.configJson,
        },
      })

      for (const value of normalized.data.values) {
        if (value.id && existingValueIds.has(value.id)) {
          await tx.optionValue.update({
            where: { id: value.id },
            data: {
              name: value.name,
              price: value.price,
              order: value.order,
              metadataJson: value.metadataJson,
            },
          })
          continue
        }

        await tx.optionValue.create({
          data: {
            optionId,
            name: value.name,
            price: value.price,
            order: value.order,
            metadataJson: value.metadataJson,
          },
        })
      }
    })

    revalidateServiceOptionsPage(serviceId)
    return { success: true }
  } catch (error) {
    console.error("Update Service Option Error:", error)
    return {
      success: false,
      error: "Das Feld konnte nicht aktualisiert werden.",
    }
  }
}

export async function deleteServiceOption(
  optionId: string,
  serviceId: string,
): Promise<OptionActionResult> {
  await requireAdminPermission("canManageServices")
  try {
    await prisma.serviceOption.delete({
      where: { id: optionId }
    })

    revalidateServiceOptionsPage(serviceId)
    return { success: true }
  } catch (error) {
    console.error("Delete Service Option Error:", error)
    return {
      success: false,
      error: "Das Feld konnte nicht geloscht werden.",
    }
  }
}

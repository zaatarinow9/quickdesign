import { prisma } from "@/lib/prisma";

export type CustomerInput = {
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  taxId?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

export type NormalizedCustomerInput = {
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  taxId: string | null;
  notes: string | null;
  isActive: boolean;
};

function normalizeOptionalString(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

export function normalizeCustomerEmail(
  value: string | null | undefined,
): string | null {
  const normalizedValue = normalizeOptionalString(value);
  return normalizedValue ? normalizedValue.toLowerCase() : null;
}

export function normalizeCustomerInput(
  input: CustomerInput,
): NormalizedCustomerInput {
  return {
    name: input.name.trim(),
    companyName: normalizeOptionalString(input.companyName),
    email: normalizeCustomerEmail(input.email),
    phone: normalizeOptionalString(input.phone),
    address: normalizeOptionalString(input.address),
    city: normalizeOptionalString(input.city),
    postalCode: normalizeOptionalString(input.postalCode),
    country: normalizeOptionalString(input.country),
    taxId: normalizeOptionalString(input.taxId),
    notes: normalizeOptionalString(input.notes),
    isActive: input.isActive ?? true,
  };
}

export async function findMatchingCustomer(input: {
  email?: string | null;
  phone?: string | null;
}) {
  const email = normalizeCustomerEmail(input.email);

  if (email) {
    const matchedByEmail = await prisma.customer.findUnique({
      where: { email },
    });

    if (matchedByEmail) {
      return matchedByEmail;
    }
  }

  const phone = normalizeOptionalString(input.phone);
  if (!phone) {
    return null;
  }

  return prisma.customer.findFirst({
    where: { phone },
  });
}

function mergeCustomerValues(
  currentValue: string | null,
  nextValue: string | null,
): string | null {
  return currentValue && currentValue.trim() !== "" ? currentValue : nextValue;
}

export async function createOrLinkCustomer(
  input: CustomerInput,
): Promise<{
  id: string;
  name: string;
  email: string | null;
  companyName: string | null;
  phone: string | null;
}> {
  const normalizedInput = normalizeCustomerInput(input);

  if (!normalizedInput.name) {
    throw new Error("Customer name is required.");
  }

  const existingCustomer = await findMatchingCustomer({
    email: normalizedInput.email,
    phone: normalizedInput.phone,
  });

  if (existingCustomer) {
    const updatedCustomer = await prisma.customer.update({
      where: { id: existingCustomer.id },
      data: {
        name: mergeCustomerValues(existingCustomer.name, normalizedInput.name) ?? "",
        companyName: mergeCustomerValues(
          existingCustomer.companyName,
          normalizedInput.companyName,
        ),
        email: mergeCustomerValues(existingCustomer.email, normalizedInput.email),
        phone: mergeCustomerValues(existingCustomer.phone, normalizedInput.phone),
        address: mergeCustomerValues(
          existingCustomer.address,
          normalizedInput.address,
        ),
        city: mergeCustomerValues(existingCustomer.city, normalizedInput.city),
        postalCode: mergeCustomerValues(
          existingCustomer.postalCode,
          normalizedInput.postalCode,
        ),
        country: mergeCustomerValues(
          existingCustomer.country,
          normalizedInput.country,
        ),
        taxId: mergeCustomerValues(existingCustomer.taxId, normalizedInput.taxId),
        notes: mergeCustomerValues(existingCustomer.notes, normalizedInput.notes),
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        phone: true,
      },
    });

    return updatedCustomer;
  }

  return prisma.customer.create({
    data: normalizedInput,
    select: {
      id: true,
      name: true,
      email: true,
      companyName: true,
      phone: true,
    },
  });
}

export function formatCustomerLocation(input: {
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
}): string {
  const parts = [input.postalCode, input.city, input.country]
    .map((value) => normalizeOptionalString(value))
    .filter((value): value is string => value !== null);

  return parts.join(", ");
}

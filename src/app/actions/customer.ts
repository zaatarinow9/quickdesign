"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/admin/auth";
import {
  normalizeCustomerEmail,
  normalizeCustomerInput,
} from "@/lib/customers";

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function ensureCustomerEmailIsAvailable(
  customerId: string | null,
  email: string | null,
): Promise<boolean> {
  if (!email) {
    return true;
  }

  const existingCustomer = await prisma.customer.findUnique({
    where: { email },
    select: { id: true },
  });

  return !existingCustomer || existingCustomer.id === customerId;
}

function buildCustomerInput(formData: FormData) {
  return normalizeCustomerInput({
    name: getFormString(formData, "name"),
    companyName: getFormString(formData, "companyName"),
    email: normalizeCustomerEmail(getFormString(formData, "email")),
    phone: getFormString(formData, "phone"),
    address: getFormString(formData, "address"),
    city: getFormString(formData, "city"),
    postalCode: getFormString(formData, "postalCode"),
    country: getFormString(formData, "country"),
    taxId: getFormString(formData, "taxId"),
    notes: getFormString(formData, "notes"),
    isActive: formData.get("isActive") === "on",
  });
}

export async function createCustomer(formData: FormData): Promise<void> {
  await requireAdminPermission("canManageCustomers");
  const customerInput = buildCustomerInput(formData);

  if (!customerInput.name) {
    redirect("/admin/customers/new?error=invalid");
  }

  const isEmailAvailable = await ensureCustomerEmailIsAvailable(
    null,
    customerInput.email,
  );

  if (!isEmailAvailable) {
    redirect("/admin/customers/new?error=email");
  }

  const customer = await prisma.customer.create({
    data: customerInput,
    select: { id: true },
  });

  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${customer.id}?created=1`);
}

export async function updateCustomer(
  customerId: string,
  formData: FormData,
): Promise<void> {
  await requireAdminPermission("canManageCustomers");
  const customerInput = buildCustomerInput(formData);

  if (!customerInput.name) {
    redirect(`/admin/customers/${customerId}/edit?error=invalid`);
  }

  const isEmailAvailable = await ensureCustomerEmailIsAvailable(
    customerId,
    customerInput.email,
  );

  if (!isEmailAvailable) {
    redirect(`/admin/customers/${customerId}/edit?error=email`);
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: customerInput,
  });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  redirect(`/admin/customers/${customerId}?updated=1`);
}

import "server-only";
import type { Settings } from "@/lib/settings/schema";

/** Firmendaten für E-Mail-Vorlagen */
export const mailCompany = (s: Settings) => ({
  name: s.company.name,
  street: s.company.street,
  postalCode: s.company.postalCode,
  city: s.company.city,
  phone: s.company.phone,
  email: s.company.email,
  website: s.company.website,
});

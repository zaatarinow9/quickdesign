import { Hammer, Store, Truck } from "lucide-react";
import type { AppointmentType } from "@/lib/projects/shared";

export const appointmentIcons: Record<AppointmentType, typeof Hammer> = { montage: Hammer, lieferung: Truck, abholung: Store };

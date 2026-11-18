import { CalendarClock, Hammer, PackageSearch, Store, Truck } from "lucide-react";
import type { AppointmentType } from "@/lib/projects/shared";

export const appointmentIcons: Record<AppointmentType, typeof Hammer> = { montage: Hammer, lieferung: Truck, abholung: Store, besorgung: PackageSearch, sonstiges: CalendarClock };

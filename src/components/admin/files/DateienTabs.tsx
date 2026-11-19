import { FilterTabs } from "@/components/admin/ui";

/** Navigation im Datei-Bereich */
export function DateienTabs({ active, counts }: { active: "ordner" | "druck" | "ablauf" | "mich"; counts?: { alle?: number; aktiv?: number } }) {
  return (
    <FilterTabs
      active={active}
      items={[
        { key: "ordner", label: "📁 Ordner", href: "/admin/dateien", count: counts?.alle },
        { key: "druck", label: "🖨 Druck (Tagesordner)", href: "/admin/dateien/druck" },
        { key: "ablauf", label: "📋 Ablauf", href: "/admin/dateien/ablauf", count: counts?.aktiv },
        { key: "mich", label: "Für mich", href: "/admin/dateien?fuer=mich" },
      ]}
    />
  );
}

/** interne Verwaltungs-Links (nur mit Anmeldung erreichbar) – auf Server und Client nutzbar */
export const fileLink = (id: string) => `/admin/dateien/${id}/ansicht`;
export const folderLink = (path: string) => (path ? `/admin/dateien?ordner=${encodeURIComponent(path)}` : "/admin/dateien");

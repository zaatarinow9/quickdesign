/** Zeit-Helfer für Server-Komponenten (außerhalb des Render-Körpers aufgerufen). */
export const isoDaysAgo = (days: number) => new Date(Date.now() - days * 864e5).toISOString();
export const lastDays = (days: number) => Array.from({ length: days }, (_, i) => isoDaysAgo(days - 1 - i).slice(0, 10));

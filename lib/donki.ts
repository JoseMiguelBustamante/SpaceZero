export type SolarEvent = {
  id: string;
  classType: string;
  peakTime: string;
  activeRegion: string;
  source: "live" | "fallback";
  link: string;
  reason?: string;
};
// Verified against NASA's 14 May 2024 report and CCMC alert 30944/1.
export const HISTORICAL_FLARE: SolarEvent = {
  id: "historical-2024-05-14-X8.7",
  classType: "X8.7",
  peakTime: "2024-05-14T16:51:00Z",
  activeRegion: "13664",
  source: "fallback",
  link: "https://science.nasa.gov/blogs/solar-cycle-25/2024/05/14/strong-solar-flare-erupts-from-sun-15/",
};
export function donkiUrl(now = new Date()) {
  const start = new Date(now.getTime() - 30 * 86400000);
  return `https://api.nasa.gov/DONKI/FLR?${new URLSearchParams({ startDate: start.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10), api_key: "DEMO_KEY" })}`;
}
export function latestFlare(data: unknown, now = Date.now()): SolarEvent {
  if (!Array.isArray(data)) throw new Error("Respuesta DONKI inválida");
  const records = data
    .filter((item: unknown) => {
      if (!item || typeof item !== "object") return false;
      const d = item as Record<string, unknown>;
      if (
        typeof d.classType !== "string" ||
        !/^([ABCMX])\d+(\.\d+)?$/.test(d.classType) ||
        typeof d.peakTime !== "string"
      )
        return false;
      const date = Date.parse(
        d.peakTime.endsWith("Z") ? d.peakTime : `${d.peakTime}Z`,
      );
      return (
        Number.isFinite(date) &&
        date <= now + 60000 &&
        date >= now - 31 * 86400000
      );
    })
    .sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) =>
        Date.parse(String(b.peakTime)) - Date.parse(String(a.peakTime)),
    );
  if (!records.length) throw new Error("Sin llamaradas recientes válidas");
  const d = records[0] as Record<string, unknown>;
  const link =
    typeof d.link === "string" &&
    /^https:\/\/([a-z0-9-]+\.)*nasa\.gov\//i.test(d.link)
      ? d.link
      : "https://ccmc.gsfc.nasa.gov/tools/DONKI/";
  return {
    id: typeof d.flrID === "string" ? d.flrID : "donki-recent",
    classType: String(d.classType),
    peakTime: String(d.peakTime).endsWith("Z")
      ? String(d.peakTime)
      : `${d.peakTime}Z`,
    activeRegion:
      typeof d.activeRegionNum === "number" ||
      typeof d.activeRegionNum === "string"
        ? String(d.activeRegionNum)
        : "No informada",
    source: "live",
    link,
  };
}

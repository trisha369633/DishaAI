export type ScanHistoryItem = {
  id: string;
  scannedAt: string;
  labels: string[];
};

const key = "dishaai-scan-history";
const maximumEntries = 12;

export function readScanHistory(): ScanHistoryItem[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is ScanHistoryItem =>
      typeof entry === "object" && entry !== null
      && typeof entry.id === "string"
      && typeof entry.scannedAt === "string"
      && Array.isArray(entry.labels)
      && entry.labels.every((label: unknown) => typeof label === "string"),
    ).slice(0, maximumEntries);
  } catch {
    return [];
  }
}

export function addScanHistory(labels: string[]) {
  const safeLabels = [...new Set(labels)].slice(0, 8);
  try {
    const entries = readScanHistory();
    localStorage.setItem(key, JSON.stringify([
      { id: crypto.randomUUID(), scannedAt: new Date().toISOString(), labels: safeLabels },
      ...entries,
    ].slice(0, maximumEntries)));
  } catch {
    // A scan still succeeds when browser storage is unavailable.
  }
}

export function clearScanHistory() {
  try {
    localStorage.removeItem(key);
  } catch {
    // Clearing is best-effort when browser storage is disabled.
  }
}
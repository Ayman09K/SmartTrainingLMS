export function createRequestId(prefix: string): string {
  const safePrefix = prefix
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]/g, "-")
    .slice(0, 30);

  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).slice(2, 12);

  return [safePrefix || "mobile", timestamp, randomPart]
    .join("-")
    .slice(0, 120);
}
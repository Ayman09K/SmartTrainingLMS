const DEFAULT_API_BASE_URL = "https://api.smarttraininglms.com/api";

function normalizeApiBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_BASE_URL = normalizeApiBaseUrl(
  configuredApiUrl && configuredApiUrl.length > 0
    ? configuredApiUrl
    : DEFAULT_API_BASE_URL,
);
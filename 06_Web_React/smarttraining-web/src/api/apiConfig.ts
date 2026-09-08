const DEFAULT_LOCAL_API_BASE_URL = "http://localhost:8080/api";
const DEFAULT_LOCAL_MEDIA_BASE_URL = "http://localhost:8082/media";
const DEFAULT_TIMEOUT = 20000;

function normalizeUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function readNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export const API_BASE_URL = normalizeUrl(
  import.meta.env.VITE_API_BASE_URL || DEFAULT_LOCAL_API_BASE_URL,
);

export const MEDIA_BASE_URL = normalizeUrl(
  import.meta.env.VITE_MEDIA_BASE_URL || DEFAULT_LOCAL_MEDIA_BASE_URL,
);

export const API_TIMEOUT = readNumber(
  import.meta.env.VITE_API_TIMEOUT,
  DEFAULT_TIMEOUT,
);

export const IS_PRODUCTION = import.meta.env.PROD;

export function buildMediaUrl(value?: string | null): string {
  if (!value) {
    return "";
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  const cleanValue = value.startsWith("/") ? value.slice(1) : value;

  return `${MEDIA_BASE_URL}/${cleanValue}`;
}

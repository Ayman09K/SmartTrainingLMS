import { apiClient } from "./apiClient";
import { API_BASE_URL, MEDIA_BASE_URL } from "./apiConfig";

export interface LearnerMediaObjectUrl {
  url: string;
  revoke: boolean;
  protectedMedia: boolean;
}

function isTrustedMediaOrigin(url: URL): boolean {
  const allowedOrigins = [API_BASE_URL, MEDIA_BASE_URL]
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  return allowedOrigins.includes(url.origin);
}

export function learnerProtectedMediaPath(
  value?: string | null,
): string | null {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  let pathname = raw;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsedUrl = new URL(raw);

      // Une URL externe (MDN, YouTube CDN, etc.) doit rester externe.
      // Seules les origines configurees pour SmartTraining passent par apiClient + JWT.
      if (!isTrustedMediaOrigin(parsedUrl)) {
        return null;
      }

      pathname = parsedUrl.pathname;
    } catch {
      return null;
    }
  } else {
    pathname = raw.split(/[?#]/, 1)[0] || raw;
  }

  const markerIndex = pathname.indexOf("/media/");

  if (markerIndex < 0) {
    return null;
  }

  return pathname.slice(markerIndex);
}

export async function loadLearnerMediaObjectUrl(
  value?: string | null,
): Promise<LearnerMediaObjectUrl | null> {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  const protectedPath = learnerProtectedMediaPath(raw);

  if (!protectedPath) {
    return {
      url: raw,
      revoke: false,
      protectedMedia: false,
    };
  }

  const response = await apiClient.get<Blob>(protectedPath, {
    responseType: "blob",
    headers: {
      Accept: "*/*",
    },
  });

  return {
    url: URL.createObjectURL(response.data),
    revoke: true,
    protectedMedia: true,
  };
}

import { create } from "axios";
import { Href, router } from "expo-router";
import { getToken, removeToken } from "../storage/tokenStorage";
import { API_BASE_URL } from "./apiConfig";

const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/verify-email",
  "/auth/resend-verification",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/oidc",
];

let sessionResetInProgress = false;

function isPublicAuthRequest(url?: string): boolean {
  const normalizedUrl = (url || "").toLowerCase();
  return PUBLIC_AUTH_PATHS.some((path) => normalizedUrl.includes(path));
}

async function resetRejectedSession(): Promise<void> {
  if (sessionResetInProgress) {
    return;
  }

  sessionResetInProgress = true;

  try {
    await removeToken();
    router.replace("/" as Href);
  } finally {
    sessionResetInProgress = false;
  }
}

export const apiClient = create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (__DEV__) {
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (__DEV__) {
    }

    if (
      error.response?.status === 401 &&
      !isPublicAuthRequest(error.config?.url)
    ) {
      await resetRejectedSession();
    }

    return Promise.reject(error);
  },
);
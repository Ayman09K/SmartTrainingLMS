import axios from "axios";
import type { AxiosError, AxiosRequestConfig } from "axios";
import { API_BASE_URL, API_TIMEOUT } from "./apiConfig";
import { getToken, removeToken } from "../utils/tokenStorage";

interface ApiErrorBody {
  message?: string;
  error?: string;
  details?: string;
  timestamp?: string;
  path?: string;
  status?: number;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) {
      removeToken();
    }

    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data;

    if (body?.message) {
      return body.message;
    }

    if (body?.error) {
      return body.error;
    }

    if (body?.details) {
      return body.details;
    }

    if (error.response?.status) {
      return `Erreur API ${error.response.status}`;
    }

    if (error.code === "ECONNABORTED") {
      return "Le serveur met trop de temps à répondre.";
    }

    if (error.message) {
      return error.message;
    }
  }

  return "Une erreur inattendue est survenue.";
}

export async function getData<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.get<T>(url, config);
  return response.data;
}

export async function postData<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  const response = await apiClient.post<TResponse>(url, body, config);
  return response.data;
}

export async function putData<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  const response = await apiClient.put<TResponse>(url, body, config);
  return response.data;
}

export async function patchData<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  const response = await apiClient.patch<TResponse>(url, body, config);
  return response.data;
}

export async function deleteData<TResponse = void>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  const response = await apiClient.delete<TResponse>(url, config);
  return response.data;
}

export async function uploadFormData<TResponse>(
  url: string,
  formData: FormData,
): Promise<TResponse> {
  const response = await apiClient.post<TResponse>(url, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

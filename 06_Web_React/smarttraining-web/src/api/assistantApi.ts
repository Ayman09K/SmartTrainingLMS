import axios from "axios";

import {
  deleteData,
  getData,
  postData,
} from "./apiClient";

export type AssistantHistoryRole = "user" | "assistant";

export interface AssistantHistoryMessage {
  role: AssistantHistoryRole;
  content: string;
}

export interface AssistantChatRequest {
  message: string;
  trainingId?: number;
  lessonId?: number;
  surface?: "MOBILE" | "WEB";
  conversationId?: number;
}

export interface AssistantChatResponse {
  answer: string;
  model: string;
  contextUsed: boolean;
  conversationId: number;
}

export interface AssistantConversationSummary {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantPersistedMessage {
  id: number;
  role: AssistantHistoryRole;
  content: string;
  trainingId?: number | null;
  lessonId?: number | null;
  surface?: "MOBILE" | "WEB" | null;
  model?: string | null;
  contextUsed: boolean;
  createdAt: string;
}

export async function askAssistant(
  request: AssistantChatRequest,
): Promise<AssistantChatResponse> {
  return postData<AssistantChatResponse, AssistantChatRequest>(
    "/analytics/assistant/chat",
    {
      ...request,
      surface: request.surface ?? "WEB",
    },
  );
}

export async function listAssistantConversations(
  limit = 30,
): Promise<AssistantConversationSummary[]> {
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));

  return getData<AssistantConversationSummary[]>(
    `/analytics/assistant/conversations?limit=${safeLimit}`,
  );
}

export async function getAssistantConversationMessages(
  conversationId: number,
  limit = 100,
): Promise<AssistantPersistedMessage[]> {
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)));

  return getData<AssistantPersistedMessage[]>(
    `/analytics/assistant/conversations/${conversationId}/messages?limit=${safeLimit}`,
  );
}

export async function deleteAssistantConversation(
  conversationId: number,
): Promise<void> {
  await deleteData<void>(
    `/analytics/assistant/conversations/${conversationId}`,
  );
}

export function getAssistantErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "Impossible d’obtenir une réponse pour le moment.";
  }

  const status = error.response?.status;

  if (status === 503 || status === 429) {
    return "L’assistant est temporairement indisponible. Réessayez dans quelques instants.";
  }

  if (
    status === 504 ||
    error.code === "ECONNABORTED" ||
    error.code === "ETIMEDOUT"
  ) {
    return "L’assistant met plus de temps que prévu à répondre.";
  }

  if (!error.response) {
    return "Vérifiez votre connexion Internet puis réessayez.";
  }

  return "Impossible d’obtenir une réponse pour le moment.";
}

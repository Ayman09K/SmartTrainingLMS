import { isAxiosError } from "axios";

import { apiClient } from "../../api/apiClient";

export type AssistantHistoryRole = "user" | "assistant";

export type AssistantHistoryMessage = {
  role: AssistantHistoryRole;
  content: string;
};

export type AssistantChatRequest = {
  message: string;
  trainingId?: number;
  lessonId?: number;
  surface?: "MOBILE" | "WEB";
  conversationId?: number;
  history?: AssistantHistoryMessage[];
};

export type AssistantChatResponse = {
  answer: string;
  model: string;
  contextUsed: boolean;
  conversationId: number;
};

export type AssistantConversationSummary = {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type AssistantPersistedMessage = {
  id: number;
  role: AssistantHistoryRole;
  content: string;
  trainingId?: number | null;
  lessonId?: number | null;
  surface?: "MOBILE" | "WEB" | null;
  model?: string | null;
  contextUsed: boolean;
  createdAt: string;
};

export async function askAssistant(
  request: AssistantChatRequest,
): Promise<AssistantChatResponse> {
  const response = await apiClient.post<AssistantChatResponse>(
    "/analytics/assistant/chat",
    { ...request, surface: request.surface ?? "MOBILE" },
  );

  return response.data;
}

export async function listAssistantConversations(
  limit = 30,
): Promise<AssistantConversationSummary[]> {
  const response = await apiClient.get<AssistantConversationSummary[]>(
    "/analytics/assistant/conversations",
    { params: { limit } },
  );

  return response.data;
}

export async function getAssistantConversationMessages(
  conversationId: number,
  limit = 100,
): Promise<AssistantPersistedMessage[]> {
  const response = await apiClient.get<AssistantPersistedMessage[]>(
    `/analytics/assistant/conversations/${conversationId}/messages`,
    { params: { limit } },
  );

  return response.data;
}

export async function deleteAssistantConversation(
  conversationId: number,
): Promise<void> {
  await apiClient.delete(
    `/analytics/assistant/conversations/${conversationId}`,
  );
}

export function getAssistantErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
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

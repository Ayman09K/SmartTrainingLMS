import { apiClient } from "../../api/apiClient";
import {
  Quiz,
  QuizAttemptFullResponse,
  QuizAttemptResponse,
  StartAttemptRequest,
  StartAttemptResponse,
  SubmitAttemptRequest,
} from "../../types/evaluation";

export async function getPublishedQuizzesByTraining(
  trainingId: number,
): Promise<Quiz[]> {
  const response = await apiClient.get<Quiz[]>(
    `/quizzes/learner/me/training/${trainingId}`,
  );

  return response.data;
}

export async function getQuizFullDetails(
  quizId: number,
): Promise<Quiz> {
  const response = await apiClient.get<Quiz>(
    `/quizzes/learner/me/${quizId}`,
  );

  return response.data;
}

export async function startQuizAttempt(
  request: StartAttemptRequest,
): Promise<StartAttemptResponse> {
  const response = await apiClient.post<StartAttemptResponse>(
    "/attempts/learner/me/start",
    request,
  );

  return response.data;
}

export async function submitQuizAttempt(
  attemptId: number,
  request: SubmitAttemptRequest,
): Promise<QuizAttemptFullResponse> {
  const response = await apiClient.post<QuizAttemptFullResponse>(
    `/attempts/learner/me/${attemptId}/submit`,
    request,
  );

  return response.data;
}

export async function getMyQuizAttemptsForQuiz(
  quizId: number,
): Promise<QuizAttemptResponse[]> {
  const response = await apiClient.get<QuizAttemptResponse[]>(
    `/attempts/learner/me/quiz/${quizId}`,
  );

  return response.data;
}

export async function getMyQuizAttempt(
  attemptId: number,
): Promise<QuizAttemptFullResponse> {
  const response = await apiClient.get<QuizAttemptFullResponse>(
    `/attempts/learner/me/${attemptId}`,
  );

  return response.data;
}
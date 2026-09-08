import { apiClient } from "../../api/apiClient";
import type {
  AnswerOptionAuthoringRequest,
  AnswerOptionAuthoringResponse,
  QuestionAuthoringRequest,
  QuestionAuthoringResponse,
  QuizAuthoringRequest,
  QuizAuthoringResponse,
  QuizBuilderTrainingOutline,
  QuizFullAuthoringResponse,
} from "../../types/quizAuthoringMobile";

export async function getManageableQuizzesByTraining(
  trainingId: number,
): Promise<QuizAuthoringResponse[]> {
  const response = await apiClient.get<QuizAuthoringResponse[]>(
    `/quizzes/training/${trainingId}`,
  );
  return response.data;
}

export async function getManageableQuizFull(
  quizId: number,
): Promise<QuizFullAuthoringResponse> {
  const response = await apiClient.get<QuizFullAuthoringResponse>(
    `/quizzes/${quizId}/full`,
  );
  return response.data;
}

export async function getQuizBuilderTrainingOutline(
  trainingId: number,
): Promise<QuizBuilderTrainingOutline> {
  const response = await apiClient.get<QuizBuilderTrainingOutline>(
    `/trainings/${trainingId}/full`,
  );
  return response.data;
}

export async function createManageableQuiz(
  request: QuizAuthoringRequest,
): Promise<QuizAuthoringResponse> {
  const response = await apiClient.post<QuizAuthoringResponse>(
    "/quizzes",
    request,
  );
  return response.data;
}

export async function updateManageableQuiz(
  quizId: number,
  request: QuizAuthoringRequest,
): Promise<QuizAuthoringResponse> {
  const response = await apiClient.put<QuizAuthoringResponse>(
    `/quizzes/${quizId}`,
    request,
  );
  return response.data;
}

export async function deleteManageableQuiz(quizId: number): Promise<void> {
  await apiClient.delete(`/quizzes/${quizId}`);
}

export async function createManageableQuestion(
  request: QuestionAuthoringRequest,
): Promise<QuestionAuthoringResponse> {
  const response = await apiClient.post<QuestionAuthoringResponse>(
    "/questions",
    request,
  );
  return response.data;
}

export async function updateManageableQuestion(
  questionId: number,
  request: QuestionAuthoringRequest,
): Promise<QuestionAuthoringResponse> {
  const response = await apiClient.put<QuestionAuthoringResponse>(
    `/questions/${questionId}`,
    request,
  );
  return response.data;
}

export async function deleteManageableQuestion(
  questionId: number,
): Promise<void> {
  await apiClient.delete(`/questions/${questionId}`);
}

export async function createManageableOption(
  request: AnswerOptionAuthoringRequest,
): Promise<AnswerOptionAuthoringResponse> {
  const response = await apiClient.post<AnswerOptionAuthoringResponse>(
    "/options",
    request,
  );
  return response.data;
}

export async function updateManageableOption(
  optionId: number,
  request: AnswerOptionAuthoringRequest,
): Promise<AnswerOptionAuthoringResponse> {
  const response = await apiClient.put<AnswerOptionAuthoringResponse>(
    `/options/${optionId}`,
    request,
  );
  return response.data;
}

export async function deleteManageableOption(optionId: number): Promise<void> {
  await apiClient.delete(`/options/${optionId}`);
}

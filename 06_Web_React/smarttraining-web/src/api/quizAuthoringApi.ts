import {
  deleteData,
  getData,
  postData,
  putData,
} from "./apiClient";
import type {
  AnswerOptionAuthoringRequest,
  AnswerOptionAuthoringResponse,
  QuestionAuthoringRequest,
  QuestionAuthoringResponse,
  QuizAuthoringRequest,
  QuizAuthoringResponse,
  QuizFullAuthoringResponse,
} from "../types/quizAuthoring";

export async function getManageableQuizzesByTraining(
  trainingId: number,
): Promise<QuizAuthoringResponse[]> {
  return getData<QuizAuthoringResponse[]>(
    `/quizzes/training/${trainingId}`,
  );
}

export async function getManageableQuizFull(
  quizId: number,
): Promise<QuizFullAuthoringResponse> {
  return getData<QuizFullAuthoringResponse>(
    `/quizzes/${quizId}/full`,
  );
}

export async function createManageableQuiz(
  request: QuizAuthoringRequest,
): Promise<QuizAuthoringResponse> {
  return postData<QuizAuthoringResponse, QuizAuthoringRequest>(
    "/quizzes",
    request,
  );
}

export async function updateManageableQuiz(
  quizId: number,
  request: QuizAuthoringRequest,
): Promise<QuizAuthoringResponse> {
  return putData<QuizAuthoringResponse, QuizAuthoringRequest>(
    `/quizzes/${quizId}`,
    request,
  );
}

export async function deleteManageableQuiz(
  quizId: number,
): Promise<void> {
  return deleteData<void>(`/quizzes/${quizId}`);
}

export async function createManageableQuestion(
  request: QuestionAuthoringRequest,
): Promise<QuestionAuthoringResponse> {
  return postData<QuestionAuthoringResponse, QuestionAuthoringRequest>(
    "/questions",
    request,
  );
}

export async function updateManageableQuestion(
  questionId: number,
  request: QuestionAuthoringRequest,
): Promise<QuestionAuthoringResponse> {
  return putData<QuestionAuthoringResponse, QuestionAuthoringRequest>(
    `/questions/${questionId}`,
    request,
  );
}

export async function deleteManageableQuestion(
  questionId: number,
): Promise<void> {
  return deleteData<void>(`/questions/${questionId}`);
}

export async function createManageableOption(
  request: AnswerOptionAuthoringRequest,
): Promise<AnswerOptionAuthoringResponse> {
  return postData<
    AnswerOptionAuthoringResponse,
    AnswerOptionAuthoringRequest
  >("/options", request);
}

export async function updateManageableOption(
  optionId: number,
  request: AnswerOptionAuthoringRequest,
): Promise<AnswerOptionAuthoringResponse> {
  return putData<
    AnswerOptionAuthoringResponse,
    AnswerOptionAuthoringRequest
  >(`/options/${optionId}`, request);
}

export async function deleteManageableOption(
  optionId: number,
): Promise<void> {
  return deleteData<void>(`/options/${optionId}`);
}

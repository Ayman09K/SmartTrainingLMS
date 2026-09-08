import {
  getData,
  postData,
} from "./apiClient";
import type {
  LearnerQuizResponse,
  LearnerStartAttemptRequest,
  QuizAttemptFullResponse,
  QuizAttemptResponse,
  SubmitAttemptRequest,
} from "../types/evaluation";

export async function getLearnerQuizzesByTraining(
  trainingId: number,
): Promise<LearnerQuizResponse[]> {
  return getData<LearnerQuizResponse[]>(
    `/quizzes/learner/me/training/${trainingId}`,
  );
}

export async function getLearnerQuiz(
  quizId: number,
): Promise<LearnerQuizResponse> {
  return getData<LearnerQuizResponse>(
    `/quizzes/learner/me/${quizId}`,
  );
}

export async function startLearnerQuizAttempt(
  quizId: number,
): Promise<QuizAttemptResponse> {
  const request: LearnerStartAttemptRequest = {
    quizId,
  };

  return postData<
    QuizAttemptResponse,
    LearnerStartAttemptRequest
  >(
    "/attempts/learner/me/start",
    request,
  );
}

export async function submitLearnerQuizAttempt(
  attemptId: number,
  request: SubmitAttemptRequest,
): Promise<QuizAttemptFullResponse> {
  return postData<
    QuizAttemptFullResponse,
    SubmitAttemptRequest
  >(
    `/attempts/learner/me/${attemptId}/submit`,
    request,
  );
}

export async function getMyQuizAttempts(): Promise<
  QuizAttemptResponse[]
> {
  return getData<QuizAttemptResponse[]>(
    "/attempts/learner/me",
  );
}

export async function getMyQuizAttemptsForQuiz(
  quizId: number,
): Promise<QuizAttemptResponse[]> {
  return getData<QuizAttemptResponse[]>(
    `/attempts/learner/me/quiz/${quizId}`,
  );
}

export async function getMyQuizAttempt(
  attemptId: number,
): Promise<QuizAttemptFullResponse> {
  return getData<QuizAttemptFullResponse>(
    `/attempts/learner/me/${attemptId}`,
  );
}

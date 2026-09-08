import type { LearnerQuizResponse } from "../../../types/evaluation";
import type {
  LearnerTrainingContentResponse,
  LearnerTrainingLessonContent,
  LearnerTrainingModuleContent,
  LearnerTrainingResourceContent,
} from "../../../types/training";

export type CoursePlayerStepKind = "LESSON" | "RESOURCE" | "QUIZ";

export interface CoursePlayerStep {
  key: string;
  kind: CoursePlayerStepKind;
  moduleId: number | null;
  lessonId: number | null;
  resourceId: number | null;
  quizId: number | null;
  title: string;
  subtitle?: string;
  module: LearnerTrainingModuleContent | null;
  lesson: LearnerTrainingLessonContent | null;
  resource: LearnerTrainingResourceContent | null;
  quiz: LearnerQuizResponse | null;
}

function orderValue(value?: number | null): number {
  return Number.isFinite(value) ? Number(value) : Number.MAX_SAFE_INTEGER;
}

function byOrderThenId<T extends { id: number; orderIndex?: number | null }>(
  left: T,
  right: T,
): number {
  const order = orderValue(left.orderIndex) - orderValue(right.orderIndex);
  return order || left.id - right.id;
}

function byQuizTitleThenId(
  left: LearnerQuizResponse,
  right: LearnerQuizResponse,
): number {
  return (
    left.title.localeCompare(right.title, "fr", { sensitivity: "base" }) ||
    left.id - right.id
  );
}

function hasMeaningfulLessonContent(
  lesson: LearnerTrainingLessonContent,
): boolean {
  return [lesson.objective, lesson.description, lesson.content].some(
    (value) => Boolean(value?.trim()),
  );
}

function isTransparentScormWrapperLesson(
  lesson: LearnerTrainingLessonContent,
  resources: LearnerTrainingResourceContent[],
): boolean {
  return (
    !hasMeaningfulLessonContent(lesson) &&
    String(lesson.completionRule || "").toUpperCase() === "SCORM_COMPLETED" &&
    resources.some(
      (resource) =>
        String(resource.type || "").toUpperCase() === "SCORM",
    )
  );
}

export function buildCoursePlayerSteps(
  training: LearnerTrainingContentResponse,
  quizzes: LearnerQuizResponse[],
): CoursePlayerStep[] {
  const steps: CoursePlayerStep[] = [];
  const modules = [...training.modules].sort(byOrderThenId);
  const moduleIds = new Set(modules.map((module) => module.id));

  for (const module of modules) {
    const lessons = [...module.lessons].sort(byOrderThenId);

    for (const lesson of lessons) {
      const resources = [...lesson.resources]
        .filter((resource) => resource.active !== false)
        .sort(byOrderThenId);

      if (
        resources.length === 0 &&
        !isTransparentScormWrapperLesson(lesson, resources)
      ) {
        steps.push({
          key: `lesson:${lesson.id}`,
          kind: "LESSON",
          moduleId: module.id,
          lessonId: lesson.id,
          resourceId: null,
          quizId: null,
          title: lesson.title,
          subtitle: module.title,
          module,
          lesson,
          resource: null,
          quiz: null,
        });
      }

      for (const resource of resources) {
        steps.push({
          key: `resource:${resource.id}`,
          kind: "RESOURCE",
          moduleId: module.id,
          lessonId: lesson.id,
          resourceId: resource.id,
          quizId: null,
          title: resource.title,
          subtitle: lesson.title,
          module,
          lesson,
          resource,
          quiz: null,
        });
      }
    }

    const moduleQuizzes = quizzes
      .filter((quiz) => quiz.moduleId === module.id)
      .sort(byQuizTitleThenId);

    for (const quiz of moduleQuizzes) {
      steps.push({
        key: `quiz:${quiz.id}`,
        kind: "QUIZ",
        moduleId: module.id,
        lessonId: null,
        resourceId: null,
        quizId: quiz.id,
        title: quiz.title,
        subtitle: `Évaluation · ${module.title}`,
        module,
        lesson: null,
        resource: null,
        quiz,
      });
    }
  }

  const generalQuizzes = quizzes
    .filter((quiz) => !quiz.moduleId || !moduleIds.has(quiz.moduleId))
    .sort(byQuizTitleThenId);

  for (const quiz of generalQuizzes) {
    steps.push({
      key: `quiz:${quiz.id}`,
      kind: "QUIZ",
      moduleId: null,
      lessonId: null,
      resourceId: null,
      quizId: quiz.id,
      title: quiz.title,
      subtitle: "Évaluation de la formation",
      module: null,
      lesson: null,
      resource: null,
      quiz,
    });
  }

  return steps;
}

import {
  LearnerTrainingContent,
  LearnerTrainingLesson,
  LearnerTrainingModule,
  LearnerTrainingResource,
} from "../../types/learnerTraining";
import {
  MobileCoursePlayerPosition,
} from "./mobileCoursePlayerPositionStore";

export interface MobileCoursePlayerStep {
  key: string;
  module: LearnerTrainingModule;
  lesson: LearnerTrainingLesson;
  resource: LearnerTrainingResource | null;
}

function orderedValue(value?: number | null): number {
  return typeof value === "number"
    ? value
    : Number.MAX_SAFE_INTEGER;
}

function compareOrdered(
  left: { id: number; orderIndex?: number | null },
  right: { id: number; orderIndex?: number | null },
): number {
  const orderDelta =
    orderedValue(left.orderIndex) - orderedValue(right.orderIndex);

  if (orderDelta !== 0) {
    return orderDelta;
  }

  return left.id - right.id;
}

export function normalizeMobileCoursePlayerTraining(
  training: LearnerTrainingContent,
): LearnerTrainingContent {
  // PATCH16_A8C5T_RICH_PLAYER_RESILIENCE_V1
  // Runtime JSON can legally omit an empty nested collection.
  const modules = Array.isArray(training.modules)
    ? training.modules.filter(Boolean)
    : [];

  return {
    ...training,
    modules: [...modules]
      .sort(compareOrdered)
      .map((module) => {
        const lessons = Array.isArray(module.lessons)
          ? module.lessons.filter(Boolean)
          : [];

        return {
          ...module,
          lessons: [...lessons]
            .sort(compareOrdered)
            .map((lesson) => {
              const resources = Array.isArray(lesson.resources)
                ? lesson.resources.filter(Boolean)
                : [];

              return {
                ...lesson,
                resources: [...resources]
                  .filter((resource) => resource.active !== false)
                  .sort(compareOrdered),
              };
            }),
        };
      }),
  };
}

export function buildMobileCoursePlayerSteps(
  training: LearnerTrainingContent,
): MobileCoursePlayerStep[] {
  const steps: MobileCoursePlayerStep[] = [];

  for (const module of training.modules) {
    for (const lesson of module.lessons) {
      if (lesson.resources.length === 0) {
        steps.push({
          key: `lesson-${lesson.id}`,
          module,
          lesson,
          resource: null,
        });
        continue;
      }

      for (const resource of lesson.resources) {
        steps.push({
          key: `resource-${resource.id}`,
          module,
          lesson,
          resource,
        });
      }
    }
  }

  return steps;
}

export function findMobileCoursePlayerStepIndex(
  steps: MobileCoursePlayerStep[],
  position: MobileCoursePlayerPosition | null,
): number {
  if (steps.length === 0 || !position) {
    return 0;
  }

  if (position.resourceId) {
    const resourceIndex = steps.findIndex(
      (step) =>
        step.lesson.id === position.lessonId
        && step.resource?.id === position.resourceId,
    );

    if (resourceIndex >= 0) {
      return resourceIndex;
    }
  }

  const lessonIndex = steps.findIndex(
    (step) => step.lesson.id === position.lessonId,
  );

  return lessonIndex >= 0 ? lessonIndex : 0;
}

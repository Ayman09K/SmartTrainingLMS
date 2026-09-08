export type TrainingLevel = "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE";

export type TrainingStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type ResourceType = "TEXT" | "PDF_URL" | "VIDEO_URL" | "EXTERNAL_LINK";

export type Training = {
  id: number;
  trainerId: number;
  title: string;
  description: string | null;
  objectives: string | null;
  level: TrainingLevel;
  estimatedDurationHours: number | null;
  status: TrainingStatus;
  createdAt: string;
  updatedAt: string | null;
};

export type Resource = {
  id: number;
  lessonId: number;
  title: string;
  type: ResourceType;
  url: string | null;
  textContent: string | null;
  orderIndex: number;
};

export type FullLesson = {
  id: number;
  title: string;
  content: string | null;
  orderIndex: number;
  estimatedDurationMinutes: number | null;
  resources: Resource[];
};

export type FullModule = {
  id: number;
  title: string;
  description: string | null;
  orderIndex: number;
  lessons: FullLesson[];
};

export type FullTraining = {
  id: number;
  trainerId: number;
  title: string;
  description: string | null;
  objectives: string | null;
  level: TrainingLevel;
  estimatedDurationHours: number | null;
  status: TrainingStatus;
  createdAt: string;
  updatedAt: string | null;
  modules: FullModule[];
};
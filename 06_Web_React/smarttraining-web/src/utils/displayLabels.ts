import type { AuthUser, UserRole } from "../types/auth";

const labels: Record<string, string> = {
  PUBLISHED: "Publiée", DRAFT: "Brouillon", ARCHIVED: "Archivée",
  ACTIVE: "Active", INACTIVE: "Inactive", OPEN: "Ouverte",
  IN_PROGRESS: "En cours", RESOLVED: "Résolue", IGNORED: "Ignorée",
  NOT_STARTED: "Non commencée", COMPLETED: "Terminée", AT_RISK: "À risque",
  LOW: "Faible", MEDIUM: "Moyen", HIGH: "Élevé",
  PLANNED: "Planifiée", DONE: "Terminée", CANCELLED: "Annulée",
  DISMISSED: "Ignorée", APPRENANT: "Apprenant", FORMATEUR: "Formateur", ADMIN: "Administrateur",
  RULE_BASED: "Règles pédagogiques", AI_BASED: "Analyse intelligente", MANUAL: "Manuelle",
  LOW_PROGRESS: "Progression faible", LOW_SCORE: "Score faible", INACTIVITY: "Inactivité",
  AI_RISK: "Risque détecté", QUIZ_FAILURE: "Quiz non réussi", LOW_ACTIVITY: "Activité faible",
};

export function displayLabel(value?: string | null, fallback = "Non indiqué") {
  return value ? labels[value] ?? value.replaceAll("_", " ").toLowerCase() : fallback;
}

export function displayRole(role?: UserRole) { return displayLabel(role); }

export function displayName(user?: AuthUser | null) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  return name || user?.fullName || user?.name || user?.email || "Utilisateur";
}

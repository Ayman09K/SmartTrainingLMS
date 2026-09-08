import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const exactTitles: Record<string, string> = {
  "/login": "Connexion",
  "/register": "Inscription",
  "/unauthorized": "Acc\u00e8s refus\u00e9",

  "/admin": "Tableau de bord",
  "/admin/users": "Utilisateurs",
  "/admin/trainer-requests": "Demandes formateurs",
  "/admin/account-deletion-requests": "Demandes de suppression",
  "/admin/trainings": "Formations",
  "/admin/trainings/new": "Nouvelle formation",
  "/admin/assignments": "Affectations",
  "/admin/reviews": "Avis",
  "/admin/feedbacks": "Feedbacks",
  "/admin/alerts": "Alertes & risques",
  "/admin/statistics": "Statistiques / BI",
  "/admin/notifications": "Notifications",
  "/admin/account": "Mon compte",

  "/trainer": "Espace formateur",
  "/trainer/trainings": "Formations",
  "/trainer/trainings/new": "Nouvelle formation",
  "/trainer/content": "Contenus",
  "/trainer/uploads": "Ressources",
  "/trainer/learners": "Apprenants",
  "/trainer/feedbacks": "Feedbacks",
  "/trainer/alerts": "Alertes & risques",
  "/trainer/interventions": "Interventions",
  "/trainer/support-sessions": "S\u00e9ances",
  "/trainer/statistics": "Statistiques / BI",
  "/trainer/notifications": "Notifications",
  "/trainer/account": "Mon compte",

  "/learner": "Tableau de bord",
  "/learner/catalog": "Catalogue",
  "/learner/invitations": "Mes invitations",
  "/learner/trainings": "Mes apprentissages",
  "/learner/progress": "Progression",
  "/learner/quizzes": "Mes quiz",
  "/learner/feedbacks": "Mes avis et aide",
  "/learner/support-sessions": "Mes s\u00e9ances",
  "/learner/notifications": "Notifications",
  "/learner/account": "Mon compte",
};

function normalizePath(pathname: string) {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/, "");
}

function titleForPath(pathname: string) {
  const path = normalizePath(pathname);
  const exact = exactTitles[path];

  if (exact) {
    return exact;
  }

  if (/^\/admin\/trainings\/[^/]+\/edit$/.test(path)) {
    return "Modifier une formation";
  }

  if (/^\/admin\/trainings\/[^/]+\/content$/.test(path)) {
    return "Contenu de formation";
  }

  if (/^\/trainer\/trainings\/[^/]+\/edit$/.test(path)) {
    return "Modifier une formation";
  }

  if (/^\/trainer\/trainings\/[^/]+\/content$/.test(path)) {
    return "Contenu de formation";
  }

  if (/^\/trainer\/learners\/[^/]+$/.test(path)) {
    return "Suivi apprenant";
  }

  if (/^\/learner\/trainings\/[^/]+$/.test(path)) {
    return "Formation";
  }

  if (path.startsWith("/admin")) {
    return "Administration";
  }

  if (path.startsWith("/trainer")) {
    return "Espace formateur";
  }

  if (path.startsWith("/learner")) {
    return "Espace apprenant";
  }

  return "";
}

export function SmartTrainingDocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const pageTitle = titleForPath(pathname);

    document.title = pageTitle
      ? `SmartTraining \u2014 ${pageTitle}`
      : "SmartTraining";
  }, [pathname]);

  return null;
}
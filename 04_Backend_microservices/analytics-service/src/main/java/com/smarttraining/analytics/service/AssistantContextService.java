package com.smarttraining.analytics.service;

import com.smarttraining.analytics.dto.AssistantChatRequest;
import com.smarttraining.analytics.dto.LearnerProgressResponse;
import com.smarttraining.analytics.dto.RecommendationResponse;
import com.smarttraining.analytics.integration.TrainingAssistantContent;
import com.smarttraining.analytics.integration.TrainingAssistantContextClient;
import com.smarttraining.analytics.integration.TrainingAssistantSummary;
import com.smarttraining.analytics.security.AuthenticatedUser;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;

@Service
public class AssistantContextService {

    private static final int MAX_CONTEXT_CHARS = 14000;
    private static final int MAX_LESSON_CONTENT_CHARS = 6000;
    private static final int MAX_RESOURCE_TEXT_CHARS = 2200;

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile(
                "(?i)\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b"
            );

    private static final Pattern BEARER_PATTERN =
            Pattern.compile("(?i)Bearer\\s+[A-Za-z0-9._~+/=-]+");

    private final TrainingAssistantContextClient trainingClient;
    private final AnalyticsService analyticsService;
    private final LearningRecommendationService recommendationService;

    public AssistantContextService(
            TrainingAssistantContextClient trainingClient,
            AnalyticsService analyticsService,
            LearningRecommendationService recommendationService
    ) {
        this.trainingClient = trainingClient;
        this.analyticsService = analyticsService;
        this.recommendationService = recommendationService;
    }

    public String build(
            AssistantChatRequest request,
            AuthenticatedUser actor,
            String jwtToken
    ) {
        if (request.getLessonId() != null && request.getTrainingId() == null) {
            throw new IllegalArgumentException(
                    "Une leçon ne peut être contextualisée sans formation."
            );
        }

        StringBuilder context = new StringBuilder();
        appendPlatformKnowledge(context, actor.getRole());

        List<TrainingAssistantSummary> trainings =
                safeTrainings(actor, jwtToken);

        Map<Long, String> titleByTrainingId = new HashMap<>();
        for (TrainingAssistantSummary training : trainings) {
            if (training.getId() != null) {
                titleByTrainingId.put(
                        training.getId(),
                        safeText(training.getTitle())
                );
            }
        }

        if (request.getTrainingId() == null) {
            if ("APPRENANT".equals(actor.getRole())) {
                appendOverview(
                        context,
                        trainings,
                        actor.getUserId(),
                        titleByTrainingId
                );
            } else {
                appendStaffOverview(
                        context,
                        trainings,
                        actor.getRole()
                );
            }
        } else {
            appendTrainingContext(
                    context,
                    request,
                    actor,
                    jwtToken
            );
        }

        String result = redact(context.toString()).trim();

        if (result.length() > MAX_CONTEXT_CHARS) {
            result = result.substring(0, MAX_CONTEXT_CHARS)
                    + "\n[Contexte tronqué pour limiter les données transmises.]";
        }

        return result;
    }

    private List<TrainingAssistantSummary> safeTrainings(
            AuthenticatedUser actor,
            String jwtToken
    ) {
        try {
            if ("APPRENANT".equals(actor.getRole())) {
                return trainingClient.getMyTrainings(jwtToken);
            }

            if ("FORMATEUR".equals(actor.getRole())) {
                return trainingClient.getTrainerTrainings(
                        actor.getUserId(),
                        jwtToken
                );
            }

            if ("ADMIN".equals(actor.getRole())) {
                return trainingClient.getAdminTrainings(jwtToken);
            }

            return List.of();
        } catch (HttpClientErrorException.Forbidden exception) {
            throw new AccessDeniedException(
                    "Accès au contexte pédagogique interdit.",
                    exception
            );
        } catch (RuntimeException exception) {
            return List.of();
        }
    }

    private void appendPlatformKnowledge(
            StringBuilder context,
            String role
    ) {
        context.append("CONNAISSANCE OFFICIELLE SMARTTRAINING\n");
        context.append(
                "Règle : ne jamais inventer un menu, un bouton ou un chemin "
                + "qui n'est pas décrit ci-dessous.\n"
        );

        if ("APPRENANT".equals(role)) {
            context.append(
                    "- Web apprenant : Dashboard, Catalogue, Mes invitations, "
                    + "Mes formations, Progression & IA, Mes quiz, "
                    + "Mes avis & aide, Mes séances, Notifications.\n"
            );
            context.append(
                    "- Mobile apprenant : Accueil, Formations, Explorer, "
                    + "Activité, Compte.\n"
            );
            context.append(
                    "- Une formation autorisée peut être ouverte en détail puis "
                    + "lancée dans le lecteur de cours ; les quiz liés à la "
                    + "formation sont accessibles depuis les écrans "
                    + "d'apprentissage concernés.\n"
            );
            context.append(
                    "- Les certificats, parcours, recommandations, progression "
                    + "et séances existent dans l'espace apprenant lorsque "
                    + "l'utilisateur y a accès.\n"
            );
        } else if ("FORMATEUR".equals(role)) {
            context.append(
                    "- Web formateur : Dashboard, Formations, Parcours, "
                    + "Contenus, Uploads, Apprenants, Groupes, Feedbacks, "
                    + "Alertes, Interventions, Séances, Résultats & rapports, "
                    + "Statistiques, Notifications.\n"
            );
            context.append(
                    "- Mobile formateur : Accueil, Formations, Apprenants, "
                    + "Suivi, Plus. Dans Plus : Parcours de formation, "
                    + "Groupes / cohortes, Séances d'accompagnement, "
                    + "Interventions, Feedbacks apprenants, Avis sur mes "
                    + "formations, Notifications, Mon compte, Apparence.\n"
            );
            context.append(
                    "- Création Mobile formateur : ouvrir l'onglet Formations, "
                    + "puis le bouton Nouvelle formation. L'écran Nouvelle "
                    + "formation propose le mode manuel et l'import SCORM. "
                    + "Le mode manuel crée d'abord un brouillon ; les modules, "
                    + "leçons et ressources se gèrent ensuite dans Contenu de "
                    + "la formation.\n"
            );
            context.append(
                    "- Création Web formateur : ouvrir Formations puis Nouvelle "
                    + "formation. Deux choix sont disponibles : Créer "
                    + "manuellement ou Importer un SCORM. Le mode manuel garde "
                    + "l'éditeur de formation et crée un brouillon avant la "
                    + "gestion du contenu.\n"
            );
            context.append(
                    "- Import SCORM : sélectionner un package ZIP, laisser "
                    + "SmartTraining l'analyser, vérifier l'aperçu proposé, "
                    + "puis confirmer. SmartTraining crée un brouillon ; "
                    + "aucune publication n'est automatique.\n"
            );
            context.append(
                    "- Après création, le formateur peut gérer ses propres "
                    + "formations, leurs contenus, modules, leçons, ressources "
                    + "et quiz avec les écrans de gestion prévus.\n"
            );
        } else if ("ADMIN".equals(role)) {
            context.append(
                    "- Web administration : Console, Gestion des utilisateurs, "
                    + "Liste des utilisateurs, Rôle formateur, Suppressions de "
                    + "compte, Formations, Parcours, Catégories, Affectations, "
                    + "Groupes, Avis, Feedbacks, Alertes IA, "
                    + "Résultats & rapports, Statistiques, Notifications.\n"
            );
            context.append(
                    "- Mobile administration : Vue globale, Utilisateurs, "
                    + "Formations, Pilotage, Plus. Dans Plus : Parcours, "
                    + "Groupes, Catégories, Demandes formateur, Feedbacks, "
                    + "Suppressions, Notifications, Mon compte, Apparence.\n"
            );
            context.append(
                    "- L'administrateur peut gérer la gouvernance de la "
                    + "plateforme dans les limites des écrans et droits "
                    + "réellement disponibles.\n"
            );
        }

        context.append("\n");
    }

    private void appendStaffOverview(
            StringBuilder context,
            List<TrainingAssistantSummary> trainings,
            String role
    ) {
        context.append("CONTEXTE PROFESSIONNEL AUTORISÉ\n");

        if ("FORMATEUR".equals(role)) {
            context.append("- Formations gérées par le formateur :\n");
        } else {
            context.append("- Formations visibles par l'administration :\n");
        }

        if (trainings.isEmpty()) {
            context.append(
                    "  Aucune formation n'est disponible dans le contexte "
                    + "actuel.\n"
            );
            return;
        }

        trainings.stream()
                .limit(20)
                .forEach(training -> {
                    context.append("  - ")
                            .append(safeText(training.getTitle()));

                    if (hasText(training.getShortDescription())) {
                        context.append(" : ")
                                .append(
                                    limit(
                                        safeText(
                                            training.getShortDescription()
                                        ),
                                        500
                                    )
                                );
                    }

                    context.append("\n");
                });
    }

    private void appendOverview(
            StringBuilder context,
            List<TrainingAssistantSummary> trainings,
            Long userId,
            Map<Long, String> titleByTrainingId
    ) {
        context.append("SYNTHÈSE PERSONNALISÉE AUTORISÉE\n");

        if (trainings.isEmpty()) {
            context.append(
                "- Les formations personnelles ne sont pas disponibles "
                + "dans le contexte actuel.\n"
            );
        } else {
            context.append("- Formations accessibles :\n");

            trainings.stream()
                    .limit(12)
                    .forEach(training -> {
                        context.append("  • ")
                                .append(safeText(training.getTitle()));

                        if (training.getProgressPercentage() != null) {
                            context.append(" — progression ")
                                    .append(
                                        Math.round(
                                            training.getProgressPercentage()
                                        )
                                    )
                                    .append(" %");
                        }

                        if (hasText(training.getEnrollmentStatus())) {
                            context.append(" — statut ")
                                    .append(
                                        safeText(
                                            training.getEnrollmentStatus()
                                        )
                                    );
                        }

                        if (training.getDueAt() != null) {
                            context.append(" — échéance ")
                                    .append(training.getDueAt());
                        }

                        context.append("\n");
                    });
        }

        List<LearnerProgressResponse> progress =
                analyticsService.getProgressByLearner(userId);

        if (!progress.isEmpty()) {
            context.append("- Progression analytique :\n");

            progress.stream()
                    .limit(12)
                    .forEach(item -> {
                        String title = titleByTrainingId.get(
                                item.getTrainingId()
                        );

                        context.append("  • ")
                                .append(
                                    hasText(title)
                                        ? title
                                        : "Formation suivie"
                                );

                        if (item.getProgressPercentage() != null) {
                            context.append(" — ")
                                    .append(item.getProgressPercentage())
                                    .append(" %");
                        }

                        if (item.getAverageScore() != null) {
                            context.append(" — score moyen ")
                                    .append(item.getAverageScore())
                                    .append(" %");
                        }

                        if (item.getStatus() != null) {
                            context.append(" — ")
                                    .append(item.getStatus().name());
                        }

                        if (item.getLastActivityAt() != null) {
                            context.append(" — dernière activité ")
                                    .append(item.getLastActivityAt());
                        }

                        context.append("\n");
                    });
        }

        List<RecommendationResponse> recommendations =
                recommendationService
                        .getRecommendationsByLearner(userId)
                        .stream()
                        .filter(item ->
                            item.getStatus() == null
                            || !"COMPLETED".equals(item.getStatus().name())
                        )
                        .filter(item ->
                            item.getStatus() == null
                            || !"DISMISSED".equals(item.getStatus().name())
                        )
                        .limit(6)
                        .toList();

        if (!recommendations.isEmpty()) {
            context.append("- Recommandations actuellement visibles :\n");

            recommendations.forEach(item -> {
                context.append("  • ")
                        .append(safeText(item.getTitle()));

                if (hasText(item.getDescription())) {
                    context.append(" : ")
                            .append(
                                limit(
                                    safeText(item.getDescription()),
                                    700
                                )
                            );
                }

                context.append("\n");
            });
        }
    }

    private void appendTrainingContext(
            StringBuilder context,
            AssistantChatRequest request,
            AuthenticatedUser actor,
            String jwtToken
    ) {
        TrainingAssistantContent training;

        try {
            if ("APPRENANT".equals(actor.getRole())) {
                training = trainingClient.getMyTrainingContent(
                        request.getTrainingId(),
                        jwtToken
                );
            } else {
                training = trainingClient.getStaffTrainingContent(
                        request.getTrainingId(),
                        jwtToken
                );
            }
        } catch (HttpClientErrorException.Forbidden exception) {
            throw new AccessDeniedException(
                    "Vous n'avez pas accès à cette formation.",
                    exception
            );
        }

        context.append("FORMATION AUTORISÉE\n");
        appendField(context, "Titre", training.getTitle());
        appendField(
                context,
                "Description courte",
                training.getShortDescription()
        );
        appendField(context, "Description", training.getDescription());
        appendField(context, "Objectifs", training.getObjectives());
        appendField(context, "Prérequis", training.getPrerequisites());
        appendField(
                context,
                "Public cible",
                training.getTargetAudience()
        );
        appendField(context, "Catégorie", training.getCategory());
        appendField(context, "Langue", training.getLanguage());
        appendField(context, "Niveau", training.getLevel());

        if (training.getEstimatedDurationHours() != null) {
            context.append("Durée estimée : ")
                    .append(training.getEstimatedDurationHours())
                    .append(" h\n");
        }

        if (training.getProgressPercentage() != null) {
            context.append("Progression : ")
                    .append(
                        Math.round(training.getProgressPercentage())
                    )
                    .append(" %\n");
        }

        if (training.getDueAt() != null) {
            context.append("Échéance : ")
                    .append(training.getDueAt())
                    .append("\n");
        }

        if (request.getLessonId() != null) {
            TrainingAssistantContent.LessonContent lesson =
                    findLesson(
                        training,
                        request.getLessonId()
                    );

            if (lesson == null) {
                throw new AccessDeniedException(
                        "Cette leçon n'est pas accessible "
                        + "dans la formation autorisée."
                );
            }

            context.append("\nLEÇON SÉLECTIONNÉE\n");
            appendField(context, "Titre", lesson.getTitle());
            appendField(
                context,
                "Description",
                lesson.getDescription()
            );
            appendField(context, "Objectif", lesson.getObjective());

            if (hasText(lesson.getContent())) {
                context.append("Contenu : ")
                        .append(
                            limit(
                                safeText(lesson.getContent()),
                                MAX_LESSON_CONTENT_CHARS
                            )
                        )
                        .append("\n");
            }

            if (
                lesson.getResources() != null
                && !lesson.getResources().isEmpty()
            ) {
                context.append("Ressources liées à la leçon :\n");

                lesson.getResources()
                        .stream()
                        .filter(item ->
                            !Boolean.FALSE.equals(item.getActive())
                        )
                        .limit(8)
                        .forEach(resource -> {
                            context.append("  • ")
                                    .append(
                                        safeText(resource.getTitle())
                                    );

                            if (hasText(resource.getType())) {
                                context.append(" [")
                                        .append(
                                            safeText(resource.getType())
                                        )
                                        .append("]");
                            }

                            if (hasText(resource.getDescription())) {
                                context.append(" — ")
                                        .append(
                                            limit(
                                                safeText(
                                                    resource
                                                        .getDescription()
                                                ),
                                                500
                                            )
                                        );
                            }

                            if (hasText(resource.getTextContent())) {
                                context.append("\n    Extrait : ")
                                        .append(
                                            limit(
                                                safeText(
                                                    resource
                                                        .getTextContent()
                                                ),
                                                MAX_RESOURCE_TEXT_CHARS
                                            )
                                        );
                            }

                            context.append("\n");
                        });
            }

            return;
        }

        context.append("\nSTRUCTURE DE LA FORMATION\n");

        if (training.getModules() == null) {
            return;
        }

        training.getModules()
                .stream()
                .limit(20)
                .forEach(module -> {
                    context.append("- Module : ")
                            .append(safeText(module.getTitle()));

                    if (hasText(module.getDescription())) {
                        context.append(" — ")
                                .append(
                                    limit(
                                        safeText(
                                            module.getDescription()
                                        ),
                                        500
                                    )
                                );
                    }

                    context.append("\n");

                    if (module.getLessons() == null) {
                        return;
                    }

                    module.getLessons()
                            .stream()
                            .limit(30)
                            .forEach(lesson -> {
                                context.append("    • Leçon : ")
                                        .append(
                                            safeText(
                                                lesson.getTitle()
                                            )
                                        );

                                if (hasText(lesson.getObjective())) {
                                    context.append(" — objectif : ")
                                            .append(
                                                limit(
                                                    safeText(
                                                        lesson
                                                            .getObjective()
                                                    ),
                                                    350
                                                )
                                            );
                                }

                                context.append("\n");
                            });
                });
    }

    private TrainingAssistantContent.LessonContent findLesson(
            TrainingAssistantContent training,
            Long lessonId
    ) {
        if (training.getModules() == null) {
            return null;
        }

        for (TrainingAssistantContent.ModuleContent module
                : training.getModules()) {
            if (module.getLessons() == null) {
                continue;
            }

            for (TrainingAssistantContent.LessonContent lesson
                    : module.getLessons()) {
                if (
                    lesson.getId() != null
                    && lesson.getId().equals(lessonId)
                ) {
                    return lesson;
                }
            }
        }

        return null;
    }

    private void appendField(
            StringBuilder context,
            String label,
            String value
    ) {
        if (hasText(value)) {
            context.append(label)
                    .append(" : ")
                    .append(
                        limit(
                            safeText(value),
                            1800
                        )
                    )
                    .append("\n");
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String safeText(String value) {
        if (!hasText(value)) {
            return "";
        }

        return value
                .replace('\u0000', ' ')
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String limit(String value, int max) {
        if (value == null || value.length() <= max) {
            return value == null ? "" : value;
        }

        return value.substring(0, max) + "…";
    }

    private String redact(String value) {
        String result = EMAIL_PATTERN
                .matcher(value)
                .replaceAll("[email masqué]");

        result = BEARER_PATTERN
                .matcher(result)
                .replaceAll("Bearer [secret masqué]");

        return result;
    }
}

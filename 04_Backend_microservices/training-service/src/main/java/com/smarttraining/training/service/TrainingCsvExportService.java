package com.smarttraining.training.service;

import com.smarttraining.training.client.AnalyticsReportingInternalClient;
import com.smarttraining.training.client.AuthDirectoryInternalClient;
import com.smarttraining.training.client.InternalLearnerDirectoryEntry;
import com.smarttraining.training.client.InternalTrainingLearnerMetrics;
import com.smarttraining.training.dto.LearningPathProgressResponse;
import com.smarttraining.training.dto.LearningPathTrainingProgressResponse;
import com.smarttraining.training.entity.Enrollment;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.repository.EnrollmentRepository;
import com.smarttraining.training.repository.TrainingRepository;
import com.smarttraining.training.security.TrainingOwnershipService;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrainingCsvExportService {

    private static final DateTimeFormatter DATE_TIME =
            DateTimeFormatter.ofPattern(
                    "dd/MM/yyyy HH:mm",
                    Locale.FRANCE
            );

    private final TrainingRepository trainingRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final TrainingOwnershipService ownershipService;
    private final AuthDirectoryInternalClient authDirectoryClient;
    private final AnalyticsReportingInternalClient analyticsClient;
    private final LearningPathProgressService learningPathProgressService;

    public TrainingCsvExportService(
            TrainingRepository trainingRepository,
            EnrollmentRepository enrollmentRepository,
            TrainingOwnershipService ownershipService,
            AuthDirectoryInternalClient authDirectoryClient,
            AnalyticsReportingInternalClient analyticsClient,
            LearningPathProgressService learningPathProgressService
    ) {
        this.trainingRepository = trainingRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.ownershipService = ownershipService;
        this.authDirectoryClient = authDirectoryClient;
        this.analyticsClient = analyticsClient;
        this.learningPathProgressService = learningPathProgressService;
    }

    @Transactional(readOnly = true)
    public byte[] exportTrainingLearners(Long trainingId) {
        if (trainingId == null || trainingId <= 0) {
            throw new IllegalArgumentException(
                    "Identifiant formation invalide."
            );
        }

        Training training =
                trainingRepository
                        .findById(trainingId)
                        .orElseThrow(
                            () -> new IllegalArgumentException(
                                "Formation introuvable."
                            )
                        );

        ownershipService.assertCanManageTraining(
                training
        );

        List<Enrollment> enrollments =
                enrollmentRepository
                        .findByTrainingIdWithTraining(
                                trainingId
                        );

        List<Long> learnerIds =
                enrollments.stream()
                        .map(Enrollment::getLearnerId)
                        .filter(id -> id != null && id > 0)
                        .distinct()
                        .toList();

        Map<Long, InternalLearnerDirectoryEntry> identities =
                identityMap(
                    authDirectoryClient
                        .resolveLearners(learnerIds)
                );

        Map<Long, InternalTrainingLearnerMetrics> metrics =
                metricsMap(
                    analyticsClient.resolve(
                        trainingId,
                        learnerIds
                    )
                );

        StringBuilder csv =
                new StringBuilder();

        csv.append(
            "Nom;Email;Formation;Statut;Progression;"
            + "Score moyen;Risque;Derni\u00e8re activit\u00e9;"
            + "Inscription;Compl\u00e9tion;\u00c9ch\u00e9ance\r\n"
        );

        for (Enrollment enrollment : enrollments) {
            InternalLearnerDirectoryEntry identity =
                    identities.get(
                        enrollment.getLearnerId()
                    );

            InternalTrainingLearnerMetrics analytics =
                    metrics.get(
                        enrollment.getLearnerId()
                    );

            appendRow(
                    csv,
                    identity == null
                            ? "Identit\u00e9 indisponible"
                            : identity.getFullName(),
                    identity == null
                            ? ""
                            : identity.getEmail(),
                    training.getTitle(),
                    enrollmentStatus(enrollment),
                    formatProgress(
                        enrollment.getProgressPercentage()
                    ),
                    analytics == null
                            ? ""
                            : formatInteger(
                                analytics.getAverageScore()
                            ),
                    analytics == null
                            ? ""
                            : riskLabel(
                                analytics.getRiskLevel(),
                                analytics.getDataStatus()
                            ),
                    analytics == null
                            ? ""
                            : formatDate(
                                analytics.getLastActivityAt()
                            ),
                    formatDate(
                        enrollment.getEnrolledAt()
                    ),
                    formatDate(
                        enrollment.getCompletedAt()
                    ),
                    formatDate(
                        enrollment.getDueAt()
                    )
            );
        }

        return (
            "\uFEFF" + csv
        ).getBytes(
            StandardCharsets.UTF_8
        );
    }

    @Transactional(readOnly = true)
    public byte[] exportLearningPathLearners(Long pathId) {
        List<LearningPathProgressResponse> progress =
                managedLearningPathProgress(pathId);

        Map<Long, InternalLearnerDirectoryEntry> identities =
                learningPathIdentityMap(progress);

        StringBuilder csv = new StringBuilder();

        csv.append(
            "Nom;Email;Parcours;Statut;Source affectation;"
            + "Affectation;Echeance;Etapes;Etapes obligatoires;"
            + "Etapes inscrites;Etapes terminees;Obligatoires terminees;"
            + "Progression globale;Completion;Prochaine formation\r\n"
        );

        for (LearningPathProgressResponse item : progress) {
            InternalLearnerDirectoryEntry identity =
                    identities.get(item.getLearnerId());

            appendRow(
                    csv,
                    identity == null
                            ? "Identite indisponible"
                            : identity.getFullName(),
                    identity == null
                            ? ""
                            : identity.getEmail(),
                    item.getPathTitle(),
                    learningPathStatus(item),
                    learningPathAssignmentSource(item),
                    formatDate(item.getAssignedAt()),
                    formatDate(item.getPathDueAt()),
                    Integer.toString(item.getTotalSteps()),
                    Integer.toString(item.getRequiredSteps()),
                    Integer.toString(item.getEnrolledSteps()),
                    Integer.toString(item.getCompletedSteps()),
                    Integer.toString(item.getCompletedRequiredSteps()),
                    formatProgress(
                        item.getOverallProgressPercentage()
                    ),
                    formatProgress(
                        item.getCompletionProgressPercentage()
                    ),
                    nextTrainingLabel(item)
            );
        }

        return (
            "\uFEFF" + csv
        ).getBytes(
            StandardCharsets.UTF_8
        );
    }

    @Transactional(readOnly = true)
    public byte[] exportLearningPathLearnersDetail(Long pathId) {
        List<LearningPathProgressResponse> progress =
                managedLearningPathProgress(pathId);

        Map<Long, InternalLearnerDirectoryEntry> identities =
                learningPathIdentityMap(progress);

        StringBuilder csv = new StringBuilder();

        csv.append(
            "Nom;Email;Parcours;Source affectation;Echeance parcours;"
            + "Position;Formation;Obligatoire;Formation manquante;"
            + "Inscrit;Statut formation;Progression;Completion formation;"
            + "Echeance formation\r\n"
        );

        for (LearningPathProgressResponse item : progress) {
            InternalLearnerDirectoryEntry identity =
                    identities.get(item.getLearnerId());

            for (
                LearningPathTrainingProgressResponse training
                    : item.getTrainings()
            ) {
                appendRow(
                        csv,
                        identity == null
                                ? "Identite indisponible"
                                : identity.getFullName(),
                        identity == null
                                ? ""
                                : identity.getEmail(),
                        item.getPathTitle(),
                        learningPathAssignmentSource(item),
                        formatDate(item.getPathDueAt()),
                        training.getPosition() == null
                                ? ""
                                : Integer.toString(
                                    training.getPosition()
                                ),
                        training.getTrainingTitle() == null
                                ? "Formation indisponible"
                                : training.getTrainingTitle(),
                        training.isRequired()
                                ? "Oui"
                                : "Non",
                        training.isTrainingMissing()
                                ? "Oui"
                                : "Non",
                        training.isEnrolled()
                                ? "Oui"
                                : "Non",
                        learningPathTrainingStatus(training),
                        formatProgress(
                            training.getProgressPercentage()
                        ),
                        formatDate(training.getCompletedAt()),
                        formatDate(training.getDueAt())
                );
            }
        }

        return (
            "\uFEFF" + csv
        ).getBytes(
            StandardCharsets.UTF_8
        );
    }

    private List<LearningPathProgressResponse>
            managedLearningPathProgress(Long pathId) {
        if (pathId == null || pathId <= 0) {
            throw new IllegalArgumentException(
                    "Identifiant parcours invalide."
            );
        }

        return learningPathProgressService
                .getManagedLearnerProgress(pathId);
    }

    private Map<Long, InternalLearnerDirectoryEntry>
            learningPathIdentityMap(
                    List<LearningPathProgressResponse> progress
            ) {
        List<Long> learnerIds = progress.stream()
                .map(
                    LearningPathProgressResponse::getLearnerId
                )
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();

        return identityMap(
                authDirectoryClient.resolveLearners(
                        learnerIds
                )
        );
    }

    private String learningPathStatus(
            LearningPathProgressResponse progress
    ) {
        if (progress.isCompleted()) {
            return "Termine";
        }

        if (
            progress.getOverallProgressPercentage()
                > 0.0
        ) {
            return "En cours";
        }

        return "A commencer";
    }

    private String learningPathAssignmentSource(
            LearningPathProgressResponse progress
    ) {
        if (progress.getAssignmentSource() == null) {
            return "Affectation";
        }

        return switch (
            progress.getAssignmentSource()
        ) {
            case DIRECT -> "Individuelle";
            case GROUP -> "Groupe";
        };
    }

    private String nextTrainingLabel(
            LearningPathProgressResponse progress
    ) {
        if (progress.isCompleted()) {
            return "Parcours termine";
        }

        if (progress.getNextTrainingId() == null) {
            return "";
        }

        return progress.getTrainings().stream()
                .filter(item ->
                        item.getTrainingId() != null
                        && item.getTrainingId().equals(
                                progress
                                    .getNextTrainingId()
                        )
                )
                .map(
                    LearningPathTrainingProgressResponse
                        ::getTrainingTitle
                )
                .filter(title ->
                        title != null
                        && !title.isBlank()
                )
                .findFirst()
                .orElse("Formation suivante");
    }

    private String learningPathTrainingStatus(
            LearningPathTrainingProgressResponse training
    ) {
        if (training.isTrainingMissing()) {
            return "Formation indisponible";
        }

        if (!training.isEnrolled()) {
            return "Non inscrite";
        }

        if (training.getEnrollmentStatus() == null) {
            return "Inscrite";
        }

        return switch (
            training.getEnrollmentStatus()
        ) {
            case ACTIVE -> "En cours";
            case COMPLETED -> "Terminee";
            case CANCELLED -> "Annulee";
        };
    }
    private Map<Long, InternalLearnerDirectoryEntry> identityMap(
            List<InternalLearnerDirectoryEntry> items
    ) {
        Map<Long, InternalLearnerDirectoryEntry> map =
                new LinkedHashMap<>();

        if (items != null) {
            items.forEach(item -> {
                if (item != null
                        && item.getLearnerId() != null) {
                    map.put(
                        item.getLearnerId(),
                        item
                    );
                }
            });
        }

        return map;
    }

    private Map<Long, InternalTrainingLearnerMetrics> metricsMap(
            List<InternalTrainingLearnerMetrics> items
    ) {
        Map<Long, InternalTrainingLearnerMetrics> map =
                new LinkedHashMap<>();

        if (items != null) {
            items.forEach(item -> {
                if (item != null
                        && item.getLearnerId() != null) {
                    map.put(
                        item.getLearnerId(),
                        item
                    );
                }
            });
        }

        return map;
    }

    private void appendRow(
            StringBuilder csv,
            String... values
    ) {
        for (int index = 0; index < values.length; index++) {
            if (index > 0) {
                csv.append(';');
            }

            csv.append(
                csvCell(values[index])
            );
        }

        csv.append("\r\n");
    }

    private String csvCell(String value) {
        String safe =
                value == null
                ? ""
                : value;

        safe = neutralizeFormula(safe);

        boolean quote =
                safe.indexOf(';') >= 0
                || safe.indexOf('"') >= 0
                || safe.indexOf('\r') >= 0
                || safe.indexOf('\n') >= 0;

        safe = safe.replace(
            "\"",
            "\"\""
        );

        return quote
                ? "\"" + safe + "\""
                : safe;
    }

    private String neutralizeFormula(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }

        char first = value.charAt(0);

        if (first == '='
                || first == '+'
                || first == '-'
                || first == '@'
                || first == '\t'
                || first == '\r') {
            return "'" + value;
        }

        return value;
    }

    private String enrollmentStatus(
            Enrollment enrollment
    ) {
        if (enrollment.getStatus() == null) {
            return "";
        }

        return switch (
            enrollment.getStatus()
        ) {
            case ACTIVE -> "En cours";
            case COMPLETED -> "Termin\u00e9e";
            case CANCELLED -> "Annul\u00e9e";
        };
    }

    private String riskLabel(
            String riskLevel,
            String dataStatus
    ) {
        if ("INSUFFICIENT".equals(dataStatus)
                || "DATA_INSUFFICIENT".equals(riskLevel)) {
            return "Donn\u00e9es insuffisantes";
        }

        if (riskLevel == null || riskLevel.isBlank()) {
            return "";
        }

        return switch (riskLevel) {
            case "LOW" -> "Faible";
            case "MEDIUM" -> "Moyen";
            case "HIGH" -> "\u00c9lev\u00e9";
            default -> riskLevel;
        };
    }

    private String formatProgress(Double value) {
        if (value == null) {
            return "";
        }

        double bounded =
                Math.max(
                    0.0,
                    Math.min(100.0, value)
                );

        if (Math.rint(bounded) == bounded) {
            return Long.toString(
                Math.round(bounded)
            );
        }

        return String.format(
            Locale.ROOT,
            "%.2f",
            bounded
        ).replace('.', ',');
    }

    private String formatInteger(Integer value) {
        return value == null
                ? ""
                : Integer.toString(value);
    }

    private String formatDate(LocalDateTime value) {
        return value == null
                ? ""
                : DATE_TIME.format(value);
    }
}
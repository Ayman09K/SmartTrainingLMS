package com.smarttraining.training.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarttraining.training.client.TrustedAnalyticsEventRequest;
import com.smarttraining.training.config.UploadProperties;
import com.smarttraining.training.dto.scorm.*;
import com.smarttraining.training.entity.*;
import com.smarttraining.training.enums.EnrollmentStatus;
import com.smarttraining.training.enums.ResourceType;
import com.smarttraining.training.repository.*;
import com.smarttraining.training.scorm.integration.ScormAnalyticsEvent;
import com.smarttraining.training.security.AuthenticatedUserService;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScormRuntimeService {

    private static final int MAX_RUNTIME_ELEMENTS = 600;
    private static final int MAX_KEY_LENGTH = 255;
    private static final int MAX_VALUE_LENGTH = 65535;

    private static final Pattern INTERACTION_INDEX =
        Pattern.compile("^cmi\\.interactions\\.(\\d+)\\..+$");

    private static final Pattern OBJECTIVE_INDEX =
        Pattern.compile("^cmi\\.objectives\\.(\\d+)\\..+$");

    private final ScormAttemptRepository attemptRepository;
    private final ScormLaunchSessionRepository sessionRepository;
    private final ScormRuntimeValueRepository runtimeValueRepository;
    private final ScormRuntimeCommitRepository commitRepository;
    private final ScormInteractionRepository interactionRepository;
    private final ScormObjectiveRepository objectiveRepository;
    private final PedagogicalResourceRepository resourceRepository;
    private final ScormPackageRepository packageRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonRepository lessonRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final UploadProperties uploadProperties;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    public ScormRuntimeService(
        ScormAttemptRepository attemptRepository,
        ScormLaunchSessionRepository sessionRepository,
        ScormRuntimeValueRepository runtimeValueRepository,
        ScormRuntimeCommitRepository commitRepository,
        ScormInteractionRepository interactionRepository,
        ScormObjectiveRepository objectiveRepository,
        PedagogicalResourceRepository resourceRepository,
        ScormPackageRepository packageRepository,
        EnrollmentRepository enrollmentRepository,
        LessonRepository lessonRepository,
        AuthenticatedUserService authenticatedUserService,
        UploadProperties uploadProperties,
        ApplicationEventPublisher eventPublisher,
        ObjectMapper objectMapper
    ) {
        this.attemptRepository = attemptRepository;
        this.sessionRepository = sessionRepository;
        this.runtimeValueRepository = runtimeValueRepository;
        this.commitRepository = commitRepository;
        this.interactionRepository = interactionRepository;
        this.objectiveRepository = objectiveRepository;
        this.resourceRepository = resourceRepository;
        this.packageRepository = packageRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.lessonRepository = lessonRepository;
        this.authenticatedUserService = authenticatedUserService;
        this.uploadProperties = uploadProperties;
        this.eventPublisher = eventPublisher;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ScormLaunchResponse launch(Long resourceId) {
        requireLearner();

        Long learnerId = authenticatedUserService.getUserId();

        PedagogicalResource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new IllegalArgumentException("Ressource SCORM introuvable."));

        if (resource.getType() == null
            || resource.getType().normalized() != ResourceType.SCORM
            || Boolean.FALSE.equals(resource.getActive())) {
            throw new IllegalArgumentException("Cette ressource n'est pas un package SCORM actif.");
        }

        if (resource.getScormPackageId() == null) {
            throw new IllegalArgumentException("La ressource SCORM n'est liee a aucun package.");
        }

        ScormPackage scormPackage = packageRepository.findById(resource.getScormPackageId())
            .orElseThrow(() -> new IllegalArgumentException("Package SCORM introuvable."));

        if (Boolean.FALSE.equals(scormPackage.getActive())) {
            throw new IllegalArgumentException("Package SCORM inactif.");
        }

        Long lessonId = resource.getLesson().getId();
        Long moduleId = resource.getLesson().getModule().getId();
        Long trainingId = resource.getLesson().getModule().getTraining().getId();

        Enrollment enrollment = enrollmentRepository
            .findByLearnerIdAndTrainingId(learnerId, trainingId)
            .orElseThrow(() -> new AccessDeniedException(
                "L'apprenant n'est pas inscrit a cette formation."
            ));

        if (enrollment.getStatus() == EnrollmentStatus.CANCELLED) {
            throw new AccessDeniedException("Cette inscription est annulee.");
        }

        String detectedVersion = detectVersion(scormPackage);

        Optional<ScormAttempt> latest =
            attemptRepository.findFirstByLearnerIdAndResourceIdOrderByAttemptNumberDesc(
                learnerId,
                resourceId
            );

        boolean resumed = latest.isPresent() && !latest.get().isTerminal();

        ScormAttempt attempt;
        if (resumed) {
            attempt = latest.get();
            attempt.setEntryMode("resume");
            attempt.setLastActivityAt(LocalDateTime.now());
        } else {
            attempt = new ScormAttempt();
            attempt.setLearnerId(learnerId);
            attempt.setTrainingId(trainingId);
            attempt.setModuleId(moduleId);
            attempt.setLessonId(lessonId);
            attempt.setResourceId(resourceId);
            attempt.setScormPackageId(scormPackage.getId());
            attempt.setAttemptNumber(
                Math.toIntExact(
                    attemptRepository.countByLearnerIdAndResourceId(
                        learnerId,
                        resourceId
                    ) + 1
                )
            );
            attempt.setScormVersion(detectedVersion);
            attempt.setStatus("IN_PROGRESS");
            attempt.setEntryMode("ab-initio");
            attempt.setStartedAt(LocalDateTime.now());
            attempt.setLastActivityAt(LocalDateTime.now());
        }

        attempt.setScormVersion(detectedVersion);
        attempt = attemptRepository.save(attempt);

        ScormLaunchSession session = new ScormLaunchSession();
        session.setPublicId(randomPublicSessionId());
        session.setAttemptId(attempt.getId());
        session.setActive(true);
        session.setCreatedAt(LocalDateTime.now());
        session.setLastSeenAt(LocalDateTime.now());
        session.setExpiresAt(LocalDateTime.now().plusHours(8));
        sessionRepository.save(session);

        publishScormEvent(
            attempt,
            "SCORM_STARTED",
            "scorm:attempt:" + attempt.getId() + ":started",
            "Lancement du runtime SCORM.",
            scoreAsPercent(attempt)
        );

        return new ScormLaunchResponse(
            attempt.getId(),
            attempt.getAttemptNumber(),
            attempt.getScormVersion(),
            attempt.getStatus(),
            resumed,
            "/api/scorm/runtime/public/" + session.getPublicId() + "/player"
        );
    }

    @Transactional
    public ScormBootstrapResponse bootstrap(String publicId) {
        SessionContext context = requireSession(publicId);
        ScormAttempt attempt = context.attempt();
        ScormPackage scormPackage = context.scormPackage();

        Map<String, String> values = runtimeValueRepository
            .findByAttemptIdOrderByIdAsc(attempt.getId())
            .stream()
            .collect(Collectors.toMap(
                ScormRuntimeValue::getElementKey,
                value -> value.getElementValue() == null ? "" : value.getElementValue(),
                (left, right) -> right,
                LinkedHashMap::new
            ));

        return new ScormBootstrapResponse(
            attempt.getId(),
            attempt.getAttemptNumber(),
            attempt.getScormVersion(),
            attempt.getStatus(),
            String.valueOf(attempt.getLearnerId()),
            "Apprenant " + attempt.getLearnerId(),
            attempt.getEntryMode(),
            launchPathWithinPackage(scormPackage),
            attempt.getTotalTimeMs() == null ? 0L : attempt.getTotalTimeMs(),
            values
        );
    }

    @Transactional
    public String buildPlayerHtml(String publicId) {
        ScormBootstrapResponse bootstrap = bootstrap(publicId);

        try {
            String bootstrapJson = objectMapper.writeValueAsString(bootstrap);

            String html = """
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SmartTraining SCORM Player</title>
  <style>
    html,body,#sco{margin:0;width:100%;height:100%;border:0;background:#fff}
    body{overflow:hidden}
  </style>
</head>
<body>
  <iframe id="sco" title="Contenu SCORM" allow="fullscreen"></iframe>
  <script>
  (() => {
    "use strict";
    const boot = __BOOTSTRAP__;
    const state = Object.assign({}, boot.values || {});
    let lastError = "0";

    const currentBase = window.location.pathname.replace(/\\/player$/, "");
    const contentPath = boot.launchPathWithinPackage
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");

    function boolTrue(){ return "true"; }
    function getValue(key){
      if(key === "cmi.core.student_id" || key === "cmi.learner_id") return boot.learnerId || "";
      if(key === "cmi.core.student_name" || key === "cmi.learner_name") return boot.learnerName || "";
      if(key === "cmi.core.entry" || key === "cmi.entry") return boot.entryMode || "";
      if(key === "cmi.core.total_time") return format12(boot.totalTimeMs || 0);
      if(key === "cmi.total_time") return format2004(boot.totalTimeMs || 0);
      return Object.prototype.hasOwnProperty.call(state,key) ? String(state[key] ?? "") : "";
    }
    function setValue(key,value){
      if(typeof key !== "string" || !key.startsWith("cmi.")){ lastError="401"; return "false"; }
      state[key] = String(value ?? "");
      lastError = "0";
      return "true";
    }
    function clientId(){
      if(globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"){
        return globalThis.crypto.randomUUID();
      }
      return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    }
    function send(finished){
      const payload = JSON.stringify({
        clientCommitId: clientId(),
        values: state,
        finished: Boolean(finished)
      });
      const suffix = finished ? "/finish" : "/commit";
      fetch(currentBase + suffix, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: payload,
        credentials: "same-origin",
        keepalive: true
      }).catch(() => {});
      lastError = "0";
      return "true";
    }
    function format12(ms){
      const total = Math.max(0, Math.floor(ms/1000));
      const h = Math.floor(total/3600);
      const m = Math.floor((total%3600)/60);
      const s = total%60;
      return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
    }
    function format2004(ms){
      const seconds = Math.max(0, ms/1000);
      return "PT" + seconds.toFixed(2).replace(/\\.00$/,"") + "S";
    }
    const api12 = {
      LMSInitialize: boolTrue,
      LMSFinish: () => send(true),
      LMSGetValue: getValue,
      LMSSetValue: setValue,
      LMSCommit: () => send(false),
      LMSGetLastError: () => lastError,
      LMSGetErrorString: code => code === "0" ? "No error" : "Runtime error",
      LMSGetDiagnostic: code => code === "0" ? "No error" : "SmartTraining SCORM runtime diagnostic"
    };
    const api2004 = {
      Initialize: boolTrue,
      Terminate: () => send(true),
      GetValue: getValue,
      SetValue: setValue,
      Commit: () => send(false),
      GetLastError: () => lastError,
      GetErrorString: code => code === "0" ? "No error" : "Runtime error",
      GetDiagnostic: code => code === "0" ? "No error" : "SmartTraining SCORM runtime diagnostic"
    };

    if(boot.scormVersion === "SCORM_2004"){
      window.API_1484_11 = api2004;
    } else {
      window.API = api12;
    }

    document.getElementById("sco").src = currentBase + "/content/" + contentPath;

    window.addEventListener("pagehide", () => {
      if(navigator.sendBeacon){
        const blob = new Blob([JSON.stringify({
          clientCommitId: clientId(),
          values: state,
          finished: false
        })], {type:"application/json"});
        navigator.sendBeacon(currentBase + "/commit", blob);
      }
    });
  })();
  </script>
</body>
</html>
""";

            return html.replace("__BOOTSTRAP__", bootstrapJson);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Impossible de construire le Player SCORM.", exception);
        }
    }

    @Transactional
    public Resource resolveContent(String publicId, String relativePath) {
        SessionContext context = requireSession(publicId);

        if (relativePath == null || relativePath.isBlank()) {
            throw new IllegalArgumentException("Chemin de contenu SCORM manquant.");
        }

        Path base = Paths.get(uploadProperties.getBaseDirectory())
            .toAbsolutePath()
            .normalize();

        Path root = base.resolve(context.scormPackage().getExtractRelativePath())
            .normalize();

        Path target = root.resolve(relativePath)
            .normalize();

        if (!root.startsWith(base) || !target.startsWith(root)) {
            throw new AccessDeniedException("Chemin SCORM interdit.");
        }

        if (!Files.isRegularFile(target)) {
            throw new IllegalArgumentException("Fichier SCORM introuvable.");
        }

        return new FileSystemResource(target.toFile());
    }

    public MediaType contentType(Resource resource) {
        try {
            String type = Files.probeContentType(resource.getFile().toPath());
            if (type == null || type.isBlank()) {
                return MediaType.APPLICATION_OCTET_STREAM;
            }
            return MediaType.parseMediaType(type);
        } catch (Exception exception) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    @Transactional
    public ScormRuntimeStateResponse commit(
        String publicId,
        ScormRuntimeCommitRequest request,
        boolean forcedFinish
    ) {
        SessionContext context = requireSession(publicId);
        ScormAttempt attempt = context.attempt();

        String clientCommitId = request.getClientCommitId().trim();

        if (clientCommitId.length() > 160) {
            throw new IllegalArgumentException("clientCommitId SCORM trop long.");
        }

        if (commitRepository.existsByClientCommitId(clientCommitId)) {
            return new ScormRuntimeStateResponse(attempt);
        }

        Map<String, String> values = sanitizeValues(request.getValues());

        persistValues(attempt.getId(), values);
        normalizeInteractions(attempt.getId(), values);
        normalizeObjectives(attempt.getId(), values);

        updateAttemptFromValues(attempt, values);

        boolean finished = forcedFinish || Boolean.TRUE.equals(request.getFinished());

        if (finished) {
            long sessionMillis = parseSessionTimeMillis(attempt.getScormVersion(), values);
            attempt.setSessionTimeMs(sessionMillis);
            attempt.setTotalTimeMs(
                Math.max(0L, attempt.getTotalTimeMs() == null ? 0L : attempt.getTotalTimeMs())
                    + Math.max(0L, sessionMillis)
            );

            context.session().setActive(false);
            sessionRepository.save(context.session());
        }

        attempt.setLastActivityAt(LocalDateTime.now());
        attempt = attemptRepository.save(attempt);

        ScormRuntimeCommit commit = new ScormRuntimeCommit();
        commit.setAttemptId(attempt.getId());
        commit.setClientCommitId(clientCommitId);
        commit.setFinished(finished);
        commitRepository.save(commit);

        publishScormEvent(
            attempt,
            "SCORM_COMMITTED",
            "scorm:commit:" + clientCommitId,
            "Commit SCORM persiste.",
            scoreAsPercent(attempt)
        );

        if (attempt.isTerminal()) {
            String terminalEvent = switch (attempt.getStatus()) {
                case "PASSED" -> "SCORM_PASSED";
                case "FAILED" -> "SCORM_FAILED";
                default -> "SCORM_COMPLETED";
            };

            publishScormEvent(
                attempt,
                terminalEvent,
                "scorm:attempt:" + attempt.getId() + ":terminal:" + terminalEvent,
                "Etat terminal SCORM persiste.",
                scoreAsPercent(attempt)
            );

            if (!"FAILED".equals(attempt.getStatus())) {
                publishLessonCompletion(attempt);
                publishResourceCompletion(attempt);
            }
        }

        return new ScormRuntimeStateResponse(attempt);
    }

    @Transactional(readOnly = true)
    public ScormRuntimeStateResponse stateForCurrentLearner(Long attemptId) {
        requireLearner();

        ScormAttempt attempt = attemptRepository.findById(attemptId)
            .orElseThrow(() -> new IllegalArgumentException("Tentative SCORM introuvable."));

        if (!authenticatedUserService.getUserId().equals(attempt.getLearnerId())) {
            throw new AccessDeniedException("Cette tentative SCORM n'appartient pas a l'apprenant.");
        }

        return new ScormRuntimeStateResponse(attempt);
    }

    private void requireLearner() {
        String role = authenticatedUserService.getRole();

        if (!"APPRENANT".equals(role)
                && !"FORMATEUR".equals(role)
                && !"ADMIN".equals(role)) {
            throw new AccessDeniedException(
                    "Le runtime SCORM necessite une identite utilisateur pouvant suivre une formation."
            );
        }
    }

    private SessionContext requireSession(String publicId) {
        if (publicId == null || publicId.isBlank() || publicId.length() > 100) {
            throw new AccessDeniedException("Session SCORM invalide.");
        }

        ScormLaunchSession session = sessionRepository.findByPublicId(publicId)
            .orElseThrow(() -> new AccessDeniedException("Session SCORM inconnue."));

        if (Boolean.FALSE.equals(session.getActive())
            || session.getExpiresAt() == null
            || session.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new AccessDeniedException("Session SCORM expiree.");
        }

        ScormAttempt attempt = attemptRepository.findById(session.getAttemptId())
            .orElseThrow(() -> new AccessDeniedException("Tentative SCORM absente."));

        ScormPackage scormPackage = packageRepository.findById(attempt.getScormPackageId())
            .orElseThrow(() -> new AccessDeniedException("Package SCORM absent."));

        session.setLastSeenAt(LocalDateTime.now());
        sessionRepository.save(session);

        return new SessionContext(session, attempt, scormPackage);
    }

    private String detectVersion(ScormPackage scormPackage) {
        Path base = Paths.get(uploadProperties.getBaseDirectory())
            .toAbsolutePath()
            .normalize();

        Path manifest = base.resolve(scormPackage.getManifestRelativePath())
            .normalize();

        if (!manifest.startsWith(base) || !Files.isRegularFile(manifest)) {
            throw new IllegalArgumentException("Manifest SCORM inaccessible.");
        }

        try {
            String xml = Files.readString(manifest, StandardCharsets.UTF_8)
                .toLowerCase(Locale.ROOT);

            if (xml.contains("adlcp_v1p3")
                || xml.contains("imsss")
                || xml.contains("<schemaversion>2004")
                || xml.contains("<schemaversion>cam 1.3")) {
                return "SCORM_2004";
            }

            if (xml.contains("adlcp_rootv1p2")
                || xml.contains("<schemaversion>1.2")
                || xml.contains("scorm 1.2")) {
                return "SCORM_1_2";
            }

            throw new IllegalArgumentException(
                "Version SCORM non reconnue. Le runtime supporte SCORM 1.2 et SCORM 2004 Core."
            );
        } catch (IOException exception) {
            throw new IllegalArgumentException("Lecture manifest SCORM impossible.", exception);
        }
    }

    private String launchPathWithinPackage(ScormPackage scormPackage) {
        String root = normalizeRelative(scormPackage.getExtractRelativePath());
        String launch = normalizeRelative(scormPackage.getLaunchRelativePath());

        if (launch.equals(root)) {
            throw new IllegalArgumentException("Fichier de lancement SCORM invalide.");
        }

        String prefix = root.endsWith("/") ? root : root + "/";

        if (!launch.startsWith(prefix)) {
            throw new IllegalArgumentException("Launch SCORM hors du contenu extrait.");
        }

        return launch.substring(prefix.length());
    }

    private String normalizeRelative(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Chemin SCORM manquant.");
        }
        return value.replace('\\', '/').replaceAll("^/+", "");
    }

    private String randomPublicSessionId() {
        return UUID.randomUUID().toString().replace("-", "")
            + UUID.randomUUID().toString().replace("-", "");
    }

    private Map<String, String> sanitizeValues(Map<String, String> raw) {
        Map<String, String> values = raw == null ? Map.of() : raw;

        if (values.size() > MAX_RUNTIME_ELEMENTS) {
            throw new IllegalArgumentException("Trop de valeurs CMI dans un commit SCORM.");
        }

        LinkedHashMap<String, String> clean = new LinkedHashMap<>();

        values.forEach((key, value) -> {
            if (key == null
                || key.isBlank()
                || !key.startsWith("cmi.")
                || key.length() > MAX_KEY_LENGTH) {
                throw new IllegalArgumentException("Cle CMI invalide.");
            }

            String safeValue = value == null ? "" : value;

            if (safeValue.length() > MAX_VALUE_LENGTH) {
                throw new IllegalArgumentException("Valeur CMI trop longue pour " + key + ".");
            }

            clean.put(key, safeValue);
        });

        return clean;
    }

    private void persistValues(Long attemptId, Map<String, String> values) {
        LocalDateTime now = LocalDateTime.now();

        values.forEach((key, value) -> {
            ScormRuntimeValue runtimeValue = runtimeValueRepository
                .findByAttemptIdAndElementKey(attemptId, key)
                .orElseGet(ScormRuntimeValue::new);

            runtimeValue.setAttemptId(attemptId);
            runtimeValue.setElementKey(key);
            runtimeValue.setElementValue(value);
            runtimeValue.setUpdatedAt(now);
            runtimeValueRepository.save(runtimeValue);
        });
    }

    private void updateAttemptFromValues(
        ScormAttempt attempt,
        Map<String, String> values
    ) {
        if ("SCORM_2004".equals(attempt.getScormVersion())) {
            attempt.setCompletionStatus(
                firstNonBlank(values.get("cmi.completion_status"), attempt.getCompletionStatus())
            );
            attempt.setSuccessStatus(
                firstNonBlank(values.get("cmi.success_status"), attempt.getSuccessStatus())
            );
            attempt.setLocation(
                firstNonBlank(values.get("cmi.location"), attempt.getLocation())
            );
            attempt.setSuspendData(
                firstNonBlank(values.get("cmi.suspend_data"), attempt.getSuspendData())
            );
            attempt.setExitMode(
                firstNonBlank(values.get("cmi.exit"), attempt.getExitMode())
            );
            attempt.setScoreRaw(
                parseDouble(values.get("cmi.score.raw"), attempt.getScoreRaw())
            );
            attempt.setScoreMin(
                parseDouble(values.get("cmi.score.min"), attempt.getScoreMin())
            );
            attempt.setScoreMax(
                parseDouble(values.get("cmi.score.max"), attempt.getScoreMax())
            );
            attempt.setScoreScaled(
                parseDouble(values.get("cmi.score.scaled"), attempt.getScoreScaled())
            );
            attempt.setProgressMeasure(
                parseDouble(values.get("cmi.progress_measure"), attempt.getProgressMeasure())
            );

            String completion = lower(attempt.getCompletionStatus());
            String success = lower(attempt.getSuccessStatus());

            // SCORM 2004 separates completion from success.
            // A SCO may report success_status=failed while it is still incomplete.
            // Only completion_status=completed makes the attempt terminal.
            if ("completed".equals(completion)) {
                if ("passed".equals(success)) {
                    terminal(attempt, "PASSED");
                } else if ("failed".equals(success)) {
                    terminal(attempt, "FAILED");
                } else {
                    terminal(attempt, "COMPLETED");
                }
            } else {
                attempt.setStatus("IN_PROGRESS");
            }
        } else {
            attempt.setLessonStatus(
                firstNonBlank(values.get("cmi.core.lesson_status"), attempt.getLessonStatus())
            );
            attempt.setLocation(
                firstNonBlank(values.get("cmi.core.lesson_location"), attempt.getLocation())
            );
            attempt.setSuspendData(
                firstNonBlank(values.get("cmi.suspend_data"), attempt.getSuspendData())
            );
            attempt.setExitMode(
                firstNonBlank(values.get("cmi.core.exit"), attempt.getExitMode())
            );
            attempt.setScoreRaw(
                parseDouble(values.get("cmi.core.score.raw"), attempt.getScoreRaw())
            );
            attempt.setScoreMin(
                parseDouble(values.get("cmi.core.score.min"), attempt.getScoreMin())
            );
            attempt.setScoreMax(
                parseDouble(values.get("cmi.core.score.max"), attempt.getScoreMax())
            );

            String status = lower(attempt.getLessonStatus());

            if ("passed".equals(status)) {
                terminal(attempt, "PASSED");
            } else if ("failed".equals(status)) {
                terminal(attempt, "FAILED");
            } else if ("completed".equals(status)) {
                terminal(attempt, "COMPLETED");
            } else {
                attempt.setStatus("IN_PROGRESS");
            }
        }
    }

    private void terminal(ScormAttempt attempt, String status) {
        attempt.setStatus(status);
        if (attempt.getCompletedAt() == null) {
            attempt.setCompletedAt(LocalDateTime.now());
        }
    }

    private void normalizeInteractions(Long attemptId, Map<String, String> values) {
        Set<Integer> indexes = extractIndexes(values.keySet(), INTERACTION_INDEX);

        if (indexes.isEmpty()) {
            return;
        }

        for (Integer index : indexes) {
            String prefix = "cmi.interactions." + index + ".";

            ScormInteraction interaction = interactionRepository
                .findByAttemptIdAndInteractionIndex(attemptId, index)
                .orElseGet(ScormInteraction::new);

            interaction.setAttemptId(attemptId);
            interaction.setInteractionIndex(index);
            interaction.setInteractionId(values.get(prefix + "id"));
            interaction.setInteractionType(values.get(prefix + "type"));
            interaction.setLearnerResponse(firstNonBlank(
                values.get(prefix + "learner_response"),
                values.get(prefix + "student_response")
            ));
            interaction.setCorrectResponse(values.get(prefix + "correct_responses.0.pattern"));
            interaction.setResultValue(values.get(prefix + "result"));
            interaction.setWeighting(parseDouble(values.get(prefix + "weighting"), null));
            interaction.setLatency(values.get(prefix + "latency"));
            interaction.setDescription(values.get(prefix + "description"));
            interactionRepository.save(interaction);
        }
    }

    private void normalizeObjectives(Long attemptId, Map<String, String> values) {
        Set<Integer> indexes = extractIndexes(values.keySet(), OBJECTIVE_INDEX);

        if (indexes.isEmpty()) {
            return;
        }

        for (Integer index : indexes) {
            String prefix = "cmi.objectives." + index + ".";

            ScormObjective objective = objectiveRepository
                .findByAttemptIdAndObjectiveIndex(attemptId, index)
                .orElseGet(ScormObjective::new);

            objective.setAttemptId(attemptId);
            objective.setObjectiveIndex(index);
            objective.setObjectiveId(values.get(prefix + "id"));
            objective.setScoreRaw(parseDouble(values.get(prefix + "score.raw"), null));
            objective.setScoreMin(parseDouble(values.get(prefix + "score.min"), null));
            objective.setScoreMax(parseDouble(values.get(prefix + "score.max"), null));
            objective.setScoreScaled(parseDouble(values.get(prefix + "score.scaled"), null));
            objective.setStatusValue(values.get(prefix + "status"));
            objective.setCompletionStatus(values.get(prefix + "completion_status"));
            objective.setSuccessStatus(values.get(prefix + "success_status"));
            objective.setProgressMeasure(parseDouble(values.get(prefix + "progress_measure"), null));
            objectiveRepository.save(objective);
        }
    }

    private Set<Integer> extractIndexes(Set<String> keys, Pattern pattern) {
        TreeSet<Integer> indexes = new TreeSet<>();

        for (String key : keys) {
            Matcher matcher = pattern.matcher(key);
            if (matcher.matches()) {
                indexes.add(Integer.parseInt(matcher.group(1)));
            }
        }

        return indexes;
    }

    private long parseSessionTimeMillis(
        String scormVersion,
        Map<String, String> values
    ) {
        String raw = "SCORM_2004".equals(scormVersion)
            ? values.get("cmi.session_time")
            : values.get("cmi.core.session_time");

        if (raw == null || raw.isBlank()) {
            return 0L;
        }

        try {
            if ("SCORM_2004".equals(scormVersion)) {
                return parseIsoDurationMillis(raw);
            }
            return parseScorm12DurationMillis(raw);
        } catch (RuntimeException exception) {
            return 0L;
        }
    }

    private long parseScorm12DurationMillis(String raw) {
        String[] parts = raw.trim().split(":");
        if (parts.length != 3) return 0L;

        long hours = Long.parseLong(parts[0]);
        long minutes = Long.parseLong(parts[1]);
        double seconds = Double.parseDouble(parts[2]);

        return (hours * 3600000L)
            + (minutes * 60000L)
            + Math.round(seconds * 1000.0);
    }

    private long parseIsoDurationMillis(String raw) {
        String normalized = raw.trim().toUpperCase(Locale.ROOT);

        try {
            return Duration.parse(normalized).toMillis();
        } catch (Exception ignored) {
            Pattern pattern = Pattern.compile(
                "P(?:(\\d+(?:\\.\\d+)?)D)?(?:T(?:(\\d+(?:\\.\\d+)?)H)?(?:(\\d+(?:\\.\\d+)?)M)?(?:(\\d+(?:\\.\\d+)?)S)?)?"
            );
            Matcher matcher = pattern.matcher(normalized);
            if (!matcher.matches()) return 0L;

            double days = number(matcher.group(1));
            double hours = number(matcher.group(2));
            double minutes = number(matcher.group(3));
            double seconds = number(matcher.group(4));

            return Math.round(
                (days * 86400.0 + hours * 3600.0 + minutes * 60.0 + seconds) * 1000.0
            );
        }
    }

    private double number(String value) {
        return value == null || value.isBlank() ? 0.0 : Double.parseDouble(value);
    }

    private Double parseDouble(String value, Double fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return Double.valueOf(value.trim());
        } catch (NumberFormatException exception) {
            return fallback;
        }
    }

    private String firstNonBlank(String preferred, String fallback) {
        return preferred == null || preferred.isBlank() ? fallback : preferred.trim();
    }

    private String lower(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private Integer scoreAsPercent(ScormAttempt attempt) {
        if (attempt.getScoreScaled() != null) {
            return clampPercent((int) Math.round(attempt.getScoreScaled() * 100.0));
        }

        if (attempt.getScoreRaw() == null) {
            return null;
        }

        if (attempt.getScoreMax() != null && attempt.getScoreMax() > 0.0) {
            return clampPercent((int) Math.round(
                (attempt.getScoreRaw() / attempt.getScoreMax()) * 100.0
            ));
        }

        return clampPercent((int) Math.round(attempt.getScoreRaw()));
    }

    private int clampPercent(int value) {
        return Math.max(0, Math.min(100, value));
    }

    private void publishScormEvent(
        ScormAttempt attempt,
        String eventType,
        String idempotencyKey,
        String description,
        Integer score
    ) {
        TrustedAnalyticsEventRequest request = new TrustedAnalyticsEventRequest();
        request.setLearnerId(attempt.getLearnerId());
        request.setTrainingId(attempt.getTrainingId());
        request.setModuleId(attempt.getModuleId());
        request.setLessonId(attempt.getLessonId());
        request.setResourceId(attempt.getResourceId());
        request.setEventType(eventType);
        request.setSource("SCORM_RUNTIME");
        request.setIdempotencyKey(idempotencyKey);
        request.setDescription(description);

        if (score != null) {
            request.setScore(score);
            request.setTotalPoints(100);
        }

        eventPublisher.publishEvent(new ScormAnalyticsEvent(request));
    }

    private void publishLessonCompletion(ScormAttempt attempt) {
        long totalLessons = lessonRepository.countByTrainingId(attempt.getTrainingId());

        if (totalLessons <= 0 || totalLessons > Integer.MAX_VALUE) {
            return;
        }

        TrustedAnalyticsEventRequest request = new TrustedAnalyticsEventRequest();
        request.setLearnerId(attempt.getLearnerId());
        request.setTrainingId(attempt.getTrainingId());
        request.setModuleId(attempt.getModuleId());
        request.setLessonId(attempt.getLessonId());
        request.setResourceId(attempt.getResourceId());
        request.setEventType("LESSON_COMPLETED");
        request.setSource("SCORM_RUNTIME");
        request.setIdempotencyKey(
            "scorm:attempt:" + attempt.getId() + ":lesson-completed"
        );
        request.setDescription("Lecon completee par le runtime SCORM.");
        request.setTotalLessons((int) totalLessons);

        eventPublisher.publishEvent(new ScormAnalyticsEvent(request));
    }

    private void publishResourceCompletion(ScormAttempt attempt) {
        TrustedAnalyticsEventRequest request = new TrustedAnalyticsEventRequest();
        request.setLearnerId(attempt.getLearnerId());
        request.setTrainingId(attempt.getTrainingId());
        request.setModuleId(attempt.getModuleId());
        request.setLessonId(attempt.getLessonId());
        request.setResourceId(attempt.getResourceId());
        request.setEventType("RESOURCE_COMPLETED");
        request.setSource("SCORM_RUNTIME");
        request.setIdempotencyKey(
            "scorm:attempt:" + attempt.getId() + ":resource-completed"
        );
        request.setDescription("Ressource SCORM completee.");

        eventPublisher.publishEvent(new ScormAnalyticsEvent(request));
    }

    private record SessionContext(
        ScormLaunchSession session,
        ScormAttempt attempt,
        ScormPackage scormPackage
    ) {}
}
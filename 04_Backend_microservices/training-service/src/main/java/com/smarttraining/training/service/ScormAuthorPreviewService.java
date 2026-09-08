package com.smarttraining.training.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarttraining.training.config.UploadProperties;
import com.smarttraining.training.dto.scorm.ScormAuthorPreviewLaunchResponse;
import com.smarttraining.training.entity.PedagogicalResource;
import com.smarttraining.training.entity.ScormPackage;
import com.smarttraining.training.enums.ResourceType;
import com.smarttraining.training.repository.PedagogicalResourceRepository;
import com.smarttraining.training.repository.ScormPackageRepository;
import com.smarttraining.training.security.TrainingOwnershipService;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScormAuthorPreviewService {

    private static final long PREVIEW_TTL_MINUTES = 60L;

    private final PedagogicalResourceRepository resourceRepository;
    private final ScormPackageRepository packageRepository;
    private final TrainingOwnershipService ownershipService;
    private final UploadProperties uploadProperties;
    private final ObjectMapper objectMapper;

    private final ConcurrentMap<String, AuthorPreviewContext> sessions =
            new ConcurrentHashMap<>();

    public ScormAuthorPreviewService(
            PedagogicalResourceRepository resourceRepository,
            ScormPackageRepository packageRepository,
            TrainingOwnershipService ownershipService,
            UploadProperties uploadProperties,
            ObjectMapper objectMapper
    ) {
        this.resourceRepository = resourceRepository;
        this.packageRepository = packageRepository;
        this.ownershipService = ownershipService;
        this.uploadProperties = uploadProperties;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public ScormAuthorPreviewLaunchResponse launch(Long resourceId) {
        ownershipService.requireAdminOrTrainer();
        cleanupExpired();

        PedagogicalResource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Ressource SCORM introuvable."));

        ownershipService.assertCanManageResource(resource);

        if (resource.getType() == null
                || resource.getType().normalized() != ResourceType.SCORM
                || Boolean.FALSE.equals(resource.getActive())) {
            throw new IllegalArgumentException(
                    "Cette ressource n'est pas un package SCORM actif."
            );
        }

        if (resource.getScormPackageId() == null) {
            throw new IllegalArgumentException(
                    "La ressource SCORM n'est liee a aucun package."
            );
        }

        ScormPackage scormPackage = packageRepository
                .findById(resource.getScormPackageId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Package SCORM introuvable."));

        if (Boolean.FALSE.equals(scormPackage.getActive())) {
            throw new IllegalArgumentException("Package SCORM inactif.");
        }

        String launchPath = launchPathWithinPackage(scormPackage);
        String publicId = randomPublicSessionId();
        LocalDateTime expiresAt =
                LocalDateTime.now().plusMinutes(PREVIEW_TTL_MINUTES);

        sessions.put(
                publicId,
                new AuthorPreviewContext(
                        scormPackage.getId(),
                        launchPath,
                        expiresAt
                )
        );

        return new ScormAuthorPreviewLaunchResponse(
                "/api/scorm/runtime/public/author-preview/"
                        + publicId
                        + "/player",
                expiresAt
        );
    }

    public String buildPlayerHtml(String publicId) {
        AuthorPreviewContext context = requireSession(publicId);

        try {
            String launchJson =
                    objectMapper.writeValueAsString(context.launchPath());

            String html = """
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Previsualisation SCORM formateur</title>
  <style>
    html,body,#sco{margin:0;width:100%;height:100%;border:0;background:#fff}
    body{overflow:hidden}
  </style>
</head>
<body>
  <iframe id="sco" title="Previsualisation du contenu SCORM" allow="fullscreen; autoplay"></iframe>
  <script>
  (() => {
    "use strict";

    const state = Object.create(null);
    let lastError = "0";
    const launchPath = __AUTHOR_PREVIEW_LAUNCH_PATH__;

    const defaults = {
      "cmi.core.student_id": "author-preview",
      "cmi.core.student_name": "Previsualisation formateur",
      "cmi.core.entry": "ab-initio",
      "cmi.core.lesson_mode": "normal",
      "cmi.core.lesson_status": "not attempted",
      "cmi.core.score.raw": "",
      "cmi.core.score.min": "",
      "cmi.core.score.max": "",
      "cmi.learner_id": "author-preview",
      "cmi.learner_name": "Previsualisation formateur",
      "cmi.entry": "ab-initio",
      "cmi.mode": "normal",
      "cmi.completion_status": "not attempted",
      "cmi.success_status": "unknown",
      "cmi.score.raw": "",
      "cmi.score.min": "",
      "cmi.score.max": "",
      "cmi.score.scaled": ""
    };

    function ok(){ lastError = "0"; return "true"; }
    function getValue(key){
      lastError = "0";
      if(Object.prototype.hasOwnProperty.call(state,key)){
        return String(state[key] ?? "");
      }
      if(Object.prototype.hasOwnProperty.call(defaults,key)){
        return defaults[key];
      }
      return "";
    }
    function setValue(key,value){
      if(typeof key !== "string" || !key.startsWith("cmi.")){
        lastError = "401";
        return "false";
      }
      state[key] = String(value ?? "");
      lastError = "0";
      return "true";
    }
    function getLastError(){ return lastError; }
    function getErrorString(){ return lastError === "0" ? "No error" : "Preview runtime error"; }
    function getDiagnostic(){ return ""; }

    window.API = {
      LMSInitialize: ok,
      LMSFinish: ok,
      LMSGetValue: getValue,
      LMSSetValue: setValue,
      LMSCommit: ok,
      LMSGetLastError: getLastError,
      LMSGetErrorString: getErrorString,
      LMSGetDiagnostic: getDiagnostic
    };

    window.API_1484_11 = {
      Initialize: ok,
      Terminate: ok,
      GetValue: getValue,
      SetValue: setValue,
      Commit: ok,
      GetLastError: getLastError,
      GetErrorString: getErrorString,
      GetDiagnostic: getDiagnostic
    };

    const pathname = window.location.pathname;
    const currentBase = pathname.endsWith("/player")
      ? pathname.slice(0, -"/player".length)
      : pathname;
    const contentPath = launchPath
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");

    document.getElementById("sco").src =
      currentBase + "/content/" + contentPath;
  })();
  </script>
</body>
</html>
""";

            return html.replace(
                    "__AUTHOR_PREVIEW_LAUNCH_PATH__",
                    launchJson
            );
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Generation du lecteur SCORM de previsualisation impossible.",
                    exception
            );
        }
    }

    public Resource resolveContent(
            String publicId,
            String relativePath
    ) {
        AuthorPreviewContext context = requireSession(publicId);
        ScormPackage scormPackage = packageRepository
                .findById(context.scormPackageId())
                .orElseThrow(() ->
                        new AccessDeniedException(
                                "Package SCORM de previsualisation absent."
                        ));

        if (Boolean.FALSE.equals(scormPackage.getActive())) {
            throw new AccessDeniedException(
                    "Package SCORM de previsualisation inactif."
            );
        }

        if (relativePath == null || relativePath.isBlank()) {
            throw new IllegalArgumentException(
                    "Chemin de contenu SCORM manquant."
            );
        }

        Path base = Paths.get(uploadProperties.getBaseDirectory())
                .toAbsolutePath()
                .normalize();

        Path packageRoot = base
                .resolve(scormPackage.getExtractRelativePath())
                .normalize();

        if (!packageRoot.startsWith(base)
                || !Files.isDirectory(packageRoot)) {
            throw new IllegalArgumentException(
                    "Repertoire SCORM de previsualisation inaccessible."
            );
        }

        String normalizedInput = relativePath
                .replace('\\', '/')
                .replaceAll("^/+", "");

        Path relative = Paths.get(normalizedInput).normalize();

        if (relative.isAbsolute() || relative.startsWith("..")) {
            throw new AccessDeniedException(
                    "Chemin SCORM de previsualisation refuse."
            );
        }

        Path file = packageRoot.resolve(relative).normalize();

        if (!file.startsWith(packageRoot)
                || !Files.isRegularFile(file)) {
            throw new IllegalArgumentException(
                    "Fichier SCORM de previsualisation introuvable."
            );
        }

        return new FileSystemResource(file);
    }

    public MediaType contentType(Resource resource) {
        return MediaTypeFactory
                .getMediaType(resource)
                .orElse(MediaType.APPLICATION_OCTET_STREAM);
    }

    private AuthorPreviewContext requireSession(String publicId) {
        if (publicId == null
                || !publicId.matches("[a-f0-9]{128}")) {
            throw new AccessDeniedException(
                    "Session SCORM de previsualisation invalide."
            );
        }

        AuthorPreviewContext context = sessions.get(publicId);

        if (context == null) {
            throw new AccessDeniedException(
                    "Session SCORM de previsualisation inconnue."
            );
        }

        if (context.expiresAt() == null
                || context.expiresAt().isBefore(LocalDateTime.now())) {
            sessions.remove(publicId, context);
            throw new AccessDeniedException(
                    "Session SCORM de previsualisation expiree."
            );
        }

        return context;
    }

    private String launchPathWithinPackage(ScormPackage scormPackage) {
        String root = normalizeRelative(
                scormPackage.getExtractRelativePath()
        );
        String launch = normalizeRelative(
                scormPackage.getLaunchRelativePath()
        );

        String prefix = root.endsWith("/") ? root : root + "/";

        if (!launch.startsWith(prefix)
                || launch.length() <= prefix.length()) {
            throw new IllegalArgumentException(
                    "Fichier de lancement SCORM invalide."
            );
        }

        return launch.substring(prefix.length());
    }

    private String normalizeRelative(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(
                    "Chemin SCORM manquant."
            );
        }

        return value
                .replace('\\', '/')
                .replaceAll("^/+", "");
    }

    private void cleanupExpired() {
        LocalDateTime now = LocalDateTime.now();

        sessions.forEach((id, context) -> {
            if (context == null
                    || context.expiresAt() == null
                    || context.expiresAt().isBefore(now)) {
                sessions.remove(id, context);
            }
        });
    }

    private String randomPublicSessionId() {
        return UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "");
    }

    private record AuthorPreviewContext(
            Long scormPackageId,
            String launchPath,
            LocalDateTime expiresAt
    ) {
    }
}
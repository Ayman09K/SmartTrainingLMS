package com.smarttraining.training.controller;

import com.smarttraining.training.dto.scorm.ScormAuthorPreviewLaunchResponse;
import com.smarttraining.training.service.ScormAuthorPreviewService;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/scorm/runtime")
public class ScormAuthorPreviewController {

    private final ScormAuthorPreviewService previewService;

    public ScormAuthorPreviewController(
            ScormAuthorPreviewService previewService
    ) {
        this.previewService = previewService;
    }

    @PostMapping("/author-preview/launch/{resourceId}")
    public ScormAuthorPreviewLaunchResponse launch(
            @PathVariable Long resourceId
    ) {
        return previewService.launch(resourceId);
    }

    @GetMapping(
            value = "/public/author-preview/{sessionId}/player",
            produces = MediaType.TEXT_HTML_VALUE
    )
    public ResponseEntity<String> player(
            @PathVariable String sessionId
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("Referrer-Policy", "no-referrer")
                .header(
                        "Content-Security-Policy",
                        "frame-ancestors http://localhost:5173 http://127.0.0.1:5173 http://localhost:8083 http://127.0.0.1:8083 http://localhost:19006 http://127.0.0.1:19006 https://smarttraininglms.com https://www.smarttraininglms.com"
                )
                .body(previewService.buildPlayerHtml(sessionId));
    }

    @GetMapping(
            "/public/author-preview/{sessionId}/content/**"
    )
    public ResponseEntity<Resource> content(
            @PathVariable String sessionId,
            jakarta.servlet.http.HttpServletRequest request
    ) {
        String marker =
                "/scorm/runtime/public/author-preview/"
                        + sessionId
                        + "/content/";

        String requestUri = request.getRequestURI();
        int index = requestUri.indexOf(marker);

        if (index < 0) {
            throw new IllegalArgumentException(
                    "Chemin runtime SCORM de previsualisation invalide."
            );
        }

        String encoded =
                requestUri.substring(index + marker.length());

        String relativePath =
                URLDecoder.decode(
                        encoded,
                        StandardCharsets.UTF_8
                );

        Resource resource =
                previewService.resolveContent(
                        sessionId,
                        relativePath
                );

        return ResponseEntity.ok()
                .contentType(previewService.contentType(resource))
                .cacheControl(CacheControl.noCache())
                .header("Referrer-Policy", "no-referrer")
                .body(resource);
    }
}
package com.smarttraining.training.controller;

import com.smarttraining.training.dto.scorm.*;
import com.smarttraining.training.service.ScormRuntimeService;
import jakarta.validation.Valid;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/scorm/runtime")
public class ScormRuntimeController {

    private final ScormRuntimeService runtimeService;

    public ScormRuntimeController(ScormRuntimeService runtimeService) {
        this.runtimeService = runtimeService;
    }

    @PostMapping("/launch/{resourceId}")
    public ScormLaunchResponse launch(@PathVariable Long resourceId) {
        return runtimeService.launch(resourceId);
    }

    @GetMapping("/attempts/{attemptId}/me")
    public ScormRuntimeStateResponse state(@PathVariable Long attemptId) {
        return runtimeService.stateForCurrentLearner(attemptId);
    }

    @GetMapping(
        value = "/public/{sessionId}/player",
        produces = MediaType.TEXT_HTML_VALUE
    )
    public ResponseEntity<String> player(@PathVariable String sessionId) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .header("Referrer-Policy", "no-referrer")
            .header(
                "Content-Security-Policy",
                "frame-ancestors http://localhost:5173 http://127.0.0.1:5173 http://localhost:8083 http://127.0.0.1:8083 http://localhost:19006 http://127.0.0.1:19006 https://smarttraininglms.com https://www.smarttraininglms.com"
            )
            .body(runtimeService.buildPlayerHtml(sessionId));
    }

    @GetMapping("/public/{sessionId}/bootstrap")
    public ResponseEntity<ScormBootstrapResponse> bootstrap(
        @PathVariable String sessionId
    ) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .header("Referrer-Policy", "no-referrer")
            .body(runtimeService.bootstrap(sessionId));
    }

    @PostMapping("/public/{sessionId}/commit")
    public ResponseEntity<ScormRuntimeStateResponse> commit(
        @PathVariable String sessionId,
        @Valid @RequestBody ScormRuntimeCommitRequest request
    ) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(runtimeService.commit(sessionId, request, false));
    }

    @PostMapping("/public/{sessionId}/finish")
    public ResponseEntity<ScormRuntimeStateResponse> finish(
        @PathVariable String sessionId,
        @Valid @RequestBody ScormRuntimeCommitRequest request
    ) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(runtimeService.commit(sessionId, request, true));
    }

    @GetMapping("/public/{sessionId}/content/**")
    public ResponseEntity<Resource> content(
        @PathVariable String sessionId,
        jakarta.servlet.http.HttpServletRequest request
    ) {
        String marker = "/scorm/runtime/public/" + sessionId + "/content/";
        String requestUri = request.getRequestURI();
        int index = requestUri.indexOf(marker);

        if (index < 0) {
            throw new IllegalArgumentException("Chemin runtime SCORM invalide.");
        }

        String encoded = requestUri.substring(index + marker.length());
        String relativePath = URLDecoder.decode(encoded, StandardCharsets.UTF_8);

        Resource resource = runtimeService.resolveContent(sessionId, relativePath);

        return ResponseEntity.ok()
            .contentType(runtimeService.contentType(resource))
            .cacheControl(CacheControl.noCache())
            .header("Referrer-Policy", "no-referrer")
            .body(resource);
    }
}

package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.BiActivityPointResponse;
import com.smarttraining.analytics.dto.BiDistributionResponse;
import com.smarttraining.analytics.dto.BiSummaryResponse;
import com.smarttraining.analytics.dto.BiTrainingMetricResponse;
import com.smarttraining.analytics.security.AuthenticatedUser;
import com.smarttraining.analytics.service.BiAnalyticsService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/analytics/bi")
public class BiController {

    private final BiAnalyticsService biService;

    public BiController(BiAnalyticsService biService) {
        this.biService = biService;
    }

    @GetMapping("/trainer/summary")
    public BiSummaryResponse trainerSummary(
            JwtAuthenticationToken authentication,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to,
            @RequestParam(required = false)
            Long trainingId,
            @RequestParam(required = false)
            String status
    ) {
        return biService.summary(
                actor(authentication, "FORMATEUR"),
                from,
                to,
                trainingId,
                status
        );
    }

    @GetMapping("/trainer/trainings")
    public List<BiTrainingMetricResponse> trainerTrainings(
            JwtAuthenticationToken authentication,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to,
            @RequestParam(required = false)
            Long trainingId,
            @RequestParam(required = false)
            String status
    ) {
        return biService.trainings(
                actor(authentication, "FORMATEUR"),
                from,
                to,
                trainingId,
                status
        );
    }

    @GetMapping("/trainer/activity")
    public List<BiActivityPointResponse> trainerActivity(
            JwtAuthenticationToken authentication,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to,
            @RequestParam(required = false)
            Long trainingId,
            @RequestParam(required = false)
            String status
    ) {
        return biService.activity(
                actor(authentication, "FORMATEUR"),
                from,
                to,
                trainingId,
                status
        );
    }

    @GetMapping("/trainer/distributions")
    public BiDistributionResponse trainerDistributions(
            JwtAuthenticationToken authentication,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to,
            @RequestParam(required = false)
            Long trainingId,
            @RequestParam(required = false)
            String status
    ) {
        return biService.distributions(
                actor(authentication, "FORMATEUR"),
                from,
                to,
                trainingId,
                status
        );
    }

    @GetMapping("/admin/summary")
    public BiSummaryResponse adminSummary(
            JwtAuthenticationToken authentication,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to,
            @RequestParam(required = false)
            Long trainingId,
            @RequestParam(required = false)
            String status
    ) {
        return biService.summary(
                actor(authentication, "ADMIN"),
                from,
                to,
                trainingId,
                status
        );
    }

    @GetMapping("/admin/trainings")
    public List<BiTrainingMetricResponse> adminTrainings(
            JwtAuthenticationToken authentication,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to,
            @RequestParam(required = false)
            Long trainingId,
            @RequestParam(required = false)
            String status
    ) {
        return biService.trainings(
                actor(authentication, "ADMIN"),
                from,
                to,
                trainingId,
                status
        );
    }

    @GetMapping("/admin/activity")
    public List<BiActivityPointResponse> adminActivity(
            JwtAuthenticationToken authentication,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to,
            @RequestParam(required = false)
            Long trainingId,
            @RequestParam(required = false)
            String status
    ) {
        return biService.activity(
                actor(authentication, "ADMIN"),
                from,
                to,
                trainingId,
                status
        );
    }

    @GetMapping("/admin/distributions")
    public BiDistributionResponse adminDistributions(
            JwtAuthenticationToken authentication,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to,
            @RequestParam(required = false)
            Long trainingId,
            @RequestParam(required = false)
            String status
    ) {
        return biService.distributions(
                actor(authentication, "ADMIN"),
                from,
                to,
                trainingId,
                status
        );
    }

    private AuthenticatedUser actor(
            JwtAuthenticationToken authentication,
            String requiredRole
    ) {
        AuthenticatedUser actor =
                AuthenticatedUser.from(authentication);

        if (!requiredRole.equals(actor.getRole())) {
            throw new AccessDeniedException(
                    "Route BI reservee au role "
                    + requiredRole
                    + "."
            );
        }

        return actor;
    }
}
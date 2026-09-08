package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.TrainerLearnerOverviewResponse;
import com.smarttraining.analytics.security.AuthenticatedUser;
import com.smarttraining.analytics.service.TrainerLearnerOverviewService;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/analytics/trainer/learners")
public class TrainerLearnerOverviewController {

    private final TrainerLearnerOverviewService overviewService;

    public TrainerLearnerOverviewController(
            TrainerLearnerOverviewService overviewService
    ) {
        this.overviewService = overviewService;
    }

    @GetMapping("/{learnerId}/overview")
    public TrainerLearnerOverviewResponse getOverview(
            @PathVariable Long learnerId,
            JwtAuthenticationToken authentication
    ) {
        return overviewService.getOverview(
                learnerId,
                AuthenticatedUser.from(authentication)
        );
    }
}
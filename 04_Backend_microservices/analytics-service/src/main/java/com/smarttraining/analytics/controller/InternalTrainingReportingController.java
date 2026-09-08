package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.InternalTrainingLearnerMetricsRequest;
import com.smarttraining.analytics.dto.InternalTrainingLearnerMetricsResponse;
import com.smarttraining.analytics.security.InternalServiceKeyValidator;
import com.smarttraining.analytics.service.InternalTrainingReportingService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/analytics/internal/reporting")
public class InternalTrainingReportingController {

    private static final String SERVICE_KEY_HEADER =
            "X-SmartTraining-Service-Key";

    private final InternalServiceKeyValidator keyValidator;
    private final InternalTrainingReportingService reportingService;

    public InternalTrainingReportingController(
            InternalServiceKeyValidator keyValidator,
            InternalTrainingReportingService reportingService
    ) {
        this.keyValidator = keyValidator;
        this.reportingService = reportingService;
    }

    @PostMapping("/trainings/{trainingId}/learners")
    public List<InternalTrainingLearnerMetricsResponse> resolve(
            @RequestHeader(
                    name = SERVICE_KEY_HEADER,
                    required = false
            ) String serviceKey,
            @PathVariable Long trainingId,
            @Valid @RequestBody InternalTrainingLearnerMetricsRequest request
    ) {
        keyValidator.validate(serviceKey);

        return reportingService.resolve(
                trainingId,
                request.getLearnerIds()
        );
    }
}
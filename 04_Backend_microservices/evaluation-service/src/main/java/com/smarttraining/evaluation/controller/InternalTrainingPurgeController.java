package com.smarttraining.evaluation.controller;

import com.smarttraining.evaluation.security.InternalServiceKeyValidator;
import com.smarttraining.evaluation.service.TrainingDataPurgeService;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/evaluation/internal/trainings")
public class InternalTrainingPurgeController {

    private static final String SERVICE_KEY_HEADER =
            "X-SmartTraining-Service-Key";

    private final InternalServiceKeyValidator serviceKeyValidator;
    private final TrainingDataPurgeService purgeService;

    public InternalTrainingPurgeController(
            InternalServiceKeyValidator serviceKeyValidator,
            TrainingDataPurgeService purgeService
    ) {
        this.serviceKeyValidator = serviceKeyValidator;
        this.purgeService = purgeService;
    }

    @DeleteMapping("/{trainingId}")
    public Map<String, Object> purgeTraining(
            @RequestHeader(SERVICE_KEY_HEADER) String serviceKey,
            @PathVariable Long trainingId
    ) {
        serviceKeyValidator.validate(serviceKey);

        long deletedRows = purgeService.purgeTraining(trainingId);

        return Map.of(
                "trainingId", trainingId,
                "deletedRows", deletedRows,
                "idempotent", true
        );
    }
}
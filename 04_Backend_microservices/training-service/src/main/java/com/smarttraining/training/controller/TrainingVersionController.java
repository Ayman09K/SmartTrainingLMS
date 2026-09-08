package com.smarttraining.training.controller;

import com.smarttraining.training.dto.TrainingVersionResponse;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.repository.TrainingRepository;
import com.smarttraining.training.security.TrainingOwnershipService;
import com.smarttraining.training.service.TrainingVersionService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/trainings/{trainingId}/versions")
public class TrainingVersionController {

    private final TrainingRepository trainingRepository;
    private final TrainingOwnershipService ownershipService;
    private final TrainingVersionService versionService;

    public TrainingVersionController(
            TrainingRepository trainingRepository,
            TrainingOwnershipService ownershipService,
            TrainingVersionService versionService
    ) {
        this.trainingRepository = trainingRepository;
        this.ownershipService = ownershipService;
        this.versionService = versionService;
    }

    @GetMapping
    public List<TrainingVersionResponse> listVersions(@PathVariable Long trainingId) {
        Training training = requireManagedTraining(trainingId);
        ownershipService.assertCanManageTraining(training);
        return versionService.listVersions(trainingId);
    }

    @GetMapping("/{versionNumber}")
    public TrainingVersionResponse getVersion(
            @PathVariable Long trainingId,
            @PathVariable Integer versionNumber
    ) {
        Training training = requireManagedTraining(trainingId);
        ownershipService.assertCanManageTraining(training);
        return versionService.getVersion(trainingId, versionNumber);
    }

    private Training requireManagedTraining(Long trainingId) {
        return trainingRepository.findById(trainingId)
                .orElseThrow(() -> new IllegalArgumentException("Formation introuvable"));
    }
}

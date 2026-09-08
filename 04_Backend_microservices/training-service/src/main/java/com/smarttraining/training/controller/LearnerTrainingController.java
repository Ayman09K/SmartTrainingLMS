package com.smarttraining.training.controller;

import com.smarttraining.training.dto.LearnerMyTrainingResponse;
import com.smarttraining.training.dto.LearnerTrainingContentResponse;
import com.smarttraining.training.service.LearnerContentService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/trainings/learner")
public class LearnerTrainingController {

    private final LearnerContentService learnerContentService;

    public LearnerTrainingController(
            LearnerContentService learnerContentService
    ) {
        this.learnerContentService = learnerContentService;
    }

    /**
     * Liste des formations de l'apprenant authentifié.
     * Aucun learnerId n'est accepté depuis le client.
     */
    @GetMapping("/me")
    public ResponseEntity<List<LearnerMyTrainingResponse>> getMyTrainings() {
        return ResponseEntity.ok(
                learnerContentService.getMyTrainings()
        );
    }

    /**
     * Lecteur pédagogique sécurisé d'une formation réellement inscrite.
     */
    @GetMapping("/me/{trainingId}/full")
    public ResponseEntity<LearnerTrainingContentResponse> getMyTrainingContent(
            @PathVariable Long trainingId
    ) {
        return ResponseEntity.ok(
                learnerContentService.getMyTrainingContent(trainingId)
        );
    }
}
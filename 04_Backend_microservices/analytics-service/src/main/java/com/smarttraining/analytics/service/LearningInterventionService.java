package com.smarttraining.analytics.service;

import com.smarttraining.analytics.dto.InterventionRequest;
import com.smarttraining.analytics.dto.InterventionResponse;
import com.smarttraining.analytics.entity.LearningIntervention;
import com.smarttraining.analytics.enums.ActionSource;
import com.smarttraining.analytics.enums.InterventionStatus;
import com.smarttraining.analytics.repository.LearningInterventionRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class LearningInterventionService {
    private final LearningInterventionRepository learningInterventionRepository;

    public LearningInterventionService(
            LearningInterventionRepository learningInterventionRepository) {
        this.learningInterventionRepository = learningInterventionRepository;
    }

    @Transactional
    public InterventionResponse createIntervention(InterventionRequest request) {
        ActionSource source = request.getSource();
        if (source == null) {
            source = ActionSource.MANUAL;
        }

        LearningIntervention intervention = new LearningIntervention(
                request.getLearnerId(),
                request.getTrainerId(),
                request.getTrainingId(),
                request.getInterventionType(),
                request.getNote(),
                source);
        return new InterventionResponse(learningInterventionRepository.save(intervention));
    }

    public InterventionResponse getInterventionById(Long interventionId) {
        return new InterventionResponse(getInterventionEntity(interventionId));
    }

    public List<InterventionResponse> getInterventionsByLearner(Long learnerId) {
        return learningInterventionRepository.findByLearnerIdOrderByCreatedAtDesc(learnerId)
                .stream().map(InterventionResponse::new).toList();
    }

    public List<InterventionResponse> getInterventionsByTrainer(Long trainerId) {
        return learningInterventionRepository.findByTrainerIdOrderByCreatedAtDesc(trainerId)
                .stream().map(InterventionResponse::new).toList();
    }

    public List<InterventionResponse> getInterventionsByTraining(Long trainingId) {
        return learningInterventionRepository.findByTrainingIdOrderByCreatedAtDesc(trainingId)
                .stream().map(InterventionResponse::new).toList();
    }

    public List<InterventionResponse> getInterventionsByStatus(InterventionStatus status) {
        return learningInterventionRepository.findByStatusOrderByCreatedAtDesc(status)
                .stream().map(InterventionResponse::new).toList();
    }

    @Transactional
    public InterventionResponse markDone(Long interventionId) {
        LearningIntervention intervention = getInterventionEntity(interventionId);
        intervention.markDone();
        return new InterventionResponse(learningInterventionRepository.save(intervention));
    }

    @Transactional
    public InterventionResponse markCancelled(Long interventionId) {
        LearningIntervention intervention = getInterventionEntity(interventionId);
        intervention.markCancelled();
        return new InterventionResponse(learningInterventionRepository.save(intervention));
    }

    private LearningIntervention getInterventionEntity(Long interventionId) {
        return learningInterventionRepository.findById(interventionId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Intervention introuvable avec id=" + interventionId));
    }
}

package com.smarttraining.evaluation.controller;

import com.smarttraining.evaluation.dto.ScoreResponse;
import com.smarttraining.evaluation.service.EvaluationOwnershipService;
import com.smarttraining.evaluation.service.EvaluationService;
import java.util.List;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/scores")
public class ScoreController {

    private final EvaluationService service;
    private final EvaluationOwnershipService ownership;

    public ScoreController(
            EvaluationService service,
            EvaluationOwnershipService ownership
    ) {
        this.service = service;
        this.ownership = ownership;
    }

    @GetMapping("/learner/{id}")
    public List<ScoreResponse> learner(
            @PathVariable Long id,
            JwtAuthenticationToken authentication
    ) {
        return ownership.filterManageableScores(
                service.getScoresByLearner(id),
                authentication
        );
    }

    @GetMapping("/quiz/{id}")
    public List<ScoreResponse> quiz(
            @PathVariable Long id,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageQuiz(id, authentication);
        return service.getScoresByQuiz(id);
    }

    @GetMapping("/learner/{learnerId}/quiz/{quizId}")
    public List<ScoreResponse> both(
            @PathVariable Long learnerId,
            @PathVariable Long quizId,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageQuiz(quizId, authentication);
        return service.getScoresByLearnerAndQuiz(learnerId, quizId);
    }
}

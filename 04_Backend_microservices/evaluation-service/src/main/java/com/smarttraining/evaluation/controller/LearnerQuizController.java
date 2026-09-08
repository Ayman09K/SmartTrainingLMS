package com.smarttraining.evaluation.controller;

import com.smarttraining.evaluation.dto.LearnerQuizResponse;
import com.smarttraining.evaluation.service.LearnerEvaluationService;
import java.util.List;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/quizzes/learner")
public class LearnerQuizController {

    private final LearnerEvaluationService learnerEvaluationService;

    public LearnerQuizController(
            LearnerEvaluationService learnerEvaluationService
    ) {
        this.learnerEvaluationService = learnerEvaluationService;
    }

    @GetMapping("/me/training/{trainingId}")
    public List<LearnerQuizResponse> getPublishedForTraining(
            @PathVariable Long trainingId,
            JwtAuthenticationToken authentication
    ) {
        return learnerEvaluationService.getPublishedForTraining(
                trainingId,
                authentication
        );
    }

    @GetMapping("/me/{quizId}")
    public LearnerQuizResponse getQuiz(
            @PathVariable Long quizId,
            JwtAuthenticationToken authentication
    ) {
        return learnerEvaluationService.getQuiz(
                quizId,
                authentication
        );
    }
}

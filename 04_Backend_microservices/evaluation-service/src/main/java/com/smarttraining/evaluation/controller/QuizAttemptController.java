package com.smarttraining.evaluation.controller;

import com.smarttraining.evaluation.dto.QuizAttemptFullResponse;
import com.smarttraining.evaluation.dto.QuizAttemptResponse;
import com.smarttraining.evaluation.dto.StartAttemptRequest;
import com.smarttraining.evaluation.dto.SubmitAttemptRequest;
import com.smarttraining.evaluation.service.EvaluationOwnershipService;
import com.smarttraining.evaluation.service.EvaluationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/attempts")
public class QuizAttemptController {

    private final EvaluationService service;
    private final EvaluationOwnershipService ownership;

    public QuizAttemptController(
            EvaluationService service,
            EvaluationOwnershipService ownership
    ) {
        this.service = service;
        this.ownership = ownership;
    }

    @PostMapping("/start")
    public QuizAttemptResponse start(
            @Valid @RequestBody StartAttemptRequest request,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageQuiz(request.getQuizId(), authentication);
        return service.startAttempt(request);
    }

    @PostMapping("/{id}/submit")
    public QuizAttemptFullResponse submit(
            @PathVariable Long id,
            @Valid @RequestBody SubmitAttemptRequest request,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageAttempt(id, authentication);
        return service.submitAttempt(id, request);
    }

    @GetMapping("/{id}")
    public QuizAttemptFullResponse get(
            @PathVariable Long id,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageAttempt(id, authentication);
        return service.getAttemptFullDetails(id);
    }

    @GetMapping("/learner/{id}")
    public List<QuizAttemptResponse> learner(
            @PathVariable Long id,
            JwtAuthenticationToken authentication
    ) {
        return ownership.filterManageableAttempts(
                service.getAttemptsByLearner(id),
                authentication
        );
    }

    @GetMapping("/quiz/{id}")
    public List<QuizAttemptResponse> quiz(
            @PathVariable Long id,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageQuiz(id, authentication);
        return service.getAttemptsByQuiz(id);
    }

    @GetMapping("/learner/{learnerId}/quiz/{quizId}")
    public List<QuizAttemptResponse> both(
            @PathVariable Long learnerId,
            @PathVariable Long quizId,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageQuiz(quizId, authentication);
        return service.getAttemptsByLearnerAndQuiz(learnerId, quizId);
    }
}

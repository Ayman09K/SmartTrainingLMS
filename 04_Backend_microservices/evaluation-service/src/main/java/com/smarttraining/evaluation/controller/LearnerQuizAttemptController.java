package com.smarttraining.evaluation.controller;

import com.smarttraining.evaluation.dto.LearnerQuizAttemptResultResponse;
import com.smarttraining.evaluation.dto.LearnerStartAttemptRequest;
import com.smarttraining.evaluation.dto.QuizAttemptResponse;
import com.smarttraining.evaluation.dto.SubmitAttemptRequest;
import com.smarttraining.evaluation.service.LearnerEvaluationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/attempts/learner")
public class LearnerQuizAttemptController {

    private final LearnerEvaluationService learnerEvaluationService;

    public LearnerQuizAttemptController(
            LearnerEvaluationService learnerEvaluationService
    ) {
        this.learnerEvaluationService = learnerEvaluationService;
    }

    @PostMapping("/me/start")
    public QuizAttemptResponse start(
            @Valid @RequestBody LearnerStartAttemptRequest request,
            JwtAuthenticationToken authentication
    ) {
        return learnerEvaluationService.start(
                request,
                authentication
        );
    }

    @PostMapping("/me/{attemptId}/submit")
    public LearnerQuizAttemptResultResponse submit(
            @PathVariable Long attemptId,
            @Valid @RequestBody SubmitAttemptRequest request,
            JwtAuthenticationToken authentication
    ) {
        return learnerEvaluationService.submit(
                attemptId,
                request,
                authentication
        );
    }

    @GetMapping("/me")
    public List<QuizAttemptResponse> getMyAttempts(
            JwtAuthenticationToken authentication
    ) {
        return learnerEvaluationService.getMyAttempts(authentication);
    }

    @GetMapping("/me/quiz/{quizId}")
    public List<QuizAttemptResponse> getMyAttemptsForQuiz(
            @PathVariable Long quizId,
            JwtAuthenticationToken authentication
    ) {
        return learnerEvaluationService.getMyAttemptsForQuiz(
                quizId,
                authentication
        );
    }

    @GetMapping("/me/{attemptId}")
    public LearnerQuizAttemptResultResponse getAttempt(
            @PathVariable Long attemptId,
            JwtAuthenticationToken authentication
    ) {
        return learnerEvaluationService.getAttempt(
                attemptId,
                authentication
        );
    }
}
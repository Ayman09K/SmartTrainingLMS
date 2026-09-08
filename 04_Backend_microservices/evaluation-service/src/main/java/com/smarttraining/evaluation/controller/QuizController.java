package com.smarttraining.evaluation.controller;

import com.smarttraining.evaluation.dto.QuizFullResponse;
import com.smarttraining.evaluation.dto.QuizRequest;
import com.smarttraining.evaluation.dto.QuizResponse;
import com.smarttraining.evaluation.service.EvaluationOwnershipService;
import com.smarttraining.evaluation.service.EvaluationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/quizzes")
public class QuizController {

    private final EvaluationService service;
    private final EvaluationOwnershipService ownership;

    public QuizController(
            EvaluationService service,
            EvaluationOwnershipService ownership
    ) {
        this.service = service;
        this.ownership = ownership;
    }

    @PostMapping
    public QuizResponse createQuiz(
            @Valid @RequestBody QuizRequest request,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageTrainingAndModule(
                request.getTrainingId(),
                request.getModuleId(),
                authentication
        );
        return service.createQuiz(request);
    }

    @GetMapping
    public List<QuizResponse> getAllQuizzes(
            JwtAuthenticationToken authentication
    ) {
        return ownership.filterManageableQuizzes(
                service.getAllQuizzes(),
                authentication
        );
    }

    @GetMapping("/{id}")
    public QuizResponse getQuizById(
            @PathVariable Long id,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageQuiz(id, authentication);
        return service.getQuizById(id);
    }

    @GetMapping("/{id}/full")
    public QuizFullResponse getQuizFullDetails(
            @PathVariable Long id,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageQuiz(id, authentication);
        return service.getQuizFullDetails(id);
    }

    @GetMapping("/training/{id}")
    public List<QuizResponse> getQuizzesByTraining(
            @PathVariable Long id,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageTraining(id, authentication);
        return service.getQuizzesByTraining(id);
    }

    @GetMapping("/training/{id}/published")
    public List<QuizResponse> getPublishedQuizzesByTraining(
            @PathVariable Long id,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageTraining(id, authentication);
        return service.getPublishedQuizzesByTraining(id);
    }

    @GetMapping("/module/{id}")
    public List<QuizResponse> getQuizzesByModule(
            @PathVariable Long id,
            JwtAuthenticationToken authentication
    ) {
        return ownership.filterManageableQuizzes(
                service.getQuizzesByModule(id),
                authentication
        );
    }

    @PutMapping("/{id}")
    public QuizResponse updateQuiz(
            @PathVariable Long id,
            @Valid @RequestBody QuizRequest request,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageQuiz(id, authentication);
        ownership.assertCanManageTrainingAndModule(
                request.getTrainingId(),
                request.getModuleId(),
                authentication
        );
        return service.updateQuiz(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteQuiz(
            @PathVariable Long id,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageQuiz(id, authentication);
        service.deleteQuiz(id);
    }
}

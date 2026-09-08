package com.smarttraining.evaluation.controller;

import com.smarttraining.evaluation.dto.QuestionRequest;
import com.smarttraining.evaluation.dto.QuestionResponse;
import com.smarttraining.evaluation.service.EvaluationOwnershipService;
import com.smarttraining.evaluation.service.EvaluationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/questions")
public class QuestionController {

    private final EvaluationService service;
    private final EvaluationOwnershipService ownership;

    public QuestionController(
            EvaluationService service,
            EvaluationOwnershipService ownership
    ) {
        this.service = service;
        this.ownership = ownership;
    }

    @PostMapping
    public QuestionResponse createQuestion(
            @Valid @RequestBody QuestionRequest request,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageQuiz(request.getQuizId(), authentication);
        return service.createQuestion(request);
    }

    @GetMapping("/quiz/{id}")
    public List<QuestionResponse> getQuestionsByQuiz(
            @PathVariable Long id,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageQuiz(id, authentication);
        return service.getQuestionsByQuiz(id);
    }

    @GetMapping("/{id}")
    public QuestionResponse getQuestionById(
            @PathVariable Long id,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageQuestion(id, authentication);
        return service.getQuestionById(id);
    }

    @PutMapping("/{id}")
    public QuestionResponse updateQuestion(
            @PathVariable Long id,
            @Valid @RequestBody QuestionRequest request,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageQuestion(id, authentication);
        ownership.assertCanManageQuiz(request.getQuizId(), authentication);
        return service.updateQuestion(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteQuestion(
            @PathVariable Long id,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageQuestion(id, authentication);
        service.deleteQuestion(id);
    }
}

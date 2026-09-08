package com.smarttraining.evaluation.controller;

import com.smarttraining.evaluation.dto.AnswerOptionRequest;
import com.smarttraining.evaluation.dto.AnswerOptionResponse;
import com.smarttraining.evaluation.service.EvaluationOwnershipService;
import com.smarttraining.evaluation.service.EvaluationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/options")
public class AnswerOptionController {

    private final EvaluationService service;
    private final EvaluationOwnershipService ownership;

    public AnswerOptionController(
            EvaluationService service,
            EvaluationOwnershipService ownership
    ) {
        this.service = service;
        this.ownership = ownership;
    }

    @PostMapping
    public AnswerOptionResponse createAnswerOption(
            @Valid @RequestBody AnswerOptionRequest request,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageQuestion(
                request.getQuestionId(),
                authentication
        );
        return service.createAnswerOption(request);
    }

    @GetMapping("/question/{id}")
    public List<AnswerOptionResponse> getOptionsByQuestion(
            @PathVariable Long id,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageQuestion(id, authentication);
        return service.getOptionsByQuestion(id);
    }

    @PutMapping("/{id}")
    public AnswerOptionResponse updateAnswerOption(
            @PathVariable Long id,
            @Valid @RequestBody AnswerOptionRequest request,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageOption(id, authentication);
        ownership.assertCanManageQuestion(
                request.getQuestionId(),
                authentication
        );
        return service.updateAnswerOption(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteAnswerOption(
            @PathVariable Long id,
            JwtAuthenticationToken authentication
    ) {
        ownership.assertCanManageOption(id, authentication);
        service.deleteAnswerOption(id);
    }
}

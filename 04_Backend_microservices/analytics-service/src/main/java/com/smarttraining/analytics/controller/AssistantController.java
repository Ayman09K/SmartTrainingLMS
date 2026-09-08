package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.AssistantChatRequest;
import com.smarttraining.analytics.dto.AssistantChatResponse;
import com.smarttraining.analytics.dto.AssistantConversationResponse;
import com.smarttraining.analytics.dto.AssistantMessageResponse;
import com.smarttraining.analytics.security.AuthenticatedUser;
import com.smarttraining.analytics.service.AssistantService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/analytics/assistant")
public class AssistantController {

    private final AssistantService assistantService;

    public AssistantController(
            AssistantService assistantService
    ) {
        this.assistantService = assistantService;
    }

    @PostMapping("/chat")
    public AssistantChatResponse chat(
            @Valid @RequestBody AssistantChatRequest request,
            JwtAuthenticationToken authentication
    ) {
        AuthenticatedUser actor =
                AuthenticatedUser.from(authentication);

        return assistantService.chat(
                request,
                actor,
                authentication.getToken().getTokenValue()
        );
    }

    @GetMapping("/conversations")
    public List<AssistantConversationResponse> conversations(
            @RequestParam(defaultValue = "30")
            @Min(1)
            @Max(50)
            int limit,
            JwtAuthenticationToken authentication
    ) {
        return assistantService.getConversations(
            AuthenticatedUser.from(authentication),
            limit
        );
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public List<AssistantMessageResponse> messages(
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "100")
            @Min(1)
            @Max(200)
            int limit,
            JwtAuthenticationToken authentication
    ) {
        return assistantService.getMessages(
            conversationId,
            AuthenticatedUser.from(authentication),
            limit
        );
    }

    @DeleteMapping("/conversations/{conversationId}")
    public ResponseEntity<Void> deleteConversation(
            @PathVariable Long conversationId,
            JwtAuthenticationToken authentication
    ) {
        assistantService.deleteConversation(
            conversationId,
            AuthenticatedUser.from(authentication)
        );
        return ResponseEntity.noContent().build();
    }
}

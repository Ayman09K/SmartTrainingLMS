package com.smarttraining.analytics.service;

import com.smarttraining.analytics.dto.AiAssistantRequest;
import com.smarttraining.analytics.dto.AiAssistantResponse;
import com.smarttraining.analytics.dto.AssistantChatRequest;
import com.smarttraining.analytics.dto.AssistantChatResponse;
import com.smarttraining.analytics.dto.AssistantConversationResponse;
import com.smarttraining.analytics.dto.AssistantHistoryMessage;
import com.smarttraining.analytics.dto.AssistantMessageResponse;
import com.smarttraining.analytics.entity.AssistantConversation;
import com.smarttraining.analytics.entity.AssistantMessage;
import com.smarttraining.analytics.repository.AssistantConversationRepository;
import com.smarttraining.analytics.repository.AssistantMessageRepository;
import com.smarttraining.analytics.security.AuthenticatedUser;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssistantService {

    private static final Set<String> ALLOWED_ROLES =
            Set.of("APPRENANT", "FORMATEUR", "ADMIN");

    private static final int LLM_HISTORY_LIMIT = 8;
    private static final int LLM_HISTORY_CONTENT_LIMIT = 1500;
    private static final int TITLE_LIMIT = 120;

    private final AssistantContextService contextService;
    private final AiAssistantClient aiAssistantClient;
    private final AssistantConversationRepository conversationRepository;
    private final AssistantMessageRepository messageRepository;

    public AssistantService(
            AssistantContextService contextService,
            AiAssistantClient aiAssistantClient,
            AssistantConversationRepository conversationRepository,
            AssistantMessageRepository messageRepository
    ) {
        this.contextService = contextService;
        this.aiAssistantClient = aiAssistantClient;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
    }

    public AssistantChatResponse chat(
            AssistantChatRequest request,
            AuthenticatedUser actor,
            String jwtToken
    ) {
        requireAllowedActor(actor);

        String message = request.getMessage().trim();

        AssistantConversation conversation =
                resolveConversation(
                    request.getConversationId(),
                    actor.getUserId(),
                    message
                );

        List<AssistantHistoryMessage> persistedHistory =
                loadHistoryForGemini(conversation.getId());

        AssistantMessage userMessage = new AssistantMessage(
            conversation,
            "USER",
            message,
            request.getTrainingId(),
            request.getLessonId(),
            request.getSurface(),
            null,
            false
        );
        messageRepository.save(userMessage);

        conversation.touch();
        conversationRepository.save(conversation);

        String learningContext = contextService.build(
                request,
                actor,
                jwtToken
        );

        AiAssistantRequest aiRequest = new AiAssistantRequest();
        aiRequest.setRole(actor.getRole());
        aiRequest.setMessage(message);
        aiRequest.setLearningContext(learningContext);
        aiRequest.setSurface(request.getSurface());

        /*
         * Security boundary:
         * never trust the conversation history sent by Web/Mobile.
         * Gemini receives only messages reloaded from the authenticated
         * owner's persisted conversation.
         */
        aiRequest.setHistory(persistedHistory);

        AiAssistantResponse aiResponse =
                aiAssistantClient.chat(aiRequest);

        if (
            aiResponse == null
            || aiResponse.getAnswer() == null
            || aiResponse.getAnswer().isBlank()
        ) {
            throw new IllegalStateException(
                "Réponse vide de l'assistant IA."
            );
        }

        String answer = aiResponse.getAnswer().trim();

        AssistantMessage assistantMessage = new AssistantMessage(
            conversation,
            "ASSISTANT",
            answer,
            request.getTrainingId(),
            request.getLessonId(),
            request.getSurface(),
            aiResponse.getModel(),
            aiResponse.isContextUsed()
        );
        messageRepository.save(assistantMessage);

        conversation.touch();
        conversationRepository.save(conversation);

        return new AssistantChatResponse(
            answer,
            aiResponse.getModel(),
            aiResponse.isContextUsed(),
            conversation.getId()
        );
    }

    public List<AssistantConversationResponse> getConversations(
            AuthenticatedUser actor,
            int limit
    ) {
        requireAllowedActor(actor);

        return conversationRepository
            .findByUserIdOrderByUpdatedAtDesc(
                actor.getUserId(),
                PageRequest.of(0, limit)
            )
            .stream()
            .map(this::toConversationResponse)
            .toList();
    }

    public List<AssistantMessageResponse> getMessages(
            Long conversationId,
            AuthenticatedUser actor,
            int limit
    ) {
        requireAllowedActor(actor);

        AssistantConversation conversation =
                requireOwnedConversation(
                    conversationId,
                    actor.getUserId()
                );

        List<AssistantMessage> newestFirst =
                messageRepository
                    .findByConversation_IdOrderByCreatedAtDesc(
                        conversation.getId(),
                        PageRequest.of(0, limit)
                    );

        List<AssistantMessage> chronological =
                new ArrayList<>(newestFirst);
        Collections.reverse(chronological);

        return chronological
            .stream()
            .map(this::toMessageResponse)
            .toList();
    }

    @Transactional
    public void deleteConversation(
            Long conversationId,
            AuthenticatedUser actor
    ) {
        requireAllowedActor(actor);

        AssistantConversation conversation =
                requireOwnedConversation(
                    conversationId,
                    actor.getUserId()
                );

        messageRepository.deleteByConversation_Id(
            conversation.getId()
        );
        conversationRepository.delete(conversation);
    }

    private AssistantConversation resolveConversation(
            Long conversationId,
            Long userId,
            String firstMessage
    ) {
        if (conversationId == null) {
            return conversationRepository.save(
                new AssistantConversation(
                    userId,
                    deriveTitle(firstMessage)
                )
            );
        }

        return requireOwnedConversation(
            conversationId,
            userId
        );
    }

    private AssistantConversation requireOwnedConversation(
            Long conversationId,
            Long userId
    ) {
        if (conversationId == null || conversationId <= 0) {
            throw new AccessDeniedException(
                "Conversation Assistant inaccessible."
            );
        }

        return conversationRepository
            .findByIdAndUserId(conversationId, userId)
            .orElseThrow(() ->
                new AccessDeniedException(
                    "Conversation Assistant inaccessible."
                )
            );
    }

    private List<AssistantHistoryMessage> loadHistoryForGemini(
            Long conversationId
    ) {
        List<AssistantMessage> newestFirst =
                messageRepository
                    .findByConversation_IdOrderByCreatedAtDesc(
                        conversationId,
                        PageRequest.of(0, LLM_HISTORY_LIMIT)
                    );

        List<AssistantMessage> chronological =
                new ArrayList<>(newestFirst);
        Collections.reverse(chronological);

        return chronological
            .stream()
            .map(message ->
                new AssistantHistoryMessage(
                    "ASSISTANT".equals(message.getRole())
                        ? "assistant"
                        : "user",
                    limitHistoryContent(message.getContent())
                )
            )
            .toList();
    }

    private String limitHistoryContent(String content) {
        if (content == null) {
            return "";
        }

        String cleaned = content.trim();

        if (cleaned.length() <= LLM_HISTORY_CONTENT_LIMIT) {
            return cleaned;
        }

        return cleaned.substring(
            0,
            LLM_HISTORY_CONTENT_LIMIT
        );
    }

    private String deriveTitle(String message) {
        String cleaned = message
            .replaceAll("\\s+", " ")
            .trim();

        if (cleaned.isBlank()) {
            return "Nouvelle conversation";
        }

        if (cleaned.length() <= TITLE_LIMIT) {
            return cleaned;
        }

        return cleaned.substring(
            0,
            TITLE_LIMIT - 1
        ).trim() + "…";
    }

    private AssistantConversationResponse toConversationResponse(
            AssistantConversation conversation
    ) {
        return new AssistantConversationResponse(
            conversation.getId(),
            conversation.getTitle(),
            conversation.getCreatedAt(),
            conversation.getUpdatedAt()
        );
    }

    private AssistantMessageResponse toMessageResponse(
            AssistantMessage message
    ) {
        return new AssistantMessageResponse(
            message.getId(),
            "ASSISTANT".equals(message.getRole())
                ? "assistant"
                : "user",
            message.getContent(),
            message.getTrainingId(),
            message.getLessonId(),
            message.getSurface(),
            message.getModel(),
            message.isContextUsed(),
            message.getCreatedAt()
        );
    }

    private void requireAllowedActor(
            AuthenticatedUser actor
    ) {
        if (
            actor == null
            || !ALLOWED_ROLES.contains(actor.getRole())
        ) {
            throw new AccessDeniedException(
                "Accès à l'assistant interdit."
            );
        }
    }
}

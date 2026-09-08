package com.smarttraining.analytics.repository;

import com.smarttraining.analytics.entity.AssistantMessage;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssistantMessageRepository
        extends JpaRepository<AssistantMessage, Long> {

    List<AssistantMessage> findByConversation_IdOrderByCreatedAtDesc(
        Long conversationId,
        Pageable pageable
    );

    void deleteByConversation_Id(Long conversationId);
}

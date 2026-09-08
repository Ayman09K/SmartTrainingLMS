package com.smarttraining.analytics.repository;

import com.smarttraining.analytics.entity.AssistantConversation;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssistantConversationRepository
        extends JpaRepository<AssistantConversation, Long> {

    Optional<AssistantConversation> findByIdAndUserId(
        Long id,
        Long userId
    );

    Page<AssistantConversation> findByUserIdOrderByUpdatedAtDesc(
        Long userId,
        Pageable pageable
    );
}

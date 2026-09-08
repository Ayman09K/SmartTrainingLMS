package com.smarttraining.auth.repository;

import com.smarttraining.auth.entity.AccountDeletionRequest;
import com.smarttraining.auth.enums.AccountDeletionRequestStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountDeletionRequestRepository
        extends JpaRepository<AccountDeletionRequest, Long> {

    Optional<AccountDeletionRequest> findFirstByUserIdOrderByRequestedAtDesc(Long userId);

    Optional<AccountDeletionRequest> findFirstByUserIdAndStatusInOrderByRequestedAtDesc(
            Long userId,
            Collection<AccountDeletionRequestStatus> statuses
    );

    List<AccountDeletionRequest> findAllByOrderByRequestedAtDesc();

    List<AccountDeletionRequest> findByStatusOrderByRequestedAtDesc(
            AccountDeletionRequestStatus status
    );
}

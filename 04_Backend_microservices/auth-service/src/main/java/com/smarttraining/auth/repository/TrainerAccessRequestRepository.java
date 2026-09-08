package com.smarttraining.auth.repository;

import com.smarttraining.auth.entity.TrainerAccessRequest;
import com.smarttraining.auth.enums.TrainerRequestStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainerAccessRequestRepository extends JpaRepository<TrainerAccessRequest, Long> {

    List<TrainerAccessRequest> findAllByOrderByRequestedAtDesc();

    List<TrainerAccessRequest> findByStatusOrderByRequestedAtDesc(TrainerRequestStatus status);

    List<TrainerAccessRequest> findByRequesterIdOrderByRequestedAtDesc(Long requesterId);

    Optional<TrainerAccessRequest> findFirstByRequesterIdAndStatusOrderByRequestedAtDesc(
            Long requesterId,
            TrainerRequestStatus status
    );
}

package com.smarttraining.training.repository;

import com.smarttraining.training.entity.LearnerGroupMember;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerGroupMemberRepository
        extends JpaRepository<LearnerGroupMember, Long> {

    List<LearnerGroupMember> findByGroup_IdOrderByAddedAtAsc(
            Long groupId
    );

    long countByGroup_Id(Long groupId);

    boolean existsByGroup_IdAndLearnerId(
            Long groupId,
            Long learnerId
    );

    Optional<LearnerGroupMember> findByGroup_IdAndLearnerId(
            Long groupId,
            Long learnerId
    );

    void deleteByGroup_Id(Long groupId);
}

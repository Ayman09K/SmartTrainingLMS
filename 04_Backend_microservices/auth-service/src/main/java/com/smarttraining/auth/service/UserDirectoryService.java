package com.smarttraining.auth.service;

import com.smarttraining.auth.dto.UserResponse;
import com.smarttraining.auth.entity.User;
import com.smarttraining.auth.enums.AccountStatus;
import com.smarttraining.auth.enums.UserRole;
import com.smarttraining.auth.repository.UserRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserDirectoryService {

    private static final int DEFAULT_LIMIT = 30;
    private static final int MAX_LIMIT = 100;

    private static final Set<UserRole> LEARNER_CAPABLE_ROLES =
            Set.of(
                    UserRole.APPRENANT,
                    UserRole.FORMATEUR,
                    UserRole.ADMIN
            );

    private final UserRepository userRepository;

    public UserDirectoryService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> searchActiveLearners(
            String query,
            Integer requestedLimit
    ) {
        String normalizedQuery =
                query == null ? "" : query.trim();

        int limit = normalizeLimit(requestedLimit);

        return userRepository
                .searchActiveUsersByRoles(
                        LEARNER_CAPABLE_ROLES,
                        AccountStatus.ACTIVE,
                        normalizedQuery,
                        PageRequest.of(0, limit)
                )
                .stream()
                .map(UserResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getLearner(Long learnerId) {
        if (learnerId == null || learnerId <= 0) {
            throw new IllegalArgumentException(
                    "Identifiant apprenant invalide"
            );
        }

        User learner = userRepository.findById(learnerId)
                .filter(
                        user ->
                            LEARNER_CAPABLE_ROLES.contains(
                                    user.getRole()
                            )
                )
                .filter(
                        user ->
                            Boolean.TRUE.equals(
                                    user.getEnabled()
                            )
                )
                .filter(
                        user ->
                            user.getAccountStatus()
                                    == AccountStatus.ACTIVE
                )
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Apprenant introuvable"
                        )
                );

        return new UserResponse(learner);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> resolveLearners(
            List<Long> learnerIds
    ) {
        if (learnerIds == null || learnerIds.isEmpty()) {
            return List.of();
        }

        List<Long> uniqueIds =
                learnerIds.stream()
                        .filter(
                                id ->
                                    id != null
                                    && id > 0
                        )
                        .distinct()
                        .limit(200)
                        .toList();

        List<User> learners =
                userRepository
                        .findActiveUsersByIdInAndRoleIn(
                                uniqueIds,
                                LEARNER_CAPABLE_ROLES,
                                AccountStatus.ACTIVE
                        );

        Map<Long, User> byId = new LinkedHashMap<>();

        learners.forEach(
                learner ->
                    byId.put(
                            learner.getId(),
                            learner
                    )
        );

        return uniqueIds.stream()
                .map(byId::get)
                .filter(java.util.Objects::nonNull)
                .map(UserResponse::new)
                .toList();
    }

    private int normalizeLimit(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit <= 0) {
            return DEFAULT_LIMIT;
        }

        return Math.min(requestedLimit, MAX_LIMIT);
    }
}

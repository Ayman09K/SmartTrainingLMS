package com.smarttraining.training.security;

import com.smarttraining.training.entity.LearningPath;
import com.smarttraining.training.repository.LearningPathRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
public class LearningPathOwnershipService {

    private final AuthenticatedUserService authenticatedUserService;
    private final LearningPathRepository pathRepository;

    public LearningPathOwnershipService(
            AuthenticatedUserService authenticatedUserService,
            LearningPathRepository pathRepository
    ) {
        this.authenticatedUserService = authenticatedUserService;
        this.pathRepository = pathRepository;
    }

    public Long getActorId() {
        return authenticatedUserService.getUserId();
    }

    public String getActorRole() {
        return authenticatedUserService.getRole();
    }

    public boolean isAdmin() {
        return "ADMIN".equals(getActorRole());
    }

    public boolean isTrainer() {
        return "FORMATEUR".equals(getActorRole());
    }

    public void requireAdminOrTrainer() {
        String role = getActorRole();

        if (!"ADMIN".equals(role) && !"FORMATEUR".equals(role)) {
            throw new AccessDeniedException(
                    "Cette action est reservee aux administrateurs et formateurs"
            );
        }
    }

    public void assertCanManagePath(LearningPath path) {
        requireAdminOrTrainer();

        if (isAdmin()) {
            return;
        }

        if (path == null
                || path.getId() == null
                || pathRepository.countManageablePath(
                        path.getId(),
                        getActorId()
                ) == 0) {
            throw new AccessDeniedException(
                    "Vous ne pouvez gerer que vos propres parcours"
            );
        }
    }
}
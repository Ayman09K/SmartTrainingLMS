package com.smarttraining.training.security;

import com.smarttraining.training.entity.Lesson;
import com.smarttraining.training.entity.PedagogicalResource;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.entity.TrainingModule;
import com.smarttraining.training.repository.LessonRepository;
import com.smarttraining.training.repository.PedagogicalResourceRepository;
import com.smarttraining.training.repository.TrainingModuleRepository;
import com.smarttraining.training.repository.TrainingRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
public class TrainingOwnershipService {

    private final AuthenticatedUserService authenticatedUserService;
    private final TrainingRepository trainingRepository;
    private final TrainingModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final PedagogicalResourceRepository resourceRepository;

    public TrainingOwnershipService(
            AuthenticatedUserService authenticatedUserService,
            TrainingRepository trainingRepository,
            TrainingModuleRepository moduleRepository,
            LessonRepository lessonRepository,
            PedagogicalResourceRepository resourceRepository
    ) {
        this.authenticatedUserService = authenticatedUserService;
        this.trainingRepository = trainingRepository;
        this.moduleRepository = moduleRepository;
        this.lessonRepository = lessonRepository;
        this.resourceRepository = resourceRepository;
    }

    public Long getActorId() {
        return authenticatedUserService.getUserId();
    }

    public String getActorRole() {
        return authenticatedUserService.getRole();
    }

    public String getActorSubject() {
        return authenticatedUserService.getSubject();
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

    public void assertCanManageTrainingId(Long trainingId) {
        requireAdminOrTrainer();

        if (isAdmin()) {
            return;
        }

        if (trainingId == null
                || trainingRepository.countManageableTraining(
                        trainingId,
                        getActorId()
                ) == 0) {
            throw ownershipDenied();
        }
    }

    public void assertCanManageTraining(Training training) {
        if (training == null || training.getId() == null) {
            throw ownershipDenied();
        }

        assertCanManageTrainingId(training.getId());
    }

    public void assertCanManageModule(TrainingModule module) {
        requireAdminOrTrainer();

        if (isAdmin()) {
            return;
        }

        if (module == null
                || module.getId() == null
                || moduleRepository.countManageableModule(
                        module.getId(),
                        getActorId()
                ) == 0) {
            throw ownershipDenied();
        }
    }

    public void assertCanManageLesson(Lesson lesson) {
        requireAdminOrTrainer();

        if (isAdmin()) {
            return;
        }

        if (lesson == null
                || lesson.getId() == null
                || lessonRepository.countManageableLesson(
                        lesson.getId(),
                        getActorId()
                ) == 0) {
            throw ownershipDenied();
        }
    }

    public void assertCanManageResource(PedagogicalResource resource) {
        requireAdminOrTrainer();

        if (isAdmin()) {
            return;
        }

        if (resource == null
                || resource.getId() == null
                || resourceRepository.countManageableResource(
                        resource.getId(),
                        getActorId()
                ) == 0) {
            throw ownershipDenied();
        }
    }

    private AccessDeniedException ownershipDenied() {
        return new AccessDeniedException(
                "Vous ne pouvez gerer que les contenus de vos propres formations"
        );
    }
}

package com.smarttraining.training.service;

import com.smarttraining.training.repository.TrainingDeletionOutboxRepository;

import com.smarttraining.training.entity.TrainingDeletionOutbox;

import com.smarttraining.training.enums.EnrollmentSource;
import com.smarttraining.training.enums.EnrollmentStatus;

import com.smarttraining.training.dto.EnrollmentRequest;
import com.smarttraining.training.dto.EnrollmentResponse;
import com.smarttraining.training.dto.FullLessonResponse;
import com.smarttraining.training.dto.FullModuleResponse;
import com.smarttraining.training.dto.FullTrainingResponse;
import com.smarttraining.training.dto.LessonRequest;
import com.smarttraining.training.dto.LessonResponse;
import com.smarttraining.training.dto.ModuleRequest;
import com.smarttraining.training.dto.ModuleResponse;
import com.smarttraining.training.dto.ResourceRequest;
import com.smarttraining.training.dto.ResourceResponse;
import com.smarttraining.training.dto.TrainingRequest;
import com.smarttraining.training.dto.TrainingResponse;
import com.smarttraining.training.entity.Enrollment;
import com.smarttraining.training.entity.Lesson;
import com.smarttraining.training.entity.PedagogicalResource;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.entity.TrainingCategory;
import com.smarttraining.training.entity.TrainingModule;
import com.smarttraining.training.enums.EnrollmentMode;
import com.smarttraining.training.enums.StorageMode;
import com.smarttraining.training.enums.TrainingStatus;
import com.smarttraining.training.enums.TrainingVisibility;
import com.smarttraining.training.repository.EnrollmentRepository;
import com.smarttraining.training.repository.LessonRepository;
import com.smarttraining.training.repository.PedagogicalResourceRepository;
import com.smarttraining.training.repository.ScormPackageRepository;
import com.smarttraining.training.repository.TrainingModuleRepository;
import com.smarttraining.training.repository.TrainingRepository;
import com.smarttraining.training.repository.TrainingCategoryRepository;
import com.smarttraining.training.security.TrainingOwnershipService;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class TrainingService {

    private final TrainingRepository trainingRepository;
    private final TrainingCategoryRepository categoryRepository;
    private final TrainingModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final PedagogicalResourceRepository resourceRepository;
    private final ScormPackageRepository scormPackageRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final TrainingOwnershipService ownershipService;
    private final TrainingVersionService versionService;
    private final EntityManager entityManager;
    private final TrainingDeletionOutboxRepository deletionOutboxRepository;

    public TrainingService(
            TrainingRepository trainingRepository,
            TrainingCategoryRepository categoryRepository,
            TrainingModuleRepository moduleRepository,
            LessonRepository lessonRepository,
            PedagogicalResourceRepository resourceRepository,
            ScormPackageRepository scormPackageRepository,
            EnrollmentRepository enrollmentRepository,
            TrainingOwnershipService ownershipService,
            TrainingVersionService versionService,
            EntityManager entityManager,
            TrainingDeletionOutboxRepository deletionOutboxRepository
    ) {
        this.trainingRepository = trainingRepository;
        this.categoryRepository = categoryRepository;
        this.moduleRepository = moduleRepository;
        this.lessonRepository = lessonRepository;
        this.resourceRepository = resourceRepository;
        this.scormPackageRepository = scormPackageRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.ownershipService = ownershipService;
        this.versionService = versionService;
        this.entityManager = entityManager;
        this.deletionOutboxRepository = deletionOutboxRepository;
    }

    public TrainingResponse createTraining(TrainingRequest request) {
        ownershipService.requireAdminOrTrainer();

        Training training = new Training();
        applyTrainingRequest(training, request, true);

        // B7: la creation passe toujours par un brouillon.
        training.setStatus(TrainingStatus.DRAFT);

        if (ownershipService.isTrainer()) {
            Long actorId = ownershipService.getActorId();
            training.setTrainerId(actorId);
            training.setOwnerId(actorId);
        }

        Training savedTraining = trainingRepository.save(training);
        return new TrainingResponse(savedTraining);
    }

    public List<TrainingResponse> getAllTrainings() {
        ownershipService.requireAdminOrTrainer();

        return trainingRepository.findAll()
                .stream()
                .map(TrainingResponse::new)
                .toList();
    }

    public List<TrainingResponse> getAdminTrainings() {
        return getAllTrainings();
    }

    public List<TrainingResponse> getCatalogTrainings() {
        return trainingRepository
                .findByStatusAndVisibilityIn(
                        TrainingStatus.PUBLISHED,
                        List.of(TrainingVisibility.PUBLIC)
                )
                .stream()
                .map(TrainingResponse::new)
                .toList();
    }

    public TrainingResponse getTrainingById(Long id) {
        Training training = findTraining(id);

        // Le DTO historique TrainingResponse contient des champs internes.
        // Il reste donc réservé au staff ; l'apprenant utilise les routes SELF/JWT.
        assertCanReadTraining(training);

        return new TrainingResponse(training);
    }

    public List<TrainingResponse> getTrainingsByTrainer(Long trainerId) {
        String role = ownershipService.getActorRole();

        if ("FORMATEUR".equals(role)
                && !ownershipService.getActorId().equals(trainerId)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Un formateur ne peut consulter que ses propres formations"
            );
        }

        if (!"ADMIN".equals(role) && !"FORMATEUR".equals(role)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Cette vue est reservee aux administrateurs et formateurs"
            );
        }

        return trainingRepository.findByTrainerId(trainerId)
                .stream()
                .map(TrainingResponse::new)
                .toList();
    }

    public List<TrainingResponse> getPublishedTrainings() {
        ownershipService.requireAdminOrTrainer();

        return trainingRepository.findByStatus(TrainingStatus.PUBLISHED)
                .stream()
                .map(TrainingResponse::new)
                .toList();
    }

    public List<TrainingResponse> searchTrainings(String keyword) {
        ownershipService.requireAdminOrTrainer();

        if (keyword == null || keyword.isBlank()) {
            return getCatalogTrainings();
        }

        return trainingRepository.findByTitleContainingIgnoreCase(keyword)
                .stream()
                .map(TrainingResponse::new)
                .toList();
    }

    public List<TrainingResponse> getTrainingsByCategory(String category) {
        ownershipService.requireAdminOrTrainer();

        if (category == null || category.isBlank()) {
            return getCatalogTrainings();
        }

        return trainingRepository.findByCategoryIgnoreCase(category)
                .stream()
                .map(TrainingResponse::new)
                .toList();
    }

    public TrainingResponse updateTraining(Long id, TrainingRequest request) {
        Training training = findTraining(id);
        ownershipService.assertCanManageTraining(training);
        versionService.requireEditable(training);

        Long existingTrainerId = training.getTrainerId();
        Long existingOwnerId = training.getOwnerId();
        TrainingStatus existingStatus = training.getStatus();

        applyTrainingRequest(training, request, false);

        // Le statut ne se change jamais via le formulaire generique.
        training.setStatus(existingStatus);

        if (ownershipService.isTrainer()) {
            training.setTrainerId(existingTrainerId);
            training.setOwnerId(existingOwnerId);
        }

        Training savedTraining = trainingRepository.save(training);
        return new TrainingResponse(savedTraining);
    }

    @Transactional
    public TrainingResponse publishTraining(Long id) {
        Training training = findTraining(id);
        ownershipService.assertCanManageTraining(training);

        versionService.publishSnapshot(training, ownershipService.getActorId());
        training.publish();

        Training savedTraining = trainingRepository.save(training);
        return new TrainingResponse(savedTraining);
    }

    @Transactional
    public TrainingResponse archiveTraining(Long id) {
        Training training = findTraining(id);
        ownershipService.assertCanManageTraining(training);

        versionService.captureLegacyPublishedIfMissing(
                training,
                ownershipService.getActorId()
        );
        versionService.archiveCurrentPublished(training);
        training.archive();

        Training savedTraining = trainingRepository.save(training);
        return new TrainingResponse(savedTraining);
    }

    @Transactional
    public TrainingResponse moveTrainingToDraft(Long id) {
        Training training = findTraining(id);
        ownershipService.assertCanManageTraining(training);

        // Pour une ancienne formation publiee avant B7, conserver d'abord
        // une baseline immutable avant d'autoriser les modifications.
        versionService.captureLegacyPublishedIfMissing(
                training,
                ownershipService.getActorId()
        );

        training.moveToDraft();

        Training savedTraining = trainingRepository.save(training);
        return new TrainingResponse(savedTraining);
    }

    public void deleteTraining(Long id) {
        Training training = findTraining(id);
        ownershipService.assertCanManageTraining(training);

        TrainingStatus status = training.getStatus() == null
                ? TrainingStatus.DRAFT
                : training.getStatus().normalized();

        if (status != TrainingStatus.DRAFT && status != TrainingStatus.ARCHIVED) {
            throw new IllegalArgumentException(
                    "Une formation publiee doit etre archivee ou remise en brouillon avant suppression definitive."
            );
        }

        deletionOutboxRepository.save(
                TrainingDeletionOutbox.pending(id)
        );

        deleteTrainingDependencies(id);

        trainingRepository.delete(training);
        trainingRepository.flush();
    }

    private void deleteTrainingDependencies(Long trainingId) {
        List<Long> attemptIds = entityManager.createQuery(
                        "select a.id from ScormAttempt a where a.trainingId = :trainingId",
                        Long.class
                )
                .setParameter("trainingId", trainingId)
                .getResultList();

        if (!attemptIds.isEmpty()) {
            entityManager.createQuery(
                            "delete from ScormInteraction i where i.attemptId in :attemptIds"
                    )
                    .setParameter("attemptIds", attemptIds)
                    .executeUpdate();

            entityManager.createQuery(
                            "delete from ScormObjective o where o.attemptId in :attemptIds"
                    )
                    .setParameter("attemptIds", attemptIds)
                    .executeUpdate();

            entityManager.createQuery(
                            "delete from ScormLaunchSession s where s.attemptId in :attemptIds"
                    )
                    .setParameter("attemptIds", attemptIds)
                    .executeUpdate();

            entityManager.createQuery(
                            "delete from ScormRuntimeCommit c where c.attemptId in :attemptIds"
                    )
                    .setParameter("attemptIds", attemptIds)
                    .executeUpdate();

            entityManager.createQuery(
                            "delete from ScormRuntimeValue v where v.attemptId in :attemptIds"
                    )
                    .setParameter("attemptIds", attemptIds)
                    .executeUpdate();
        }

        entityManager.createQuery(
                        "delete from ScormAttempt a where a.trainingId = :trainingId"
                )
                .setParameter("trainingId", trainingId)
                .executeUpdate();

        List<Long> lessonIds = entityManager.createQuery(
                        "select l.id from Lesson l where l.module.training.id = :trainingId",
                        Long.class
                )
                .setParameter("trainingId", trainingId)
                .getResultList();

        if (!lessonIds.isEmpty()) {
            entityManager.createQuery(
                            "delete from ScormPackage p where p.lesson.id in :lessonIds"
                    )
                    .setParameter("lessonIds", lessonIds)
                    .executeUpdate();
        }

        entityManager.createQuery(
                        "delete from Enrollment e where e.training.id = :trainingId"
                )
                .setParameter("trainingId", trainingId)
                .executeUpdate();

        entityManager.createQuery(
                        "delete from TrainingAccessRequest r where r.training.id = :trainingId"
                )
                .setParameter("trainingId", trainingId)
                .executeUpdate();

        entityManager.createQuery(
                        "delete from TrainingInvitation i where i.training.id = :trainingId"
                )
                .setParameter("trainingId", trainingId)
                .executeUpdate();

        entityManager.createQuery(
                        "delete from TrainingVersion v where v.training.id = :trainingId"
                )
                .setParameter("trainingId", trainingId)
                .executeUpdate();

        entityManager.flush();
    }

    public ModuleResponse createModule(ModuleRequest request) {
        Training training = findTraining(request.getTrainingId());
        ownershipService.assertCanManageTraining(training);
        versionService.requireEditable(training);

        TrainingModule module = new TrainingModule(
                request.getTitle(),
                request.getDescription(),
                request.getOrderIndex(),
                training
        );
        module.setRequired(request.getRequired() == null ? Boolean.TRUE : request.getRequired());
        module.setEstimatedDurationMinutes(request.getEstimatedDurationMinutes());

        TrainingModule savedModule = moduleRepository.save(module);
        return new ModuleResponse(savedModule);
    }

    public List<ModuleResponse> getModulesByTraining(Long trainingId) {
        Training training = findTraining(trainingId);
        assertCanReadTraining(training);

        return moduleRepository.findByTrainingIdOrderByOrderIndexAsc(trainingId)
                .stream()
                .map(ModuleResponse::new)
                .toList();
    }

    public ModuleResponse getModuleById(Long moduleId) {
        TrainingModule module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new IllegalArgumentException("Module introuvable"));

        assertCanReadTraining(module.getTraining());
        return new ModuleResponse(module);
    }

    public ModuleResponse updateModule(Long moduleId, ModuleRequest request) {
        TrainingModule module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new IllegalArgumentException("Module introuvable"));
        ownershipService.assertCanManageModule(module);
        versionService.requireEditable(module);

        Training training = findTraining(request.getTrainingId());
        ownershipService.assertCanManageTraining(training);
        versionService.requireEditable(training);

        if (!module.getTraining().getId().equals(training.getId())) {
            throw new IllegalArgumentException(
                    "Un module ne peut pas etre deplace vers une autre formation"
            );
        }

        module.setTitle(request.getTitle());
        module.setDescription(request.getDescription());
        module.setOrderIndex(request.getOrderIndex());
        module.setRequired(request.getRequired() == null ? Boolean.TRUE : request.getRequired());
        module.setEstimatedDurationMinutes(request.getEstimatedDurationMinutes());

        TrainingModule savedModule = moduleRepository.save(module);
        return new ModuleResponse(savedModule);
    }

    public void deleteModule(Long moduleId) {
        TrainingModule module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new IllegalArgumentException("Module introuvable"));

        ownershipService.assertCanManageModule(module);
        versionService.requireEditable(module);
        moduleRepository.delete(module);
    }

    public LessonResponse createLesson(LessonRequest request) {
        TrainingModule module = moduleRepository.findById(request.getModuleId())
                .orElseThrow(() -> new IllegalArgumentException("Module introuvable"));
        ownershipService.assertCanManageModule(module);
        versionService.requireEditable(module);

        Lesson lesson = new Lesson(
                request.getTitle(),
                request.getContent(),
                request.getOrderIndex(),
                request.getEstimatedDurationMinutes(),
                module
        );
        lesson.setDescription(request.getDescription());
        lesson.setObjective(request.getObjective());
        lesson.setRequired(request.getRequired() == null ? Boolean.TRUE : request.getRequired());
        if (request.getCompletionRule() != null) {
            lesson.setCompletionRule(request.getCompletionRule());
        }

        Lesson savedLesson = lessonRepository.save(lesson);
        return new LessonResponse(savedLesson);
    }

    public List<LessonResponse> getLessonsByModule(Long moduleId) {
        TrainingModule module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new IllegalArgumentException("Module introuvable"));

        assertCanReadTraining(module.getTraining());

        return lessonRepository.findByModuleIdOrderByOrderIndexAsc(moduleId)
                .stream()
                .map(LessonResponse::new)
                .toList();
    }

    public LessonResponse getLessonById(Long lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Lecon introuvable"));

        assertCanReadTraining(lesson.getModule().getTraining());
        return new LessonResponse(lesson);
    }

    public LessonResponse updateLesson(Long lessonId, LessonRequest request) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Lecon introuvable"));
        ownershipService.assertCanManageLesson(lesson);
        versionService.requireEditable(lesson);

        TrainingModule module = moduleRepository.findById(request.getModuleId())
                .orElseThrow(() -> new IllegalArgumentException("Module introuvable"));
        ownershipService.assertCanManageModule(module);
        versionService.requireEditable(module);

        if (!lesson.getModule().getTraining().getId()
                .equals(module.getTraining().getId())) {
            throw new IllegalArgumentException(
                    "Une lecon ne peut etre deplacee qu'entre les modules de la meme formation"
            );
        }

        lesson.setTitle(request.getTitle());
        lesson.setDescription(request.getDescription());
        lesson.setObjective(request.getObjective());
        lesson.setContent(request.getContent());
        lesson.setOrderIndex(request.getOrderIndex());
        lesson.setEstimatedDurationMinutes(request.getEstimatedDurationMinutes());
        lesson.setRequired(request.getRequired() == null ? Boolean.TRUE : request.getRequired());
        if (request.getCompletionRule() != null) {
            lesson.setCompletionRule(request.getCompletionRule());
        }
        lesson.setModule(module);

        Lesson savedLesson = lessonRepository.save(lesson);
        return new LessonResponse(savedLesson);
    }

    public void deleteLesson(Long lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Lecon introuvable"));

        ownershipService.assertCanManageLesson(lesson);
        versionService.requireEditable(lesson);
        scormPackageRepository.deleteAll(
                scormPackageRepository.findByLessonIdOrderByUploadedAtDesc(lessonId)
        );
        scormPackageRepository.flush();

        lessonRepository.delete(lesson);
    }

    public ResourceResponse createResource(ResourceRequest request) {
        Lesson lesson = lessonRepository.findById(request.getLessonId())
                .orElseThrow(() -> new IllegalArgumentException("Lecon introuvable"));
        ownershipService.assertCanManageLesson(lesson);
        versionService.requireEditable(lesson);

        PedagogicalResource resource = new PedagogicalResource();
        applyResourceRequest(resource, request, lesson);

        PedagogicalResource savedResource = resourceRepository.save(resource);
        return new ResourceResponse(savedResource);
    }

    public List<ResourceResponse> getResourcesByLesson(Long lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new IllegalArgumentException("Lecon introuvable"));

        assertCanReadTraining(lesson.getModule().getTraining());

        return resourceRepository.findByLessonIdOrderByOrderIndexAsc(lessonId)
                .stream()
                .map(ResourceResponse::new)
                .toList();
    }

    public ResourceResponse getResourceById(Long resourceId) {
        PedagogicalResource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new IllegalArgumentException("Ressource introuvable"));

        assertCanReadTraining(
                resource.getLesson().getModule().getTraining()
        );

        return new ResourceResponse(resource);
    }

    public ResourceResponse updateResource(Long resourceId, ResourceRequest request) {
        PedagogicalResource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new IllegalArgumentException("Ressource introuvable"));
        ownershipService.assertCanManageResource(resource);
        versionService.requireEditable(resource);

        Lesson lesson = lessonRepository.findById(request.getLessonId())
                .orElseThrow(() -> new IllegalArgumentException("Lecon introuvable"));
        ownershipService.assertCanManageLesson(lesson);
        versionService.requireEditable(lesson);

        if (!resource.getLesson().getModule().getTraining().getId()
                .equals(lesson.getModule().getTraining().getId())) {
            throw new IllegalArgumentException(
                    "Une ressource ne peut etre deplacee que dans la meme formation"
            );
        }

        applyResourceRequest(resource, request, lesson);

        PedagogicalResource savedResource = resourceRepository.save(resource);
        return new ResourceResponse(savedResource);
    }

    public void deleteResource(Long resourceId) {
        PedagogicalResource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new IllegalArgumentException("Ressource introuvable"));

        ownershipService.assertCanManageResource(resource);
        versionService.requireEditable(resource);
        resourceRepository.delete(resource);
    }

    public EnrollmentResponse enrollLearner(EnrollmentRequest request) {
        ownershipService.requireAdminOrTrainer();

        Training training = findTraining(request.getTrainingId());
        ownershipService.assertCanManageTraining(training);

        if (request.getDueAt() != null
                && !request.getDueAt().isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException(
                    "L'echeance doit etre dans le futur"
            );
        }

        EnrollmentSource source = ownershipService.isAdmin()
                ? EnrollmentSource.ADMIN_ASSIGNMENT
                : EnrollmentSource.TRAINER_ASSIGNMENT;

        Enrollment enrollment = enrollmentRepository
                .findByLearnerIdAndTrainingId(
                        request.getLearnerId(),
                        request.getTrainingId()
                )
                .map(existing -> {
                    if (existing.getStatus() != EnrollmentStatus.CANCELLED) {
                        throw new IllegalArgumentException(
                                "Cet apprenant est deja affecte a cette formation"
                        );
                    }

                    existing.reactivate();
                    return existing;
                })
                .orElseGet(() -> new Enrollment(
                        request.getLearnerId(),
                        training,
                        source
                ));

        enrollment.setSource(source);
        enrollment.setAssignedBy(ownershipService.getActorId());
        enrollment.setAccessCodeUsed(null);
        enrollment.setInvitationToken(null);
        enrollment.setDueAt(request.getDueAt());

        Enrollment savedEnrollment = enrollmentRepository.save(enrollment);
        return new EnrollmentResponse(savedEnrollment);
    }

    public List<EnrollmentResponse> getEnrollmentsByLearner(Long learnerId) {
        String role = ownershipService.getActorRole();
        Long actorId = ownershipService.getActorId();

        if (actorId.equals(learnerId)) {
            return enrollmentRepository.findByLearnerIdWithTraining(learnerId)
                    .stream()
                    .map(EnrollmentResponse::new)
                    .toList();
        }

        if ("APPRENANT".equals(role)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Un apprenant ne peut consulter que ses propres inscriptions"
            );
        }

        if ("ADMIN".equals(role)) {
            return enrollmentRepository.findByLearnerIdWithTraining(learnerId)
                    .stream()
                    .map(EnrollmentResponse::new)
                    .toList();
        }

        if ("FORMATEUR".equals(role)) {
            return enrollmentRepository.findManagedByLearnerIdWithTraining(
                            learnerId,
                            actorId
                    )
                    .stream()
                    .map(EnrollmentResponse::new)
                    .toList();
        }

        throw new org.springframework.security.access.AccessDeniedException(
                "Role non autorise"
        );
    }

    public List<EnrollmentResponse> getEnrollmentsByTraining(Long trainingId) {
        ownershipService.assertCanManageTrainingId(trainingId);

        return enrollmentRepository.findByTrainingIdWithTraining(trainingId)
                .stream()
                .map(EnrollmentResponse::new)
                .toList();
    }

    public void deleteEnrollment(Long enrollmentId) {
        ownershipService.requireAdminOrTrainer();

        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Affectation introuvable")
                );

        if (!ownershipService.isAdmin()
                && enrollmentRepository.countManageableEnrollment(
                        enrollmentId,
                        ownershipService.getActorId()
                ) == 0) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Vous ne pouvez supprimer que les inscriptions de vos formations"
            );
        }

        if (enrollment.getStatus() != EnrollmentStatus.CANCELLED) {
            enrollment.cancel();
            enrollmentRepository.save(enrollment);
        }
    }

    public FullTrainingResponse getFullTrainingById(Long trainingId) {
        Training training = findTraining(trainingId);

        // Le DTO FullTrainingResponse historique contient des ResourceResponse
        // trop larges pour constituer le contrat produit d'un apprenant.
        ownershipService.assertCanManageTraining(training);

        List<TrainingModule> modules =
                moduleRepository.findByTrainingIdOrderByOrderIndexAsc(trainingId);

        List<FullModuleResponse> moduleResponses = modules.stream()
                .map(module -> {
                    List<Lesson> lessons =
                            lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId());

                    List<FullLessonResponse> lessonResponses = lessons.stream()
                            .map(lesson -> {
                                List<ResourceResponse> resourceResponses =
                                        resourceRepository
                                                .findByLessonIdOrderByOrderIndexAsc(lesson.getId())
                                                .stream()
                                                .map(ResourceResponse::new)
                                                .toList();

                                return new FullLessonResponse(
                                        lesson,
                                        resourceResponses
                                );
                            })
                            .toList();

                    return new FullModuleResponse(module, lessonResponses);
                })
                .toList();

        return new FullTrainingResponse(training, moduleResponses);
    }

    private void assertCanReadTraining(Training training) {
        // Tous les anciens DTO de lecture sont réservés au staff.
        // Les apprenants passent uniquement par LearnerTrainingController,
        // qui construit des DTO dédiés sans secrets ni chemins internes.
        ownershipService.assertCanManageTraining(training);
    }

    private Training findTraining(Long trainingId) {
        return trainingRepository.findById(trainingId)
                .orElseThrow(() -> new IllegalArgumentException("Formation introuvable"));
    }

    private void applyTrainingRequest(Training training, TrainingRequest request, boolean creation) {
        TrainingStatus status = request.getStatus();

        if (creation && status == null) {
            status = TrainingStatus.DRAFT;
        }

        training.setTrainerId(request.getTrainerId());
        training.setOwnerId(request.getOwnerId() == null ? request.getTrainerId() : request.getOwnerId());
        training.setTitle(request.getTitle());
        training.setShortDescription(request.getShortDescription());
        training.setDescription(request.getDescription());
        training.setObjectives(request.getObjectives());
        training.setPrerequisites(request.getPrerequisites());
        training.setTargetAudience(request.getTargetAudience());
        applyCategory(training, request);
        training.setLanguage(request.getLanguage() == null || request.getLanguage().isBlank() ? "fr" : request.getLanguage());
        training.setCoverImageUrl(request.getCoverImageUrl());
        training.setCoverImagePath(request.getCoverImagePath());
        training.setLevel(request.getLevel());
        training.setEstimatedDurationHours(request.getEstimatedDurationHours());

        if (status != null) {
            training.setStatus(status);
        }

        training.setVisibility(request.getVisibility() == null ? TrainingVisibility.PRIVATE : request.getVisibility());
        training.setEnrollmentMode(request.getEnrollmentMode() == null ? EnrollmentMode.ASSIGNMENT_ONLY : request.getEnrollmentMode());
        training.setAccessCode(request.getAccessCode());
        training.setMaxLearners(request.getMaxLearners());
    }

    private void applyCategory(Training training, TrainingRequest request) {
        TrainingCategory category;

        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(
                            () -> new IllegalArgumentException(
                                    "Categorie introuvable"
                            )
                    );
        } else if (
                request.getCategory() != null &&
                !request.getCategory().isBlank()
        ) {
            category = categoryRepository
                    .findByNameIgnoreCase(request.getCategory().trim())
                    .orElseThrow(
                            () -> new IllegalArgumentException(
                                    "Choisissez une categorie existante du referentiel"
                            )
                    );
        } else {
            throw new IllegalArgumentException(
                    "La categorie de la formation est obligatoire"
            );
        }

        boolean sameExistingCategory =
                training.getCategoryRef() != null &&
                training.getCategoryRef().getId() != null &&
                training.getCategoryRef().getId().equals(category.getId());

        if (
                !Boolean.TRUE.equals(category.getActive()) &&
                !sameExistingCategory
        ) {
            throw new IllegalArgumentException(
                    "Cette categorie est inactive et ne peut plus etre attribuee"
            );
        }

        training.setCategoryRef(category);
        training.setCategory(category.getName());
    }

    private void applyResourceRequest(PedagogicalResource resource, ResourceRequest request, Lesson lesson) {
        resource.setLesson(lesson);
        resource.setTitle(request.getTitle());
        resource.setDescription(request.getDescription());
        resource.setType(request.getType());
        resource.setStorageMode(request.getStorageMode());
        resource.setUrl(request.getUrl());
        resource.setTextContent(request.getTextContent());
        resource.setOriginalFileName(request.getOriginalFileName());
        resource.setStoredFileName(request.getStoredFileName());
        resource.setRelativePath(request.getRelativePath());
        resource.setPublicUrl(request.getPublicUrl());
        resource.setMimeType(request.getMimeType());
        resource.setFileSize(request.getFileSize());
        resource.setDurationSeconds(request.getDurationSeconds());
        resource.setUploadedBy(ownershipService.getActorId());
        resource.setScormPackageId(request.getScormPackageId());
        resource.setScormLaunchPath(request.getScormLaunchPath());
        resource.setScormManifestPath(request.getScormManifestPath());
        resource.setActive(request.getActive() == null ? Boolean.TRUE : request.getActive());

        if (request.getStorageMode() == null && request.getType() != null) {
            switch (request.getType().normalized()) {
                case TEXT -> resource.setStorageMode(StorageMode.TEXT_CONTENT);
                case SCORM -> resource.setStorageMode(StorageMode.SCORM_PACKAGE);
                case IMAGE, VIDEO, PDF, DOCUMENT -> resource.setStorageMode(StorageMode.LOCAL_FILE);
                default -> resource.setStorageMode(StorageMode.EXTERNAL_URL);
            }
        }

        resource.setOrderIndex(request.getOrderIndex());

        resource.setUploadedAt(LocalDateTime.now());
    }
}

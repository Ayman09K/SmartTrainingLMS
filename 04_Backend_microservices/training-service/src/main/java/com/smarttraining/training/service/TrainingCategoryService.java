package com.smarttraining.training.service;

import com.smarttraining.training.dto.TrainingCategoryRequest;
import com.smarttraining.training.dto.TrainingCategoryResponse;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.entity.TrainingCategory;
import com.smarttraining.training.repository.TrainingCategoryRepository;
import com.smarttraining.training.repository.TrainingRepository;
import com.smarttraining.training.security.TrainingOwnershipService;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class TrainingCategoryService {

    private final TrainingCategoryRepository categoryRepository;
    private final TrainingRepository trainingRepository;
    private final TrainingOwnershipService ownershipService;

    public TrainingCategoryService(
            TrainingCategoryRepository categoryRepository,
            TrainingRepository trainingRepository,
            TrainingOwnershipService ownershipService
    ) {
        this.categoryRepository = categoryRepository;
        this.trainingRepository = trainingRepository;
        this.ownershipService = ownershipService;
    }

    @Transactional(readOnly = true)
    public List<TrainingCategoryResponse> listActiveForStaff() {
        ownershipService.requireAdminOrTrainer();

        return categoryRepository.findByActiveTrueOrderBySortOrderAscNameAsc()
                .stream()
                .map(TrainingCategoryResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TrainingCategoryResponse> listAllForAdmin() {
        requireAdmin();

        return categoryRepository.findAllByOrderBySortOrderAscNameAsc()
                .stream()
                .map(TrainingCategoryResponse::new)
                .toList();
    }

    public TrainingCategoryResponse create(TrainingCategoryRequest request) {
        requireAdmin();

        String name = normalize(request.getName());

        if (categoryRepository.findByNameIgnoreCase(name).isPresent()) {
            throw new IllegalArgumentException(
                    "Une categorie portant ce nom existe deja"
            );
        }

        TrainingCategory category = new TrainingCategory(
                name,
                request.getActive(),
                request.getSortOrder()
        );

        return new TrainingCategoryResponse(
                categoryRepository.save(category)
        );
    }

    public TrainingCategoryResponse update(
            Long categoryId,
            TrainingCategoryRequest request
    ) {
        requireAdmin();

        TrainingCategory category = find(categoryId);
        String newName = normalize(request.getName());

        categoryRepository.findByNameIgnoreCase(newName)
                .filter(existing -> !existing.getId().equals(categoryId))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException(
                            "Une categorie portant ce nom existe deja"
                    );
                });

        boolean renameRequested =
                !category.getName().equalsIgnoreCase(newName);

        if (renameRequested) {
            List<Training> linked =
                    trainingRepository.findByCategoryRef_Id(categoryId);

            if (!linked.isEmpty()) {
                throw new IllegalArgumentException(
                        "Une categorie deja utilisee ne peut pas etre renommee. " +
                        "Desactivez-la et creez une nouvelle categorie."
                );
            }

            category.setName(newName);
        }

        if (request.getActive() != null) {
            category.setActive(request.getActive());
        }

        if (request.getSortOrder() != null) {
            category.setSortOrder(request.getSortOrder());
        }

        return new TrainingCategoryResponse(
                categoryRepository.save(category)
        );
    }

    private TrainingCategory find(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Categorie introuvable"
                        )
                );
    }

    private void requireAdmin() {
        if (!ownershipService.isAdmin()) {
            throw new AccessDeniedException(
                    "La gestion des categories est reservee aux administrateurs"
            );
        }
    }

    private String normalize(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Le nom de la categorie est obligatoire"
            );
        }

        return value.trim().replaceAll("\\s+", " ");
    }
}
package com.smarttraining.auth.controller;

import com.smarttraining.auth.dto.TrainerAccessRequestCreateRequest;
import com.smarttraining.auth.dto.TrainerAccessRequestResponse;
import com.smarttraining.auth.entity.TrainerAccessRequest;
import com.smarttraining.auth.entity.User;
import com.smarttraining.auth.enums.TrainerRequestStatus;
import com.smarttraining.auth.enums.UserRole;
import com.smarttraining.auth.repository.TrainerAccessRequestRepository;
import com.smarttraining.auth.repository.UserRepository;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.Locale;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth/trainer-requests")
public class TrainerAccessRequestController {

    private final TrainerAccessRequestRepository trainerAccessRequestRepository;
    private final UserRepository userRepository;

    public TrainerAccessRequestController(
            TrainerAccessRequestRepository trainerAccessRequestRepository,
            UserRepository userRepository
    ) {
        this.trainerAccessRequestRepository = trainerAccessRequestRepository;
        this.userRepository = userRepository;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<TrainerAccessRequestResponse> createRequest(
            Principal principal,
            @Valid @RequestBody TrainerAccessRequestCreateRequest request
    ) {
        User requester = getCurrentUser(principal);

        if (requester.getRole() == UserRole.FORMATEUR || requester.getRole() == UserRole.ADMIN) {
            throw new IllegalArgumentException("Ce compte possède déjà un rôle supérieur");
        }

        trainerAccessRequestRepository
                .findFirstByRequesterIdAndStatusOrderByRequestedAtDesc(
                        requester.getId(),
                        TrainerRequestStatus.PENDING
                )
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Une demande est déjà en attente");
                });

        TrainerAccessRequest trainerRequest = new TrainerAccessRequest(
                requester,
                request.getExpertiseDomain().trim(),
                request.getExperienceSummary() == null ? null : request.getExperienceSummary().trim(),
                request.getMotivation().trim()
        );

        TrainerAccessRequest savedRequest = trainerAccessRequestRepository.save(trainerRequest);
        return ResponseEntity.ok(new TrainerAccessRequestResponse(savedRequest));
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public ResponseEntity<List<TrainerAccessRequestResponse>> getMyRequests(Principal principal) {
        User requester = getCurrentUser(principal);

        List<TrainerAccessRequestResponse> responses = trainerAccessRequestRepository
                .findByRequesterIdOrderByRequestedAtDesc(requester.getId())
                .stream()
                .map(TrainerAccessRequestResponse::new)
                .toList();

        return ResponseEntity.ok(responses);
    }

    private User getCurrentUser(Principal principal) {
        if (principal == null) {
            throw new IllegalArgumentException("Utilisateur non authentifié");
        }

        String email = principal.getName().trim().toLowerCase(Locale.ROOT);

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
    }
}

package com.smarttraining.auth.controller;

import com.smarttraining.auth.dto.TrainerAccessRequestResponse;
import com.smarttraining.auth.dto.TrainerAccessRequestReviewRequest;
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
@RequestMapping("/auth/admin/trainer-requests")
public class AdminTrainerAccessRequestController {

    private final TrainerAccessRequestRepository trainerAccessRequestRepository;
    private final UserRepository userRepository;

    public AdminTrainerAccessRequestController(
            TrainerAccessRequestRepository trainerAccessRequestRepository,
            UserRepository userRepository
    ) {
        this.trainerAccessRequestRepository = trainerAccessRequestRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<TrainerAccessRequestResponse>> getRequests(
            @RequestParam(required = false) TrainerRequestStatus status
    ) {
        List<TrainerAccessRequest> requests = status == null
                ? trainerAccessRequestRepository.findAllByOrderByRequestedAtDesc()
                : trainerAccessRequestRepository.findByStatusOrderByRequestedAtDesc(status);

        List<TrainerAccessRequestResponse> responses = requests.stream()
                .map(TrainerAccessRequestResponse::new)
                .toList();

        return ResponseEntity.ok(responses);
    }

    @PutMapping("/{requestId}/approve")
    @Transactional
    public ResponseEntity<TrainerAccessRequestResponse> approve(
            Principal principal,
            @PathVariable Long requestId,
            @Valid @RequestBody TrainerAccessRequestReviewRequest reviewRequest
    ) {
        User reviewer = getCurrentAdmin(principal);

        TrainerAccessRequest request = trainerAccessRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Demande introuvable"));

        if (request.getStatus() != TrainerRequestStatus.PENDING) {
            throw new IllegalArgumentException("Cette demande n'est plus en attente");
        }

        User requester = request.getRequester();
        requester.setRole(UserRole.FORMATEUR);
        userRepository.save(requester);

        request.approve(reviewer, reviewRequest.getAdminComment());

        TrainerAccessRequest savedRequest = trainerAccessRequestRepository.save(request);
        return ResponseEntity.ok(new TrainerAccessRequestResponse(savedRequest));
    }

    @PutMapping("/{requestId}/reject")
    @Transactional
    public ResponseEntity<TrainerAccessRequestResponse> reject(
            Principal principal,
            @PathVariable Long requestId,
            @Valid @RequestBody TrainerAccessRequestReviewRequest reviewRequest
    ) {
        User reviewer = getCurrentAdmin(principal);

        TrainerAccessRequest request = trainerAccessRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Demande introuvable"));

        if (request.getStatus() != TrainerRequestStatus.PENDING) {
            throw new IllegalArgumentException("Cette demande n'est plus en attente");
        }

        request.reject(reviewer, reviewRequest.getAdminComment());

        TrainerAccessRequest savedRequest = trainerAccessRequestRepository.save(request);
        return ResponseEntity.ok(new TrainerAccessRequestResponse(savedRequest));
    }

    private User getCurrentAdmin(Principal principal) {
        if (principal == null) {
            throw new IllegalArgumentException("Administrateur non authentifié");
        }

        String email = principal.getName().trim().toLowerCase(Locale.ROOT);

        User admin = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Administrateur introuvable"));

        if (admin.getRole() != UserRole.ADMIN) {
            throw new IllegalArgumentException("Le compte connecté n'est pas administrateur");
        }

        return admin;
    }
}

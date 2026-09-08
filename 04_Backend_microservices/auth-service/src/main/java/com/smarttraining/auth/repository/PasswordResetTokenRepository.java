package com.smarttraining.auth.repository;

import com.smarttraining.auth.entity.PasswordResetToken;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface PasswordResetTokenRepository
        extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PasswordResetToken>
    findFirstByTokenHashAndUsedAtIsNull(String tokenHash);

    List<PasswordResetToken>
    findAllByUserIdAndUsedAtIsNull(Long userId);

    void deleteByExpiresAtBefore(LocalDateTime threshold);
}
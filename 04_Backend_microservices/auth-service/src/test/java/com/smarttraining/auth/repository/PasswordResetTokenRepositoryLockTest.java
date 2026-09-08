package com.smarttraining.auth.repository;

import static org.junit.jupiter.api.Assertions.*;

import jakarta.persistence.LockModeType;
import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Lock;

class PasswordResetTokenRepositoryLockTest {

    @Test
    void resetLookupUsesPessimisticWriteLock() throws Exception {
        Method method = PasswordResetTokenRepository.class.getMethod(
                "findFirstByTokenHashAndUsedAtIsNull",
                String.class
        );

        Lock lock = method.getAnnotation(Lock.class);

        assertNotNull(lock);
        assertEquals(LockModeType.PESSIMISTIC_WRITE, lock.value());
    }
}
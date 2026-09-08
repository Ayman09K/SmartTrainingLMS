package com.smarttraining.auth.service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PasswordResetRateLimiter {

    private static final int MAX_BUCKETS_BEFORE_CLEANUP = 10000;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final int maxRequests;
    private final long windowMillis;

    public PasswordResetRateLimiter(
            @Value("${SMARTTRAINING_AUTH_PASSWORD_RESET_RATE_LIMIT_MAX:5}")
            int maxRequests,
            @Value("${SMARTTRAINING_AUTH_PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS:900}")
            long windowSeconds
    ) {
        if (maxRequests < 1 || maxRequests > 100) {
            throw new IllegalArgumentException("PASSWORD_RESET_RATE_LIMIT_MAX invalide");
        }
        if (windowSeconds < 10 || windowSeconds > 86400) {
            throw new IllegalArgumentException("PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS invalide");
        }

        this.maxRequests = maxRequests;
        this.windowMillis = windowSeconds * 1000L;
    }

    public boolean tryAcquire(String clientKey) {
        String key = normalize(clientKey);
        long now = System.currentTimeMillis();

        if (buckets.size() > MAX_BUCKETS_BEFORE_CLEANUP) {
            cleanupExpired(now);
        }

        Bucket bucket = buckets.computeIfAbsent(key, ignored -> new Bucket(now));

        synchronized (bucket) {
            if (now - bucket.startedAt >= windowMillis) {
                bucket.startedAt = now;
                bucket.count = 0;
            }

            if (bucket.count >= maxRequests) {
                return false;
            }

            bucket.count++;
            return true;
        }
    }

    private String normalize(String clientKey) {
        if (clientKey == null || clientKey.isBlank()) {
            return "unknown";
        }

        String value = clientKey.trim();
        return value.length() <= 128 ? value : value.substring(0, 128);
    }

    private void cleanupExpired(long now) {
        buckets.entrySet().removeIf(entry -> {
            Bucket bucket = entry.getValue();
            synchronized (bucket) {
                return now - bucket.startedAt >= windowMillis;
            }
        });
    }

    private static final class Bucket {
        private long startedAt;
        private int count;

        private Bucket(long startedAt) {
            this.startedAt = startedAt;
        }
    }
}
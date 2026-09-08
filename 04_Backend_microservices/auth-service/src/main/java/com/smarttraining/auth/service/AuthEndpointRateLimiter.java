package com.smarttraining.auth.service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AuthEndpointRateLimiter {

    private static final int MAX_BUCKETS_BEFORE_CLEANUP = 20000;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    private final int loginMaxRequests;
    private final long loginWindowMillis;
    private final int registerMaxRequests;
    private final long registerWindowMillis;

    public AuthEndpointRateLimiter(
            @Value("${SMARTTRAINING_AUTH_LOGIN_RATE_LIMIT_MAX:5}")
            int loginMaxRequests,
            @Value("${SMARTTRAINING_AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS:900}")
            long loginWindowSeconds,
            @Value("${SMARTTRAINING_AUTH_REGISTER_RATE_LIMIT_MAX:5}")
            int registerMaxRequests,
            @Value("${SMARTTRAINING_AUTH_REGISTER_RATE_LIMIT_WINDOW_SECONDS:900}")
            long registerWindowSeconds
    ) {
        validate("LOGIN", loginMaxRequests, loginWindowSeconds);
        validate("REGISTER", registerMaxRequests, registerWindowSeconds);

        this.loginMaxRequests = loginMaxRequests;
        this.loginWindowMillis = loginWindowSeconds * 1000L;
        this.registerMaxRequests = registerMaxRequests;
        this.registerWindowMillis = registerWindowSeconds * 1000L;
    }

    public boolean tryAcquireLogin(String clientKey) {
        return tryAcquire(
                "login",
                clientKey,
                loginMaxRequests,
                loginWindowMillis
        );
    }

    public boolean tryAcquireRegister(String clientKey) {
        return tryAcquire(
                "register",
                clientKey,
                registerMaxRequests,
                registerWindowMillis
        );
    }

    private boolean tryAcquire(
            String scope,
            String clientKey,
            int maxRequests,
            long windowMillis
    ) {
        String key = scope + ":" + normalize(clientKey);
        long now = System.currentTimeMillis();

        if (buckets.size() > MAX_BUCKETS_BEFORE_CLEANUP) {
            cleanupExpired(now);
        }

        Bucket bucket = buckets.computeIfAbsent(
                key,
                ignored -> new Bucket(now, windowMillis)
        );

        synchronized (bucket) {
            if (now - bucket.startedAt >= bucket.windowMillis) {
                bucket.startedAt = now;
                bucket.count = 0;
                bucket.windowMillis = windowMillis;
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
        return value.length() <= 128
                ? value
                : value.substring(0, 128);
    }

    private void cleanupExpired(long now) {
        buckets.entrySet().removeIf(entry -> {
            Bucket bucket = entry.getValue();

            synchronized (bucket) {
                return now - bucket.startedAt >= bucket.windowMillis;
            }
        });
    }

    private void validate(
            String name,
            int maxRequests,
            long windowSeconds
    ) {
        if (maxRequests < 1 || maxRequests > 100) {
            throw new IllegalArgumentException(
                    name + "_RATE_LIMIT_MAX invalide"
            );
        }

        if (windowSeconds < 10 || windowSeconds > 86400) {
            throw new IllegalArgumentException(
                    name + "_RATE_LIMIT_WINDOW_SECONDS invalide"
            );
        }
    }

    private static final class Bucket {
        private long startedAt;
        private int count;
        private long windowMillis;

        private Bucket(long startedAt, long windowMillis) {
            this.startedAt = startedAt;
            this.windowMillis = windowMillis;
        }
    }
}
package com.smarttraining.auth.repository;

import com.smarttraining.auth.entity.UserPreference;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserPreferenceRepository
        extends JpaRepository<UserPreference, Long> {
}
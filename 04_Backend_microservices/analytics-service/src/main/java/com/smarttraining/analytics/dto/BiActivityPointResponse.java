package com.smarttraining.analytics.dto;

import java.time.LocalDate;

public record BiActivityPointResponse(
        LocalDate date,
        long totalEvents,
        long activeLearners
) {
}
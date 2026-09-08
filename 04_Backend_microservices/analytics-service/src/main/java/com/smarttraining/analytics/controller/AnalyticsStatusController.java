package com.smarttraining.analytics.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AnalyticsStatusController {
    @GetMapping("/analytics/status")
    public String status() {
        return "analytics-service is running";
    }
}

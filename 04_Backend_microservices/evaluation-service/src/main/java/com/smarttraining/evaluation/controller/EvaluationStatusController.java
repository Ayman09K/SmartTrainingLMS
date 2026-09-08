package com.smarttraining.evaluation.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class EvaluationStatusController {
    @GetMapping("/evaluation/status")
    public String status() {
        return "evaluation-service is running";
    }
}

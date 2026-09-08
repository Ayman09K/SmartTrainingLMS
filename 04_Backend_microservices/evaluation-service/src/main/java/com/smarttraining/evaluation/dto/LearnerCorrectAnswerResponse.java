package com.smarttraining.evaluation.dto;

import java.util.List;

public record LearnerCorrectAnswerResponse(
        List<LearnerAnswerOptionResponse> options,
        QuestionTypeConfigRequest typeConfig
) {
}

package com.smarttraining.evaluation.dto;

public record LearnerAnswerOptionResponse(
        Long id,
        String content,
        Integer orderIndex
) {
    public static LearnerAnswerOptionResponse from(
            AnswerOptionResponse option
    ) {
        return new LearnerAnswerOptionResponse(
                option.getId(),
                option.getContent(),
                option.getOrderIndex()
        );
    }
}

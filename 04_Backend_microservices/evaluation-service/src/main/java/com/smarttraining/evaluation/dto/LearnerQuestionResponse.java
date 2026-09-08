package com.smarttraining.evaluation.dto;

import com.smarttraining.evaluation.enums.QuestionType;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

public record LearnerQuestionResponse(
        Long id,
        String content,
        QuestionType type,
        Integer orderIndex,
        Integer points,
        List<LearnerAnswerOptionResponse> options,
        LearnerQuestionTypeConfigResponse typeConfig
) {
    public static LearnerQuestionResponse from(
            QuestionFullResponse question
    ) {
        return new LearnerQuestionResponse(
                question.getId(),
                question.getContent(),
                question.getType(),
                question.getOrderIndex(),
                question.getPoints(),
                question.getOptions() == null
                        ? List.of()
                        : question.getOptions()
                                .stream()
                                .map(LearnerAnswerOptionResponse::from)
                                .toList(),
                LearnerQuestionTypeConfigResponse.from(
                        question.getTypeConfig()
                )
        );
    }

    public LearnerQuestionResponse forPresentation(
            boolean shuffleAnswerOptions,
            long seed
    ) {
        List<LearnerAnswerOptionResponse> presentedOptions =
                options == null
                        ? List.of()
                        : List.copyOf(options);

        if (
                shuffleAnswerOptions
                && presentedOptions.size() > 1
        ) {
            List<LearnerAnswerOptionResponse> shuffled =
                    new ArrayList<>(presentedOptions);
            Collections.shuffle(
                    shuffled,
                    new Random(seed ^ 0x3A11L)
            );

            List<LearnerAnswerOptionResponse> normalized =
                    new ArrayList<>();

            for (int index = 0; index < shuffled.size(); index++) {
                LearnerAnswerOptionResponse option =
                        shuffled.get(index);

                normalized.add(
                        new LearnerAnswerOptionResponse(
                                option.id(),
                                option.content(),
                                index + 1
                        )
                );
            }

            presentedOptions = List.copyOf(normalized);
        }

        LearnerQuestionTypeConfigResponse presentedConfig =
                typeConfig == null
                        ? null
                        : typeConfig.scrambled(
                                seed ^ 0x6B29L
                        );

        return new LearnerQuestionResponse(
                id,
                content,
                type,
                orderIndex,
                points,
                presentedOptions,
                presentedConfig
        );
    }
}

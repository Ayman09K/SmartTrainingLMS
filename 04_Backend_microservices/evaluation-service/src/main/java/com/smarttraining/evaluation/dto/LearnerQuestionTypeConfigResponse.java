package com.smarttraining.evaluation.dto;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

public record LearnerQuestionTypeConfigResponse(
        Integer version,
        List<String> blankIds,
        List<DisplayItem> orderingItems,
        List<DisplayItem> matchingLeft,
        List<DisplayItem> matchingRight,
        List<DisplayItem> dragItems,
        List<DisplayItem> dragZones,
        String numericUnit
) {
    public record DisplayItem(String id, String text) {}

    public static LearnerQuestionTypeConfigResponse from(
            QuestionTypeConfigRequest config
    ) {
        if (config == null || config.hasNoSpecificConfig()) {
            return null;
        }

        List<String> blankIds =
                config.getFillBlank() == null
                        || config.getFillBlank().getBlanks() == null
                ? List.of()
                : config.getFillBlank().getBlanks().stream()
                        .map(QuestionTypeConfigRequest.BlankRule::getId)
                        .toList();

        List<DisplayItem> orderingItems =
                config.getOrdering() == null
                        || config.getOrdering().getItems() == null
                ? List.of()
                : config.getOrdering().getItems().stream()
                        .map(item -> new DisplayItem(
                                item.getId(),
                                item.getText()
                        ))
                        .toList();

        List<DisplayItem> matchingLeft =
                config.getMatching() == null
                        || config.getMatching().getLeft() == null
                ? List.of()
                : config.getMatching().getLeft().stream()
                        .map(LearnerQuestionTypeConfigResponse::display)
                        .toList();

        List<DisplayItem> matchingRight =
                config.getMatching() == null
                        || config.getMatching().getRight() == null
                ? List.of()
                : config.getMatching().getRight().stream()
                        .map(LearnerQuestionTypeConfigResponse::display)
                        .toList();

        List<DisplayItem> dragItems =
                config.getDragDrop() == null
                        || config.getDragDrop().getItems() == null
                ? List.of()
                : config.getDragDrop().getItems().stream()
                        .map(LearnerQuestionTypeConfigResponse::display)
                        .toList();

        List<DisplayItem> dragZones =
                config.getDragDrop() == null
                        || config.getDragDrop().getZones() == null
                ? List.of()
                : config.getDragDrop().getZones().stream()
                        .map(LearnerQuestionTypeConfigResponse::display)
                        .toList();

        String numericUnit =
                config.getNumeric() == null
                ? null
                : config.getNumeric().getUnit();

        return new LearnerQuestionTypeConfigResponse(
                config.getVersion(),
                blankIds,
                orderingItems,
                matchingLeft,
                matchingRight,
                dragItems,
                dragZones,
                numericUnit
        );
    }

    public LearnerQuestionTypeConfigResponse scrambled(long seed) {
        return new LearnerQuestionTypeConfigResponse(
                version,
                blankIds,
                shuffled(orderingItems, seed ^ 0x71A4L),
                matchingLeft,
                shuffled(matchingRight, seed ^ 0x19C3L),
                shuffled(dragItems, seed ^ 0x55D1L),
                dragZones,
                numericUnit
        );
    }

    private static List<DisplayItem> shuffled(
            List<DisplayItem> values,
            long seed
    ) {
        if (values == null || values.size() < 2) {
            return values == null ? List.of() : List.copyOf(values);
        }

        List<DisplayItem> result = new ArrayList<>(values);
        Collections.shuffle(result, new Random(seed));
        return List.copyOf(result);
    }

    private static DisplayItem display(
            QuestionTypeConfigRequest.DisplayItem item
    ) {
        return new DisplayItem(item.getId(), item.getText());
    }
}

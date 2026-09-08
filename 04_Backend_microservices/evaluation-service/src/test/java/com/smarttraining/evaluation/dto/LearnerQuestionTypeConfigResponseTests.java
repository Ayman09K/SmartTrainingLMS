package com.smarttraining.evaluation.dto;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest.BlankRule;
import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest.DisplayItem;
import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest.DragPlacement;
import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest.MatchingPair;
import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest.OrderingItem;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class LearnerQuestionTypeConfigResponseTests {

    @Test
    void learnerConfigKeepsPresentationButStripsEveryAnswerKey() throws Exception {
        QuestionTypeConfigRequest raw =
                new QuestionTypeConfigRequest();

        QuestionTypeConfigRequest.FillBlankConfig fill =
                new QuestionTypeConfigRequest.FillBlankConfig();
        BlankRule blank = new BlankRule();
        blank.setId("blank-1");
        blank.setAccepted(List.of("Paris"));
        blank.setCaseSensitive(false);
        blank.setTrim(true);
        fill.setBlanks(List.of(blank));
        raw.setFillBlank(fill);

        QuestionTypeConfigRequest.OrderingConfig ordering =
                new QuestionTypeConfigRequest.OrderingConfig();
        OrderingItem ordered = new OrderingItem();
        ordered.setId("order-1");
        ordered.setText("Premier");
        ordered.setCorrectIndex(0);
        ordering.setItems(List.of(ordered));
        raw.setOrdering(ordering);

        QuestionTypeConfigRequest.MatchingConfig matching =
                new QuestionTypeConfigRequest.MatchingConfig();
        matching.setLeft(List.of(display("left-1", "Gauche")));
        matching.setRight(List.of(display("right-1", "Droite")));
        MatchingPair pair = new MatchingPair();
        pair.setLeftId("left-1");
        pair.setRightId("right-1");
        matching.setPairs(List.of(pair));
        raw.setMatching(matching);

        QuestionTypeConfigRequest.DragDropConfig drag =
                new QuestionTypeConfigRequest.DragDropConfig();
        drag.setItems(List.of(display("item-1", "Element")));
        drag.setZones(List.of(display("zone-1", "Zone")));
        DragPlacement placement = new DragPlacement();
        placement.setItemId("item-1");
        placement.setZoneId("zone-1");
        drag.setPlacements(List.of(placement));
        raw.setDragDrop(drag);

        QuestionTypeConfigRequest.NumericConfig numeric =
                new QuestionTypeConfigRequest.NumericConfig();
        numeric.setExpected(new BigDecimal("42"));
        numeric.setTolerance(new BigDecimal("0.5"));
        numeric.setUnit("kg");
        raw.setNumeric(numeric);

        LearnerQuestionTypeConfigResponse safe =
                LearnerQuestionTypeConfigResponse.from(raw);

        String json = JsonMapper.builder()
                .build()
                .writeValueAsString(safe);

        assertTrue(json.contains("blank-1"));
        assertTrue(json.contains("Premier"));
        assertTrue(json.contains("Gauche"));
        assertTrue(json.contains("Droite"));
        assertTrue(json.contains("Element"));
        assertTrue(json.contains("Zone"));
        assertTrue(json.contains("kg"));

        assertFalse(json.contains("Paris"));
        assertFalse(json.contains("accepted"));
        assertFalse(json.contains("correctIndex"));
        assertFalse(json.contains("\"pairs\""));
        assertFalse(json.contains("placements"));
        assertFalse(json.contains("expected"));
        assertFalse(json.contains("tolerance"));
        assertFalse(json.contains("\"correct\""));
    }

    private DisplayItem display(String id, String text) {
        DisplayItem item = new DisplayItem();
        item.setId(id);
        item.setText(text);
        return item;
    }
}

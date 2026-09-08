package com.smarttraining.evaluation.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.smarttraining.evaluation.dto.SubmittedAnswerRequest;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class SubmittedAnswerCodecReadWriteTests {

    @Test
    void structuredLearnerAnswerRoundTripsForResultDetail() {
        SubmittedAnswerCodec codec =
                new SubmittedAnswerCodec(
                        JsonMapper.builder().build()
                );

        SubmittedAnswerRequest answer =
                new SubmittedAnswerRequest();
        answer.setQuestionId(99L);
        answer.setOrderedItemIds(
                List.of("a", "b", "c")
        );
        answer.setNumericValue(
                new BigDecimal("12.50")
        );

        String json = codec.write(answer);
        SubmittedAnswerRequest decoded =
                codec.read(json);

        assertNotNull(decoded);
        assertEquals(99L, decoded.getQuestionId());
        assertEquals(
                List.of("a", "b", "c"),
                decoded.getOrderedItemIds()
        );
        assertEquals(
                new BigDecimal("12.50"),
                decoded.getNumericValue()
        );
    }
}

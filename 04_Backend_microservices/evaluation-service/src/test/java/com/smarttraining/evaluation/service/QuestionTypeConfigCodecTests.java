package com.smarttraining.evaluation.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest;
import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest.BlankRule;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class QuestionTypeConfigCodecTests {

    @Test
    void fillBlankConfigRoundTripsWithoutComputedEmptyProperty() {
        JsonMapper mapper = JsonMapper.builder().build();
        QuestionTypeConfigCodec codec = new QuestionTypeConfigCodec(mapper);

        QuestionTypeConfigRequest config = new QuestionTypeConfigRequest();
        QuestionTypeConfigRequest.FillBlankConfig fill =
            new QuestionTypeConfigRequest.FillBlankConfig();

        BlankRule blank = new BlankRule();
        blank.setId("b1");
        blank.setAccepted(List.of("Paris"));
        blank.setCaseSensitive(false);
        blank.setTrim(true);

        fill.setBlanks(List.of(blank));
        config.setFillBlank(fill);

        String json = codec.write(config);

        assertNotNull(json);
        assertFalse(
            json.contains("\"empty\""),
            "Le helper interne ne doit pas devenir une propriete JSON."
        );

        QuestionTypeConfigRequest decoded = codec.read(json);

        assertNotNull(decoded);
        assertNotNull(decoded.getFillBlank());
        assertEquals(1, decoded.getFillBlank().getBlanks().size());
        assertEquals("b1", decoded.getFillBlank().getBlanks().get(0).getId());
        assertEquals(
            "Paris",
            decoded.getFillBlank().getBlanks().get(0).getAccepted().get(0)
        );
    }
}

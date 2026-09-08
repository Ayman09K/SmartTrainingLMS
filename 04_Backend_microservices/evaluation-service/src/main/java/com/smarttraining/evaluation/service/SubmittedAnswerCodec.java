package com.smarttraining.evaluation.service;

import com.smarttraining.evaluation.dto.SubmittedAnswerRequest;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

@Component
public class SubmittedAnswerCodec {
    public static final int MAX_JSON_LENGTH = 12000;

    private final JsonMapper jsonMapper;

    public SubmittedAnswerCodec(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    public String write(SubmittedAnswerRequest answer) {
        if (answer == null) return null;

        try {
            String json = jsonMapper.writeValueAsString(answer);

            if (json.length() > MAX_JSON_LENGTH) {
                throw new IllegalArgumentException(
                        "Reponse structuree trop longue."
                );
            }

            return json;
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalArgumentException(
                    "Reponse structuree JSON invalide.",
                    exception
            );
        }
    }

    public SubmittedAnswerRequest read(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }

        if (json.length() > MAX_JSON_LENGTH) {
            throw new IllegalArgumentException(
                    "Reponse structuree trop longue."
            );
        }

        try {
            return jsonMapper.readValue(
                    json,
                    SubmittedAnswerRequest.class
            );
        } catch (Exception exception) {
            throw new IllegalArgumentException(
                    "Reponse structuree JSON invalide.",
                    exception
            );
        }
    }
}

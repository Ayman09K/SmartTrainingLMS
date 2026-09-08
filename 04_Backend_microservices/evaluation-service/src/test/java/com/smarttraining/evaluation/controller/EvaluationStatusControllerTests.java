package com.smarttraining.evaluation.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EvaluationStatusController.class)
class EvaluationStatusControllerTests {
    @Autowired private MockMvc mockMvc;
    @Test void statusEndpointReturnsExpectedMessage() throws Exception {
        mockMvc.perform(get("/evaluation/status"))
                .andExpect(status().isOk())
                .andExpect(content().string("evaluation-service is running"));
    }
}

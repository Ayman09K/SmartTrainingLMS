package com.smarttraining.analytics.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import com.netflix.discovery.EurekaClient;

@WebMvcTest(AnalyticsStatusController.class)
class AnalyticsStatusControllerTests {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EurekaClient eurekaClient;

    @Test
    void statusReturnsServiceMessage() throws Exception {
        mockMvc.perform(get("/analytics/status"))
                .andExpect(status().isOk())
                .andExpect(content().string("analytics-service is running"));
    }
}

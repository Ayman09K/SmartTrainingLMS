package com.smarttraining.evaluation.dto;
import jakarta.validation.constraints.NotNull; import jakarta.validation.constraints.Positive;
public class StartAttemptRequest { @NotNull @Positive private Long quizId; @NotNull @Positive private Long learnerId; public StartAttemptRequest(){} public Long getQuizId(){return quizId;} public void setQuizId(Long quizId){this.quizId=quizId;} public Long getLearnerId(){return learnerId;} public void setLearnerId(Long learnerId){this.learnerId=learnerId;} }

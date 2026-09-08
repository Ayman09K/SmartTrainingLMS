package com.smarttraining.evaluation.dto;
import jakarta.validation.Valid; import jakarta.validation.constraints.NotEmpty; import java.util.List;
public class SubmitAttemptRequest { @NotEmpty @Valid private List<SubmittedAnswerRequest> answers; public SubmitAttemptRequest(){} public List<SubmittedAnswerRequest> getAnswers(){return answers;} public void setAnswers(List<SubmittedAnswerRequest> answers){this.answers=answers;} }

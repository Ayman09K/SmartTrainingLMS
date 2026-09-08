package com.smarttraining.evaluation.dto;
import com.smarttraining.evaluation.entity.QuizAttempt; import com.smarttraining.evaluation.enums.AttemptStatus; import java.time.LocalDateTime;
public class QuizAttemptResponse { private Long id;private Long quizId;private Long learnerId;private AttemptStatus status;private LocalDateTime startedAt;private LocalDateTime submittedAt;private Integer score;private Integer totalPoints;private Boolean success; public QuizAttemptResponse(){} public QuizAttemptResponse(QuizAttempt a){id=a.getId();quizId=a.getQuizId();learnerId=a.getLearnerId();status=a.getStatus();startedAt=a.getStartedAt();submittedAt=a.getSubmittedAt();score=a.getScore();totalPoints=a.getTotalPoints();success=a.getSuccess();} public Long getId(){return id;}public Long getQuizId(){return quizId;}public Long getLearnerId(){return learnerId;}public AttemptStatus getStatus(){return status;}public LocalDateTime getStartedAt(){return startedAt;}public LocalDateTime getSubmittedAt(){return submittedAt;}public Integer getScore(){return score;}public Integer getTotalPoints(){return totalPoints;}public Boolean getSuccess(){return success;}
    // PATCH19_R1_QUIZ_ATTEMPT_PORTABLE_EPOCH_V1
    public Long getStartedAtEpochMs() {
        if (startedAt == null) {
            return null;
        }
        return startedAt
                .atZone(java.time.ZoneId.systemDefault())
                .toInstant()
                .toEpochMilli();
    }
}

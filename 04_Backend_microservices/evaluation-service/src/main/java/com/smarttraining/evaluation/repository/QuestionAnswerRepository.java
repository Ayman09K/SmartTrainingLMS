package com.smarttraining.evaluation.repository;
import com.smarttraining.evaluation.entity.QuestionAnswer;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface QuestionAnswerRepository extends JpaRepository<QuestionAnswer, Long> {
    List<QuestionAnswer> findByAttemptId(Long attemptId);
    List<QuestionAnswer> findByQuestionId(Long questionId);
}

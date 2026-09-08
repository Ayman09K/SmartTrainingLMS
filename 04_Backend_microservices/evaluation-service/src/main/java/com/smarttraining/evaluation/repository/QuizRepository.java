package com.smarttraining.evaluation.repository;
import com.smarttraining.evaluation.entity.Quiz;
import com.smarttraining.evaluation.enums.QuizStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface QuizRepository extends JpaRepository<Quiz, Long> {
    List<Quiz> findByTrainingId(Long trainingId);
    List<Quiz> findByModuleId(Long moduleId);
    List<Quiz> findByStatus(QuizStatus status);
    List<Quiz> findByTrainingIdAndStatus(Long trainingId, QuizStatus status);

    long countByTrainingIdAndStatus(Long trainingId, QuizStatus status);
}
package com.smarttraining.evaluation.repository;
import com.smarttraining.evaluation.entity.QuizAttempt;
import com.smarttraining.evaluation.enums.AttemptStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {
    List<QuizAttempt> findByLearnerId(Long learnerId);
    List<QuizAttempt> findByQuizId(Long quizId);
    List<QuizAttempt> findByLearnerIdAndQuizId(Long learnerId, Long quizId);
    List<QuizAttempt> findByLearnerIdAndStatus(Long learnerId, AttemptStatus status);
    List<QuizAttempt> findByLearnerIdAndStatusOrderBySubmittedAtDesc(Long learnerId, AttemptStatus status);
    List<QuizAttempt> findByQuizIdAndStatusOrderBySubmittedAtDesc(Long quizId, AttemptStatus status);
    List<QuizAttempt> findByLearnerIdAndQuizIdAndStatusOrderBySubmittedAtDesc(Long learnerId, Long quizId, AttemptStatus status);
}

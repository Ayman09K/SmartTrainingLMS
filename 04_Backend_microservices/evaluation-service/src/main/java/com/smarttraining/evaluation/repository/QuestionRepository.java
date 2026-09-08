package com.smarttraining.evaluation.repository;
import com.smarttraining.evaluation.entity.Question;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByQuizIdOrderByOrderIndexAsc(Long quizId);
}

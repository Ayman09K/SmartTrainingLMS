package com.smarttraining.evaluation.repository;
import com.smarttraining.evaluation.entity.AnswerOption;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface AnswerOptionRepository extends JpaRepository<AnswerOption, Long> {
    List<AnswerOption> findByQuestionIdOrderByOrderIndexAsc(Long questionId);
}

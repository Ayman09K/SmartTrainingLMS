package com.smarttraining.evaluation.service.grading;

import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest;
import com.smarttraining.evaluation.dto.SubmittedAnswerRequest;
import com.smarttraining.evaluation.entity.AnswerOption;
import com.smarttraining.evaluation.entity.Question;
import com.smarttraining.evaluation.enums.QuestionType;
import java.util.List;

public interface QuestionGrader{
    QuestionType supports();
    QuestionGradeResult grade(Question question,QuestionTypeConfigRequest config,SubmittedAnswerRequest answer,List<AnswerOption> options);
}

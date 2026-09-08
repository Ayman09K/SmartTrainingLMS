package com.smarttraining.evaluation.service.grading;

import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest;
import com.smarttraining.evaluation.dto.SubmittedAnswerRequest;
import com.smarttraining.evaluation.entity.AnswerOption;
import com.smarttraining.evaluation.entity.Question;
import com.smarttraining.evaluation.enums.QuestionType;
import com.smarttraining.evaluation.exception.QuizAttemptRuleException;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class TrueFalseGrader implements QuestionGrader{
    public QuestionType supports(){return QuestionType.TRUE_FALSE;}
    public QuestionGradeResult grade(Question q,QuestionTypeConfigRequest c,SubmittedAnswerRequest a,List<AnswerOption> options){
        List<Long> correct=GradingSupport.correctOptionIds(options),submitted=GradingSupport.submittedOptionIds(a,options);
        if(options.size()!=2||correct.size()!=1)throw new IllegalStateException("TRUE_FALSE requiert deux options et exactement une correcte.");
        if(submitted.size()>1)throw new QuizAttemptRuleException("TRUE_FALSE accepte au maximum une option.");
        return GradingSupport.allOrNothing(q,correct.equals(submitted));
    }
}

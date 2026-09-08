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
public class SingleChoiceGrader implements QuestionGrader{
    public QuestionType supports(){return QuestionType.SINGLE_CHOICE;}
    public QuestionGradeResult grade(Question q,QuestionTypeConfigRequest c,SubmittedAnswerRequest a,List<AnswerOption> options){
        List<Long> correct=GradingSupport.correctOptionIds(options),submitted=GradingSupport.submittedOptionIds(a,options);
        if(correct.size()!=1)throw new IllegalStateException("SINGLE_CHOICE requiert exactement une option correcte.");
        if(submitted.size()>1)throw new QuizAttemptRuleException("SINGLE_CHOICE accepte au maximum une option.");
        return GradingSupport.allOrNothing(q,correct.equals(submitted));
    }
}

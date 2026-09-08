package com.smarttraining.evaluation.service.grading;

import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest;
import com.smarttraining.evaluation.dto.SubmittedAnswerRequest;
import com.smarttraining.evaluation.entity.AnswerOption;
import com.smarttraining.evaluation.entity.Question;
import com.smarttraining.evaluation.enums.QuestionType;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class MultipleChoiceGrader implements QuestionGrader{
    public QuestionType supports(){return QuestionType.MULTIPLE_CHOICE;}
    public QuestionGradeResult grade(Question q,QuestionTypeConfigRequest c,SubmittedAnswerRequest a,List<AnswerOption> options){
        List<Long> correct=GradingSupport.correctOptionIds(options),submitted=GradingSupport.submittedOptionIds(a,options);
        if(correct.isEmpty())throw new IllegalStateException("MULTIPLE_CHOICE requiert au moins une option correcte.");
        return GradingSupport.allOrNothing(q,correct.equals(submitted));
    }
}

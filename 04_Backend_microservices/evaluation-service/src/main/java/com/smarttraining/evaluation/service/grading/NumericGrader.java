package com.smarttraining.evaluation.service.grading;

import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest;
import com.smarttraining.evaluation.dto.SubmittedAnswerRequest;
import com.smarttraining.evaluation.entity.AnswerOption;
import com.smarttraining.evaluation.entity.Question;
import com.smarttraining.evaluation.enums.QuestionType;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class NumericGrader implements QuestionGrader{
    public QuestionType supports(){return QuestionType.NUMERIC;}
    public QuestionGradeResult grade(Question q,QuestionTypeConfigRequest c,SubmittedAnswerRequest a,List<AnswerOption> options){
        if(c==null||c.getNumeric()==null)throw new IllegalStateException("Configuration NUMERIC absente.");
        BigDecimal submitted=a.getNumericValue();if(submitted==null)return GradingSupport.allOrNothing(q,false);
        boolean ok=submitted.subtract(c.getNumeric().getExpected()).abs().compareTo(c.getNumeric().getTolerance())<=0;
        return GradingSupport.allOrNothing(q,ok);
    }
}

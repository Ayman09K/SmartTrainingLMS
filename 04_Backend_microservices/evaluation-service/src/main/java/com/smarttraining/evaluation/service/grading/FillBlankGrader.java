package com.smarttraining.evaluation.service.grading;

import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest;
import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest.BlankRule;
import com.smarttraining.evaluation.dto.SubmittedAnswerRequest;
import com.smarttraining.evaluation.dto.SubmittedAnswerRequest.BlankAnswer;
import com.smarttraining.evaluation.entity.AnswerOption;
import com.smarttraining.evaluation.entity.Question;
import com.smarttraining.evaluation.enums.QuestionType;
import com.smarttraining.evaluation.exception.QuizAttemptRuleException;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class FillBlankGrader implements QuestionGrader{
    public QuestionType supports(){return QuestionType.FILL_BLANK;}
    public QuestionGradeResult grade(Question q,QuestionTypeConfigRequest c,SubmittedAnswerRequest a,List<AnswerOption> options){
        if(c==null||c.getFillBlank()==null)throw new IllegalStateException("Configuration FILL_BLANK absente.");
        List<BlankRule> rules=c.getFillBlank().getBlanks();
        Map<String,BlankAnswer> submitted=new HashMap<>();
        if(a.getBlankAnswers()!=null)for(BlankAnswer item:a.getBlankAnswers()){
            String id=GradingSupport.requiredId(item==null?null:item.getBlankId(),"blankId");
            if(submitted.putIfAbsent(id,item)!=null)throw new QuizAttemptRuleException("Un blankId ne peut pas etre soumis deux fois.");
        }
        Map<String,BlankRule> known=new HashMap<>();for(BlankRule rule:rules)known.put(rule.getId(),rule);
        for(String id:submitted.keySet())if(!known.containsKey(id))throw new QuizAttemptRuleException("Un blankId soumis n'appartient pas a la question.");
        int correct=0;
        for(BlankRule rule:rules){BlankAnswer actual=submitted.get(rule.getId());if(matches(rule,actual==null?"":actual.getValue()))correct++;}
        return GradingSupport.proportional(q,correct,rules.size());
    }
    private boolean matches(BlankRule rule,String submitted){
        String actual=normalize(submitted,Boolean.TRUE.equals(rule.getTrim()),Boolean.TRUE.equals(rule.getCaseSensitive()));
        for(String accepted:rule.getAccepted())if(normalize(accepted,Boolean.TRUE.equals(rule.getTrim()),Boolean.TRUE.equals(rule.getCaseSensitive())).equals(actual))return true;
        return false;
    }
    private String normalize(String value,boolean trim,boolean cs){
        String v=value==null?"":value;if(trim)v=v.trim();if(!cs)v=v.toLowerCase(Locale.ROOT);return v;
    }
}

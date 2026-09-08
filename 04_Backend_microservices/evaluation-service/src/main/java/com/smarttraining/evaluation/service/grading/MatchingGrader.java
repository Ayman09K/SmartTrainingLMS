package com.smarttraining.evaluation.service.grading;

import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest;
import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest.DisplayItem;
import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest.MatchingPair;
import com.smarttraining.evaluation.dto.SubmittedAnswerRequest;
import com.smarttraining.evaluation.dto.SubmittedAnswerRequest.MatchingPairAnswer;
import com.smarttraining.evaluation.entity.AnswerOption;
import com.smarttraining.evaluation.entity.Question;
import com.smarttraining.evaluation.enums.QuestionType;
import com.smarttraining.evaluation.exception.QuizAttemptRuleException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class MatchingGrader implements QuestionGrader{
    public QuestionType supports(){return QuestionType.MATCHING;}
    public QuestionGradeResult grade(Question q,QuestionTypeConfigRequest c,SubmittedAnswerRequest a,List<AnswerOption> options){
        if(c==null||c.getMatching()==null)throw new IllegalStateException("Configuration MATCHING absente.");
        Map<String,String> expected=new HashMap<>();for(MatchingPair p:c.getMatching().getPairs())expected.put(p.getLeftId(),p.getRightId());
        Set<String> rightIds=new HashSet<>();for(DisplayItem i:c.getMatching().getRight())rightIds.add(i.getId());
        Set<String> seenLeft=new HashSet<>();int correct=0;
        if(a.getMatchingPairs()!=null)for(MatchingPairAnswer p:a.getMatchingPairs()){
            String left=GradingSupport.requiredId(p==null?null:p.getLeftId(),"leftId"),right=GradingSupport.requiredId(p.getRightId(),"rightId");
            if(!expected.containsKey(left)||!rightIds.contains(right))throw new QuizAttemptRuleException("Paire MATCHING inconnue.");
            if(!seenLeft.add(left))throw new QuizAttemptRuleException("Element gauche MATCHING duplique.");
            if(right.equals(expected.get(left)))correct++;
        }
        return GradingSupport.proportional(q,correct,expected.size());
    }
}

package com.smarttraining.evaluation.service.grading;

import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest;
import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest.OrderingItem;
import com.smarttraining.evaluation.dto.SubmittedAnswerRequest;
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
public class OrderingGrader implements QuestionGrader{
    public QuestionType supports(){return QuestionType.ORDERING;}
    public QuestionGradeResult grade(Question q,QuestionTypeConfigRequest c,SubmittedAnswerRequest a,List<AnswerOption> options){
        if(c==null||c.getOrdering()==null)throw new IllegalStateException("Configuration ORDERING absente.");
        List<OrderingItem> items=c.getOrdering().getItems();Map<String,Integer> expected=new HashMap<>();
        for(OrderingItem item:items)expected.put(item.getId(),item.getCorrectIndex());
        List<String> submitted=a.getOrderedItemIds()==null?List.of():a.getOrderedItemIds();Set<String> seen=new HashSet<>();
        for(String raw:submitted){String id=GradingSupport.requiredId(raw,"orderedItemId");if(!expected.containsKey(id))throw new QuizAttemptRuleException("Element ORDERING inconnu.");if(!seen.add(id))throw new QuizAttemptRuleException("Element ORDERING duplique.");}
        int correct=0;for(int i=0;i<submitted.size();i++){Integer expectedIndex=expected.get(submitted.get(i));if(expectedIndex!=null&&expectedIndex==i)correct++;}
        return GradingSupport.proportional(q,correct,items.size());
    }
}

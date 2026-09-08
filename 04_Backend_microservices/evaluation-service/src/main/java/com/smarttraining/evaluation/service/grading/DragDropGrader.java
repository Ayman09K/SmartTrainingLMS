package com.smarttraining.evaluation.service.grading;

import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest;
import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest.DisplayItem;
import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest.DragPlacement;
import com.smarttraining.evaluation.dto.SubmittedAnswerRequest;
import com.smarttraining.evaluation.dto.SubmittedAnswerRequest.DragPlacementAnswer;
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
public class DragDropGrader implements QuestionGrader{
    public QuestionType supports(){return QuestionType.DRAG_DROP;}
    public QuestionGradeResult grade(Question q,QuestionTypeConfigRequest c,SubmittedAnswerRequest a,List<AnswerOption> options){
        if(c==null||c.getDragDrop()==null)throw new IllegalStateException("Configuration DRAG_DROP absente.");
        Map<String,String> expected=new HashMap<>();for(DragPlacement p:c.getDragDrop().getPlacements())expected.put(p.getItemId(),p.getZoneId());
        Set<String> zones=new HashSet<>();for(DisplayItem z:c.getDragDrop().getZones())zones.add(z.getId());
        Set<String> seen=new HashSet<>();int correct=0;
        if(a.getDragPlacements()!=null)for(DragPlacementAnswer p:a.getDragPlacements()){
            String item=GradingSupport.requiredId(p==null?null:p.getItemId(),"itemId"),zone=GradingSupport.requiredId(p.getZoneId(),"zoneId");
            if(!expected.containsKey(item)||!zones.contains(zone))throw new QuizAttemptRuleException("Placement DRAG_DROP inconnu.");
            if(!seen.add(item))throw new QuizAttemptRuleException("Element DRAG_DROP duplique.");
            if(zone.equals(expected.get(item)))correct++;
        }
        return GradingSupport.proportional(q,correct,expected.size());
    }
}

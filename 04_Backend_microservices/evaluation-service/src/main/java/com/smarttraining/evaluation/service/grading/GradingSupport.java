package com.smarttraining.evaluation.service.grading;

import com.smarttraining.evaluation.dto.SubmittedAnswerRequest;
import com.smarttraining.evaluation.entity.AnswerOption;
import com.smarttraining.evaluation.entity.Question;
import com.smarttraining.evaluation.exception.QuizAttemptRuleException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

final class GradingSupport{
    private GradingSupport(){}
    static int maxPoints(Question q){return q.getPoints()==null?0:Math.max(0,q.getPoints());}
    static QuestionGradeResult allOrNothing(Question q,boolean ok){return new QuestionGradeResult(ok,ok?maxPoints(q):0);}
    static QuestionGradeResult proportional(Question q,int correct,int total){
        if(total<=0||correct<=0)return new QuestionGradeResult(false,0);
        int bounded=Math.min(correct,total),max=maxPoints(q),earned=(max*bounded)/total;
        boolean full=bounded==total;
        if(full)earned=max;
        return new QuestionGradeResult(full,earned);
    }
    static List<Long> submittedOptionIds(SubmittedAnswerRequest a,List<AnswerOption> options){
        List<Long> values=a.getSelectedOptionIds()==null?List.of():a.getSelectedOptionIds();
        Set<Long> known=new HashSet<>();
        for(AnswerOption o:options)if(o.getId()!=null)known.add(o.getId());
        Set<Long> seen=new HashSet<>();
        for(Long id:values){
            if(id==null||!known.contains(id))throw new QuizAttemptRuleException("Une option soumise n'appartient pas a la question.");
            if(!seen.add(id))throw new QuizAttemptRuleException("Une option ne peut pas etre soumise deux fois.");
        }
        return values.stream().sorted().toList();
    }
    static List<Long> correctOptionIds(List<AnswerOption> options){
        return options.stream().filter(o->Boolean.TRUE.equals(o.getCorrect())).map(AnswerOption::getId).filter(id->id!=null).sorted().toList();
    }
    static String requiredId(String value,String label){
        if(value==null||value.isBlank())throw new QuizAttemptRuleException(label+" invalide.");
        return value.trim();
    }
}

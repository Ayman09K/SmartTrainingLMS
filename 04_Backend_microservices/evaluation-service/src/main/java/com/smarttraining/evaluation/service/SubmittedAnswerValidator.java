package com.smarttraining.evaluation.service;

import com.smarttraining.evaluation.dto.SubmittedAnswerRequest;
import com.smarttraining.evaluation.enums.QuestionType;
import com.smarttraining.evaluation.exception.QuizAttemptRuleException;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class SubmittedAnswerValidator {
    private static final int MAX_ITEMS=100;

    public void validateCompatible(QuestionType type,SubmittedAnswerRequest a){
        if(type==null||a==null)throw new QuizAttemptRuleException("Question ou reponse invalide.");
        bounded(a.getSelectedOptionIds(),"selectedOptionIds"); bounded(a.getBlankAnswers(),"blankAnswers"); bounded(a.getOrderedItemIds(),"orderedItemIds"); bounded(a.getMatchingPairs(),"matchingPairs"); bounded(a.getDragPlacements(),"dragPlacements");
        switch(type){
            case SINGLE_CHOICE,MULTIPLE_CHOICE,TRUE_FALSE -> {rejectText(a);empty(a.getBlankAnswers(),"blankAnswers");empty(a.getOrderedItemIds(),"orderedItemIds");empty(a.getMatchingPairs(),"matchingPairs");empty(a.getDragPlacements(),"dragPlacements");if(a.getNumericValue()!=null)bad("numericValue");}
            case FILL_BLANK -> {empty(a.getSelectedOptionIds(),"selectedOptionIds");rejectText(a);empty(a.getOrderedItemIds(),"orderedItemIds");empty(a.getMatchingPairs(),"matchingPairs");empty(a.getDragPlacements(),"dragPlacements");if(a.getNumericValue()!=null)bad("numericValue");}
            case ORDERING -> {empty(a.getSelectedOptionIds(),"selectedOptionIds");rejectText(a);empty(a.getBlankAnswers(),"blankAnswers");empty(a.getMatchingPairs(),"matchingPairs");empty(a.getDragPlacements(),"dragPlacements");if(a.getNumericValue()!=null)bad("numericValue");}
            case MATCHING -> {empty(a.getSelectedOptionIds(),"selectedOptionIds");rejectText(a);empty(a.getBlankAnswers(),"blankAnswers");empty(a.getOrderedItemIds(),"orderedItemIds");empty(a.getDragPlacements(),"dragPlacements");if(a.getNumericValue()!=null)bad("numericValue");}
            case DRAG_DROP -> {empty(a.getSelectedOptionIds(),"selectedOptionIds");rejectText(a);empty(a.getBlankAnswers(),"blankAnswers");empty(a.getOrderedItemIds(),"orderedItemIds");empty(a.getMatchingPairs(),"matchingPairs");if(a.getNumericValue()!=null)bad("numericValue");}
            case NUMERIC -> {empty(a.getSelectedOptionIds(),"selectedOptionIds");rejectText(a);empty(a.getBlankAnswers(),"blankAnswers");empty(a.getOrderedItemIds(),"orderedItemIds");empty(a.getMatchingPairs(),"matchingPairs");empty(a.getDragPlacements(),"dragPlacements");}
        }
    }
    private void rejectText(SubmittedAnswerRequest a){if(a.getAnswerText()!=null&&!a.getAnswerText().isBlank())bad("answerText");}
    private void empty(List<?> values,String field){if(values!=null&&!values.isEmpty())bad(field);}
    private void bounded(List<?> values,String field){if(values!=null&&values.size()>MAX_ITEMS)throw new QuizAttemptRuleException(field+" depasse 100 elements.");}
    private void bad(String field){throw new QuizAttemptRuleException("Le champ "+field+" n'est pas compatible avec ce type de question.");}
}

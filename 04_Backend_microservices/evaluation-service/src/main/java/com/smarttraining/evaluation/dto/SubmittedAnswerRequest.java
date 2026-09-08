package com.smarttraining.evaluation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.List;

public class SubmittedAnswerRequest {
    @NotNull @Positive private Long questionId;
    private List<Long> selectedOptionIds;
    private String answerText;
    @Valid private List<BlankAnswer> blankAnswers;
    private List<String> orderedItemIds;
    @Valid private List<MatchingPairAnswer> matchingPairs;
    @Valid private List<DragPlacementAnswer> dragPlacements;
    private BigDecimal numericValue;

    public SubmittedAnswerRequest() {}
    public Long getQuestionId(){return questionId;} public void setQuestionId(Long questionId){this.questionId=questionId;}
    public List<Long> getSelectedOptionIds(){return selectedOptionIds;} public void setSelectedOptionIds(List<Long> ids){this.selectedOptionIds=ids;}
    public String getAnswerText(){return answerText;} public void setAnswerText(String text){this.answerText=text;}
    public List<BlankAnswer> getBlankAnswers(){return blankAnswers;} public void setBlankAnswers(List<BlankAnswer> values){this.blankAnswers=values;}
    public List<String> getOrderedItemIds(){return orderedItemIds;} public void setOrderedItemIds(List<String> values){this.orderedItemIds=values;}
    public List<MatchingPairAnswer> getMatchingPairs(){return matchingPairs;} public void setMatchingPairs(List<MatchingPairAnswer> values){this.matchingPairs=values;}
    public List<DragPlacementAnswer> getDragPlacements(){return dragPlacements;} public void setDragPlacements(List<DragPlacementAnswer> values){this.dragPlacements=values;}
    public BigDecimal getNumericValue(){return numericValue;} public void setNumericValue(BigDecimal value){this.numericValue=value;}

    public static class BlankAnswer {
        private String blankId; private String value;
        public BlankAnswer() {}
        public String getBlankId(){return blankId;} public void setBlankId(String blankId){this.blankId=blankId;}
        public String getValue(){return value;} public void setValue(String value){this.value=value;}
    }
    public static class MatchingPairAnswer {
        private String leftId; private String rightId;
        public MatchingPairAnswer() {}
        public String getLeftId(){return leftId;} public void setLeftId(String leftId){this.leftId=leftId;}
        public String getRightId(){return rightId;} public void setRightId(String rightId){this.rightId=rightId;}
    }
    public static class DragPlacementAnswer {
        private String itemId; private String zoneId;
        public DragPlacementAnswer() {}
        public String getItemId(){return itemId;} public void setItemId(String itemId){this.itemId=itemId;}
        public String getZoneId(){return zoneId;} public void setZoneId(String zoneId){this.zoneId=zoneId;}
    }
}

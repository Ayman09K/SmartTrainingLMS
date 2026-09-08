package com.smarttraining.evaluation.service.grading;

public record QuestionGradeResult(boolean fullyCorrect,int pointsEarned){
    public QuestionGradeResult{
        if(pointsEarned<0)throw new IllegalArgumentException("Les points gagnes ne peuvent pas etre negatifs.");
    }
}

package com.smarttraining.evaluation.service.grading;

import static org.junit.jupiter.api.Assertions.*;

import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest;
import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest.*;
import com.smarttraining.evaluation.dto.SubmittedAnswerRequest;
import com.smarttraining.evaluation.dto.SubmittedAnswerRequest.*;
import com.smarttraining.evaluation.entity.AnswerOption;
import com.smarttraining.evaluation.entity.Question;
import com.smarttraining.evaluation.enums.QuestionType;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class QuestionGradersTests {

    @Test void singleChoiceExactAnswerGetsFullPoints() throws Exception {
        Question q=question(QuestionType.SINGLE_CHOICE,4);
        List<AnswerOption> options=List.of(option(11L,true),option(12L,false));
        SubmittedAnswerRequest a=answer();a.setSelectedOptionIds(List.of(11L));
        QuestionGradeResult r=new SingleChoiceGrader().grade(q,null,a,options);
        assertTrue(r.fullyCorrect());assertEquals(4,r.pointsEarned());
    }

    @Test void multipleChoiceUsesExactSetWithoutImplicitPartialCredit() throws Exception {
        Question q=question(QuestionType.MULTIPLE_CHOICE,6);
        List<AnswerOption> options=List.of(option(21L,true),option(22L,true),option(23L,false));
        SubmittedAnswerRequest a=answer();a.setSelectedOptionIds(List.of(21L));
        QuestionGradeResult r=new MultipleChoiceGrader().grade(q,null,a,options);
        assertFalse(r.fullyCorrect());assertEquals(0,r.pointsEarned());
    }

    @Test void trueFalseCorrectAnswerGetsFullPoints() throws Exception {
        Question q=question(QuestionType.TRUE_FALSE,2);
        List<AnswerOption> options=List.of(option(31L,false),option(32L,true));
        SubmittedAnswerRequest a=answer();a.setSelectedOptionIds(List.of(32L));
        QuestionGradeResult r=new TrueFalseGrader().grade(q,null,a,options);
        assertTrue(r.fullyCorrect());assertEquals(2,r.pointsEarned());
    }

    @Test void fillBlankAwardsPointsPerCorrectBlank() {
        Question q=question(QuestionType.FILL_BLANK,10);
        QuestionTypeConfigRequest c=new QuestionTypeConfigRequest();
        FillBlankConfig fill=new FillBlankConfig();
        BlankRule b1=new BlankRule();b1.setId("b1");b1.setAccepted(List.of("Paris"));b1.setCaseSensitive(false);b1.setTrim(true);
        BlankRule b2=new BlankRule();b2.setId("b2");b2.setAccepted(List.of("France"));b2.setCaseSensitive(false);b2.setTrim(true);
        fill.setBlanks(List.of(b1,b2));c.setFillBlank(fill);
        BlankAnswer a1=new BlankAnswer();a1.setBlankId("b1");a1.setValue(" paris ");
        BlankAnswer a2=new BlankAnswer();a2.setBlankId("b2");a2.setValue("Italie");
        SubmittedAnswerRequest a=answer();a.setBlankAnswers(List.of(a1,a2));
        QuestionGradeResult r=new FillBlankGrader().grade(q,c,a,List.of());
        assertFalse(r.fullyCorrect());assertEquals(5,r.pointsEarned());
    }

    @Test void orderingAwardsPointsPerCorrectPosition() {
        Question q=question(QuestionType.ORDERING,8);
        QuestionTypeConfigRequest c=new QuestionTypeConfigRequest();OrderingConfig ordering=new OrderingConfig();
        ordering.setItems(List.of(ordering("a","A",0),ordering("b","B",1),ordering("c","C",2),ordering("d","D",3)));c.setOrdering(ordering);
        SubmittedAnswerRequest a=answer();a.setOrderedItemIds(List.of("a","c","b","d"));
        QuestionGradeResult r=new OrderingGrader().grade(q,c,a,List.of());
        assertFalse(r.fullyCorrect());assertEquals(4,r.pointsEarned());
    }

    @Test void matchingAwardsPointsPerCorrectPair() {
        Question q=question(QuestionType.MATCHING,6);
        QuestionTypeConfigRequest c=new QuestionTypeConfigRequest();MatchingConfig matching=new MatchingConfig();
        matching.setLeft(List.of(display("l1","France"),display("l2","Maroc")));matching.setRight(List.of(display("r1","Paris"),display("r2","Rabat")));
        matching.setPairs(List.of(pair("l1","r1"),pair("l2","r2")));c.setMatching(matching);
        MatchingPairAnswer p1=new MatchingPairAnswer();p1.setLeftId("l1");p1.setRightId("r1");
        MatchingPairAnswer p2=new MatchingPairAnswer();p2.setLeftId("l2");p2.setRightId("r1");
        SubmittedAnswerRequest a=answer();a.setMatchingPairs(List.of(p1,p2));
        QuestionGradeResult r=new MatchingGrader().grade(q,c,a,List.of());
        assertFalse(r.fullyCorrect());assertEquals(3,r.pointsEarned());
    }

    @Test void dragDropAwardsPointsPerCorrectPlacement() {
        Question q=question(QuestionType.DRAG_DROP,6);
        QuestionTypeConfigRequest c=new QuestionTypeConfigRequest();DragDropConfig drag=new DragDropConfig();
        drag.setItems(List.of(display("i1","Chat"),display("i2","Saumon")));drag.setZones(List.of(display("z1","Mammifere"),display("z2","Poisson")));
        DragPlacement c1=new DragPlacement();c1.setItemId("i1");c1.setZoneId("z1");
        DragPlacement c2=new DragPlacement();c2.setItemId("i2");c2.setZoneId("z2");
        drag.setPlacements(List.of(c1,c2));c.setDragDrop(drag);
        DragPlacementAnswer a1=new DragPlacementAnswer();a1.setItemId("i1");a1.setZoneId("z1");
        DragPlacementAnswer a2=new DragPlacementAnswer();a2.setItemId("i2");a2.setZoneId("z1");
        SubmittedAnswerRequest a=answer();a.setDragPlacements(List.of(a1,a2));
        QuestionGradeResult r=new DragDropGrader().grade(q,c,a,List.of());
        assertFalse(r.fullyCorrect());assertEquals(3,r.pointsEarned());
    }

    @Test void numericUsesAbsoluteTolerance() {
        Question q=question(QuestionType.NUMERIC,5);
        QuestionTypeConfigRequest c=new QuestionTypeConfigRequest();NumericConfig numeric=new NumericConfig();
        numeric.setExpected(new BigDecimal("42.0"));numeric.setTolerance(new BigDecimal("0.1"));numeric.setUnit("kg");c.setNumeric(numeric);
        SubmittedAnswerRequest a=answer();a.setNumericValue(new BigDecimal("42.08"));
        QuestionGradeResult r=new NumericGrader().grade(q,c,a,List.of());
        assertTrue(r.fullyCorrect());assertEquals(5,r.pointsEarned());
    }

    private Question question(QuestionType type,int points){Question q=new Question();q.setType(type);q.setPoints(points);return q;}
    private SubmittedAnswerRequest answer(){SubmittedAnswerRequest a=new SubmittedAnswerRequest();a.setQuestionId(1L);return a;}
    private AnswerOption option(Long id,boolean correct)throws Exception{AnswerOption o=new AnswerOption();Field f=AnswerOption.class.getDeclaredField("id");f.setAccessible(true);f.set(o,id);o.setCorrect(correct);return o;}
    private OrderingItem ordering(String id,String text,int index){OrderingItem i=new OrderingItem();i.setId(id);i.setText(text);i.setCorrectIndex(index);return i;}
    private DisplayItem display(String id,String text){DisplayItem i=new DisplayItem();i.setId(id);i.setText(text);return i;}
    private MatchingPair pair(String left,String right){MatchingPair p=new MatchingPair();p.setLeftId(left);p.setRightId(right);return p;}
}

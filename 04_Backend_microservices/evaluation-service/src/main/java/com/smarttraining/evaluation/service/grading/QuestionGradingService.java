package com.smarttraining.evaluation.service.grading;

import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest;
import com.smarttraining.evaluation.dto.SubmittedAnswerRequest;
import com.smarttraining.evaluation.entity.AnswerOption;
import com.smarttraining.evaluation.entity.Question;
import com.smarttraining.evaluation.enums.QuestionType;
import com.smarttraining.evaluation.repository.AnswerOptionRepository;
import com.smarttraining.evaluation.service.QuestionTypeConfigCodec;
import com.smarttraining.evaluation.service.QuestionTypeConfigValidator;
import com.smarttraining.evaluation.service.SubmittedAnswerValidator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class QuestionGradingService{
    private final AnswerOptionRepository options;
    private final QuestionTypeConfigCodec configCodec;
    private final QuestionTypeConfigValidator configValidator;
    private final SubmittedAnswerValidator answerValidator;
    private final Map<QuestionType,QuestionGrader> graders=new EnumMap<>(QuestionType.class);

    public QuestionGradingService(AnswerOptionRepository options,QuestionTypeConfigCodec configCodec,QuestionTypeConfigValidator configValidator,SubmittedAnswerValidator answerValidator,List<QuestionGrader> graderBeans){
        this.options=options;this.configCodec=configCodec;this.configValidator=configValidator;this.answerValidator=answerValidator;
        for(QuestionGrader grader:graderBeans){
            QuestionGrader old=graders.put(grader.supports(),grader);
            if(old!=null)throw new IllegalStateException("Deux graders pour "+grader.supports());
        }
        for(QuestionType type:QuestionType.values())if(!graders.containsKey(type))throw new IllegalStateException("Aucun grader pour "+type);
    }

    public QuestionGradeResult grade(Question question,SubmittedAnswerRequest answer){
        if(question==null||question.getType()==null)throw new IllegalArgumentException("Question a grader invalide.");
        QuestionTypeConfigRequest config=configCodec.read(question.getConfigJson());
        configValidator.validate(question.getType(),config);
        answerValidator.validateCompatible(question.getType(),answer);
        List<AnswerOption> questionOptions=options.findByQuestionIdOrderByOrderIndexAsc(question.getId());
        return graders.get(question.getType()).grade(question,config,answer,questionOptions);
    }
}

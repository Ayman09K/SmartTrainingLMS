package com.smarttraining.evaluation.service;import com.smarttraining.evaluation.dto.AnswerOptionRequest;
import com.smarttraining.evaluation.dto.AnswerOptionResponse;
import com.smarttraining.evaluation.dto.QuestionAnswerResponse;
import com.smarttraining.evaluation.dto.QuestionFullResponse;
import com.smarttraining.evaluation.dto.QuestionRequest;
import com.smarttraining.evaluation.dto.QuestionResponse;
import com.smarttraining.evaluation.dto.QuizAttemptFullResponse;
import com.smarttraining.evaluation.dto.QuizAttemptResponse;
import com.smarttraining.evaluation.dto.QuizFullResponse;
import com.smarttraining.evaluation.dto.QuizRequest;
import com.smarttraining.evaluation.dto.QuizResponse;
import com.smarttraining.evaluation.dto.ScoreResponse;
import com.smarttraining.evaluation.dto.StartAttemptRequest;
import com.smarttraining.evaluation.dto.SubmitAttemptRequest;
import com.smarttraining.evaluation.dto.SubmittedAnswerRequest;
import com.smarttraining.evaluation.dto.QuestionTypeConfigRequest;
import com.smarttraining.evaluation.entity.AnswerOption;
import com.smarttraining.evaluation.entity.Question;
import com.smarttraining.evaluation.entity.QuestionAnswer;
import com.smarttraining.evaluation.entity.Quiz;
import com.smarttraining.evaluation.entity.QuizAttempt;
import com.smarttraining.evaluation.enums.AttemptStatus;
import com.smarttraining.evaluation.enums.QuizStatus;
import com.smarttraining.evaluation.exception.QuizAttemptRuleException;
import com.smarttraining.evaluation.service.grading.QuestionGradeResult;
import com.smarttraining.evaluation.service.grading.QuestionGradingService;
import com.smarttraining.evaluation.repository.AnswerOptionRepository;
import com.smarttraining.evaluation.repository.QuestionAnswerRepository;
import com.smarttraining.evaluation.repository.QuestionRepository;
import com.smarttraining.evaluation.repository.QuizAttemptRepository;
import com.smarttraining.evaluation.repository.QuizRepository;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class EvaluationService {

    private final QuizRepository quizzes;
    private final QuestionRepository questions;
    private final AnswerOptionRepository options;
    private final QuizAttemptRepository attempts;
    private final QuestionAnswerRepository answers;
    private final AnalyticsEventClient analyticsEventClient;
    private final QuestionTypeConfigCodec questionTypeConfigCodec;
    private final QuestionTypeConfigValidator questionTypeConfigValidator;
    private final SubmittedAnswerCodec submittedAnswerCodec;
    private final QuestionGradingService questionGradingService;

    public EvaluationService(
            QuizRepository quizzes,
            QuestionRepository questions,
            AnswerOptionRepository options,
            QuizAttemptRepository attempts,
            QuestionAnswerRepository answers,
            AnalyticsEventClient analyticsEventClient,
            QuestionTypeConfigCodec questionTypeConfigCodec,
            QuestionTypeConfigValidator questionTypeConfigValidator,
            SubmittedAnswerCodec submittedAnswerCodec,
            QuestionGradingService questionGradingService
    ) {
        this.quizzes = quizzes;
        this.questions = questions;
        this.options = options;
        this.attempts = attempts;
        this.answers = answers;
        this.analyticsEventClient = analyticsEventClient;
        this.questionTypeConfigCodec = questionTypeConfigCodec;
        this.questionTypeConfigValidator = questionTypeConfigValidator;
        this.submittedAnswerCodec = submittedAnswerCodec;
        this.questionGradingService = questionGradingService;
    }

    public QuizResponse createQuiz(QuizRequest request) {
        Quiz quiz = new Quiz();
        apply(quiz, request);
        return new QuizResponse(quizzes.save(quiz));
    }

    @Transactional(readOnly = true)
    public List<QuizResponse> getAllQuizzes() {
        return quizzes.findAll().stream().map(QuizResponse::new).toList();
    }

    @Transactional(readOnly = true)
    public QuizResponse getQuizById(Long id) {
        return new QuizResponse(quiz(id));
    }

    @Transactional(readOnly = true)
    public List<QuizResponse> getQuizzesByTraining(Long id) {
        return quizzes.findByTrainingId(id).stream().map(QuizResponse::new).toList();
    }

    @Transactional(readOnly = true)
    public List<QuizResponse> getPublishedQuizzesByTraining(Long id) {
        return quizzes.findByTrainingIdAndStatus(id, QuizStatus.PUBLISHED)
                .stream()
                .map(QuizResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<QuizResponse> getQuizzesByModule(Long id) {
        return quizzes.findByModuleId(id).stream().map(QuizResponse::new).toList();
    }

    public QuizResponse updateQuiz(Long id, QuizRequest request) {
        Quiz quiz = quiz(id);
        apply(quiz, request);
        return new QuizResponse(quizzes.save(quiz));
    }

    public void deleteQuiz(Long id) {
        quizzes.delete(quiz(id));
    }

    private void apply(Quiz quiz, QuizRequest request) {
        quiz.setTrainingId(request.getTrainingId());
        quiz.setModuleId(request.getModuleId());
        quiz.setTitle(request.getTitle());
        quiz.setDescription(request.getDescription());
        quiz.setPassingScore(request.getPassingScore());
        quiz.setMaxAttempts(request.getMaxAttempts());

        if (request.getTimeLimitMinutes() != null) {
            quiz.setTimeLimitMinutes(
                    request.getTimeLimitMinutes() == 0
                            ? null
                            : request.getTimeLimitMinutes()
            );
        }

        if (request.getShuffleQuestions() != null) {
            quiz.setShuffleQuestions(request.getShuffleQuestions());
        }

        if (request.getShuffleOptions() != null) {
            quiz.setShuffleOptions(request.getShuffleOptions());
        }

        if (request.getResultPolicy() != null) {
            quiz.setResultPolicy(request.getResultPolicy());
        }

        if (request.getCorrectAnswerPolicy() != null) {
            quiz.setCorrectAnswerPolicy(
                    request.getCorrectAnswerPolicy()
            );
        }

        if (request.getSuccessFeedback() != null) {
            quiz.setSuccessFeedback(
                    normalizeOptionalText(
                            request.getSuccessFeedback()
                    )
            );
        }

        if (request.getFailureFeedback() != null) {
            quiz.setFailureFeedback(
                    normalizeOptionalText(
                            request.getFailureFeedback()
                    )
            );
        }

        quiz.setStatus(request.getStatus() != null
                ? request.getStatus()
                : (quiz.getStatus() != null ? quiz.getStatus() : QuizStatus.DRAFT));
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public QuestionResponse createQuestion(QuestionRequest request) {
        Question question = new Question();
        apply(question, request);
        return questionResponse(questions.save(question));
    }

    @Transactional(readOnly = true)
    public List<QuestionResponse> getQuestionsByQuiz(Long id) {
        return questions.findByQuizIdOrderByOrderIndexAsc(id)
                .stream()
                .map(this::questionResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public QuestionResponse getQuestionById(Long id) {
        return questionResponse(question(id));
    }

    public QuestionResponse updateQuestion(Long id, QuestionRequest request) {
        Question question = question(id);
        apply(question, request);
        return questionResponse(questions.save(question));
    }

    public void deleteQuestion(Long id) {
        questions.delete(question(id));
    }

    private void apply(Question question, QuestionRequest request) {
        question.setQuiz(quiz(request.getQuizId()));
        question.setContent(request.getContent());
        question.setType(request.getType());
        question.setOrderIndex(request.getOrderIndex());
        question.setPoints(request.getPoints());
        question.setExplanation(request.getExplanation());

        questionTypeConfigValidator.validate(
                request.getType(),
                request.getTypeConfig()
        );
        question.setConfigJson(
                questionTypeConfigCodec.write(request.getTypeConfig())
        );
    }

    private QuestionResponse questionResponse(Question question) {
        return new QuestionResponse(
                question,
                questionTypeConfigCodec.read(question.getConfigJson())
        );
    }

    public AnswerOptionResponse createAnswerOption(AnswerOptionRequest request) {
        AnswerOption option = new AnswerOption();
        apply(option, request);
        return new AnswerOptionResponse(options.save(option));
    }

    @Transactional(readOnly = true)
    public List<AnswerOptionResponse> getOptionsByQuestion(Long id) {
        return options.findByQuestionIdOrderByOrderIndexAsc(id)
                .stream()
                .map(AnswerOptionResponse::new)
                .toList();
    }

    public AnswerOptionResponse updateAnswerOption(Long id, AnswerOptionRequest request) {
        AnswerOption option = option(id);
        apply(option, request);
        return new AnswerOptionResponse(options.save(option));
    }

    public void deleteAnswerOption(Long id) {
        options.delete(option(id));
    }

    private void apply(AnswerOption option, AnswerOptionRequest request) {
        option.setQuestion(question(request.getQuestionId()));
        option.setContent(request.getContent());
        option.setCorrect(request.getCorrect());
        option.setOrderIndex(request.getOrderIndex());
    }

    @Transactional(readOnly = true)
    public QuizFullResponse getQuizFullDetails(Long id) {
        Quiz quiz = quiz(id);

        List<QuestionFullResponse> questionResponses = questions
                .findByQuizIdOrderByOrderIndexAsc(id)
                .stream()
                .map(question -> new QuestionFullResponse(
                        question,
                        options.findByQuestionIdOrderByOrderIndexAsc(question.getId())
                                .stream()
                                .map(AnswerOptionResponse::new)
                                .toList(),
                        questionTypeConfigCodec.read(question.getConfigJson())
                ))
                .toList();

        return new QuizFullResponse(quiz, questionResponses);
    }

    public QuizAttemptResponse startAttempt(StartAttemptRequest request) {
        Quiz quiz = quiz(request.getQuizId());

        if (quiz.getStatus() != QuizStatus.PUBLISHED) {
            throw new IllegalArgumentException("Le quiz n'est pas publié");
        }

        QuizAttempt attempt = new QuizAttempt();
        attempt.setQuizId(request.getQuizId());
        attempt.setLearnerId(request.getLearnerId());
        attempt.setStatus(AttemptStatus.STARTED);

        QuizAttempt savedAttempt = attempts.save(attempt);

        analyticsEventClient.publishQuizStarted(quiz, savedAttempt);

        return new QuizAttemptResponse(savedAttempt);
    }

    public QuizAttemptFullResponse submitAttempt(Long id, SubmitAttemptRequest request) {
        QuizAttempt attempt = attempt(id);

        if (attempt.getStatus() != AttemptStatus.STARTED) {
            throw new QuizAttemptRuleException(
                    "Cette tentative n'est plus ouverte."
            );
        }

        Quiz quiz = quiz(attempt.getQuizId());

        List<Question> quizQuestions = questions.findByQuizIdOrderByOrderIndexAsc(quiz.getId());
        Set<Long> submittedQuestionIds = new HashSet<>();

        int total = quizQuestions.stream()
                .map(Question::getPoints)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .sum();

        int score = 0;

        for (SubmittedAnswerRequest submittedAnswer : request.getAnswers()) {
            if (!submittedQuestionIds.add(submittedAnswer.getQuestionId())) {
                throw new QuizAttemptRuleException(
                        "Une question ne peut être soumise qu'une seule fois."
                );
            }

            Question question = question(submittedAnswer.getQuestionId());

            if (!question.getQuiz().getId().equals(quiz.getId())) {
                throw new IllegalArgumentException("La question " + question.getId() + " n'appartient pas au quiz");
            }

            QuestionGradeResult grade =
                    questionGradingService.grade(question, submittedAnswer);
            boolean correct = grade.fullyCorrect();
            int earned = grade.pointsEarned();

            QuestionAnswer answer = new QuestionAnswer();
            answer.setAttempt(attempt);
            answer.setQuestionId(question.getId());
            answer.setSelectedOptionIds(ids(submittedAnswer.getSelectedOptionIds()));
            answer.setAnswerText(submittedAnswer.getAnswerText());
            answer.setAnswerJson(submittedAnswerCodec.write(submittedAnswer));
            answer.setCorrect(correct);
            answer.setPointsEarned(earned);

            answers.save(answer);

            score += earned;
        }

        int percentage = total == 0 ? 0 : (score * 100) / total;

        attempt.setScore(score);
        attempt.setTotalPoints(total);
        attempt.setSuccess(percentage >= quiz.getPassingScore());
        attempt.setStatus(AttemptStatus.SUBMITTED);
        attempt.setSubmittedAt(LocalDateTime.now());

        QuizAttempt savedAttempt = attempts.save(attempt);

        analyticsEventClient.publishQuizSubmitted(quiz, savedAttempt, percentage);

        return getAttemptFullDetails(savedAttempt.getId());
    }

    public QuizAttemptResponse cancelAttemptForTimeout(Long id) {
        QuizAttempt attempt = attempt(id);

        if (attempt.getStatus() == AttemptStatus.STARTED) {
            attempt.setStatus(AttemptStatus.CANCELLED);
            attempt.setSubmittedAt(LocalDateTime.now());
            attempt = attempts.save(attempt);
        }

        return new QuizAttemptResponse(attempt);
    }

    @Transactional(readOnly = true)
    public QuizAttemptFullResponse getAttemptFullDetails(Long id) {
        QuizAttempt attempt = attempt(id);

        return new QuizAttemptFullResponse(
                attempt,
                answers.findByAttemptId(id)
                        .stream()
                        .map(QuestionAnswerResponse::new)
                        .toList()
        );
    }

    @Transactional(readOnly = true)
    public List<QuizAttemptResponse> getAttemptsByLearner(Long id) {
        return attempts.findByLearnerId(id).stream().map(QuizAttemptResponse::new).toList();
    }

    @Transactional(readOnly = true)
    public List<QuizAttemptResponse> getAttemptsByQuiz(Long id) {
        return attempts.findByQuizId(id).stream().map(QuizAttemptResponse::new).toList();
    }

    @Transactional(readOnly = true)
    public List<QuizAttemptResponse> getAttemptsByLearnerAndQuiz(Long learnerId, Long quizId) {
        return attempts.findByLearnerIdAndQuizId(learnerId, quizId)
                .stream()
                .map(QuizAttemptResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ScoreResponse> getScoresByLearner(Long id) {
        return attempts.findByLearnerIdAndStatusOrderBySubmittedAtDesc(id, AttemptStatus.SUBMITTED)
                .stream()
                .map(ScoreResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ScoreResponse> getScoresByQuiz(Long id) {
        return attempts.findByQuizIdAndStatusOrderBySubmittedAtDesc(id, AttemptStatus.SUBMITTED)
                .stream()
                .map(ScoreResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ScoreResponse> getScoresByLearnerAndQuiz(Long learnerId, Long quizId) {
        return attempts.findByLearnerIdAndQuizIdAndStatusOrderBySubmittedAtDesc(
                        learnerId,
                        quizId,
                        AttemptStatus.SUBMITTED
                )
                .stream()
                .map(ScoreResponse::new)
                .toList();
    }

    private String ids(List<Long> ids) {
        return ids == null || ids.isEmpty()
                ? ""
                : ids.stream()
                        .sorted()
                        .map(String::valueOf)
                        .collect(Collectors.joining(","));
    }

    private Quiz quiz(Long id) {
        return quizzes.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Quiz introuvable avec l'id : " + id));
    }

    private Question question(Long id) {
        return questions.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Question introuvable avec l'id : " + id));
    }

    private AnswerOption option(Long id) {
        return options.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Option introuvable avec l'id : " + id));
    }

    private QuizAttempt attempt(Long id) {
        return attempts.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tentative introuvable avec l'id : " + id));
    }
}

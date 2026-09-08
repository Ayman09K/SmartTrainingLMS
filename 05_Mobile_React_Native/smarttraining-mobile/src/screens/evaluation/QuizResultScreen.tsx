import ScreenContainer from "../../components/ScreenContainer";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import AppButton from "../../components/AppButton";
import ScoreSummary from "../../components/evaluation/ScoreSummary";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  LearnerCorrectAnswerResponse,
  LearnerQuestionResultResponse,
  Question,
  QuizAttemptFullResponse,
  QuizFull,
  SubmittedAnswerRequest,
} from "../../types/evaluation";

interface QuizResultScreenProps {
  result: QuizAttemptFullResponse;
  quiz: QuizFull;
  onBackToTraining: () => void;
  onBackToQuizzes: () => void;
}

function itemLabel(
  items: { id: string; text: string }[] | undefined,
  id: string,
): string {
  return items?.find((item) => item.id === id)?.text ?? id;
}

function optionLabels(question: Question, ids: number[]): string {
  const labels = question.options
    .filter((option) => ids.includes(option.id))
    .map((option) => option.content);
  return labels.length ? labels.join(", ") : ids.join(", ");
}

function learnerAnswerLabel(
  question: Question | undefined,
  answer?: SubmittedAnswerRequest | null,
): string {
  if (!answer) return "Aucune réponse enregistrée";
  if (!question) return "Réponse enregistrée";

  if (answer.selectedOptionIds?.length) {
    return optionLabels(question, answer.selectedOptionIds);
  }
  if (answer.answerText?.trim()) return answer.answerText.trim();
  if (answer.blankAnswers?.length) {
    return answer.blankAnswers
      .map((item) => `${item.blankId} : ${item.value}`)
      .join(" · ");
  }
  if (answer.orderedItemIds?.length) {
    return answer.orderedItemIds
      .map((id) => itemLabel(question.typeConfig?.orderingItems, id))
      .join(" → ");
  }
  if (answer.matchingPairs?.length) {
    return answer.matchingPairs
      .map(
        (pair) =>
          `${itemLabel(question.typeConfig?.matchingLeft, pair.leftId)} → ${itemLabel(
            question.typeConfig?.matchingRight,
            pair.rightId,
          )}`,
      )
      .join(" · ");
  }
  if (answer.dragPlacements?.length) {
    return answer.dragPlacements
      .map(
        (placement) =>
          `${itemLabel(question.typeConfig?.dragItems, placement.itemId)} → ${itemLabel(
            question.typeConfig?.dragZones,
            placement.zoneId,
          )}`,
      )
      .join(" · ");
  }
  if (answer.numericValue !== undefined && answer.numericValue !== null) {
    return `${answer.numericValue}${
      question.typeConfig?.numericUnit
        ? ` ${question.typeConfig.numericUnit}`
        : ""
    }`;
  }
  return "Réponse enregistrée";
}

function correctAnswerLabel(
  question: Question | undefined,
  correctAnswer: LearnerCorrectAnswerResponse,
): string {
  if (correctAnswer.options?.length) {
    return correctAnswer.options.map((option) => option.content).join(", ");
  }

  const config = correctAnswer.typeConfig;
  if (!config || !question) return "Correction disponible";

  if (question.type === "FILL_BLANK" && config.fillBlank?.blanks?.length) {
    return config.fillBlank.blanks
      .map((blank) => `${blank.id} : ${blank.accepted.join(" / ")}`)
      .join(" · ");
  }
  if (question.type === "ORDERING" && config.ordering?.items?.length) {
    return [...config.ordering.items]
      .sort((a, b) => a.correctIndex - b.correctIndex)
      .map((item) => item.text)
      .join(" → ");
  }
  if (question.type === "MATCHING" && config.matching?.pairs?.length) {
    return config.matching.pairs
      .map(
        (pair) =>
          `${itemLabel(config.matching?.left, pair.leftId)} → ${itemLabel(
            config.matching?.right,
            pair.rightId,
          )}`,
      )
      .join(" · ");
  }
  if (question.type === "DRAG_DROP" && config.dragDrop?.placements?.length) {
    return config.dragDrop.placements
      .map(
        (placement) =>
          `${itemLabel(config.dragDrop?.items, placement.itemId)} → ${itemLabel(
            config.dragDrop?.zones,
            placement.zoneId,
          )}`,
      )
      .join(" · ");
  }
  if (question.type === "NUMERIC" && config.numeric) {
    return `${config.numeric.expected} ± ${config.numeric.tolerance}${
      config.numeric.unit ? ` ${config.numeric.unit}` : ""
    }`;
  }
  return "Correction disponible";
}

function resultStatusLabel(status: LearnerQuestionResultResponse["status"]): string {
  if (status === "CORRECT") return "Correcte";
  if (status === "PARTIAL") return "Partiellement correcte";
  return "Incorrecte";
}

export default function QuizResultScreen({
  result,
  quiz,
  onBackToTraining,
  onBackToQuizzes,
}: QuizResultScreenProps) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);

  const resultByQuestionId = new Map(
    result.questionResults.map((item) => [item.questionId, item]),
  );

  const presentationQuestionResults = [
    ...quiz.questions
      .map((question) => resultByQuestionId.get(question.id))
      .filter(
        (item): item is LearnerQuestionResultResponse =>
          item !== undefined,
      ),
    ...result.questionResults.filter(
      (item) =>
        !quiz.questions.some(
          (question) => question.id === item.questionId,
        ),
    ),
  ];

  return (
    <ScreenContainer>
      <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Résultat du quiz</Text>
      <ScoreSummary result={result} />

      <Text style={styles.quizTitle}>{quiz.title}</Text>
      <Text style={styles.subtitle}>
        Détail de tes réponses et feedback pédagogique
      </Text>

      {presentationQuestionResults.map((questionResult, index) => {
        const question =
          quiz.questions.find(
            (item) => item.id === questionResult.questionId,
          ) ?? quiz.questions[index];
        const statusColor =
          questionResult.status === "CORRECT"
            ? theme.colors.success
            : questionResult.status === "PARTIAL"
              ? theme.colors.accent
              : theme.colors.danger;

        return (
          <View
            key={questionResult.questionId}
            style={[
              styles.questionCard,
              { borderLeftColor: statusColor },
            ]}
          >
            <View style={styles.questionHeader}>
              <Text style={styles.questionNumber}>
                Question {index + 1} · {questionResult.type}
              </Text>
              <Text style={styles.points}>
                {questionResult.pointsEarned} / {questionResult.maxPoints} pt
              </Text>
            </View>

            <Text style={styles.questionTitle}>
              {questionResult.prompt}
            </Text>

            <View style={styles.answerBox}>
              <Text style={styles.boxTitle}>Ta réponse</Text>
              <Text style={styles.boxText}>
                {learnerAnswerLabel(
                  question,
                  questionResult.learnerAnswer,
                )}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                { borderColor: statusColor },
              ]}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>
                {resultStatusLabel(questionResult.status)}
              </Text>
            </View>

            {questionResult.feedback ? (
              <View style={styles.infoBox}>
                <Text style={styles.boxTitle}>Feedback</Text>
                <Text style={styles.boxText}>{questionResult.feedback}</Text>
              </View>
            ) : null}

            {questionResult.explanation ? (
              <View style={styles.infoBox}>
                <Text style={styles.boxTitle}>Explication</Text>
                <Text style={styles.boxText}>{questionResult.explanation}</Text>
              </View>
            ) : null}

            {questionResult.correctAnswer ? (
              <View style={styles.correctionBox}>
                <Text style={styles.correctionTitle}>
                  Correction autorisée
                </Text>
                <Text style={styles.correctionText}>
                  {correctAnswerLabel(
                    question,
                    questionResult.correctAnswer,
                  )}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}

      <Text style={styles.policyNote}>
        La correction n’est affichée que lorsqu’elle est fournie par le serveur selon la politique du quiz.
      </Text>

      <AppButton title="Retour aux quiz" onPress={onBackToQuizzes} />
      <AppButton
        title="Retour à la formation"
        onPress={onBackToTraining}
        variant="secondary"
        style={styles.secondaryButton}
      />
      </ScrollView>
    </ScreenContainer>
  );
}

function makeStyles(
  theme: ReturnType<typeof useSmartTrainingTheme>["theme"],
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 14,
      paddingBottom: 32,
    },
    title: {
      color: theme.colors.foreground,
      fontSize: 25,
      fontWeight: "900",
      marginBottom: 16,
    },
    quizTitle: {
      color: theme.colors.foreground,
      fontSize: 19,
      fontWeight: "900",
    },
    subtitle: {
      color: theme.colors.foregroundMuted,
      marginTop: 4,
      marginBottom: 16,
      lineHeight: 20,
    },
    questionCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderLeftWidth: 4,
      borderColor: theme.colors.border,
      borderRadius: theme.shape.cardRadius,
      padding: theme.shape.cardPadding,
      marginBottom: 12,
      gap: 10,
    },
    questionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 10,
    },
    questionNumber: {
      flex: 1,
      color: theme.colors.foregroundMuted,
      fontSize: 11,
      fontWeight: "900",
    },
    questionTitle: {
      color: theme.colors.foreground,
      fontSize: 16,
      fontWeight: "900",
      lineHeight: 22,
    },
    points: {
      color: theme.colors.foregroundMuted,
      fontWeight: "800",
      fontSize: 12,
    },
    answerBox: {
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: 12,
      padding: 12,
    },
    infoBox: {
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 12,
    },
    boxTitle: {
      color: theme.colors.foreground,
      fontWeight: "900",
      fontSize: 12,
      marginBottom: 4,
    },
    boxText: {
      color: theme.colors.foregroundMuted,
      lineHeight: 20,
    },
    statusBadge: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "900",
    },
    correctionBox: {
      backgroundColor: theme.colors.surfaceSoft,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.success,
      padding: 12,
    },
    correctionTitle: {
      color: theme.colors.success,
      fontWeight: "900",
      fontSize: 12,
      marginBottom: 4,
    },
    correctionText: {
      color: theme.colors.foreground,
      lineHeight: 20,
      fontWeight: "700",
    },
    policyNote: {
      color: theme.colors.foregroundMuted,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 14,
    },
    secondaryButton: {
      marginTop: 10,
    },
  });
}

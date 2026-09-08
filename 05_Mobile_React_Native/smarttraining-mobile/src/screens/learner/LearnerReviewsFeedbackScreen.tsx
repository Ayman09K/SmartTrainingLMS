import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
type SmartTheme = ReturnType<typeof useSmartTrainingTheme>["theme"];
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import {
  createMyFeedback,
  createOrUpdateMyReview,
  getMyFeedbacks,
  getMyReviews,
} from "../../features/analytics/learnerFeedbackService";
import {
  getMyLearnerTrainings,
} from "../../features/trainings/learnerTrainingService";



import {
  LearnerDifficultyLevel,
  LearnerFeedbackResponse,
  LearnerReviewResponse,
} from "../../types/learnerFeedback";
import { LearnerMyTraining } from "../../types/learnerTraining";

type Props = {
  onBackHome: () => void;
};

const difficulties: {
  value: LearnerDifficultyLevel;
  label: string;
}[] = [
  { value: "VERY_EASY", label: "Très facile" },
  { value: "EASY", label: "Facile" },
  { value: "NORMAL", label: "Normal" },
  { value: "HARD", label: "Difficile" },
  { value: "VERY_HARD", label: "Très difficile" },
];

function formatDate(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

function feedbackStatusLabel(value: string): string {
  if (value === "OPEN") return "Envoyée";
  if (value === "IN_PROGRESS") return "En cours de traitement";
  if (value === "RESOLVED") return "Traitée";
  if (value === "CLOSED") return "Clôturée";

  return "Envoyée";
}

function reviewStatusLabel(value: string): string {
  if (value === "HIDDEN") {
    return "Masqué par la modération";
  }

  return "Publié";
}

function difficultyLabel(value: LearnerDifficultyLevel): string {
  return (
    difficulties.find((item) => item.value === value)?.label ??
    "Normal"
  );
}

export default function LearnerReviewsFeedbackScreen({
  onBackHome,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  const [trainings, setTrainings] = useState<LearnerMyTraining[]>([]);
  const [feedbacks, setFeedbacks] =
    useState<LearnerFeedbackResponse[]>([]);
  const [reviews, setReviews] =
    useState<LearnerReviewResponse[]>([]);

  const [selectedTrainingId, setSelectedTrainingId] =
    useState<number | null>(null);

  const [difficulty, setDifficulty] =
    useState<LearnerDifficultyLevel>("NORMAL");
  const [needHelp, setNeedHelp] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [trainingData, feedbackData, reviewData] =
      await Promise.all([
        getMyLearnerTrainings(),
        getMyFeedbacks(),
        getMyReviews(),
      ]);

    setTrainings(trainingData);
    setFeedbacks(feedbackData);
    setReviews(reviewData);

    if (
      selectedTrainingId === null &&
      trainingData.length > 0
    ) {
      setSelectedTrainingId(trainingData[0].id);
    }
  }

  useEffect(() => {
    let active = true;

    void Promise.all([
      getMyLearnerTrainings(),
      getMyFeedbacks(),
      getMyReviews(),
    ])
      .then(([trainingData, feedbackData, reviewData]) => {
        if (!active) return;

        setTrainings(trainingData);
        setFeedbacks(feedbackData);
        setReviews(reviewData);

        const initialTrainingId = trainingData[0]?.id ?? null;
        const initialReview = reviewData.find(
          (item) => item.trainingId === initialTrainingId,
        );

        setSelectedTrainingId(initialTrainingId);
        setRating(initialReview?.rating ?? 5);
        setReviewComment(initialReview?.comment ?? "");
        setError("");
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger tes avis et tes demandes.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const trainingTitles = useMemo(
    () =>
      new Map(
        trainings.map((training) => [
          training.id,
          training.title,
        ]),
      ),
    [trainings],
  );

  const currentReview = useMemo(
    () =>
      reviews.find(
        (item) => item.trainingId === selectedTrainingId,
      ),
    [reviews, selectedTrainingId],
  );

  function selectTraining(trainingId: number) {
    const existingReview = reviews.find(
      (item) => item.trainingId === trainingId,
    );

    setSelectedTrainingId(trainingId);
    setRating(existingReview?.rating ?? 5);
    setReviewComment(existingReview?.comment ?? "");
    setError("");
    setSuccess("");
  }

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError(
        "Impossible d’actualiser tes avis et tes demandes.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function submitFeedback() {
    if (selectedTrainingId === null) {
      setError("Choisis d’abord une formation.");
      return;
    }

    const cleanMessage = feedbackMessage.trim();

    if (!cleanMessage) {
      setError("Décris brièvement ton retour ou ton besoin d’aide.");
      return;
    }

    setSavingFeedback(true);
    setError("");
    setSuccess("");

    try {
      const created = await createMyFeedback({
        trainingId: selectedTrainingId,
        difficultyLevel: difficulty,
        needHelp,
        message: cleanMessage,
      });

      setFeedbacks((current) => [created, ...current]);
      setFeedbackMessage("");
      setDifficulty("NORMAL");
      setNeedHelp(false);
      setSuccess(
        needHelp
          ? "Ta demande d’aide a été envoyée au formateur."
          : "Ton retour pédagogique a été envoyé.",
      );
    } catch {
      setError(
        "Ton retour n’a pas pu être envoyé. Réessaie dans quelques instants.",
      );
    } finally {
      setSavingFeedback(false);
    }
  }

  async function submitReview() {
    if (selectedTrainingId === null) {
      setError("Choisis d’abord une formation.");
      return;
    }

    setSavingReview(true);
    setError("");
    setSuccess("");

    try {
      const saved = await createOrUpdateMyReview({
        trainingId: selectedTrainingId,
        rating,
        comment: reviewComment.trim(),
      });

      setReviews((current) => [
        saved,
        ...current.filter((item) => item.id !== saved.id),
      ]);

      setSuccess(
        currentReview
          ? "Ton avis a été mis à jour."
          : "Ton avis a été publié.",
      );
    } catch {
      setError(
        "Ton avis n’a pas pu être enregistré. Réessaie dans quelques instants.",
      );
    } finally {
      setSavingReview(false);
    }
  }

  if (loading) {
    return (
      <LoadingState message="Chargement de tes avis et retours..." />
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <AppButton
          title="Retour à l’accueil"
          onPress={onBackHome}
          variant="secondary"
          style={styles.backButton}
        />

        <SectionHeader
          title="Avis et feedback"
          subtitle="Évalue tes formations, signale une difficulté et retrouve les réponses de ton formateur."
        />

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>C’est enregistré</Text>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        {error ? <ErrorMessage message={error} /> : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Choisir une formation</Text>
          <Text style={styles.helpText}>
            Tes avis et demandes sont toujours liés à une formation de ton espace.
          </Text>

          <View style={styles.choiceWrap}>
            {trainings.map((training) => {
              const selected =
                training.id === selectedTrainingId;

              return (
                <Pressable
                  key={training.id}
                  onPress={() =>
                    selectTraining(training.id)
                  }
                  accessibilityRole="radio"
                  accessibilityLabel={training.title}
                  accessibilityState={{ selected }}
                  style={[
                    styles.trainingChoice,
                    selected && styles.trainingChoiceSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.trainingChoiceText,
                      selected &&
                        styles.trainingChoiceTextSelected,
                    ]}
                  >
                    {training.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {trainings.length === 0 ? (
            <Text style={styles.emptyText}>
              Aucune formation inscrite n’est disponible.
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Donner mon avis</Text>
          <Text style={styles.helpText}>
            Choisis une note de 1 à 5 et ajoute un commentaire si tu le souhaites.
          </Text>

          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable
                key={value}
                onPress={() => setRating(value)}
                    accessibilityRole="radio"
                    accessibilityLabel={`${value} ${value === 1 ? "etoile" : "etoiles"} sur 5`}
                    accessibilityState={{ selected: rating === value }}
                style={[
                  styles.ratingButton,
                  rating === value && styles.ratingButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.ratingText,
                    rating === value && styles.ratingTextSelected,
                  ]}
                >
                  {value} ★
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={reviewComment}
              accessibilityLabel={"Commentaire de mon avis"}
            onChangeText={setReviewComment}
            placeholder="Mon avis sur cette formation..."
            placeholderTextColor={theme.colors.foregroundMuted}
            multiline
            style={[styles.input, styles.textArea]}
          />

          {currentReview ? (
            <Text style={styles.currentInfo}>
              Avis actuel : {currentReview.rating}/5 ·{" "}
              {reviewStatusLabel(currentReview.status)}
            </Text>
          ) : null}

          <AppButton
            title={
              currentReview
                ? "Mettre à jour mon avis"
                : "Publier mon avis"
            }
            onPress={() => void submitReview()}
            loading={savingReview}
            disabled={selectedTrainingId === null}
            style={styles.action}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Faire un retour ou demander de l’aide
          </Text>
          <Text style={styles.helpText}>
            Indique comment tu as vécu la formation et si tu souhaites être aidé.
          </Text>

          <Text style={styles.fieldLabel}>Niveau de difficulté</Text>

          <View style={styles.choiceWrap}>
            {difficulties.map((item) => {
              const selected = item.value === difficulty;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => setDifficulty(item.value)}
                  accessibilityRole="radio"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected }}
                  style={[
                    styles.smallChoice,
                    selected && styles.smallChoiceSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.smallChoiceText,
                      selected &&
                        styles.smallChoiceTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => setNeedHelp((value) => !value)}
              accessibilityRole="checkbox"
              accessibilityLabel={"J\u2019ai besoin d\u2019aide"}
              accessibilityState={{ checked: needHelp }}
            style={[
              styles.helpToggle,
              needHelp && styles.helpToggleSelected,
            ]}
          >
            <Text
              style={[
                styles.helpToggleTitle,
                needHelp && styles.helpToggleTitleSelected,
              ]}
            >
              {needHelp
                ? "✓ J’ai besoin d’aide"
                : "J’ai besoin d’aide"}
            </Text>
            <Text style={styles.helpToggleText}>
              Coche cette option si tu souhaites attirer l’attention du formateur.
            </Text>
          </Pressable>

          <TextInput
            value={feedbackMessage}
              accessibilityLabel={"Message de feedback ou demande d\u2019aide"}
            onChangeText={setFeedbackMessage}
            placeholder="Décris ton retour, ta difficulté ou ton besoin..."
            placeholderTextColor={theme.colors.foregroundMuted}
            multiline
            style={[styles.input, styles.textArea]}
          />

          <AppButton
            title={
              needHelp
                ? "Envoyer ma demande d’aide"
                : "Envoyer mon retour"
            }
            onPress={() => void submitFeedback()}
            loading={savingFeedback}
            disabled={selectedTrainingId === null}
            style={styles.action}
          />
        </View>

        <Text style={styles.sectionTitle}>Suivi de mes demandes</Text>

        {feedbacks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Aucun retour envoyé
            </Text>
            <Text style={styles.emptyText}>
              Tes demandes et les réponses du formateur apparaîtront ici.
            </Text>
          </View>
        ) : (
          feedbacks.map((feedback) => (
            <View key={feedback.id} style={styles.historyCard}>
              <View style={styles.historyTop}>
                <Text style={styles.historyTraining}>
                  {trainingTitles.get(feedback.trainingId) ??
                    "Formation associée"}
                </Text>
                <Text style={styles.historyStatus}>
                  {feedbackStatusLabel(feedback.status)}
                </Text>
              </View>

              <Text style={styles.historyMeta}>
                Difficulté :{" "}
                {difficultyLabel(feedback.difficultyLevel)}
                {feedback.needHelp ? " · Aide demandée" : ""}
              </Text>

              {feedback.message ? (
                <Text style={styles.historyMessage}>
                  {feedback.message}
                </Text>
              ) : null}

              {feedback.trainerResponse ? (
                <View style={styles.trainerResponse}>
                  <Text style={styles.trainerResponseTitle}>
                    Réponse du formateur
                  </Text>
                  <Text style={styles.trainerResponseText}>
                    {feedback.trainerResponse}
                  </Text>
                </View>
              ) : null}

              {feedback.createdAt ? (
                <Text style={styles.dateText}>
                  Envoyé le {formatDate(feedback.createdAt)}
                </Text>
              ) : null}
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Mes avis publiés</Text>

        {reviews.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucun avis publié</Text>
            <Text style={styles.emptyText}>
              Tu peux évaluer une formation depuis le formulaire ci-dessus.
            </Text>
          </View>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.historyCard}>
              <View style={styles.historyTop}>
                <Text style={styles.historyTraining}>
                  {trainingTitles.get(review.trainingId) ??
                    "Formation associée"}
                </Text>
                <Text style={styles.historyStatus}>
                  {review.rating}/5
                </Text>
              </View>

              <Text style={styles.historyMeta}>
                {reviewStatusLabel(review.status)}
              </Text>

              {review.comment ? (
                <Text style={styles.historyMessage}>
                  {review.comment}
                </Text>
              ) : null}

              {review.updatedAt || review.createdAt ? (
                <Text style={styles.dateText}>
                  Mis à jour le{" "}
                  {formatDate(
                    review.updatedAt ?? review.createdAt,
                  )}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function makeStyles(theme: SmartTheme) {
  return StyleSheet.create({
  scrollArea: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    paddingBottom: theme.shape.cardPadding * 2,
  },
  backButton: {
    marginBottom: 14,
  },
  successBox: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.shape.cardRadius,
    padding: 18,
    marginBottom: 18,
  },
  successTitle: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: "900",
  },
  successText: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.cardRadius,
    padding: theme.shape.cardPadding,
    marginBottom: 18,
  },
  cardTitle: {
    color: theme.colors.foreground,
    fontSize: 18,
    fontWeight: "900",
  },
  helpText: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
    marginBottom: 14,
  },
  fieldLabel: {
    color: theme.colors.foreground,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  trainingChoice: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.controlRadius,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  trainingChoiceSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.surfaceSoft,
  },
  trainingChoiceText: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  trainingChoiceTextSelected: {
    color: theme.colors.accent,
  },
  ratingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  ratingButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.controlRadius,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceSoft,
  },
  ratingButtonSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.surfaceSoft,
  },
  ratingText: {
    color: theme.colors.foregroundMuted,
    fontWeight: "800",
  },
  ratingTextSelected: {
    color: theme.colors.accent,
  },
  smallChoice: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8,
  },
  smallChoiceSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.surfaceSoft,
  },
  smallChoiceText: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  smallChoiceTextSelected: {
    color: theme.colors.accent,
  },
  helpToggle: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.cardRadius,
    padding: 14,
    marginTop: 14,
  },
  helpToggleSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.surfaceSoft,
  },
  helpToggleTitle: {
    color: theme.colors.foreground,
    fontSize: 14,
    fontWeight: "900",
  },
  helpToggleTitleSelected: {
    color: theme.colors.accent,
  },
  helpToggleText: {
    color: theme.colors.foregroundMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.controlRadius,
    backgroundColor: theme.colors.surface,
    color: theme.colors.foreground,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    marginTop: 14,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  currentInfo: {
    color: theme.colors.foregroundMuted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  action: {
    marginTop: 18,
  },
  sectionTitle: {
    color: theme.colors.foreground,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 14,
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.cardRadius,
    padding: 18,
    marginBottom: 18,
  },
  emptyTitle: {
    color: theme.colors.foreground,
    fontSize: 15,
    fontWeight: "900",
  },
  emptyText: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  historyCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.cardRadius,
    padding: 18,
    marginBottom: 14,
  },
  historyTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  historyTraining: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: 14,
    fontWeight: "900",
  },
  historyStatus: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
  },
  historyMeta: {
    color: theme.colors.foregroundMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  historyMessage: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  trainerResponse: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.shape.controlRadius,
    padding: 14,
    marginTop: 14,
  },
  trainerResponseTitle: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "900",
  },
  trainerResponseText: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  dateText: {
    color: theme.colors.foregroundMuted,
    fontSize: 12,
    marginTop: 14,
  },
});
}

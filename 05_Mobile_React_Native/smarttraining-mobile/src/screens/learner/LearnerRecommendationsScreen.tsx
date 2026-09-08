import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
type SmartTheme = ReturnType<typeof useSmartTrainingTheme>["theme"];
import { useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import LearnerRecommendationCard from "../../components/learner/LearnerRecommendationCard";
import {
  acceptRecommendation,
  completeRecommendation,
  dismissRecommendation,
  getMyRecommendations,
} from "../../features/analytics/analyticsService";
import {
  getMyLearnerTrainings,
} from "../../features/trainings/learnerTrainingService";



import { RecommendationResponse } from "../../types/analytics";
import { LearnerMyTraining } from "../../types/learnerTraining";

type Props = {
  onOpenTraining: (trainingId: number) => void;
  onBackHome: () => void;
};

export default function LearnerRecommendationsScreen({
  onOpenTraining,
  onBackHome,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  const [recommendations, setRecommendations] =
    useState<RecommendationResponse[]>([]);
  const [trainings, setTrainings] =
    useState<LearnerMyTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [recommendationData, trainingData] =
      await Promise.all([
        getMyRecommendations(),
        getMyLearnerTrainings(),
      ]);

    setRecommendations(recommendationData);
    setTrainings(trainingData);
  }

  useEffect(() => {
    let active = true;

    void Promise.all([
      getMyRecommendations(),
      getMyLearnerTrainings(),
    ])
      .then(([recommendationData, trainingData]) => {
        if (!active) return;

        setRecommendations(recommendationData);
        setTrainings(trainingData);
        setError("");
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger tes recommandations. Réessaie dans quelques instants.",
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

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError(
        "Impossible d’actualiser tes recommandations.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function updateRecommendation(
    recommendationId: number,
    action: "ACCEPT" | "COMPLETE" | "DISMISS",
  ) {
    setBusyId(recommendationId);
    setError("");
    setSuccess("");

    try {
      const updated =
        action === "ACCEPT"
          ? await acceptRecommendation(recommendationId)
          : action === "COMPLETE"
            ? await completeRecommendation(recommendationId)
            : await dismissRecommendation(recommendationId);

      setRecommendations((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );

      setSuccess(
        action === "ACCEPT"
          ? "La recommandation est maintenant dans tes actions en cours."
          : action === "COMPLETE"
            ? "La recommandation a été marquée comme terminée."
            : "La recommandation a été ignorée.",
      );
    } catch {
      setError(
        "Cette recommandation n’a pas pu être mise à jour.",
      );
    } finally {
      setBusyId(null);
    }
  }

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

  const sortedRecommendations = useMemo(
    () =>
      [...recommendations].sort((left, right) => {
        const rank: Record<string, number> = {
          PROPOSED: 0,
          ACCEPTED: 1,
          COMPLETED: 2,
          DISMISSED: 3,
        };

        return (
          (rank[left.status] ?? 9) -
          (rank[right.status] ?? 9)
        );
      }),
    [recommendations],
  );

  if (loading) {
    return (
      <LoadingState message="Chargement de tes recommandations..." />
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollArea}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
          />
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppButton
          title="Retour à l’accueil"
          onPress={onBackHome}
          variant="secondary"
          style={styles.homeButton}
        />
        <SectionHeader
          title="Mes recommandations"
          subtitle="Retrouve les actions pédagogiques proposées pour avancer dans tes formations."
        />

        {success ? (
          <View style={styles.success}>
            <Text style={styles.successTitle}>C’est fait</Text>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        {error ? (
          <ErrorMessage
            message={error}
            onRetry={() => void refresh()}
          />
        ) : null}

        {sortedRecommendations.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              Aucune recommandation pour le moment
            </Text>
            <Text style={styles.emptyText}>
              Les conseils personnalisés apparaîtront ici lorsque ton
              activité permettra de proposer une prochaine action utile.
            </Text>
          </View>
        ) : (
          sortedRecommendations.map((recommendation) => (
            <LearnerRecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              trainingTitle={
                trainingTitles.get(recommendation.trainingId) ||
                "Formation associée"
              }
              busy={busyId === recommendation.id}
              onAccept={() =>
                void updateRecommendation(
                  recommendation.id,
                  "ACCEPT",
                )
              }
              onComplete={() =>
                void updateRecommendation(
                  recommendation.id,
                  "COMPLETE",
                )
              }
              onDismiss={() =>
                void updateRecommendation(
                  recommendation.id,
                  "DISMISS",
                )
              }
              onOpenTraining={() =>
                onOpenTraining(recommendation.trainingId)
              }
            />
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
  homeButton: {
    marginBottom: 14,
  },
  success: {
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
  empty: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.cardRadius,
    padding: theme.shape.cardPadding,
  },
  emptyTitle: {
    color: theme.colors.foreground,
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
});
}

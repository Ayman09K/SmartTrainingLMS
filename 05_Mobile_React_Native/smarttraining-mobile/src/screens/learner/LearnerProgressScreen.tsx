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
import LearnerProgressCard from "../../components/learner/LearnerProgressCard";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import { ActivityItem } from "../../components/ux/RichPrimitives";
import {
  getMyProgress,
  getMyRiskIndicator,
} from "../../features/analytics/analyticsService";
import {
  getMyLearnerTrainings,
} from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
  LearnerProgressResponse,
  RiskIndicatorResponse,
} from "../../types/analytics";
import { LearnerMyTraining } from "../../types/learnerTraining";

type Props = {
  onOpenTraining: (trainingId: number) => void;
  onOpenRecommendations: () => void;
  onBackHome: () => void;
};

function clamp(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatActivityDate(value?: string | null): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function riskTitle(level?: string): string {
  if (level === "DATA_INSUFFICIENT") {
    return "Analyse en cours de construction";
  }

  if (level === "HIGH") {
    return "Accompagnement conseill\u00E9";
  }

  if (level === "MEDIUM") {
    return "Progression \u00E0 surveiller";
  }

  return "Rythme satisfaisant";
}

function riskMessage(risk: RiskIndicatorResponse | null): string {
  if (!risk || risk.riskLevel === "DATA_INSUFFICIENT") {
    return "Il n\u2019y a pas encore assez d\u2019activit\u00E9 pour personnaliser ton accompagnement. Continue ton parcours normalement.";
  }

  const suggestion = risk.recommendations?.[0];

  if (suggestion) {
    return suggestion;
  }

  if (risk.riskLevel === "HIGH") {
    return "Reprends les activit\u00E9s prioritaires et sollicite ton formateur si tu rencontres un blocage.";
  }

  if (risk.riskLevel === "MEDIUM") {
    return "Avance r\u00E9guli\u00E8rement et consulte les recommandations propos\u00E9es pour ton parcours.";
  }

  return "Continue \u00E0 avancer r\u00E9guli\u00E8rement dans tes formations.";
}

export default function LearnerProgressScreen({
  onOpenTraining,
  onOpenRecommendations,
  onBackHome,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [progressList, setProgressList] =
    useState<LearnerProgressResponse[]>([]);
  const [trainings, setTrainings] =
    useState<LearnerMyTraining[]>([]);
  const [risk, setRisk] =
    useState<RiskIndicatorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [progressData, trainingData] = await Promise.all([
      getMyProgress(),
      getMyLearnerTrainings(),
    ]);

    setProgressList(progressData);
    setTrainings(trainingData);

    try {
      setRisk(await getMyRiskIndicator());
    } catch {
      setRisk(null);
    }
  }

  useEffect(() => {
    let active = true;

    void Promise.all([
      getMyProgress(),
      getMyLearnerTrainings(),
    ])
      .then(async ([progressData, trainingData]) => {
        if (!active) return;

        setProgressList(progressData);
        setTrainings(trainingData);
        setError("");

        try {
          const riskData = await getMyRiskIndicator();

          if (active) {
            setRisk(riskData);
          }
        } catch {
          if (active) {
            setRisk(null);
          }
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger ta progression. R\u00E9essaie dans quelques instants.",
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
        "Impossible d\u2019actualiser ta progression. R\u00E9essaie dans quelques instants.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  const progressByTraining = useMemo(
    () =>
      new Map(
        progressList.map((item) => [item.trainingId, item]),
      ),
    [progressList],
  );

  const percentages = useMemo(
    () =>
      trainings.map((training) => {
        const analyticsProgress =
          progressByTraining.get(training.id)?.progressPercentage;

        return clamp(
          analyticsProgress ?? training.progressPercentage,
        );
      }),
    [progressByTraining, trainings],
  );

  const averageProgress =
    percentages.length > 0
      ? Math.round(
          percentages.reduce((sum, value) => sum + value, 0) /
            percentages.length,
        )
      : 0;

  const completedCount = percentages.filter(
    (value) => value >= 100,
  ).length;

  const scores = progressList
    .map((item) => item.averageScore)
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    );

  const averageScore =
    scores.length > 0
      ? Math.round(
          scores.reduce((sum, value) => sum + value, 0) /
            scores.length,
        )
      : null;

  const recentActivity = useMemo(() => {
    const trainingById = new Map(
      trainings.map((training) => [training.id, training.title]),
    );

    return progressList
      .filter((item) => Boolean(item.lastActivityAt))
      .map((item) => ({
        id: item.id,
        title: `Dernière activité — ${
          trainingById.get(item.trainingId) || "Formation suivie"
        }`,
        description: `${clamp(item.progressPercentage)} % de progression • ${
          item.status === "COMPLETED"
            ? "Formation terminée"
            : item.status === "AT_RISK"
              ? "Progression à surveiller"
              : item.status === "IN_PROGRESS"
                ? "Parcours en cours"
                : "Parcours à commencer"
        }`,
        timestamp: formatActivityDate(item.lastActivityAt),
        sortValue: item.lastActivityAt
          ? Date.parse(item.lastActivityAt)
          : 0,
      }))
      .sort((a, b) => b.sortValue - a.sortValue)
      .slice(0, 3);
  }, [progressList, trainings]);

  if (loading) {
    return <LoadingState message="Chargement de ta progression..." />;
  }

  const riskAccent =
    risk?.riskLevel === "HIGH"
      ? theme.colors.danger
      : risk?.riskLevel === "MEDIUM"
        ? theme.colors.warning
        : risk?.riskLevel === "LOW"
          ? theme.colors.success
          : theme.colors.info;

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollArea}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: theme.shape.cardPadding * 2,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <AppButton
            title={"Retour \u00E0 l\u2019accueil"}
            onPress={onBackHome}
            variant="secondary"
            style={styles.homeButton}
          />

          <SectionHeader
            title="Ma progression"
            subtitle="Suis ton avancement formation par formation et retrouve les prochaines actions utiles."
          />

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => void refresh()}
            />
          ) : null}

          <View style={styles.summaryGrid}>
            <SummaryCard
              label="Formations suivies"
              value={String(trainings.length)}
            />
            <SummaryCard
              label="Progression moyenne"
              value={`${averageProgress} %`}
            />
            <SummaryCard
              label={"Formations termin\u00E9es"}
              value={String(completedCount)}
            />
            <SummaryCard
              label="Score moyen"
              value={
                averageScore === null
                  ? "\u2014"
                  : `${averageScore} %`
              }
            />
          </View>

          <View
            style={[
              styles.guidance,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: riskAccent,
                borderRadius: theme.shape.cardRadius,
                borderWidth: Math.max(1, theme.shape.borderWidth),
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <View style={styles.guidanceHeader}>
              <View
                style={[
                  styles.guidanceMark,
                  {
                    backgroundColor: riskAccent,
                    borderRadius: 999,
                  },
                ]}
              />
              <View style={styles.guidanceHeadingText}>
                <Text
                  style={[
                    styles.guidanceEyebrow,
                    { color: riskAccent },
                  ]}
                >
                  ACCOMPAGNEMENT
                </Text>
                <Text
                  style={[
                    styles.guidanceTitle,
                    { color: theme.colors.foreground },
                  ]}
                >
                  {riskTitle(risk?.riskLevel)}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.guidanceText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {riskMessage(risk)}
            </Text>

            <AppButton
              title="Voir mes recommandations"
              onPress={onOpenRecommendations}
              variant="secondary"
              style={styles.guidanceAction}
            />
          </View>

          <View style={styles.activitySection}>
            <SectionHeader
              title="Activité récente"
              subtitle="Dernières activités réellement enregistrées dans tes formations."
            />

            {recentActivity.length > 0 ? (
              <View style={styles.activityList}>
                {recentActivity.map((item) => (
                  <ActivityItem
                    key={item.id}
                    title={item.title}
                    description={item.description}
                    timestamp={item.timestamp}
                  />
                ))}
              </View>
            ) : (
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Aucune activité récente horodatée n’est encore disponible.
              </Text>
            )}
          </View>

          <View style={styles.detailHeader}>
            <Text
              style={[
                styles.detailEyebrow,
                { color: theme.colors.accent },
              ]}
            >
              FORMATIONS
            </Text>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.foreground },
              ]}
            >
              D{"\u00E9"}tail par formation
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Retrouve ton taux d{"\u2019"}avancement, tes activit{"\u00E9"}s
              termin{"\u00E9"}es et ton dernier score.
            </Text>
          </View>

          {trainings.length === 0 ? (
            <View
              style={[
                styles.empty,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.cardRadius,
                  borderWidth: theme.shape.borderWidth,
                  padding: theme.shape.cardPadding,
                },
              ]}
            >
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Aucune formation {"\u00E0"} suivre
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Ta progression appara{"\u00EE"}tra ici d{"\u00E8"}s qu{"\u2019"}une
                formation sera disponible dans ton espace.
              </Text>
            </View>
          ) : (
            trainings.map((training) => (
              <LearnerProgressCard
                key={training.id}
                trainingTitle={training.title}
                fallbackPercentage={training.progressPercentage}
                progress={progressByTraining.get(training.id)}
                onOpenTraining={() => onOpenTraining(training.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function SummaryCard({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) {
    return (
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.shape.cardRadius,
            borderWidth: theme.shape.borderWidth,
            padding: Math.max(
              16,
              theme.shape.cardPadding - 4,
            ),
          },
        ]}
      >
        <Text
          style={[
            styles.summaryValue,
            { color: theme.colors.accent },
          ]}
        >
          {value}
        </Text>
        <Text
          style={[
            styles.summaryLabel,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {label}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flexGrow: 1,
  },
  page: {
    width: "100%",
    maxWidth: 1080,
    alignSelf: "center",
  },
  homeButton: {
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 190,
    minWidth: 0,
  },
  summaryValue: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "900",
  },
  summaryLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 5,
  },
  guidance: {
    marginBottom: 24,
  },
  guidanceHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  guidanceMark: {
    width: 6,
    minHeight: 48,
  },
  guidanceHeadingText: {
    flex: 1,
  },
  guidanceEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
  },
  guidanceTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
    marginTop: 5,
  },
  guidanceText: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
    maxWidth: 760,
  },
  guidanceAction: {
    alignSelf: "flex-start",
    marginTop: 18,
  },
  activitySection: {
    marginTop: 8,
  },
  activityList: {
    gap: 12,
    marginTop: 4,
    marginBottom: 24,
  },
  detailHeader: {
    marginBottom: 14,
  },
  detailEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    maxWidth: 760,
  },
  empty: {},
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
});
import { useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import TrainerFeedbackCard from "../../components/trainer/TrainerFeedbackCard";
import {
  getTrainerFeedbacks,
} from "../../features/trainer/trainerFeedbackReviewService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerFeedbackListItem,
} from "../../types/trainerFeedbackReviewMobile";

type Props = {
  trainerId: number;
  onOpenFeedback: (feedbackId: number) => void;
  onOpenReviews: () => void;
};

type Filter =
  | "ALL"
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

function filterLabel(value: Filter): string {
  const labels: Record<Filter, string> = {
    ALL: "Tous",
    OPEN: "À traiter",
    IN_PROGRESS: "En cours",
    RESOLVED: "Traités",
    CLOSED: "Clôturés",
  };

  return labels[value];
}

function searchText(
  item: TrainerFeedbackListItem,
): string {
  const learner = item.learner;
  const learnerText = learner
    ? [
        learner.fullName,
        learner.firstName,
        learner.lastName,
        learner.email,
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return [
    learnerText,
    item.training?.title,
    item.feedback.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("fr");
}

export default function TrainerFeedbacksScreen({
  trainerId,
  onOpenFeedback,
  onOpenReviews,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [items, setItems] =
    useState<TrainerFeedbackListItem[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const loaded = await getTrainerFeedbacks(trainerId);
    setItems(loaded);
  }

  useEffect(() => {
    let active = true;

    void getTrainerFeedbacks(trainerId)
      .then((loaded) => {
        if (active) {
          setItems(loaded);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger les feedbacks apprenants.",
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
  }, [trainerId]);

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError(
        "Impossible d’actualiser les feedbacks.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  const counts = useMemo(() => {
    const result: Record<Filter, number> = {
      ALL: items.length,
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    for (const item of items) {
      const status = item.feedback.status as Filter;

      if (status in result && status !== "ALL") {
        result[status] += 1;
      }
    }

    return result;
  }, [items]);

  const filtered = useMemo(() => {
    const normalized = query
      .trim()
      .toLocaleLowerCase("fr");

    return items.filter((item) => {
      const statusMatch =
        filter === "ALL" ||
        item.feedback.status === filter;

      const queryMatch =
        !normalized ||
        searchText(item).includes(normalized);

      return statusMatch && queryMatch;
    });
  }, [filter, items, query]);

  if (loading) {
    return (
      <LoadingState message="Chargement des feedbacks..." />
    );
  }

  const filters: Filter[] = [
    "ALL",
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
  ];

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: theme.shape.cardPadding * 2,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <SectionHeader
            title="Feedbacks apprenants"
            subtitle="Traitez les retours et demandes d’aide reçus sur vos formations."
          />

          <View
            style={[
              styles.reviewLink,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderRadius: theme.shape.cardRadius,
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <Text
              style={[
                styles.reviewTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Avis sur mes formations
            </Text>
            <Text
              style={[
                styles.reviewText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Consultez séparément les notes et commentaires
              publiés par les apprenants.
            </Text>
            <Text
              onPress={onOpenReviews}
              style={[
                styles.reviewAction,
                { color: theme.colors.accent },
              ]}
            >
              Consulter les avis
            </Text>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un apprenant, une formation..."
            placeholderTextColor={theme.colors.foregroundSubtle}
            style={[
              styles.search,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
                color: theme.colors.foreground,
              },
            ]}
          />

          <View style={styles.filters}>
            {filters.map((value) => {
              const selected = value === filter;

              return (
                <Text
                  key={value}
                  onPress={() => setFilter(value)}
                  style={[
                    styles.filter,
                    {
                      backgroundColor: selected
                        ? theme.colors.accent
                        : theme.colors.surfaceSoft,
                      color: selected
                        ? theme.colors.background
                        : theme.colors.foreground,
                      borderColor: selected
                        ? theme.colors.accent
                        : theme.colors.border,
                      borderWidth: theme.shape.borderWidth,
                    },
                  ]}
                >
                  {filterLabel(value)} · {counts[value]}
                </Text>
              );
            })}
          </View>

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => void refresh()}
            />
          ) : null}

          {filtered.length === 0 ? (
            <View
              style={[
                styles.empty,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.cardRadius,
                  borderWidth: theme.shape.borderWidth,
                },
              ]}
            >
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Aucun feedback à afficher
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Aucun retour ne correspond au filtre ou à la recherche.
              </Text>
            </View>
          ) : (
            filtered.map((item) => (
              <TrainerFeedbackCard
                key={item.feedback.id}
                item={item}
                onOpen={() =>
                  onOpenFeedback(item.feedback.id)
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
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
  reviewLink: {
    marginBottom: 14,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  reviewText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  reviewAction: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 10,
  },
  search: {
    minHeight: 48,
    paddingHorizontal: 15,
    fontSize: 15,
    marginBottom: 12,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  filter: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
  },
  empty: {
    padding: 22,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
});
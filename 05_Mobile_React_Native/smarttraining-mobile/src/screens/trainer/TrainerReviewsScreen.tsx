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
import TrainerReviewCard from "../../components/trainer/TrainerReviewCard";
import {
  getTrainerReviews,
} from "../../features/trainer/trainerFeedbackReviewService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerReviewListItem,
} from "../../types/trainerFeedbackReviewMobile";

type Props = {
  trainerId: number;
};

function searchText(item: TrainerReviewListItem): string {
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
    item.review.comment,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("fr");
}

export default function TrainerReviewsScreen({
  trainerId,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [items, setItems] =
    useState<TrainerReviewListItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const loaded = await getTrainerReviews(trainerId);
    setItems(loaded);
  }

  useEffect(() => {
    let active = true;

    void getTrainerReviews(trainerId)
      .then((loaded) => {
        if (active) {
          setItems(loaded);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger les avis de vos formations.",
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
        "Impossible d’actualiser les avis.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = useMemo(() => {
    const normalized = query
      .trim()
      .toLocaleLowerCase("fr");

    if (!normalized) {
      return items;
    }

    return items.filter((item) =>
      searchText(item).includes(normalized),
    );
  }, [items, query]);

  const published = items.filter(
    (item) => item.review.status !== "HIDDEN",
  );

  const average =
    published.length > 0
      ? published.reduce(
          (sum, item) => sum + item.review.rating,
          0,
        ) / published.length
      : null;

  if (loading) {
    return (
      <LoadingState message="Chargement des avis..." />
    );
  }

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
            title="Avis sur mes formations"
            subtitle="Consultez les notes et commentaires laissés par les apprenants."
          />

          <View style={styles.metrics}>
            <View
              style={[
                styles.metric,
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
                  styles.metricValue,
                  { color: theme.colors.accent },
                ]}
              >
                {average === null ? "-" : average.toFixed(1)}
              </Text>
              <Text
                style={[
                  styles.metricLabel,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Note moyenne publiée
              </Text>
            </View>

            <View
              style={[
                styles.metric,
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
                  styles.metricValue,
                  { color: theme.colors.accent },
                ]}
              >
                {published.length}
              </Text>
              <Text
                style={[
                  styles.metricLabel,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Avis publiés
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.readOnly,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderRadius: theme.shape.cardRadius,
              },
            ]}
          >
            <Text
              style={[
                styles.readOnlyTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Consultation mobile
            </Text>
            <Text
              style={[
                styles.readOnlyText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              La modération et les actions de publication
              restent gérées dans les espaces prévus à cet effet.
            </Text>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une formation, un commentaire..."
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
                Aucun avis à afficher
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Aucun avis ne correspond à la recherche.
              </Text>
            </View>
          ) : (
            filtered.map((item) => (
              <TrainerReviewCard
                key={item.review.id}
                item={item}
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
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 180,
    minWidth: 0,
    padding: 15,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: "900",
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  readOnly: {
    padding: 14,
    marginBottom: 14,
  },
  readOnlyTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  readOnlyText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  search: {
    minHeight: 48,
    paddingHorizontal: 15,
    fontSize: 15,
    marginBottom: 14,
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
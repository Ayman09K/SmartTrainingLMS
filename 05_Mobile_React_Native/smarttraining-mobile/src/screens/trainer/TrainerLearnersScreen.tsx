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
import TrainerLearnerCard from "../../components/trainer/TrainerLearnerCard";
import {
  getTrainerLearners,
} from "../../features/trainer/trainerLearnerService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerLearnerListItem,
} from "../../types/trainerLearnerMobile";

type Props = {
  trainerId: number;
  onOpenLearner: (learnerId: number) => void;
};

function searchableText(
  item: TrainerLearnerListItem,
): string {
  return [
    item.identity.fullName,
    item.identity.firstName,
    item.identity.lastName,
    item.identity.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("fr");
}

export default function TrainerLearnersScreen({
  trainerId,
  onOpenLearner,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [items, setItems] =
    useState<TrainerLearnerListItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const loaded = await getTrainerLearners(trainerId);
    setItems(loaded);
  }

  useEffect(() => {
    let active = true;

    void getTrainerLearners(trainerId)
      .then((loaded) => {
        if (active) {
          setItems(loaded);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger les apprenants suivis.",
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
        "Impossible d’actualiser les apprenants suivis.",
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
      searchableText(item).includes(normalized),
    );
  }, [items, query]);

  if (loading) {
    return (
      <LoadingState message="Chargement des apprenants suivis..." />
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
            title="Apprenants suivis"
            subtitle="Les participants réellement inscrits à vos formations."
          />

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher par nom ou e-mail..."
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

          <View
            style={[
              styles.summary,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderRadius: theme.shape.cardRadius,
              },
            ]}
          >
            <Text
              style={[
                styles.summaryValue,
                { color: theme.colors.foreground },
              ]}
            >
              {filtered.length}
            </Text>
            <Text
              style={[
                styles.summaryLabel,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              apprenant{filtered.length > 1 ? "s" : ""} affiché
              {filtered.length > 1 ? "s" : ""}
            </Text>
          </View>

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
                Aucun apprenant à afficher
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Aucun participant ne correspond à la recherche
                ou aucune inscription n’est encore disponible.
              </Text>
            </View>
          ) : (
            filtered.map((item) => (
              <TrainerLearnerCard
                key={item.identity.id}
                item={item}
                onOpen={() =>
                  onOpenLearner(item.identity.id)
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
  search: {
    minHeight: 48,
    paddingHorizontal: 15,
    fontSize: 15,
    marginBottom: 14,
  },
  summary: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    padding: 14,
    marginBottom: 14,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "900",
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "700",
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
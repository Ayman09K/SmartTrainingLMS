import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
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
import TrainerTrainingCard from "../../components/trainer/TrainerTrainingCard";
import {
  getTrainerTrainingList,
} from "../../features/trainer/trainerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
  TrainerTrainingListItem,
} from "../../types/trainerMobile";

type Props = {
  trainerId: number;
  onOpenTraining: (trainingId: number) => void;
  onCreateTraining: () => void;
  onEditTraining: (trainingId: number) => void;
};

function statusLabel(value: string): string {
  if (value === "ALL") return "Toutes";
  if (value === "PUBLISHED") return "Publiées";
  if (value === "DRAFT") return "Brouillons";
  if (value === "ARCHIVED") return "Archivées";

  return value;
}

export default function TrainerTrainingsScreen({
  trainerId,
  onOpenTraining,
  onCreateTraining,
  onEditTraining,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [items, setItems] =
    useState<TrainerTrainingListItem[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const loaded = await getTrainerTrainingList(trainerId);
    setItems(loaded);
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void getTrainerTrainingList(trainerId)
        .then((loaded) => {
          if (active) {
            setItems(loaded);
            setError("");
          }
        })
        .catch(() => {
          if (active) {
            setError(
              "Impossible de charger vos formations.",
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
    }, [trainerId]),
  );

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError(
        "Impossible d’actualiser vos formations.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = useMemo(() => {
    const normalized = query
      .trim()
      .toLocaleLowerCase("fr");

    return items.filter(({ training }) => {
      const queryMatch =
        !normalized ||
        training.title
          .toLocaleLowerCase("fr")
          .includes(normalized) ||
        (training.shortDescription || "")
          .toLocaleLowerCase("fr")
          .includes(normalized) ||
        (training.category || "")
          .toLocaleLowerCase("fr")
          .includes(normalized);

      const statusMatch =
        status === "ALL" || training.status === status;

      return queryMatch && statusMatch;
    });
  }, [items, query, status]);

  if (loading) {
    return (
      <LoadingState message="Chargement de vos formations..." />
    );
  }

  const statuses = [
    "ALL",
    "PUBLISHED",
    "DRAFT",
    "ARCHIVED",
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
            title="Mes formations"
            subtitle="Créez, modifiez et pilotez vos formations depuis le mobile."
          />

          <AppButton
            title="Nouvelle formation"
            onPress={onCreateTraining}
            style={styles.createButton}
          />

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une formation..."
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
            {statuses.map((value) => {
              const selected = value === status;

              return (
                <Text
                  key={value}
                  onPress={() => setStatus(value)}
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
                  {statusLabel(value)}
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
              formation{filtered.length > 1 ? "s" : ""} affichée
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
                Aucune formation correspondante
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Modifiez la recherche ou créez une nouvelle formation.
              </Text>
            </View>
          ) : (
            filtered.map((item) => (
              <TrainerTrainingCard
                key={item.training.id}
                item={item}
                onOpen={() =>
                  onOpenTraining(item.training.id)
                }
                onEdit={
                  item.training.status === "DRAFT"
                    ? () =>
                        onEditTraining(item.training.id)
                    : undefined
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
  createButton: {
    alignSelf: "flex-start",
    minWidth: 190,
    marginBottom: 14,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
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
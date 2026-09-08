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
import TrainerAlertCard from "../../components/trainer/TrainerAlertCard";
import {
  getTrainerAlerts,
} from "../../features/trainer/trainerAlertService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerAlertListItem,
} from "../../types/trainerAlertMobile";

type Props = {
  trainerId: number;
  onOpenAlert: (alertId: number) => void;
};

type Filter =
  | "ALL"
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "IGNORED";

function filterLabel(value: Filter): string {
  const labels: Record<Filter, string> = {
    ALL: "Toutes",
    OPEN: "À traiter",
    IN_PROGRESS: "En cours",
    RESOLVED: "Résolues",
    IGNORED: "Ignorées",
  };

  return labels[value];
}

function searchText(item: TrainerAlertListItem): string {
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
    item.alert.title,
    item.alert.message,
    learnerText,
    item.training?.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("fr");
}

export default function TrainerAlertsScreen({
  trainerId,
  onOpenAlert,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [items, setItems] =
    useState<TrainerAlertListItem[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const loaded = await getTrainerAlerts(trainerId);
    setItems(loaded);
  }

  useEffect(() => {
    let active = true;

    void getTrainerAlerts(trainerId)
      .then((loaded) => {
        if (active) {
          setItems(loaded);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger vos alertes pédagogiques.",
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
        "Impossible d’actualiser les alertes pédagogiques.",
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
      IGNORED: 0,
    };

    for (const item of items) {
      const status = item.alert.status as Filter;

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
        filter === "ALL" || item.alert.status === filter;

      const queryMatch =
        !normalized ||
        searchText(item).includes(normalized);

      return statusMatch && queryMatch;
    });
  }, [filter, items, query]);

  if (loading) {
    return (
      <LoadingState message="Chargement des alertes pédagogiques..." />
    );
  }

  const filters: Filter[] = [
    "ALL",
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED",
    "IGNORED",
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
            title="Alertes pédagogiques"
            subtitle="Priorisez les situations qui demandent un accompagnement."
          />

          <View
            style={[
              styles.info,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderRadius: theme.shape.cardRadius,
              },
            ]}
          >
            <Text
              style={[
                styles.infoTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Lecture pédagogique
            </Text>
            <Text
              style={[
                styles.infoText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Une alerte attire votre attention. Le détail
              vérifie séparément si les données sont suffisantes
              avant de qualifier le niveau d’accompagnement.
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
              const selected = filter === value;

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
                Aucune alerte à afficher
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Aucun élément ne correspond au filtre ou à la recherche.
              </Text>
            </View>
          ) : (
            filtered.map((item) => (
              <TrainerAlertCard
                key={item.alert.id}
                item={item}
                onOpen={() =>
                  onOpenAlert(item.alert.id)
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
  info: {
    padding: 15,
    marginBottom: 14,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
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
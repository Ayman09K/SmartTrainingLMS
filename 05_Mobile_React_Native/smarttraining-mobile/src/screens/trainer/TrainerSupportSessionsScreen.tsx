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
import TrainerSupportSessionCard from "../../components/trainer/TrainerSupportSessionCard";
import {
  getTrainerSupportSessions,
} from "../../features/trainer/trainerActionService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerSupportSessionListItem,
  TrainerSupportSessionStatus,
} from "../../types/trainerActionMobile";

type Props = {
  trainerId: number;
  onCreate: () => void;
  onOpen: (sessionId: number) => void;
};

type Filter = "ALL" | TrainerSupportSessionStatus;

function label(value: Filter): string {
  const labels: Record<Filter, string> = {
    ALL: "Toutes",
    SCHEDULED: "Planifiées",
    COMPLETED: "Réalisées",
    CANCELLED: "Annulées",
  };

  return labels[value];
}

export default function TrainerSupportSessionsScreen({
  trainerId,
  onCreate,
  onOpen,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [items, setItems] =
    useState<TrainerSupportSessionListItem[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const loaded = await getTrainerSupportSessions(trainerId);
    setItems(loaded);
  }

  useEffect(() => {
    let active = true;

    void getTrainerSupportSessions(trainerId)
      .then((loaded) => {
        if (active) {
          setItems(loaded);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger les séances d’accompagnement.",
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
        "Impossible d’actualiser les séances.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  const filters: Filter[] = [
    "ALL",
    "SCHEDULED",
    "COMPLETED",
    "CANCELLED",
  ];

  const filtered = useMemo(
    () =>
      filter === "ALL"
        ? items
        : items.filter(
            (item) => item.session.status === filter,
          ),
    [filter, items],
  );

  if (loading) {
    return (
      <LoadingState message="Chargement des séances..." />
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
            title="Séances d’accompagnement"
            subtitle="Planifiez et pilotez vos rendez-vous pédagogiques à distance."
          />

          <AppButton
            title="Planifier une séance"
            onPress={onCreate}
            style={styles.createButton}
          />

          <View style={styles.filters}>
            {filters.map((value) => {
              const active = filter === value;

              return (
                <Text
                  key={value}
                  onPress={() => setFilter(value)}
                  style={[
                    styles.filter,
                    {
                      backgroundColor: active
                        ? theme.colors.accent
                        : theme.colors.surfaceSoft,
                      color: active
                        ? theme.colors.background
                        : theme.colors.foreground,
                      borderColor: active
                        ? theme.colors.accent
                        : theme.colors.border,
                      borderWidth: theme.shape.borderWidth,
                    },
                  ]}
                >
                  {label(value)}
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
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Aucune séance dans cette catégorie.
              </Text>
            </View>
          ) : (
            filtered.map((item) => (
              <TrainerSupportSessionCard
                key={item.session.id}
                item={item}
                onOpen={() => onOpen(item.session.id)}
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
    marginBottom: 14,
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
    padding: 18,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
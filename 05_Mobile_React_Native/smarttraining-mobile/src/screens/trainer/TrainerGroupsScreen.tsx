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

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import {
  getTrainerGroups,
} from "../../features/trainer/trainerGroupService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
  TrainerLearnerGroup,
} from "../../types/trainerGroupMobile";

type Props = {
  onOpenGroup: (groupId: number) => void;
};

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

function ownerRoleLabel(value?: string | null): string {
  if (value === "ADMIN") {
    return "Administrateur";
  }

  if (value === "FORMATEUR") {
    return "Formateur";
  }

  return "Gestionnaire";
}

export default function TrainerGroupsScreen({
  onOpenGroup,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [groups, setGroups] =
    useState<TrainerLearnerGroup[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const loaded = await getTrainerGroups();
    setGroups(loaded);
  }

  useEffect(() => {
    let active = true;

    void getTrainerGroups()
      .then((loaded) => {
        if (!active) {
          return;
        }

        setGroups(loaded);
        setError("");
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger vos groupes.",
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
        "Impossible d'actualiser vos groupes.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  const visibleGroups = useMemo(() => {
    const normalized = query
      .trim()
      .toLocaleLowerCase("fr");

    if (!normalized) {
      return groups;
    }

    return groups.filter((group) =>
      [
        group.name,
        group.description || "",
        ownerRoleLabel(group.ownerRole),
      ]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(normalized),
    );
  }, [groups, query]);

  if (loading) {
    return (
      <LoadingState message="Chargement de vos groupes..." />
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
            title="Groupes / cohortes"
            subtitle="Consultez les groupes que vous pouvez gerer depuis votre espace formateur."
          />

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => void refresh()}
            />
          ) : null}

          <TextInput
            accessibilityLabel="Rechercher un groupe"
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un groupe..."
            placeholderTextColor={
              theme.colors.foregroundSubtle
            }
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

          <View style={styles.summaryRow}>
            <Text
              style={[
                styles.summaryText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {visibleGroups.length} groupe(s)
            </Text>
          </View>

          {visibleGroups.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
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
                Aucun groupe a afficher
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Creez ou organisez vos groupes depuis le Web,
                puis retrouvez-les ici.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {visibleGroups.map((group) => (
                <Pressable
                  key={group.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ouvrir le groupe ${group.name}`}
                  onPress={() => onOpenGroup(group.id)}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor:
                        theme.colors.surface,
                      borderColor: pressed
                        ? theme.colors.accent
                        : theme.colors.border,
                      borderRadius:
                        theme.shape.cardRadius,
                      borderWidth:
                        Math.max(
                          1,
                          theme.shape.borderWidth,
                        ),
                      padding:
                        theme.shape.cardPadding,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardCopy}>
                      <Text
                        style={[
                          styles.cardTitle,
                          {
                            color:
                              theme.colors.foreground,
                          },
                        ]}
                      >
                        {group.name}
                      </Text>

                      {group.description ? (
                        <Text
                          numberOfLines={3}
                          style={[
                            styles.cardDescription,
                            {
                              color:
                                theme.colors
                                  .foregroundMuted,
                            },
                          ]}
                        >
                          {group.description}
                        </Text>
                      ) : null}
                    </View>

                    <View
                      style={[
                        styles.countBadge,
                        {
                          backgroundColor:
                            theme.colors.surfaceSoft,
                          borderColor:
                            theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.countValue,
                          {
                            color:
                              theme.colors.accent,
                          },
                        ]}
                      >
                        {group.memberCount}
                      </Text>
                      <Text
                        style={[
                          styles.countLabel,
                          {
                            color:
                              theme.colors
                                .foregroundMuted,
                          },
                        ]}
                      >
                        membres
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Text
                      style={[
                        styles.metaText,
                        {
                          color:
                            theme.colors
                              .foregroundSubtle,
                        },
                      ]}
                    >
                      {ownerRoleLabel(group.ownerRole)}
                    </Text>
                    <Text
                      style={[
                        styles.metaText,
                        {
                          color:
                            theme.colors
                              .foregroundSubtle,
                        },
                      ]}
                    >
                      Mis a jour : {formatDate(group.updatedAt)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  summaryRow: {
    alignItems: "flex-end",
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: "700",
  },
  list: {
    gap: 12,
  },
  card: {
    gap: 14,
  },
  cardTop: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  countBadge: {
    minWidth: 72,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  countValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  countLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  metaText: {
    fontSize: 11,
    lineHeight: 16,
  },
  emptyCard: {
    gap: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
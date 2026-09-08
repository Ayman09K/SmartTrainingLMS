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
  getAdminGroups,
} from "../../features/admin/adminGroupService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerLearnerGroup,
} from "../../types/trainerGroupMobile";

type Props = {
  onOpenGroup: (groupId: number) => void;
};

function ownerRoleLabel(value?: string | null): string {
  if (value === "ADMIN") {
    return "Administrateur";
  }
  if (value === "FORMATEUR") {
    return "Formateur";
  }
  return value || "Gestionnaire";
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(parsed);
}

export default function AdminGroupsScreen({
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
    const loaded = await getAdminGroups();
    setGroups(loaded);
  }

  useEffect(() => {
    let active = true;
    void getAdminGroups()
      .then((loaded) => {
        if (!active) {
          return;
        }
        setGroups(loaded);
        setError("");
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger les groupes.");
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
      setError("Impossible d'actualiser les groupes.");
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
      <LoadingState message="Chargement des groupes..." />
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
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
            subtitle="Vue administrateur globale en consultation."
          />

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => void refresh()}
            />
          ) : null}

          <TextInput
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

          <Text
            style={[
              styles.count,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            {visibleGroups.length} groupe(s)
          </Text>

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
            </View>
          ) : (
            <View style={styles.list}>
              {visibleGroups.map((group) => (
                <Pressable
                  key={group.id}
                  accessibilityRole="button"
                  accessibilityLabel={
                    `Consulter le groupe ${group.name}`
                  }
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
                  <View style={styles.cardHeader}>
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
                        styles.badge,
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
                          styles.badgeValue,
                          { color: theme.colors.accent },
                        ]}
                      >
                        {group.memberCount}
                      </Text>
                      <Text
                        style={[
                          styles.badgeLabel,
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
                        styles.meta,
                        {
                          color:
                            theme.colors
                              .foregroundSubtle,
                        },
                      ]}
                    >
                      Proprietaire :{" "}
                      {ownerRoleLabel(group.ownerRole)}
                    </Text>
                    <Text
                      style={[
                        styles.meta,
                        {
                          color:
                            theme.colors
                              .foregroundSubtle,
                        },
                      ]}
                    >
                      Mis a jour :{" "}
                      {formatDate(group.updatedAt)}
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
  scroll: {
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
  count: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  card: {
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
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
  badge: {
    minWidth: 72,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  badgeValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  badgeLabel: {
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
  meta: {
    fontSize: 11,
    lineHeight: 16,
  },
  emptyCard: {
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
});

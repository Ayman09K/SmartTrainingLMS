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

import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import StatusBadge from "../../components/StatusBadge";
import {
  getManageableLearningPaths,
} from "../../features/learningPaths/learningPathService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  LearningPathManager,
} from "../../types/learningPath";

type Props = {
  role: "FORMATEUR" | "ADMIN";
  onCreatePath: () => void;
  onOpenPath: (pathId: number) => void;
};

function visibilityLabel(value: string): string {
  if (value === "PUBLIC") return "Public";
  if (value === "ASSIGNED_ONLY") return "Sur affectation";
  if (value === "PRIVATE") return "Privé";

  return value;
}

export default function LearningPathManagerListScreen({
  role,
  onCreatePath,
  onOpenPath,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [items, setItems] = useState<LearningPathManager[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const loaded = await getManageableLearningPaths();
    setItems(loaded);
  }

  useEffect(() => {
    let active = true;

    void getManageableLearningPaths()
      .then((loaded) => {
        if (!active) return;

        setItems(loaded);
        setError("");
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger les parcours.");
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
      setError("Impossible d’actualiser les parcours.");
    } finally {
      setRefreshing(false);
    }
  }

  const families = useMemo(() => {
    const grouped = new Map<number, LearningPathManager[]>();

    for (const item of items) {
      const rootId = item.versionRootId || item.id;
      const versions = grouped.get(rootId) || [];
      versions.push(item);
      grouped.set(rootId, versions);
    }

    return Array.from(grouped.entries()).map(
      ([rootId, versions]) => {
        const sorted = [...versions].sort(
          (left, right) =>
            (right.versionNumber || 1) -
              (left.versionNumber || 1) ||
            right.id - left.id,
        );

        const draft = sorted.find(
          (item) => item.status === "DRAFT",
        );
        const published = sorted.find(
          (item) => item.status === "PUBLISHED",
        );
        const archived = sorted.find(
          (item) => item.status === "ARCHIVED",
        );

        return {
          rootId,
          versions: sorted,
          draft,
          published,
          archived,
          display: draft || published || archived || sorted[0],
        };
      },
    );
  }, [items]);

  const filtered = useMemo(() => {
    const normalized = query
      .trim()
      .toLocaleLowerCase("fr");

    if (!normalized) return families;

    return families.filter((family) => {
      const item = family.display;

      return [
        item.title,
        item.shortDescription ?? "",
        item.status,
        item.visibility,
        family.versions
          .map(
            (version) =>
              `v${version.versionNumber || 1} ${version.status}`,
          )
          .join(" "),
      ]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(normalized);
    });
  }, [families, query]);

  if (loading) {
    return <LoadingState message="Chargement des parcours..." />;
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
          />
        }
      >
        <View style={styles.page}>
          <SectionHeader
            title="Parcours de formation"
            subtitle={
              role === "ADMIN"
                ? "Créez et pilotez les parcours de l’ensemble de la plateforme."
                : "Assemblez vos formations dans un ordre pédagogique réutilisable."
            }
          />

          <View style={styles.topActions}>
            <AppButton
              title="Nouveau parcours"
              onPress={onCreatePath}
              style={styles.createButton}
            />
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un parcours..."
            placeholderTextColor={theme.colors.foregroundSubtle}
            style={[
              styles.search,
              {
                color: theme.colors.foreground,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          />

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => void refresh()}
            />
          ) : null}

          <Text
            style={[
              styles.count,
              { color: theme.colors.foregroundSubtle },
            ]}
          >
            {filtered.length} parcours
          </Text>

          {filtered.length === 0 ? (
            <View
              style={[
                styles.empty,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.cardRadius,
                },
              ]}
            >
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Aucun parcours à afficher
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Créez un parcours puis ajoutez-y des formations existantes.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {filtered.map((family) => {
                const item = family.display;
                const draft = family.draft;
                const published = family.published;
                const archived = family.archived;
                const openTarget =
                  draft || published || archived || item;

                return (
                  <Pressable
                    key={family.rootId}
                    accessibilityRole="button"
                    accessibilityLabel={`Ouvrir le parcours ${item.title}`}
                    onPress={() => onOpenPath(openTarget.id)}
                    style={({ pressed }) => [
                      styles.card,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: pressed
                          ? theme.colors.accent
                          : theme.colors.border,
                        borderRadius: theme.shape.cardRadius,
                        borderWidth: Math.max(
                          1,
                          theme.shape.borderWidth,
                        ),
                        padding: theme.shape.cardPadding,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardCopy}>
                        <Text
                          style={[
                            styles.cardTitle,
                            { color: theme.colors.foreground },
                          ]}
                        >
                          {item.title}
                        </Text>

                        {item.shortDescription ? (
                          <Text
                            style={[
                              styles.description,
                              {
                                color:
                                  theme.colors.foregroundMuted,
                              },
                            ]}
                          >
                            {item.shortDescription}
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.versionBadges}>
                        {published ? (
                          <StatusBadge
                            label={`V${published.versionNumber || 1} Publié`}
                            variant="success"
                          />
                        ) : null}

                        {draft ? (
                          <StatusBadge
                            label={`V${draft.versionNumber || 1} Brouillon`}
                            variant="warning"
                          />
                        ) : null}

                        {!published && !draft && archived ? (
                          <StatusBadge
                            label={`V${archived.versionNumber || 1} Archivé`}
                            variant="info"
                          />
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.metaRow}>
                      <Text
                        style={[
                          styles.meta,
                          {
                            color:
                              theme.colors.foregroundSubtle,
                          },
                        ]}
                      >
                        {visibilityLabel(item.visibility)}
                      </Text>

                      <Text
                        style={[
                          styles.meta,
                          {
                            color:
                              theme.colors.foregroundSubtle,
                          },
                        ]}
                      >
                        {family.versions.length} version
                        {family.versions.length > 1 ? "s" : ""}
                      </Text>

                      <Text
                        style={[
                          styles.meta,
                          {
                            color:
                              theme.colors.foregroundSubtle,
                          },
                        ]}
                      >
                        Propriétaire : {item.ownerRole}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
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
    paddingBottom: 36,
  },
  page: {
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
  },
  topActions: {
    flexDirection: "row",
    marginBottom: 14,
  },
  createButton: {
    minWidth: 170,
  },
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    marginBottom: 12,
  },
  count: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 10,
  },
  list: {
    gap: 12,
  },
  card: {
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
  },
  versionBadges: {
    alignItems: "flex-end",
    gap: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
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
  empty: {
    borderWidth: 1,
    padding: 16,
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

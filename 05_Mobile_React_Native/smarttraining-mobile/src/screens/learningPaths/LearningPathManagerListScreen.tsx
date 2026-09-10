import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import StatusBadge from "../../components/StatusBadge";
import ScreenContainer from "../../components/ScreenContainer";
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

type PaginationItem = number | "ellipsis";
type PathFilter = "ALL" | "DRAFT" | "PUBLISHED" | "ARCHIVED";

const PAGE_SIZE = 4;

const PATH_FILTERS: readonly PathFilter[] = [
  "ALL",
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
];

function filterLabel(value: PathFilter): string {
  if (value === "ALL") return "Tous";
  if (value === "DRAFT") return "Brouillons";
  if (value === "PUBLISHED") return "Publiés";
  return "Archivés";
}

function filterIcon(
  value: PathFilter,
): React.ComponentProps<typeof SymbolView>["name"] {
  if (value === "DRAFT") {
    return {
      ios: "pencil.circle.fill",
      android: "edit",
      web: "edit",
    };
  }

  if (value === "PUBLISHED") {
    return {
      ios: "checkmark.circle.fill",
      android: "check_circle",
      web: "check_circle",
    };
  }

  if (value === "ARCHIVED") {
    return {
      ios: "archivebox.fill",
      android: "inventory_2",
      web: "inventory_2",
    };
  }

  return {
    ios: "rectangle.stack.fill",
    android: "view_agenda",
    web: "view_agenda",
  };
}

function visibilityLabel(value: string): string {
  if (value === "PUBLIC") return "Public";
  if (value === "ASSIGNED_ONLY") return "Sur affectation";
  if (value === "PRIVATE") return "Privé";

  return value;
}

function ownerRoleLabel(value: string): string {
  if (value === "FORMATEUR") return "Formateur";
  if (value === "ADMIN") return "Administrateur";
  return value;
}

function buildPagination(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
  }

  if (currentPage <= 2) {
    return [1, 2, 3, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 1) {
    return [
      1,
      "ellipsis",
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage,
    "ellipsis",
    totalPages,
  ];
}

export default function LearningPathManagerListScreen({
  role,
  onCreatePath,
  onOpenPath,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [items, setItems] = useState<LearningPathManager[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PathFilter>("ALL");
  const [page, setPage] = useState(1);
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
          display:
            draft ||
            published ||
            archived ||
            sorted[0],
        };
      },
    );
  }, [items]);

  const counts = useMemo<Record<PathFilter, number>>(() => {
    const result: Record<PathFilter, number> = {
      ALL: families.length,
      DRAFT: 0,
      PUBLISHED: 0,
      ARCHIVED: 0,
    };

    for (const family of families) {
      const status = family.display.status;

      if (
        status === "DRAFT" ||
        status === "PUBLISHED" ||
        status === "ARCHIVED"
      ) {
        result[status] += 1;
      }
    }

    return result;
  }, [families]);

  const filtered = useMemo(() => {
    const normalized = query
      .trim()
      .toLocaleLowerCase("fr");

    return families.filter((family) => {
      const item = family.display;

      if (filter !== "ALL" && item.status !== filter) {
        return false;
      }

      if (!normalized) {
        return true;
      }

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
  }, [families, filter, query]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE),
  );
  const currentPage = Math.min(
    Math.max(page, 1),
    totalPages,
  );
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleFamilies = filtered.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );
  const paginationItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function changeQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  function changeFilter(value: PathFilter) {
    setFilter(value);
    setPage(1);
  }

  function changePage(nextPage: number) {
    setPage(
      Math.min(
        Math.max(nextPage, 1),
        totalPages,
      ),
    );
  }

  if (loading) {
    return <LoadingState message="Chargement des parcours..." />;
  }

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{ padding: 0, backgroundColor: "#F8F6F3" }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={16}
      >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-[760px]">
          <View
            className="overflow-hidden rounded-[24px] border bg-white"
            style={{
              borderColor: "#E5DFE8",
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.05,
              shadowRadius: 9,
              elevation: 2,
            }}
          >
            <View className="h-1.5 bg-[#7C3AED]" />
            <View className="p-3.5">
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-[#F1E9FF]">
                <SymbolView
                  name={{
                    ios: "map.fill",
                    android: "route",
                    web: "route",
                  }}
                  tintColor={theme.colors.accent}
                  size={16}
                  weight="bold"
                />
              </View>

              <View className="ml-3 min-w-0 flex-1">
                <Text
                  className="text-[10px] font-black uppercase tracking-[0.6px]"
                  style={{ color: theme.colors.accent }}
                >
                  Organisation pédagogique
                </Text>

                <Text
                  className="mt-0.5 text-[14px] font-black leading-[18px]"
                  style={{ color: theme.colors.foreground }}
                >
                  Construisez des parcours réutilisables
                </Text>

                <Text
                  className="mt-1 text-[11px] leading-[16px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  {role === "ADMIN"
                    ? "Créez et pilotez les parcours de l’ensemble de la plateforme."
                    : "Assemblez vos formations dans un ordre pédagogique réutilisable."}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nouveau parcours"
              onPress={onCreatePath}
              android_ripple={{ color: "transparent" }}
              className="mt-3 h-[48px] flex-row items-center justify-center rounded-[14px]"
              style={{ backgroundColor: theme.colors.accent }}
            >
              <SymbolView
                name={{
                  ios: "plus",
                  android: "add",
                  web: "add",
                }}
                tintColor={theme.colors.accentForeground}
                size={15}
                weight="bold"
              />

              <Text
                className="ml-2 text-[13px] font-black"
                style={{
                  color: theme.colors.accentForeground,
                }}
              >
                Nouveau parcours
              </Text>
            </Pressable>
            </View>
          </View>

          <View
            className="mt-3 flex-row items-center rounded-[15px] border bg-white px-3"
            style={{ borderColor: theme.colors.border }}
          >
            <SymbolView
              name={{
                ios: "magnifyingglass",
                android: "search",
                web: "search",
              }}
              tintColor={theme.colors.foregroundSubtle}
              size={15}
            />

            <TextInput
              value={query}
              onChangeText={changeQuery}
              placeholder="Rechercher un parcours..."
              placeholderTextColor={theme.colors.foregroundSubtle}
              className="ml-2 h-[48px] min-w-0 flex-1 text-[13px]"
              style={{ color: theme.colors.foreground }}
              returnKeyType="search"
            />

            {query ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
                onPress={() => changeQuery("")}
                android_ripple={{ color: "transparent" }}
                className="h-8 w-8 items-center justify-center"
              >
                <SymbolView
                  name={{
                    ios: "xmark.circle.fill",
                    android: "cancel",
                    web: "cancel",
                  }}
                  tintColor={theme.colors.foregroundSubtle}
                  size={15}
                />
              </Pressable>
            ) : null}
          </View>

          {role === "ADMIN" ? (
            <View className="mt-3">
              <View className="mb-2 flex-row items-end">
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[14px] font-black"
                    style={{ color: theme.colors.foreground }}
                  >
                    Statut
                  </Text>
                  <Text
                    className="mt-1 text-[10px] leading-[15px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Filtrer les parcours de formation
                  </Text>
                </View>

                {filter !== "ALL" ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Réinitialiser le filtre"
                    onPress={() => changeFilter("ALL")}
                    android_ripple={{ color: "transparent" }}
                    className="rounded-full bg-[#F3EEFF] px-2.5 py-1.5"
                  >
                    <Text className="text-[9px] font-black text-[#7C3AED]">
                      Réinitialiser
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingRight: 4 }}
              >
                {PATH_FILTERS.map((value) => {
                  const selected = filter === value;

                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => changeFilter(value)}
                      android_ripple={{ color: "transparent" }}
                      className="h-[42px] flex-row items-center rounded-[12px] border px-2.5"
                      style={{
                        backgroundColor: selected
                          ? theme.colors.accent
                          : theme.colors.surface,
                        borderColor: selected
                          ? theme.colors.accent
                          : theme.colors.border,
                      }}
                    >
                      <SymbolView
                        name={filterIcon(value)}
                        tintColor={
                          selected
                            ? theme.colors.accentForeground
                            : theme.colors.foregroundSubtle
                        }
                        size={12}
                        weight="bold"
                      />

                      <Text
                        className="ml-1.5 text-[11px] font-black"
                        style={{
                          color: selected
                            ? theme.colors.accentForeground
                            : theme.colors.foregroundMuted,
                        }}
                      >
                        {filterLabel(value)}
                      </Text>

                      <View
                        className="ml-2 min-w-[24px] items-center justify-center rounded-full px-1.5 py-1"
                        style={{
                          backgroundColor: selected
                            ? "rgba(255,255,255,0.18)"
                            : "#F3EEFF",
                        }}
                      >
                        <Text
                          className="text-[9px] font-black"
                          style={{
                            color: selected
                              ? theme.colors.accentForeground
                              : theme.colors.accent,
                          }}
                        >
                          {counts[value]}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {error ? (
            <View className="mt-3">
              <ErrorMessage
                message={error}
                onRetry={() => void refresh()}
              />
            </View>
          ) : null}

          <View className="mb-3 mt-4">
            <Text
              className="text-[18px] font-black"
              style={{ color: theme.colors.foreground }}
            >
              {role === "ADMIN" ? "Parcours de la plateforme" : "Mes parcours"}
            </Text>
          </View>

          {filtered.length === 0 ? (
            <View
              className="items-center rounded-[20px] border bg-white px-5 py-8"
              style={{ borderColor: theme.colors.border }}
            >
              <View className="h-12 w-12 items-center justify-center rounded-full bg-[#F1E9FF]">
                <SymbolView
                  name={{
                    ios: "map.fill",
                    android: "route",
                    web: "route",
                  }}
                  tintColor={theme.colors.accent}
                  size={19}
                  weight="bold"
                />
              </View>

              <Text
                className="mt-3 text-[15px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Aucun parcours à afficher
              </Text>

              <Text
                className="mt-1 text-center text-[11px] leading-[16px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Créez un parcours puis ajoutez-y des formations existantes.
              </Text>
            </View>
          ) : (
            <>
              <View className="gap-3">
                {visibleFamilies.map((family) => {
                  const item = family.display;
                  const draft = family.draft;
                  const published = family.published;
                  const archived = family.archived;
                  const openTarget =
                    draft ||
                    published ||
                    archived ||
                    item;

                  return (
                    <Pressable
                      key={family.rootId}
                      accessibilityRole="button"
                      accessibilityLabel={`Ouvrir le parcours ${item.title}`}
                      onPress={() =>
                        onOpenPath(openTarget.id)
                      }
                      android_ripple={{ color: "transparent" }}
                      className="overflow-hidden rounded-[18px] border p-3"
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderColor:
                          role === "ADMIN" ? "#E4DCEB" : theme.colors.border,
                        borderLeftWidth: role === "ADMIN" ? 3 : 1,
                        borderLeftColor:
                          role === "ADMIN"
                            ? published
                              ? "#16845A"
                              : draft
                                ? "#B45309"
                                : "#98A2B3"
                            : theme.colors.border,
                      }}
                    >
                      <View className="flex-row items-start">
                        <View
                          className="h-10 w-10 shrink-0 items-center justify-center rounded-[12px]"
                          style={{
                            backgroundColor:
                              role === "ADMIN" ? "#F0E8FF" : "#F1E9FF",
                          }}
                        >
                          <SymbolView
                            name={{
                              ios: "map.fill",
                              android: "route",
                              web: "route",
                            }}
                            tintColor="#7C3AED"
                            size={16}
                            weight="bold"
                          />
                        </View>

                        <View className="ml-3 min-w-0 flex-1">
                          <View className="flex-row items-start">
                            <View className="min-w-0 flex-1">
                              <Text
                                numberOfLines={2}
                                className="text-[13px] font-black leading-[18px]"
                                style={{ color: theme.colors.foreground }}
                              >
                                {item.title}
                              </Text>

                              <Text
                                numberOfLines={1}
                                className="mt-0.5 text-[9px] leading-[13px]"
                                style={{ color: theme.colors.foregroundMuted }}
                              >
                                {item.shortDescription ||
                                  "Aucune description renseignée"}
                              </Text>
                            </View>

                            <View
                              className="ml-2 shrink-0 rounded-full px-2 py-1"
                              style={{
                                backgroundColor: published
                                  ? "#EAFBF3"
                                  : draft
                                    ? "#FFF4E5"
                                    : "#F2F4F7",
                              }}
                            >
                              <Text
                                className="text-[8px] font-black"
                                style={{
                                  color: published
                                    ? "#16845A"
                                    : draft
                                      ? "#B45309"
                                      : "#667085",
                                }}
                              >
                                {published
                                  ? "Publié"
                                  : draft
                                    ? "Brouillon"
                                    : "Archivé"}
                              </Text>
                            </View>
                          </View>

                          <View className="mt-2 flex-row flex-wrap items-center gap-1.5">
                            <View className="flex-row items-center">
                              <SymbolView
                                name={{
                                  ios: "square.stack.3d.up.fill",
                                  android: "layers",
                                  web: "layers",
                                }}
                                tintColor="#7C3AED"
                                size={9}
                              />
                              <Text
                                className="ml-1 text-[8px] font-black"
                                style={{ color: theme.colors.foregroundMuted }}
                              >
                                V{openTarget.versionNumber || 1}
                              </Text>
                            </View>

                            <View className="flex-row items-center">
                              <SymbolView
                                name={{
                                  ios: "eye.fill",
                                  android: "visibility",
                                  web: "visibility",
                                }}
                                tintColor="#7C3AED"
                                size={9}
                              />
                              <Text
                                numberOfLines={1}
                                className="ml-1 text-[8px] font-bold"
                                style={{ color: theme.colors.foregroundMuted }}
                              >
                                {visibilityLabel(item.visibility)}
                              </Text>
                            </View>

                            <View className="flex-row items-center">
                              <SymbolView
                                name={{
                                  ios: "square.stack.3d.up",
                                  android: "layers",
                                  web: "layers",
                                }}
                                tintColor="#7C3AED"
                                size={9}
                              />
                              <Text
                                className="ml-1 text-[8px] font-bold"
                                style={{ color: theme.colors.foregroundMuted }}
                              >
                                {family.versions.length} version
                                {family.versions.length > 1 ? "s" : ""}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <View
                        className="mt-2.5 flex-row items-center justify-between border-t pt-2.5"
                        style={{ borderColor: "#E8E2EA" }}
                      >
                        {role === "ADMIN" ? (
                          <View className="min-w-0 flex-1 flex-row items-center">
                            <SymbolView
                              name={{
                                ios: "person.crop.circle.fill",
                                android: "account_circle",
                                web: "account_circle",
                              }}
                              tintColor={theme.colors.foregroundSubtle}
                              size={10}
                            />
                            <Text
                              numberOfLines={1}
                              className="ml-1.5 text-[9px] font-bold"
                              style={{ color: theme.colors.foregroundMuted }}
                            >
                              {ownerRoleLabel(item.ownerRole)}
                            </Text>
                          </View>
                        ) : (
                          <View className="flex-1" />
                        )}

                        <View className="ml-2 flex-row items-center">
                          <Text className="text-[10px] font-black text-[#7C3AED]">
                            Ouvrir
                          </Text>
                          <SymbolView
                            name={{
                              ios: "chevron.right",
                              android: "chevron_right",
                              web: "chevron_right",
                            }}
                            tintColor="#7C3AED"
                            size={10}
                            weight="bold"
                          />
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {filtered.length > 0 ? (
                <View
                  className="mt-4 rounded-[20px] border bg-white px-3 py-3"
                  style={{ borderColor: theme.colors.border }}
                >
                  <View className="mb-2.5 flex-row items-center justify-end">
                    <View className="rounded-full bg-[#F3EEFF] px-2.5 py-1">
                      <Text
                        className="text-[10px] font-black"
                        style={{ color: theme.colors.accent }}
                      >
                        Page {currentPage} / {totalPages}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-center gap-1.5">
                    <PageArrow
                      previous
                      disabled={currentPage === 1}
                      onPress={() =>
                        changePage(currentPage - 1)
                      }
                    />

                    {paginationItems.map((entry, index) =>
                      entry === "ellipsis" ? (
                        <Text
                          key={`ellipsis-${index}`}
                          className="w-5 text-center text-[14px]"
                          style={{
                            color: theme.colors.foregroundSubtle,
                          }}
                        >
                          …
                        </Text>
                      ) : (
                        <Pressable
                          key={entry}
                          accessibilityRole="button"
                          accessibilityLabel={`Page ${entry}`}
                          accessibilityState={{
                            selected:
                              entry === currentPage,
                          }}
                          onPress={() =>
                            changePage(entry)
                          }
                          android_ripple={{ color: "transparent" }}
                          className="h-9 w-9 items-center justify-center rounded-xl border"
                          style={{
                            backgroundColor:
                              entry === currentPage
                                ? theme.colors.accent
                                : theme.colors.surface,
                            borderColor:
                              entry === currentPage
                                ? theme.colors.accent
                                : theme.colors.border,
                          }}
                        >
                          <Text
                            className="text-[11px] font-black"
                            style={{
                              color:
                                entry === currentPage
                                  ? theme.colors.accentForeground
                                  : theme.colors.foregroundMuted,
                            }}
                          >
                            {entry}
                          </Text>
                        </Pressable>
                      ),
                    )}

                    <PageArrow
                      disabled={
                        currentPage === totalPages
                      }
                      onPress={() =>
                        changePage(currentPage + 1)
                      }
                    />
                  </View>
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );

  function MetaPill({
    icon,
    label,
  }: {
    icon: React.ComponentProps<
      typeof SymbolView
    >["name"];
    label: string;
  }) {
    return (
      <View className="flex-row items-center rounded-full bg-[#F8F6F9] px-2.5 py-1.5">
        <SymbolView
          name={icon}
          tintColor={theme.colors.foregroundSubtle}
          size={11}
        />
        <Text
          className="ml-1.5 text-[10px] font-bold"
          style={{
            color: theme.colors.foregroundMuted,
          }}
        >
          {label}
        </Text>
      </View>
    );
  }

  function PageArrow({
    previous = false,
    disabled,
    onPress,
  }: {
    previous?: boolean;
    disabled: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          previous
            ? "Page précédente"
            : "Page suivante"
        }
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="h-9 w-9 items-center justify-center rounded-xl border"
        style={{
          backgroundColor: disabled
            ? "#F8F6F3"
            : theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <SymbolView
          name={{
            ios: previous
              ? "chevron.left"
              : "chevron.right",
            android: previous
              ? "chevron_left"
              : "chevron_right",
            web: previous
              ? "chevron_left"
              : "chevron_right",
          }}
          tintColor={
            disabled
              ? theme.colors.foregroundSubtle
              : theme.colors.accent
          }
          size={14}
          weight="bold"
        />
      </Pressable>
    );
  }
}

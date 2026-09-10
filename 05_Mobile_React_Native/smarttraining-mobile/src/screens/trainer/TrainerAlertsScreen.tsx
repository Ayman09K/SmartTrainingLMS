import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
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

type StatusFilter =
  | "ALL"
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "IGNORED";

type PriorityFilter =
  | "ALL"
  | "HIGH"
  | "MEDIUM"
  | "LOW";

type SymbolName = ComponentProps<typeof SymbolView>["name"];

type PaginationItem = number | "ellipsis";

const PAGE_SIZE = 4;

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

function statusLabel(value: StatusFilter): string {
  const labels: Record<StatusFilter, string> = {
    ALL: "Tous",
    OPEN: "À traiter",
    IN_PROGRESS: "En cours",
    RESOLVED: "Résolues",
    IGNORED: "Ignorées",
  };

  return labels[value];
}

function statusIcon(value: StatusFilter): SymbolName {
  if (value === "OPEN") {
    return {
      ios: "exclamationmark.circle.fill",
      android: "error",
      web: "error",
    };
  }

  if (value === "IN_PROGRESS") {
    return {
      ios: "clock.fill",
      android: "schedule",
      web: "schedule",
    };
  }

  if (value === "RESOLVED") {
    return {
      ios: "checkmark.circle.fill",
      android: "check_circle",
      web: "check_circle",
    };
  }

  if (value === "IGNORED") {
    return {
      ios: "eye.slash.fill",
      android: "visibility_off",
      web: "visibility_off",
    };
  }

  return {
    ios: "square.stack.3d.up.fill",
    android: "layers",
    web: "layers",
  };
}

function priorityLabel(
  value: PriorityFilter,
): string {
  const labels: Record<PriorityFilter, string> = {
    ALL: "Toutes",
    HIGH: "Élevée",
    MEDIUM: "Moyenne",
    LOW: "Faible",
  };

  return labels[value];
}

function priorityVisual(value: PriorityFilter): {
  color: string;
  soft: string;
  icon: SymbolName;
} {
  if (value === "HIGH") {
    return {
      color: "#C2413A",
      soft: "#FFF0F0",
      icon: {
        ios: "exclamationmark.triangle.fill",
        android: "warning",
        web: "warning",
      },
    };
  }

  if (value === "MEDIUM") {
    return {
      color: "#B45309",
      soft: "#FFF4E5",
      icon: {
        ios: "minus.circle.fill",
        android: "remove_circle",
        web: "remove_circle",
      },
    };
  }

  if (value === "LOW") {
    return {
      color: "#16845A",
      soft: "#EAFBF3",
      icon: {
        ios: "checkmark.circle.fill",
        android: "check_circle",
        web: "check_circle",
      },
    };
  }

  return {
    color: "#7C3AED",
    soft: "#F1E9FF",
    icon: {
      ios: "line.3.horizontal.decrease.circle.fill",
      android: "filter_list",
      web: "filter_list",
    },
  };
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

  const scrollRef = useRef<ScrollView | null>(null);
  const listTopRef = useRef(0);

  const [items, setItems] =
    useState<TrainerAlertListItem[]>([]);
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  async function load() {
    const loaded =
      await getTrainerAlerts(trainerId);
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

  const normalizedQuery = query
    .trim()
    .toLocaleLowerCase("fr");

  const matchesQuery = (
    item: TrainerAlertListItem,
  ): boolean =>
    !normalizedQuery ||
    searchText(item).includes(normalizedQuery);

  // Les compteurs de STATUT tiennent compte du filtre PRIORITÉ actif.
  // Exemple : si "Moyenne" est sélectionnée, "À traiter" affiche
  // uniquement le nombre d'alertes à traiter de priorité moyenne.
  const statusCounts = useMemo(() => {
    const scopedItems = items.filter(
      (item) =>
        matchesQuery(item) &&
        (priorityFilter === "ALL" ||
          item.alert.severity === priorityFilter),
    );

    const result: Record<StatusFilter, number> = {
      ALL: scopedItems.length,
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      IGNORED: 0,
    };

    for (const item of scopedItems) {
      const value =
        item.alert.status as StatusFilter;

      if (
        value !== "ALL" &&
        value in result
      ) {
        result[value] += 1;
      }
    }

    return result;
  }, [
    items,
    normalizedQuery,
    priorityFilter,
  ]);

  // Les compteurs de PRIORITÉ tiennent compte du filtre STATUT actif.
  // Exemple : si "À traiter" est sélectionné, "Moyenne" affiche
  // uniquement les alertes à traiter de priorité moyenne.
  const priorityCounts = useMemo(() => {
    const scopedItems = items.filter(
      (item) =>
        matchesQuery(item) &&
        (statusFilter === "ALL" ||
          item.alert.status === statusFilter),
    );

    const result: Record<PriorityFilter, number> = {
      ALL: scopedItems.length,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    for (const item of scopedItems) {
      const value =
        item.alert.severity as PriorityFilter;

      if (
        value !== "ALL" &&
        value in result
      ) {
        result[value] += 1;
      }
    }

    return result;
  }, [
    items,
    normalizedQuery,
    statusFilter,
  ]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const statusMatch =
        statusFilter === "ALL" ||
        item.alert.status === statusFilter;

      const priorityMatch =
        priorityFilter === "ALL" ||
        item.alert.severity === priorityFilter;

      return (
        statusMatch &&
        priorityMatch &&
        matchesQuery(item)
      );
    });
  }, [
    items,
    normalizedQuery,
    priorityFilter,
    statusFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE),
  );

  const currentPage = Math.min(
    Math.max(page, 1),
    totalPages,
  );

  const pageItems = useMemo(() => {
    const start =
      (currentPage - 1) * PAGE_SIZE;

    return filtered.slice(
      start,
      start + PAGE_SIZE,
    );
  }, [currentPage, filtered]);

  const paginationItems = useMemo(
    () =>
      buildPagination(
        currentPage,
        totalPages,
      ),
    [currentPage, totalPages],
  );

  const firstVisible =
    filtered.length === 0
      ? 0
      : (currentPage - 1) * PAGE_SIZE + 1;

  const lastVisible = Math.min(
    currentPage * PAGE_SIZE,
    filtered.length,
  );

  function updateQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  function selectStatus(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  function selectPriority(
    value: PriorityFilter,
  ) {
    setPriorityFilter(value);
    setPage(1);
  }

  function resetFilters() {
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setPage(1);
  }

  function changePage(nextPage: number) {
    const normalizedPage = Math.min(
      Math.max(nextPage, 1),
      totalPages,
    );

    if (normalizedPage === currentPage) {
      return;
    }

    setPage(normalizedPage);

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(
          0,
          listTopRef.current - 12,
        ),
        animated: true,
      });
    });
  }

  if (loading) {
    return (
      <LoadingState message="Chargement des alertes pédagogiques..." />
    );
  }

  const statusFilters: StatusFilter[] = [
    "ALL",
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED",
    "IGNORED",
  ];

  const priorityFilters: PriorityFilter[] = [
    "ALL",
    "HIGH",
    "MEDIUM",
    "LOW",
  ];

  const hasActiveFilters =
    statusFilter !== "ALL" ||
    priorityFilter !== "ALL";

  return (
    <ScreenContainer
      edges={["left", "right"]}
      style={{
        padding: 0,
        backgroundColor: "#F8F6F3",
      }}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: 12,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-[760px] px-4">
          {/* INTRO */}
          <View className="pb-3 pt-4">
            <View className="flex-row items-start">
              <View className="min-w-0 flex-1">
                <View
                  className="self-start rounded-full px-2.5 py-1"
                  style={{
                    backgroundColor: "#F3EEFF",
                  }}
                >
                  <Text
                    className="text-[11px] font-black uppercase tracking-[0.7px]"
                    style={{
                      color: theme.colors.accent,
                    }}
                  >
                    Suivi pédagogique
                  </Text>
                </View>

                <Text
                  className="mt-2 text-[26px] font-black leading-[30px]"
                  style={{
                    color: theme.colors.foreground,
                  }}
                >
                  Alertes pédagogiques
                </Text>

                <Text
                  className="mt-1.5 max-w-[520px] text-[13px] leading-[19px]"
                  style={{
                    color:
                      theme.colors.foregroundMuted,
                  }}
                >
                  Priorisez les situations qui demandent votre attention avant d’ouvrir leur détail.
                </Text>
              </View>

              <View
                className="ml-3 h-12 w-12 items-center justify-center rounded-[16px]"
                style={{
                  backgroundColor: "#F1E9FF",
                }}
              >
                <SymbolView
                  name={{
                    ios: "waveform.path.ecg",
                    android: "monitoring",
                    web: "monitoring",
                  }}
                  tintColor="#7C3AED"
                  size={21}
                  weight="bold"
                />
              </View>
            </View>
          </View>

          {/* PROFESSIONAL FILTER PANEL */}
          <View
            className="mb-3 overflow-hidden rounded-[20px] border bg-white"
            style={{
              borderColor: "#E5DFE8",
              shadowColor: "#0F172A",
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 1,
            }}
          >
            <View className="flex-row items-center px-3.5 pb-2 pt-3">
              <View
                className="h-8 w-8 items-center justify-center rounded-[10px]"
                style={{
                  backgroundColor: "#F1E9FF",
                }}
              >
                <SymbolView
                  name={{
                    ios: "line.3.horizontal.decrease.circle.fill",
                    android: "filter_list",
                    web: "filter_list",
                  }}
                  tintColor="#7C3AED"
                  size={14}
                  weight="bold"
                />
              </View>

              <View className="ml-2.5 min-w-0 flex-1">
                <Text
                  className="text-[13px] font-black"
                  style={{
                    color: theme.colors.foreground,
                  }}
                >
                  Filtres
                </Text>

                <Text
                  className="mt-0.5 text-[10px]"
                  style={{
                    color:
                      theme.colors.foregroundMuted,
                  }}
                >
                  Les compteurs s’adaptent aux filtres sélectionnés
                </Text>
              </View>

              {hasActiveFilters ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Réinitialiser les filtres"
                  onPress={resetFilters}
                  android_ripple={{
                    color: "transparent",
                  }}
                  className="rounded-full px-2.5 py-1.5"
                  style={{
                    backgroundColor: "#F3EEFF",
                  }}
                >
                  <Text
                    className="text-[10px] font-black"
                    style={{
                      color: theme.colors.accent,
                    }}
                  >
                    Réinitialiser
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View
              className="border-t px-3.5 py-3"
              style={{
                borderTopColor: "#F0EBF2",
              }}
            >
              <Text
                className="mb-2 text-[11px] font-black uppercase tracking-[0.5px]"
                style={{
                  color:
                    theme.colors.foregroundSubtle,
                }}
              >
                Statut
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  gap: 7,
                }}
              >
                {statusFilters.map((value) => (
                  <StatusChip
                    key={value}
                    value={value}
                    selected={
                      statusFilter === value
                    }
                    count={statusCounts[value]}
                    onPress={() =>
                      selectStatus(value)
                    }
                  />
                ))}
              </ScrollView>

              <Text
                className="mb-2 mt-3 text-[11px] font-black uppercase tracking-[0.5px]"
                style={{
                  color:
                    theme.colors.foregroundSubtle,
                }}
              >
                Priorité
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  gap: 7,
                }}
              >
                {priorityFilters.map(
                  (value) => (
                    <PriorityChip
                      key={value}
                      value={value}
                      selected={
                        priorityFilter === value
                      }
                      count={
                        priorityCounts[value]
                      }
                      onPress={() =>
                        selectPriority(value)
                      }
                    />
                  ),
                )}
              </ScrollView>
            </View>
          </View>

          {/* SEARCH */}
          <View
            className="mb-4 flex-row items-center rounded-[16px] border bg-white px-3"
            style={{
              borderColor: "#E5DFE8",
            }}
          >
            <SymbolView
              name={{
                ios: "magnifyingglass",
                android: "search",
                web: "search",
              }}
              tintColor={
                theme.colors.foregroundSubtle
              }
              size={17}
            />

            <TextInput
              value={query}
              onChangeText={updateQuery}
              placeholder="Rechercher un apprenant, une formation..."
              placeholderTextColor={
                theme.colors.foregroundSubtle
              }
              className="ml-2 min-h-[48px] flex-1 text-[14px]"
              style={{
                color: theme.colors.foreground,
              }}
            />

            {query.trim() ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
                onPress={() => updateQuery("")}
                android_ripple={{
                  color: "transparent",
                }}
                className="h-8 w-8 items-center justify-center rounded-full"
              >
                <SymbolView
                  name={{
                    ios: "xmark.circle.fill",
                    android: "cancel",
                    web: "cancel",
                  }}
                  tintColor={
                    theme.colors.foregroundSubtle
                  }
                  size={15}
                />
              </Pressable>
            ) : null}
          </View>

          {/* EXPLANATION */}
          <View
            className="mb-4 flex-row items-start rounded-[16px] px-3 py-3"
            style={{
              backgroundColor: "#F5F1FA",
            }}
          >
            <View
              className="h-8 w-8 items-center justify-center rounded-[10px]"
              style={{
                backgroundColor: "#E9DEFB",
              }}
            >
              <SymbolView
                name={{
                  ios: "info.circle.fill",
                  android: "info",
                  web: "info",
                }}
                tintColor="#7C3AED"
                size={14}
                weight="bold"
              />
            </View>

            <View className="ml-2.5 min-w-0 flex-1">
              <Text
                className="text-[12px] font-black"
                style={{
                  color: theme.colors.foreground,
                }}
              >
                Lecture pédagogique
              </Text>

              <Text
                className="mt-1 text-[11px] leading-[17px]"
                style={{
                  color:
                    theme.colors.foregroundMuted,
                }}
              >
                Une alerte signale une situation à examiner. Le détail permet de vérifier les données disponibles avant de qualifier l’accompagnement.
              </Text>
            </View>
          </View>

          {error ? (
            <View className="mb-4">
              <ErrorMessage
                message={error}
                onRetry={() => void refresh()}
              />
            </View>
          ) : null}

          {/* LIST */}
          <View
            onLayout={(event) => {
              listTopRef.current =
                event.nativeEvent.layout.y;
            }}
          >
            <View className="mb-3 flex-row items-end">
              <View className="min-w-0 flex-1">
                <Text
                  className="text-[19px] font-black"
                  style={{
                    color: theme.colors.foreground,
                  }}
                >
                  Alertes
                </Text>

                <Text
                  className="mt-0.5 text-[12px] font-semibold"
                  style={{
                    color:
                      theme.colors.foregroundMuted,
                  }}
                >
                  {filtered.length === 0
                    ? "Aucun résultat"
                    : `${firstVisible}–${lastVisible} sur ${filtered.length}`}
                </Text>
              </View>

              {hasActiveFilters ? (
                <View className="flex-row gap-1.5">
                  {statusFilter !== "ALL" ? (
                    <ActiveFilterBadge
                      text={statusLabel(
                        statusFilter,
                      )}
                    />
                  ) : null}

                  {priorityFilter !== "ALL" ? (
                    <ActiveFilterBadge
                      text={`Priorité ${priorityLabel(
                        priorityFilter,
                      ).toLowerCase()}`}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>

            {filtered.length === 0 ? (
              <View
                className="items-center rounded-[22px] border bg-white px-5 py-8"
                style={{
                  borderColor: "#E5DFE8",
                }}
              >
                <View
                  className="h-[58px] w-[58px] items-center justify-center rounded-full"
                  style={{
                    backgroundColor: "#F1E9FF",
                  }}
                >
                  <SymbolView
                    name={{
                      ios: "checkmark.shield.fill",
                      android: "verified_user",
                      web: "verified_user",
                    }}
                    tintColor="#7C3AED"
                    size={23}
                    weight="bold"
                  />
                </View>

                <Text
                  className="mt-4 text-[16px] font-black"
                  style={{
                    color: theme.colors.foreground,
                  }}
                >
                  Aucune alerte à afficher
                </Text>

                <Text
                  className="mt-1.5 text-center text-[12px] leading-[18px]"
                  style={{
                    color:
                      theme.colors.foregroundMuted,
                  }}
                >
                  Aucun élément ne correspond aux filtres ou à la recherche actuelle.
                </Text>
              </View>
            ) : (
              <>
                <View>
                  {pageItems.map((item) => (
                    <TrainerAlertCard
                      key={item.alert.id}
                      item={item}
                      onOpen={() =>
                        onOpenAlert(
                          item.alert.id,
                        )
                      }
                    />
                  ))}
                </View>

                {/* PAGINATION IDENTIQUE AUX AUTRES ÉCRANS */}
                <View
                  className="mt-5 rounded-[22px] border bg-white px-3 py-3"
                  style={{
                    borderColor:
                      theme.colors.border,
                  }}
                >
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text
                      className="text-[13px] font-bold"
                      style={{
                        color:
                          theme.colors
                            .foregroundMuted,
                      }}
                    >
                      {firstVisible}–
                      {lastVisible} sur{" "}
                      {filtered.length}
                    </Text>

                    <View className="rounded-full bg-[#F3EEFF] px-2.5 py-1">
                      <Text
                        className="text-[12px] font-black"
                        style={{
                          color:
                            theme.colors.accent,
                        }}
                      >
                        Page {currentPage} /{" "}
                        {totalPages}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-center gap-1.5">
                    <PaginationArrow
                      direction="previous"
                      disabled={
                        currentPage === 1
                      }
                      onPress={() =>
                        changePage(
                          currentPage - 1,
                        )
                      }
                    />

                    {paginationItems.map(
                      (item, index) => {
                        if (
                          item === "ellipsis"
                        ) {
                          return (
                            <View
                              key={`ellipsis-${index}`}
                              className="h-9 w-6 items-center justify-center"
                            >
                              <Text
                                className="text-[15px] font-bold"
                                style={{
                                  color:
                                    theme.colors
                                      .foregroundSubtle,
                                }}
                              >
                                …
                              </Text>
                            </View>
                          );
                        }

                        const active =
                          item ===
                          currentPage;

                        return (
                          <Pressable
                            key={item}
                            accessibilityRole="button"
                            accessibilityLabel={`Page ${item}`}
                            accessibilityState={{
                              selected: active,
                            }}
                            onPress={() =>
                              changePage(item)
                            }
                            android_ripple={{
                              color:
                                "transparent",
                            }}
                            className="h-9 w-9 items-center justify-center rounded-xl border"
                            style={{
                              backgroundColor:
                                active
                                  ? theme.colors
                                      .accent
                                  : theme.colors
                                      .surface,
                              borderColor:
                                active
                                  ? theme.colors
                                      .accent
                                  : theme.colors
                                      .border,
                            }}
                          >
                            <Text
                              className="text-[13px] font-black"
                              style={{
                                color: active
                                  ? theme.colors
                                      .accentForeground
                                  : theme.colors
                                      .foregroundMuted,
                              }}
                            >
                              {item}
                            </Text>
                          </Pressable>
                        );
                      },
                    )}

                    <PaginationArrow
                      direction="next"
                      disabled={
                        currentPage ===
                        totalPages
                      }
                      onPress={() =>
                        changePage(
                          currentPage + 1,
                        )
                      }
                    />
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function StatusChip({
    value,
    selected,
    count,
    onPress,
  }: {
    value: StatusFilter;
    selected: boolean;
    count: number;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`Statut ${statusLabel(
          value,
        )}`}
        onPress={onPress}
        android_ripple={{
          color: "transparent",
        }}
        className="min-h-[40px] flex-row items-center rounded-[14px] border px-3"
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
          name={statusIcon(value)}
          tintColor={
            selected
              ? theme.colors.accentForeground
              : theme.colors.accent
          }
          size={14}
          weight="bold"
        />

        <Text
          className="ml-1.5 text-[12px] font-black"
          style={{
            color: selected
              ? theme.colors.accentForeground
              : theme.colors.foregroundMuted,
          }}
        >
          {statusLabel(value)}
        </Text>

        <View
          className="ml-2 min-w-[22px] items-center rounded-[8px] px-1.5 py-1"
          style={{
            backgroundColor: selected
              ? "rgba(255,255,255,0.20)"
              : theme.colors.surfaceSoft,
          }}
        >
          <Text
            className="text-[11px] font-black"
            style={{
              color: selected
                ? theme.colors.accentForeground
                : theme.colors.accent,
            }}
          >
            {count}
          </Text>
        </View>
      </Pressable>
    );
  }

  function PriorityChip({
    value,
    selected,
    count,
    onPress,
  }: {
    value: PriorityFilter;
    selected: boolean;
    count: number;
    onPress: () => void;
  }) {
    const visual =
      priorityVisual(value);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`Priorité ${priorityLabel(
          value,
        )}`}
        onPress={onPress}
        android_ripple={{
          color: "transparent",
        }}
        className="min-h-[40px] flex-row items-center rounded-[14px] border px-3"
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
          name={visual.icon}
          tintColor={
            selected
              ? theme.colors.accentForeground
              : theme.colors.accent
          }
          size={14}
          weight="bold"
        />

        <Text
          className="ml-1.5 text-[12px] font-black"
          style={{
            color: selected
              ? theme.colors.accentForeground
              : theme.colors.foregroundMuted,
          }}
        >
          {priorityLabel(value)}
        </Text>

        <View
          className="ml-2 min-w-[22px] items-center rounded-[8px] px-1.5 py-1"
          style={{
            backgroundColor: selected
              ? "rgba(255,255,255,0.20)"
              : theme.colors.surfaceSoft,
          }}
        >
          <Text
            className="text-[11px] font-black"
            style={{
              color: selected
                ? theme.colors.accentForeground
                : theme.colors.accent,
            }}
          >
            {count}
          </Text>
        </View>
      </Pressable>
    );
  }

  function ActiveFilterBadge({
    text,
  }: {
    text: string;
  }) {
    return (
      <View
        className="rounded-full px-2 py-1"
        style={{
          backgroundColor: "#F3EEFF",
        }}
      >
        <Text
          numberOfLines={1}
          className="max-w-[110px] text-[10px] font-black"
          style={{
            color: theme.colors.accent,
          }}
        >
          {text}
        </Text>
      </View>
    );
  }

  function PaginationArrow({
    direction,
    disabled,
    onPress,
  }: {
    direction: "previous" | "next";
    disabled: boolean;
    onPress: () => void;
  }) {
    const isPrevious =
      direction === "previous";

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isPrevious
            ? "Page précédente"
            : "Page suivante"
        }
        accessibilityState={{
          disabled,
        }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{
          color: "transparent",
        }}
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
            ios: isPrevious
              ? "chevron.left"
              : "chevron.right",
            android: isPrevious
              ? "chevron_left"
              : "chevron_right",
            web: isPrevious
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

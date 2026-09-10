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
import TrainerFeedbackCard from "../../components/trainer/TrainerFeedbackCard";
import {
  getTrainerFeedbacks,
} from "../../features/trainer/trainerFeedbackReviewService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerFeedbackListItem,
} from "../../types/trainerFeedbackReviewMobile";

type Props = {
  trainerId: number;
  onOpenFeedback: (feedbackId: number) => void;
  onOpenReviews: () => void;
};

type Filter =
  | "ALL"
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

type SymbolName =
  ComponentProps<typeof SymbolView>["name"];

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

function filterLabel(value: Filter): string {
  const labels: Record<Filter, string> = {
    ALL: "Tous",
    OPEN: "À traiter",
    IN_PROGRESS: "En cours",
    RESOLVED: "Traités",
    CLOSED: "Clôturés",
  };

  return labels[value];
}

function filterIcon(value: Filter): SymbolName {
  if (value === "OPEN") {
    return {
      ios: "exclamationmark.bubble.fill",
      android: "feedback",
      web: "feedback",
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

  if (value === "CLOSED") {
    return {
      ios: "archivebox.fill",
      android: "archive",
      web: "archive",
    };
  }

  return {
    ios: "bubble.left.and.bubble.right.fill",
    android: "forum",
    web: "forum",
  };
}

function searchText(
  item: TrainerFeedbackListItem,
): string {
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
    item.feedback.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("fr");
}

export default function TrainerFeedbacksScreen({
  trainerId,
  onOpenFeedback,
  onOpenReviews,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const scrollRef = useRef<ScrollView | null>(null);
  const listTopRef = useRef(0);

  const [items, setItems] =
    useState<TrainerFeedbackListItem[]>([]);
  const [filter, setFilter] =
    useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  async function load() {
    const loaded =
      await getTrainerFeedbacks(trainerId);
    setItems(loaded);
  }

  useEffect(() => {
    let active = true;

    void getTrainerFeedbacks(trainerId)
      .then((loaded) => {
        if (active) {
          setItems(loaded);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger les feedbacks apprenants.",
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
        "Impossible d’actualiser les feedbacks.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  const normalizedQuery = query
    .trim()
    .toLocaleLowerCase("fr");

  const counts = useMemo(() => {
    const scopedItems = items.filter(
      (item) =>
        !normalizedQuery ||
        searchText(item).includes(
          normalizedQuery,
        ),
    );

    const result: Record<Filter, number> = {
      ALL: scopedItems.length,
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    for (const item of scopedItems) {
      const status =
        item.feedback.status as Filter;

      if (
        status !== "ALL" &&
        status in result
      ) {
        result[status] += 1;
      }
    }

    return result;
  }, [items, normalizedQuery]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const statusMatch =
        filter === "ALL" ||
        item.feedback.status === filter;

      const queryMatch =
        !normalizedQuery ||
        searchText(item).includes(
          normalizedQuery,
        );

      return statusMatch && queryMatch;
    });
  }, [
    filter,
    items,
    normalizedQuery,
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
      : (currentPage - 1) *
          PAGE_SIZE +
        1;

  const lastVisible = Math.min(
    currentPage * PAGE_SIZE,
    filtered.length,
  );

  function selectFilter(value: Filter) {
    setFilter(value);
    setPage(1);
  }

  function updateQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  function changePage(nextPage: number) {
    const normalizedPage = Math.min(
      Math.max(nextPage, 1),
      totalPages,
    );

    if (
      normalizedPage === currentPage
    ) {
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
      <LoadingState message="Chargement des feedbacks..." />
    );
  }

  const filters: Filter[] = [
    "ALL",
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
  ];

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{
        padding: 0,
        backgroundColor: "#F8F6F3",
      }}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: 34,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              void refresh()
            }
            tintColor={
              theme.colors.accent
            }
            colors={[
              theme.colors.accent,
            ]}
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
                    backgroundColor:
                      "#F3EEFF",
                  }}
                >
                  <Text
                    className="text-[9px] font-black uppercase tracking-[0.7px]"
                    style={{
                      color:
                        theme.colors
                          .accent,
                    }}
                  >
                    Relation apprenant
                  </Text>
                </View>

                <Text
                  className="mt-2 text-[25px] font-black leading-[30px]"
                  style={{
                    color:
                      theme.colors
                        .foreground,
                  }}
                >
                  Feedbacks apprenants
                </Text>

                <Text
                  className="mt-1.5 max-w-[540px] text-[11px] leading-[16px]"
                  style={{
                    color:
                      theme.colors
                        .foregroundMuted,
                  }}
                >
                  Traitez les retours et les demandes d’aide reçus sur vos formations.
                </Text>
              </View>

              <View
                className="ml-3 h-12 w-12 items-center justify-center rounded-[16px]"
                style={{
                  backgroundColor:
                    "#F1E9FF",
                }}
              >
                <SymbolView
                  name={{
                    ios: "bubble.left.and.bubble.right.fill",
                    android: "forum",
                    web: "forum",
                  }}
                  tintColor="#7C3AED"
                  size={21}
                  weight="bold"
                />
              </View>
            </View>
          </View>

          {/* REVIEWS LINK - EXISTING FUNCTIONALITY PRESERVED */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Consulter les avis sur mes formations"
            onPress={onOpenReviews}
            android_ripple={{
              color: "transparent",
            }}
            className="mb-3 flex-row items-center rounded-[18px] border bg-white px-3.5 py-3"
            style={{
              borderColor: "#E5DFE8",
              shadowColor: "#0F172A",
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.035,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <View
              className="h-10 w-10 items-center justify-center rounded-[12px]"
              style={{
                backgroundColor:
                  "#FFF6DD",
              }}
            >
              <SymbolView
                name={{
                  ios: "star.fill",
                  android: "star",
                  web: "star",
                }}
                tintColor="#D97706"
                size={17}
                weight="bold"
              />
            </View>

            <View className="ml-3 min-w-0 flex-1">
              <Text
                className="text-[11px] font-black"
                style={{
                  color:
                    theme.colors
                      .foreground,
                }}
              >
                Avis sur mes formations
              </Text>

              <Text
                className="mt-0.5 text-[9px] leading-[13px]"
                style={{
                  color:
                    theme.colors
                      .foregroundMuted,
                }}
              >
                Notes et commentaires publiés par les apprenants
              </Text>
            </View>

            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{
                backgroundColor:
                  "#F3EEFF",
              }}
            >
              <SymbolView
                name={{
                  ios: "chevron.right",
                  android:
                    "chevron_right",
                  web: "chevron_right",
                }}
                tintColor="#7C3AED"
                size={13}
                weight="bold"
              />
            </View>
          </Pressable>

          {/* STATUS FILTER */}
          <View className="mb-3">
            <View className="mb-2 flex-row items-end">
              <View className="min-w-0 flex-1">
                <Text
                  className="text-[11px] font-black"
                  style={{
                    color:
                      theme.colors
                        .foreground,
                  }}
                >
                  Statut
                </Text>

                <Text
                  className="mt-0.5 text-[8px]"
                  style={{
                    color:
                      theme.colors
                        .foregroundMuted,
                  }}
                >
                  Filtrer les feedbacks
                </Text>
              </View>

              {filter !== "ALL" ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Réinitialiser le filtre"
                  onPress={() =>
                    selectFilter("ALL")
                  }
                  android_ripple={{
                    color:
                      "transparent",
                  }}
                  className="rounded-full px-2.5 py-1.5"
                  style={{
                    backgroundColor:
                      "#F3EEFF",
                  }}
                >
                  <Text
                    className="text-[8px] font-black"
                    style={{
                      color:
                        theme.colors
                          .accent,
                    }}
                  >
                    Réinitialiser
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 8,
                paddingRight: 4,
              }}
            >
              {filters.map((value) => {
                const selected =
                  filter === value;

                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected,
                    }}
                    accessibilityLabel={`Filtrer par ${filterLabel(
                      value,
                    )}`}
                    onPress={() =>
                      selectFilter(value)
                    }
                    android_ripple={{
                      color: "transparent",
                    }}
                    className="h-[42px] flex-row items-center rounded-[12px] border px-2.5"
                    style={{
                      backgroundColor:
                        selected
                          ? theme.colors.accent
                          : theme.colors.surface,
                      borderColor:
                        selected
                          ? theme.colors.accent
                          : theme.colors.border,
                      shadowColor: "#0F172A",
                      shadowOffset: {
                        width: 0,
                        height: 1,
                      },
                      shadowOpacity:
                        selected ? 0.06 : 0.025,
                      shadowRadius: 3,
                      elevation:
                        selected ? 1 : 0,
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
                      className="ml-1.5 text-[10px] font-black"
                      style={{
                        color:
                          selected
                            ? theme.colors.accentForeground
                            : theme.colors.foregroundMuted,
                      }}
                    >
                      {filterLabel(value)}
                    </Text>

                    <View
                      className="ml-2 min-w-[24px] items-center justify-center rounded-full px-1.5 py-1"
                      style={{
                        backgroundColor:
                          selected
                            ? "rgba(255,255,255,0.18)"
                            : "#F3EEFF",
                      }}
                    >
                      <Text
                        className="text-[8px] font-black"
                        style={{
                          color:
                            selected
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
                theme.colors
                  .foregroundSubtle
              }
              size={17}
            />

            <TextInput
              value={query}
              onChangeText={updateQuery}
              placeholder="Rechercher un apprenant, une formation..."
              placeholderTextColor={
                theme.colors
                  .foregroundSubtle
              }
              className="ml-2 min-h-[48px] flex-1 text-[12px]"
              style={{
                color:
                  theme.colors
                    .foreground,
              }}
            />

            {query.trim() ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
                onPress={() =>
                  updateQuery("")
                }
                android_ripple={{
                  color:
                    "transparent",
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
                    theme.colors
                      .foregroundSubtle
                  }
                  size={15}
                />
              </Pressable>
            ) : null}
          </View>

          {error ? (
            <View className="mb-4">
              <ErrorMessage
                message={error}
                onRetry={() =>
                  void refresh()
                }
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
            <View className="mb-3">
              <Text
                className="text-[18px] font-black"
                style={{
                  color:
                    theme.colors
                      .foreground,
                }}
              >
                {filter === "ALL"
                  ? "Tous les feedbacks"
                  : filterLabel(filter)}
              </Text>

              <Text
                className="mt-0.5 text-[10px] font-semibold"
                style={{
                  color:
                    theme.colors
                      .foregroundMuted,
                }}
              >
                {filtered.length === 0
                  ? "Aucun résultat"
                  : `${firstVisible}–${lastVisible} sur ${filtered.length}`}
              </Text>
            </View>

            {filtered.length === 0 ? (
              <View
                className="items-center rounded-[22px] border bg-white px-5 py-8"
                style={{
                  borderColor:
                    "#E5DFE8",
                }}
              >
                <View
                  className="h-[58px] w-[58px] items-center justify-center rounded-full"
                  style={{
                    backgroundColor:
                      "#F1E9FF",
                  }}
                >
                  <SymbolView
                    name={{
                      ios: "bubble.left.and.exclamationmark.bubble.right.fill",
                      android: "forum",
                      web: "forum",
                    }}
                    tintColor="#7C3AED"
                    size={23}
                    weight="bold"
                  />
                </View>

                <Text
                  className="mt-4 text-[15px] font-black"
                  style={{
                    color:
                      theme.colors
                        .foreground,
                  }}
                >
                  Aucun feedback à afficher
                </Text>

                <Text
                  className="mt-1.5 text-center text-[10px] leading-[15px]"
                  style={{
                    color:
                      theme.colors
                        .foregroundMuted,
                  }}
                >
                  Aucun retour ne correspond au filtre ou à la recherche actuelle.
                </Text>
              </View>
            ) : (
              <>
                {pageItems.map(
                  (item) => (
                    <TrainerFeedbackCard
                      key={
                        item.feedback.id
                      }
                      item={item}
                      onOpen={() =>
                        onOpenFeedback(
                          item.feedback.id,
                        )
                      }
                    />
                  ),
                )}

                <View
                  className="mb-5 mt-2 rounded-[22px] border bg-white px-3 py-3"
                  style={{
                    borderColor:
                      theme.colors.border,
                  }}
                >
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text
                      className="text-[11px] font-bold"
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
                        className="text-[10px] font-black"
                        style={{
                          color:
                            theme.colors
                              .accent,
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
                          currentPage -
                            1,
                        )
                      }
                    />

                    {paginationItems.map(
                      (item, index) => {
                        if (
                          item ===
                          "ellipsis"
                        ) {
                          return (
                            <View
                              key={`ellipsis-${index}`}
                              className="h-9 w-6 items-center justify-center"
                            >
                              <Text
                                className="text-[14px] font-bold"
                                style={{
                                  color:
                                    theme
                                      .colors
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
                              selected:
                                active,
                            }}
                            onPress={() =>
                              changePage(
                                item,
                              )
                            }
                            android_ripple={{
                              color:
                                "transparent",
                            }}
                            className="h-9 w-9 items-center justify-center rounded-xl border"
                            style={{
                              backgroundColor:
                                active
                                  ? theme
                                      .colors
                                      .accent
                                  : theme
                                      .colors
                                      .surface,
                              borderColor:
                                active
                                  ? theme
                                      .colors
                                      .accent
                                  : theme
                                      .colors
                                      .border,
                            }}
                          >
                            <Text
                              className="text-[11px] font-black"
                              style={{
                                color:
                                  active
                                    ? theme
                                        .colors
                                        .accentForeground
                                    : theme
                                        .colors
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
                          currentPage +
                            1,
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

  function PaginationArrow({
    direction,
    disabled,
    onPress,
  }: {
    direction:
      | "previous"
      | "next";
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
          borderColor:
            theme.colors.border,
          opacity: disabled
            ? 0.45
            : 1,
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
              ? theme.colors
                  .foregroundSubtle
              : theme.colors.accent
          }
          size={14}
          weight="bold"
        />
      </Pressable>
    );
  }
}

import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { useFocusEffect } from "expo-router";
import {
  useCallback,
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

import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
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

type TrainingStatus =
  | "ALL"
  | "PUBLISHED"
  | "DRAFT"
  | "ARCHIVED";

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

export default function TrainerTrainingsScreen({
  trainerId,
  onOpenTraining,
  onCreateTraining,
  onEditTraining,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const mountedRef = useRef(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const listTopRef = useRef(0);

  const [items, setItems] =
    useState<TrainerTrainingListItem[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] =
    useState<TrainingStatus>("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void getTrainerTrainingList(trainerId)
        .then((loaded) => {
          if (!active || !mountedRef.current) {
            return;
          }

          setItems(loaded);
          setError("");
        })
        .catch(() => {
          if (!active || !mountedRef.current) {
            return;
          }

          setError(
            "Impossible de charger vos formations.",
          );
        })
        .finally(() => {
          if (!active || !mountedRef.current) {
            return;
          }

          setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [trainerId]),
  );

  async function refresh() {
    if (!mountedRef.current) {
      return;
    }

    setRefreshing(true);

    try {
      const loaded =
        await getTrainerTrainingList(trainerId);

      if (!mountedRef.current) {
        return;
      }

      setItems(loaded);
      setError("");
    } catch {
      if (!mountedRef.current) {
        return;
      }

      setError(
        "Impossible d’actualiser vos formations.",
      );
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }

  const counts = useMemo(() => {
    return {
      all: items.length,
      published: items.filter(
        ({ training }) =>
          training.status === "PUBLISHED",
      ).length,
      draft: items.filter(
        ({ training }) =>
          training.status === "DRAFT",
      ).length,
      archived: items.filter(
        ({ training }) =>
          training.status === "ARCHIVED",
      ).length,
    };
  }, [items]);

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
        status === "ALL" ||
        training.status === status;

      return queryMatch && statusMatch;
    });
  }, [items, query, status]);

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

  function selectStatus(
    value: TrainingStatus,
  ) {
    setStatus(value);
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
      <LoadingState message="Chargement de vos formations..." />
    );
  }

  return (
    <ScreenContainer
      edges={["left", "right"]}
      style={{ padding: 0 }}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-5"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              void refresh()
            }
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-[760px]">
          {/* En-tête */}
          <View className="mb-5 flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1 pr-2">
              <View className="mb-2 self-start rounded-full bg-[#F3EEFF] px-3 py-1.5">
                <Text className="text-[11px] font-extrabold uppercase tracking-[1px] text-[#7C3AED]">
                  Catalogue formateur
                </Text>
              </View>

              <Text
                className="text-[27px] font-black leading-[32px] tracking-[-0.8px]"
                style={{
                  color:
                    theme.colors.foreground,
                }}
              >
                Votre catalogue
              </Text>

              <Text
                className="mt-1.5 text-[14px] leading-5"
                style={{
                  color:
                    theme.colors
                      .foregroundMuted,
                }}
              >
                Créez, modifiez et pilotez vos
                formations depuis le mobile.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Créer une nouvelle formation"
              onPress={onCreateTraining}
              android_ripple={{
                color: "transparent",
              }}
              className="h-11 w-11 items-center justify-center rounded-[15px]"
              style={{
                backgroundColor:
                  theme.colors.accent,
              }}
            >
              <SymbolView
                name={{
                  ios: "plus",
                  android: "add",
                  web: "add",
                }}
                tintColor={
                  theme.colors
                    .accentForeground
                }
                size={21}
                weight="bold"
              />
            </Pressable>
          </View>

          {/* Filtre standard de l’application : icône + libellé + compteur */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            contentContainerStyle={{
              gap: 8,
              paddingRight: 4,
            }}
          >
            <StatusStat
              statusValue="ALL"
              label="Toutes"
              value={counts.all}
              icon={{
                ios: "square.grid.2x2.fill",
                android: "grid_view",
                web: "grid_view",
              }}
            />

            <StatusStat
              statusValue="PUBLISHED"
              label="Publiées"
              value={counts.published}
              icon={{
                ios: "checkmark.circle.fill",
                android: "check_circle",
                web: "check_circle",
              }}
            />

            <StatusStat
              statusValue="DRAFT"
              label="Brouillons"
              value={counts.draft}
              icon={{
                ios: "doc.text.fill",
                android: "description",
                web: "description",
              }}
            />

            <StatusStat
              statusValue="ARCHIVED"
              label="Archivées"
              value={counts.archived}
              icon={{
                ios: "archivebox.fill",
                android: "archive",
                web: "archive",
              }}
            />
          </ScrollView>

          {/* Recherche */}
          <View
            className="mb-3 h-[52px] flex-row items-center rounded-2xl border bg-white px-4"
            style={{
              borderColor:
                theme.colors.border,
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
              size={19}
            />

            <TextInput
              value={query}
              onChangeText={updateQuery}
              placeholder="Rechercher une formation..."
              placeholderTextColor={
                theme.colors
                  .foregroundSubtle
              }
              className="ml-3 flex-1 text-[15px]"
              style={{
                color:
                  theme.colors.foreground,
              }}
              returnKeyType="search"
            />

            {query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
                onPress={() =>
                  updateQuery("")
                }
                android_ripple={{
                  color: "transparent",
                }}
                className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-[#F3EEFF]"
              >
                <SymbolView
                  name={{
                    ios: "xmark",
                    android: "close",
                    web: "close",
                  }}
                  tintColor={
                    theme.colors.accent
                  }
                  size={15}
                  weight="bold"
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

          {/* Liste */}
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
                  color: theme.colors.foreground,
                }}
              >
                Formations
              </Text>

              <Text
                className="mt-0.5 text-[12px] font-semibold"
                style={{
                  color: theme.colors.foregroundMuted,
                }}
              >
                {filtered.length} résultat
                {filtered.length > 1 ? "s" : ""}
              </Text>
            </View>

            {filtered.length === 0 ? (
              <View
                className="items-center rounded-[24px] border bg-white px-6 py-10"
                style={{
                  borderColor:
                    theme.colors.border,
                }}
              >
                <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-[#F3EEFF]">
                  <SymbolView
                    name={{
                      ios: "books.vertical",
                      android:
                        "library_books",
                      web: "library_books",
                    }}
                    tintColor={
                      theme.colors.accent
                    }
                    size={25}
                  />
                </View>

                <Text
                  className="text-center text-[17px] font-black"
                  style={{
                    color:
                      theme.colors
                        .foreground,
                  }}
                >
                  Aucune formation
                  correspondante
                </Text>

                <Text
                  className="mt-2 text-center text-[13px] leading-5"
                  style={{
                    color:
                      theme.colors
                        .foregroundMuted,
                  }}
                >
                  Modifiez vos filtres ou
                  créez une nouvelle
                  formation.
                </Text>

                <AppButton
                  title="Créer une formation"
                  onPress={onCreateTraining}
                  style={{
                    marginTop: 18,
                    minWidth: 190,
                  }}
                />
              </View>
            ) : (
              <>
                <View className="gap-3">
                  {pageItems.map(
                    (item) => (
                      <TrainerTrainingCard
                        key={
                          item.training.id
                        }
                        item={item}
                        onOpen={() =>
                          onOpenTraining(
                            item.training.id,
                          )
                        }
                        onEdit={
                          item.training
                            .status ===
                          "DRAFT"
                            ? () =>
                                onEditTraining(
                                  item
                                    .training
                                    .id,
                                )
                            : undefined
                        }
                      />
                    ),
                  )}
                </View>

                {/* Pagination */}
                <View
                  className="mt-5 rounded-[22px] border bg-white px-3 py-3"
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
                          currentPage - 1,
                        )
                      }
                    />

                    {paginationItems.map(
                      (
                        item,
                        index,
                      ) => {
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

  function StatusStat({
    statusValue,
    label,
    value,
    icon,
  }: {
    statusValue: TrainingStatus;
    label: string;
    value: number;
    icon: ComponentProps<typeof SymbolView>["name"];
  }) {
    const selected = status === statusValue;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Filtrer par ${label}`}
        accessibilityState={{ selected }}
        onPress={() => selectStatus(statusValue)}
        android_ripple={{ color: "transparent" }}
        className="h-[42px] flex-row items-center rounded-[12px] border px-2.5"
        style={{
          backgroundColor: selected
            ? theme.colors.accent
            : theme.colors.surface,
          borderColor: selected
            ? theme.colors.accent
            : theme.colors.border,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: selected ? 0.06 : 0.025,
          shadowRadius: 3,
          elevation: selected ? 1 : 0,
        }}
      >
        <SymbolView
          name={icon}
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
            color: selected
              ? theme.colors.accentForeground
              : theme.colors.foregroundMuted,
          }}
        >
          {label}
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
            className="text-[8px] font-black"
            style={{
              color: selected
                ? theme.colors.accentForeground
                : theme.colors.accent,
            }}
          >
            {value}
          </Text>
        </View>
      </Pressable>
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
          borderColor:
            theme.colors.border,
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
              ? theme.colors
                  .foregroundSubtle
              : theme.colors.accent
          }
          size={17}
          weight="bold"
        />
      </Pressable>
    );
  }
}

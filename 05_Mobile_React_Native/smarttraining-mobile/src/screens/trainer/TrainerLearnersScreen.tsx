import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
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
import SectionHeader from "../../components/SectionHeader";
import TrainerLearnerCard from "../../components/trainer/TrainerLearnerCard";
import { getTrainerLearners } from "../../features/trainer/trainerLearnerService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type { TrainerLearnerListItem } from "../../types/trainerLearnerMobile";

type Props = {
  trainerId: number;
  onOpenLearner: (learnerId: number) => void;
};

type LearnerFilter = "ALL" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
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


function searchableText(item: TrainerLearnerListItem) {
  return [
    item.identity.fullName,
    item.identity.firstName,
    item.identity.lastName,
    item.identity.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("fr");
}

function progressOf(item: TrainerLearnerListItem) {
  return Math.max(0, Math.min(100, item.averageProgress));
}

function matchesFilter(item: TrainerLearnerListItem, filter: LearnerFilter) {
  const progress = progressOf(item);

  if (filter === "NOT_STARTED") return progress <= 0;
  if (filter === "IN_PROGRESS") return progress > 0 && progress < 100;
  if (filter === "COMPLETED") return progress >= 100;

  return true;
}

export default function TrainerLearnersScreen({
  trainerId,
  onOpenLearner,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [items, setItems] = useState<TrainerLearnerListItem[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LearnerFilter>("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const loaded = await getTrainerLearners(trainerId);
    setItems(loaded);
  }

  useEffect(() => {
    let active = true;

    void getTrainerLearners(trainerId)
      .then((loaded) => {
        if (!active) return;
        setItems(loaded);
        setError("");
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger les apprenants suivis.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
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
      setError("Impossible d’actualiser les apprenants suivis.");
    } finally {
      setRefreshing(false);
    }
  }

  const counts = useMemo(
    () => ({
      ALL: items.length,
      NOT_STARTED: items.filter((item) => matchesFilter(item, "NOT_STARTED"))
        .length,
      IN_PROGRESS: items.filter((item) => matchesFilter(item, "IN_PROGRESS"))
        .length,
      COMPLETED: items.filter((item) => matchesFilter(item, "COMPLETED"))
        .length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");

    return items.filter((item) => {
      const matchesQuery =
        !normalized || searchableText(item).includes(normalized);

      return matchesQuery && matchesFilter(item, filter);
    });
  }, [items, query, filter]);

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE),
  );

  const currentPage = Math.min(
    Math.max(page, 1),
    totalPages,
  );

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleItems = filtered.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );
  const firstVisible =
    filtered.length === 0 ? 0 : startIndex + 1;
  const lastVisible = Math.min(
    startIndex + PAGE_SIZE,
    filtered.length,
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

  function changePage(nextPage: number) {
    const normalizedPage = Math.min(
      Math.max(nextPage, 1),
      totalPages,
    );

    if (normalizedPage === currentPage) {
      return;
    }

    setPage(normalizedPage);
  }

  if (loading) {
    return <LoadingState message="Chargement des apprenants suivis..." />;
  }

  const filters: {
    key: LearnerFilter;
    label: string;
    icon: React.ComponentProps<typeof SymbolView>["name"];
  }[] = [
    {
      key: "ALL",
      label: "Tous",
      icon: { ios: "person.2.fill", android: "group", web: "group" },
    },
    {
      key: "NOT_STARTED",
      label: "À démarrer",
      icon: {
        ios: "circle.dashed",
        android: "radio_button_unchecked",
        web: "radio_button_unchecked",
      },
    },
    {
      key: "IN_PROGRESS",
      label: "En cours",
      icon: { ios: "chart.bar.fill", android: "bar_chart", web: "bar_chart" },
    },
    {
      key: "COMPLETED",
      label: "Terminés",
      icon: {
        ios: "checkmark.circle.fill",
        android: "check_circle",
        web: "check_circle",
      },
    },
  ];

  return (
    <ScreenContainer
      edges={["left", "right"]}
      style={{ paddingBottom: 0 }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 4 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
      >
        <View className="mx-auto w-full max-w-[760px]">
          <SectionHeader
            title="Apprenants suivis"
            subtitle="Les participants réellement inscrits à vos formations."
          />

          {/* Recherche */}
          <View
            className="mb-3 min-h-[50px] flex-row items-center rounded-[18px] border bg-white px-4"
            style={{ borderColor: theme.colors.border }}
          >
            <SymbolView
              name={{ ios: "magnifyingglass", android: "search", web: "search" }}
              tintColor={theme.colors.foregroundSubtle}
              size={18}
            />

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher par nom ou e-mail..."
              placeholderTextColor={theme.colors.foregroundSubtle}
              className="ml-2 min-w-0 flex-1 py-3 text-[14px]"
              style={{ color: theme.colors.foreground }}
            />

            {query ? (
              <Pressable
                onPress={() => setQuery("")}
                android_ripple={{ color: "transparent" }}
                className="h-8 w-8 items-center justify-center rounded-xl bg-[#F3EEFF]"
              >
                <SymbolView
                  name={{ ios: "xmark", android: "close", web: "close" }}
                  tintColor={theme.colors.accent}
                  size={13}
                  weight="bold"
                />
              </Pressable>
            ) : null}
          </View>

          {/* Filtres */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            contentContainerStyle={{ gap: 8, paddingRight: 12 }}
          >
            {filters.map((item) => {
              const active = filter === item.key;

              return (
                <Pressable
                  key={item.key}
                  onPress={() => setFilter(item.key)}
                  android_ripple={{ color: "transparent" }}
                  className="min-h-[40px] flex-row items-center rounded-[14px] border px-3"
                  style={{
                    backgroundColor: active
                      ? theme.colors.accent
                      : theme.colors.surface,
                    borderColor: active
                      ? theme.colors.accent
                      : theme.colors.border,
                  }}
                >
                  <SymbolView
                    name={item.icon}
                    tintColor={
                      active
                        ? theme.colors.accentForeground
                        : theme.colors.accent
                    }
                    size={14}
                    weight="bold"
                  />

                  <Text
                    className="ml-1.5 text-[12px] font-black"
                    style={{
                      color: active
                        ? theme.colors.accentForeground
                        : theme.colors.foregroundMuted,
                    }}
                  >
                    {item.label}
                  </Text>

                  <View
                    className="ml-2 min-w-[22px] items-center rounded-[8px] px-1.5 py-1"
                    style={{
                      backgroundColor: active
                        ? "rgba(255,255,255,0.20)"
                        : theme.colors.surfaceSoft,
                    }}
                  >
                    <Text
                      className="text-[11px] font-black"
                      style={{
                        color: active
                          ? theme.colors.accentForeground
                          : theme.colors.accent,
                      }}
                    >
                      {counts[item.key]}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Résumé */}
          <View className="mb-3 flex-row items-center justify-between">
            <View>
              <Text
                className="text-[15px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                {filtered.length} apprenant{filtered.length > 1 ? "s" : ""}
              </Text>

              <Text
                className="mt-0.5 text-[11px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                {filter === "ALL"
                  ? "Tous les apprenants"
                  : filter === "NOT_STARTED"
                    ? "Progression à 0 %"
                    : filter === "IN_PROGRESS"
                      ? "Progression entre 1 % et 99 %"
                      : "Progression à 100 %"}
              </Text>
            </View>

            {filtered.length > 0 ? (
              <View className="rounded-full bg-[#F3EEFF] px-3 py-1.5">
                <Text
                  className="text-[11px] font-black"
                  style={{ color: theme.colors.accent }}
                >
                  {firstVisible}–{lastVisible} / {filtered.length}
                </Text>
              </View>
            ) : null}
          </View>

          {error ? (
            <View className="mb-3">
              <ErrorMessage
                message={error}
                onRetry={() => void refresh()}
              />
            </View>
          ) : null}

          {/* Cartes */}
          {filtered.length === 0 ? (
            <View
              className="items-center rounded-[22px] border bg-white px-5 py-8"
              style={{ borderColor: theme.colors.border }}
            >
              <SymbolView
                name={{
                  ios: "person.crop.circle.badge.questionmark",
                  android: "person_search",
                  web: "person_search",
                }}
                tintColor={theme.colors.accent}
                size={24}
              />

              <Text
                className="mt-3 text-[16px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Aucun apprenant trouvé
              </Text>

              <Text
                className="mt-1 text-center text-[13px] leading-[17px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Modifiez le filtre ou la recherche.
              </Text>
            </View>
          ) : (
            visibleItems.map((item) => (
              <TrainerLearnerCard
                key={item.identity.id}
                item={item}
                onOpen={() => onOpenLearner(item.identity.id)}
              />
            ))
          )}

          {/* Pagination — même style que Mes formations */}
          {filtered.length > PAGE_SIZE ? (
            <View
              className="mt-5 rounded-[22px] border bg-white px-3 py-3"
              style={{
                borderColor: theme.colors.border,
              }}
            >
              <View className="mb-3 flex-row items-center justify-between">
                <Text
                  className="text-[12px] font-bold"
                  style={{
                    color: theme.colors.foregroundMuted,
                  }}
                >
                  {firstVisible}–{lastVisible} sur {filtered.length}
                </Text>

                <View className="rounded-full bg-[#F3EEFF] px-2.5 py-1">
                  <Text
                    className="text-[13px] font-black"
                    style={{
                      color: theme.colors.accent,
                    }}
                  >
                    Page {currentPage} / {totalPages}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-center gap-1.5">
                <PaginationArrow
                  direction="previous"
                  disabled={currentPage === 1}
                  onPress={() =>
                    changePage(currentPage - 1)
                  }
                />

                {paginationItems.map((item, index) => {
                  if (item === "ellipsis") {
                    return (
                      <View
                        key={`ellipsis-${index}`}
                        className="h-9 w-6 items-center justify-center"
                      >
                        <Text
                          className="text-[15px] font-bold"
                          style={{
                            color:
                              theme.colors.foregroundSubtle,
                          }}
                        >
                          …
                        </Text>
                      </View>
                    );
                  }

                  const active = item === currentPage;

                  return (
                    <Pressable
                      key={item}
                      accessibilityRole="button"
                      accessibilityLabel={`Page ${item}`}
                      accessibilityState={{ selected: active }}
                      onPress={() => changePage(item)}
                      android_ripple={{ color: "transparent" }}
                      className="h-9 w-9 items-center justify-center rounded-xl border"
                      style={{
                        backgroundColor: active
                          ? theme.colors.accent
                          : theme.colors.surface,
                        borderColor: active
                          ? theme.colors.accent
                          : theme.colors.border,
                      }}
                    >
                      <Text
                        className="text-[12px] font-black"
                        style={{
                          color: active
                            ? theme.colors.accentForeground
                            : theme.colors.foregroundMuted,
                        }}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  );
                })}

                <PaginationArrow
                  direction="next"
                  disabled={currentPage === totalPages}
                  onPress={() =>
                    changePage(currentPage + 1)
                  }
                />
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function PaginationArrow({
    direction,
    disabled,
    onPress,
  }: {
    direction: "previous" | "next";
    disabled: boolean;
    onPress: () => void;
  }) {
    const isPrevious = direction === "previous";

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isPrevious
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

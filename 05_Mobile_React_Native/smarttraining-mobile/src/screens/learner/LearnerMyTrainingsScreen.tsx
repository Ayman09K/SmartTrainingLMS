import { Href, router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  type ComponentProps,
  useCallback,
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
import LearnerMyLearningPathCard from "../../components/learner/LearnerMyLearningPathCard";
import LearnerMyTrainingCard from "../../components/learner/LearnerMyTrainingCard";
import {
  getLearningPathCatalog,
  getMyAssignedLearningPaths,
} from "../../features/learningPaths/learningPathService";
import {
  getMyLearnerTrainings,
} from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
  LearningPathCatalog,
  LearningPathProgress,
} from "../../types/learningPath";
import { LearnerMyTraining } from "../../types/learnerTraining";

type Props = {
  onOpenTraining: (trainingId: number) => void;
  onBackHome: () => void;
  onOpenCertificates: () => void;
};

type FilterKey =
  | "ALL"
  | "ACTIVE"
  | "COMPLETED";

type PaginationItem = number | "ellipsis";
type SymbolName = ComponentProps<typeof SymbolView>["name"];

const PAGE_SIZE = 5;

function clampProgress(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function isTrainingCompleted(training: LearnerMyTraining): boolean {
  return (
    training.enrollmentStatus === "COMPLETED" ||
    clampProgress(training.progressPercentage) >= 100
  );
}

function isTrainingActive(training: LearnerMyTraining): boolean {
  const progress = clampProgress(training.progressPercentage);

  return !isTrainingCompleted(training) && progress > 0;
}

function isPathActive(path: LearningPathProgress): boolean {
  const progress = clampProgress(path.overallProgressPercentage);

  return !path.completed && progress > 0;
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

export default function LearnerMyTrainingsScreen({
  onOpenTraining,
  onBackHome: _onBackHome,
  onOpenCertificates,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const scrollRef = useRef<ScrollView | null>(null);
  const trainingSectionTopRef = useRef(0);

  const [trainings, setTrainings] = useState<LearnerMyTraining[]>([]);
  const [paths, setPaths] = useState<LearningPathProgress[]>([]);
  const [catalog, setCatalog] = useState<LearningPathCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trainingError, setTrainingError] = useState("");
  const [pathError, setPathError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [page, setPage] = useState(1);

  const catalogById = useMemo(
    () => new Map(catalog.map((item) => [item.id, item])),
    [catalog],
  );

  async function loadAll() {
    const [trainingResult, pathResult, catalogResult] =
      await Promise.allSettled([
        getMyLearnerTrainings(),
        getMyAssignedLearningPaths(),
        getLearningPathCatalog(),
      ]);

    if (trainingResult.status === "fulfilled") {
      setTrainings(trainingResult.value);
      setTrainingError("");
    } else {
      setTrainings([]);
      setTrainingError(
        "Impossible de charger tes formations. Réessaie dans quelques instants.",
      );
    }

    if (pathResult.status === "fulfilled") {
      setPaths(pathResult.value);
      setPathError("");
    } else {
      setPaths([]);
      setPathError(
        "Impossible de charger tes parcours affectés. Réessaie dans quelques instants.",
      );
    }

    if (catalogResult.status === "fulfilled") {
      setCatalog(catalogResult.value);
    } else {
      setCatalog([]);
    }
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void Promise.allSettled([
        getMyLearnerTrainings(),
        getMyAssignedLearningPaths(),
        getLearningPathCatalog(),
      ]).then(([trainingResult, pathResult, catalogResult]) => {
        if (!active) {
          return;
        }

        if (trainingResult.status === "fulfilled") {
          setTrainings(trainingResult.value);
          setTrainingError("");
        } else {
          setTrainings([]);
          setTrainingError(
            "Impossible de charger tes formations. Réessaie dans quelques instants.",
          );
        }

        if (pathResult.status === "fulfilled") {
          setPaths(pathResult.value);
          setPathError("");
        } else {
          setPaths([]);
          setPathError(
            "Impossible de charger tes parcours affectés. Réessaie dans quelques instants.",
          );
        }

        if (catalogResult.status === "fulfilled") {
          setCatalog(catalogResult.value);
        } else {
          setCatalog([]);
        }

        setLoading(false);
      });

      return () => {
        active = false;
      };
    }, []),
  );

  async function refresh() {
    setRefreshing(true);

    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }

  function openLearningPath(pathId: number) {
    router.push(
      `/learner/learning-path-detail?pathId=${pathId}` as Href,
    );
  }

  const completedTrainings = useMemo(
    () =>
      trainings.filter((training) =>
        isTrainingCompleted(training),
      ).length,
    [trainings],
  );

  const averageProgress = useMemo(() => {
    if (!trainings.length) {
      return 0;
    }

    return Math.round(
      trainings.reduce(
        (total, training) =>
          total +
          clampProgress(
            training.progressPercentage,
          ),
        0,
      ) / trainings.length,
    );
  }, [trainings]);

  const trainingCounts = useMemo(
    () => ({
      all: trainings.length,
      active: trainings.filter(isTrainingActive).length,
      completed: trainings.filter(isTrainingCompleted).length,
    }),
    [trainings],
  );

  const filteredPaths = useMemo(() => {
    const normalized = search
      .trim()
      .toLocaleLowerCase("fr");

    if (!normalized) {
      return paths;
    }

    return paths.filter((path) => {
      const pathCatalog =
        catalogById.get(path.pathId);

      return [
        path.pathTitle,
        pathCatalog?.shortDescription,
        pathCatalog?.description,
        ...path.trainings.map(
          (training) => training.trainingTitle,
        ),
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("fr")
            .includes(normalized),
        );
    });
  }, [catalogById, paths, search]);

  const filteredTrainings = useMemo(() => {
    const normalized = search
      .trim()
      .toLocaleLowerCase("fr");

    return trainings.filter((training) => {
      if (
        filter === "ACTIVE" &&
        !isTrainingActive(training)
      ) {
        return false;
      }

      if (
        filter === "COMPLETED" &&
        !isTrainingCompleted(training)
      ) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [
        training.title,
        training.shortDescription,
        training.category,
        training.level,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("fr")
            .includes(normalized),
        );
    });
  }, [filter, search, trainings]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTrainings.length / PAGE_SIZE),
  );

  const currentPage = Math.min(
    Math.max(page, 1),
    totalPages,
  );

  const firstIndex =
    (currentPage - 1) * PAGE_SIZE;

  const visibleTrainings = filteredTrainings.slice(
    firstIndex,
    firstIndex + PAGE_SIZE,
  );

  const firstVisible =
    filteredTrainings.length === 0
      ? 0
      : firstIndex + 1;

  const lastVisible = Math.min(
    firstIndex + PAGE_SIZE,
    filteredTrainings.length,
  );

  const paginationItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages],
  );

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateFilter(nextFilter: FilterKey) {
    setFilter(nextFilter);
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
          trainingSectionTopRef.current - 12,
        ),
        animated: true,
      });
    });
  }

  if (loading) {
    return (
      <LoadingState message="Chargement de ton apprentissage..." />
    );
  }

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
        className="flex-1 min-h-[0px]"
        contentContainerClassName="grow px-[14px] pt-[10px] pb-[4px]"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      >
        <View className="w-full max-w-[760px] self-center">
          <View className="overflow-hidden rounded-[26px] border border-[#E7E2EB] bg-[#FFFFFF] p-[16px]" style={{ shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: {
      width: 0,
      height: 4,
    }, elevation: 2 }}>
            <View className="absolute w-[170px] h-[170px] rounded-[85px] right-[-72px] top-[-82px] bg-[#F3EEFF]" />
            <View className="absolute w-[78px] h-[78px] rounded-[39px] right-[24px] top-[-34px] bg-[#E3D4FF] opacity-[0.82]" />

            <View className="flex-row items-center">
              <View className="w-[48px] h-[48px] rounded-[15px] bg-[#FAF8F5] items-center justify-center">
                <SymbolView
                  name={{
                    ios: "books.vertical.fill",
                    android: "library_books",
                    web: "library_books",
                  }}
                  tintColor="#7C3AED"
                  size={22}
                  weight="bold"
                />
              </View>

              <View className="ml-[10px] min-h-[28px] px-[11px] rounded-full bg-[#F3EEFF] items-center justify-center">
                <Text className="text-[#7C3AED] text-[9px] font-black tracking-[0.9px]">
                  MON APPRENTISSAGE
                </Text>
              </View>
            </View>

            <Text className="mt-[14px] text-[#111827] text-[24px] leading-[29px] font-black tracking-[-0.6px]">
              Formations & parcours
            </Text>

            <Text className="mt-[5px] max-w-[92%] text-[#667085] text-[13px] leading-[19px] font-medium">
              Retrouve tout ce qui t’est affecté, reprends ta progression
              et accède rapidement à tes certificats.
            </Text>

            <View className="mt-[16px] gap-[9px]">
              <Pressable
                accessibilityRole="button"
                onPress={onOpenCertificates}
                android_ripple={{ color: "transparent" }}
                className="min-h-[50px] rounded-[16px] bg-[#7C3AED] px-[10px] flex-row items-center"
              >
                <View className="w-[34px] h-[34px] rounded-[11px] mr-[9px] bg-[rgba(255,255,255,0.16)] items-center justify-center">
                  <SymbolView
                    name={{
                      ios: "rosette",
                      android: "workspace_premium",
                      web: "workspace_premium",
                    }}
                    tintColor="#FFFFFF"
                    size={15}
                    weight="bold"
                  />
                </View>

                <Text className="flex-1 text-[#FFFFFF] text-[12px] font-black">
                  Mes certificats
                </Text>

                <SymbolView
                  name={{
                    ios: "chevron.right",
                    android: "chevron_right",
                    web: "chevron_right",
                  }}
                  tintColor="#FFFFFF"
                  size={11}
                  weight="bold"
                />
              </Pressable>

              <View
                className="flex-row overflow-hidden rounded-[16px] border bg-[#FCFBFD] px-[4px] py-[7px]"
                style={{
                  borderColor: theme.colors.border,
                }}
              >
                <OverviewStat
                  label="Parcours"
                  value={String(paths.length)}
                  icon={{
                    ios: "point.topleft.down.curvedto.point.bottomright.up",
                    android: "route",
                    web: "route",
                  }}
                  tint="#7C3AED"
                  background="#F3EEFF"
                  divider
                />

                <OverviewStat
                  label="Formations"
                  value={String(trainings.length)}
                  icon={{
                    ios: "book.pages.fill",
                    android: "menu_book",
                    web: "menu_book",
                  }}
                  tint="#2563EB"
                  background="#EFF6FF"
                  divider
                />

                <OverviewStat
                  label="Terminées"
                  value={String(completedTrainings)}
                  icon={{
                    ios: "checkmark.seal.fill",
                    android: "verified",
                    web: "verified",
                  }}
                  tint="#16A36A"
                  background="#ECFDF3"
                  divider
                />

                <OverviewStat
                  label="Progression"
                  value={`${averageProgress}%`}
                  icon={{
                    ios: "chart.bar.fill",
                    android: "bar_chart",
                    web: "bar_chart",
                  }}
                  tint="#D97706"
                  background="#FFF7ED"
                />
              </View>
            </View>
          </View>

          <View className="min-h-[54px] mt-[18px] mb-[0px] rounded-[18px] border border-[#E7E2EB] bg-[#FFFFFF] px-[8px] flex-row items-center" style={{ shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 9, shadowOffset: {
      width: 0,
      height: 3,
    }, elevation: 2 }}>
            <View className="w-[38px] h-[38px] rounded-[13px] bg-[#F3EEFF] items-center justify-center">
              <SymbolView
                name={{
                  ios: "magnifyingglass",
                  android: "search",
                  web: "search",
                }}
                tintColor="#7C3AED"
                size={20}
                weight="bold"
              />
            </View>

            <TextInput
              value={search}
              onChangeText={updateSearch}
              placeholder="Rechercher une formation, un sujet..."
              placeholderTextColor="#98A2B3"
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 min-w-[0px] min-h-[52px] px-[11px] text-[12px] font-semibold" style={{ color: theme.colors.foreground }}
            />

            {search ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
                onPress={() => updateSearch("")}
                android_ripple={{ color: "transparent" }}
                className="w-[32px] h-[32px] rounded-[11px] bg-[#F8F6F3] items-center justify-center"
              >
                <SymbolView
                  name={{
                    ios: "xmark",
                    android: "close",
                    web: "close",
                  }}
                  tintColor="#667085"
                  size={12}
                  weight="bold"
                />
              </Pressable>
            ) : null}
          </View>

          {/* =================================================
              MES PARCOURS — section dédiée, plus légère
          ================================================= */}
          <View className="mt-[24px]">
            <View className="relative overflow-hidden min-h-[86px] mb-[12px] rounded-[19px] border border-[#E5DDF0] bg-[#FFFFFF] px-[12px] py-[11px] flex-row items-center">
              <View className="absolute left-[0px] top-[0px] bottom-[0px] w-[4px] bg-[#7C3AED]" />

              <View className="w-[42px] h-[42px] rounded-[14px] ml-[2px] mr-[10px] bg-[#F3EEFF] items-center justify-center">
                <SymbolView
                  name={{
                    ios: "point.topleft.down.curvedto.point.bottomright.up",
                    android: "route",
                    web: "route",
                  }}
                  tintColor="#7C3AED"
                  size={17}
                  weight="bold"
                />
              </View>

              <View className="flex-1 min-w-[0px]">
                <Text className="text-[#111827] text-[18px] leading-[22px] font-black tracking-[-0.2px]">
                  Mes parcours
                </Text>
                <Text className="mt-[2px] text-[#667085] text-[11px] leading-[15px]">
                  Des chemins d’apprentissage composés de plusieurs formations.
                </Text>
              </View>

              <View className="min-w-[34px] h-[30px] px-[9px] rounded-full bg-[#F3EEFF] items-center justify-center">
                <Text className="text-[#7C3AED] text-[10px] font-black">
                  {filteredPaths.length}
                </Text>
              </View>
            </View>

            {pathError ? (
              <View className="mt-[12px]">
                <ErrorMessage
                  message={pathError}
                  onRetry={() => void refresh()}
                />
              </View>
            ) : null}

            {!pathError && filteredPaths.length === 0 ? (
              <View className="min-h-[174px] rounded-[22px] border border-[#E7E2EB] bg-[#FFFFFF] p-[18px] items-center justify-center">
                <View className="w-[48px] h-[48px] rounded-[16px] mb-[11px] bg-[#F3EEFF] items-center justify-center">
                  <SymbolView
                    name={{
                      ios: "point.topleft.down.curvedto.point.bottomright.up",
                      android: "route",
                      web: "route",
                    }}
                    tintColor="#7C3AED"
                    size={20}
                    weight="bold"
                  />
                </View>

                <Text className="text-[#111827] text-[14px] font-black text-center">
                  {search.trim()
                    ? "Aucun parcours correspondant"
                    : "Aucun parcours affecté"}
                </Text>

                <Text className="mt-[5px] max-w-[310px] text-[#667085] text-[11px] leading-[16px] text-center">
                  {search.trim()
                    ? "Essaie avec un autre mot-clé."
                    : "Les parcours apparaîtront ici lorsqu’ils seront réellement affectés à ton compte."}
                </Text>
              </View>
            ) : null}

            {!pathError && filteredPaths.length > 0 ? (
              <View className="gap-[11px]">
                {filteredPaths.map((path, index) => (
                  <LearnerMyLearningPathCard
                    key={`path-${path.pathId}`}
                    progress={path}
                    catalog={catalogById.get(path.pathId)}
                    onOpen={() =>
                      openLearningPath(path.pathId)
                    }
                  />
                ))}
              </View>
            ) : null}
          </View>

          {/* =================================================
              MES FORMATIONS — section dédiée
          ================================================= */}
          <View
            className="mt-[26px]"
            onLayout={(event) => {
              trainingSectionTopRef.current =
                event.nativeEvent.layout.y;
            }}
          >
            <View className="relative overflow-hidden min-h-[86px] mb-[12px] rounded-[19px] border border-[#DCE6F2] bg-[#FFFFFF] px-[12px] py-[11px] flex-row items-center">
              <View className="absolute left-[0px] top-[0px] bottom-[0px] w-[4px] bg-[#2563EB]" />

              <View className="w-[42px] h-[42px] rounded-[14px] ml-[2px] mr-[10px] bg-[#EFF6FF] items-center justify-center">
                <SymbolView
                  name={{
                    ios: "play.rectangle.fill",
                    android: "play_circle",
                    web: "play_circle",
                  }}
                  tintColor="#2563EB"
                  size={17}
                  weight="bold"
                />
              </View>

              <View className="flex-1 min-w-[0px]">
                <Text className="text-[#111827] text-[18px] leading-[22px] font-black tracking-[-0.2px]">
                  Mes formations
                </Text>
                <Text className="mt-[2px] text-[#667085] text-[11px] leading-[15px]">
                  Tes cours individuels et tes formations affectées.
                </Text>
              </View>

              <View className="min-w-[34px] h-[30px] px-[9px] rounded-full bg-[#EFF6FF] items-center justify-center">
                <Text className="text-[#2563EB] text-[10px] font-black">
                  {filteredTrainings.length}
                </Text>
              </View>
            </View>

            <View className="mt-[14px] mb-[16px] flex-row gap-[8px]">
              <FilterPill
                label="Toutes"
                count={trainingCounts.all}
                active={filter === "ALL"}
                onPress={() => updateFilter("ALL")}
              />

              <FilterPill
                label="En cours"
                count={trainingCounts.active}
                active={filter === "ACTIVE"}
                onPress={() => updateFilter("ACTIVE")}
              />

              <FilterPill
                label="Terminées"
                count={trainingCounts.completed}
                active={filter === "COMPLETED"}
                onPress={() => updateFilter("COMPLETED")}
              />
            </View>

            {trainingError ? (
              <View className="mt-[12px]">
                <ErrorMessage
                  message={trainingError}
                  onRetry={() => void refresh()}
                />
              </View>
            ) : null}

            {!trainingError && filteredTrainings.length === 0 ? (
              <View className="min-h-[174px] rounded-[22px] border border-[#E7E2EB] bg-[#FFFFFF] p-[18px] items-center justify-center">
                <View className="w-[48px] h-[48px] rounded-[16px] mb-[11px] bg-[#EFF6FF] items-center justify-center">
                  <SymbolView
                    name={{
                      ios: "books.vertical.fill",
                      android: "library_books",
                      web: "library_books",
                    }}
                    tintColor="#2563EB"
                    size={20}
                    weight="bold"
                  />
                </View>

                <Text className="text-[#111827] text-[14px] font-black text-center">
                  {search.trim()
                    ? "Aucune formation correspondante"
                    : filter === "ACTIVE"
                      ? "Aucune formation en cours"
                      : filter === "COMPLETED"
                        ? "Aucune formation terminée"
                        : "Aucune formation disponible"}
                </Text>

                <Text className="mt-[5px] max-w-[310px] text-[#667085] text-[11px] leading-[16px] text-center">
                  {search.trim()
                    ? "Essaie avec un autre mot-clé."
                    : "Les formations apparaîtront ici après une inscription, une affectation ou une invitation acceptée."}
                </Text>
              </View>
            ) : null}

            {!trainingError && filteredTrainings.length > 0 ? (
              <View className="gap-[11px]">
                {visibleTrainings.map((training, index) => (
                  <LearnerMyTrainingCard
                    key={`training-${training.id}`}
                    training={training}
                    onOpen={() =>
                      onOpenTraining(training.id)
                    }
                  />
                ))}
              </View>
            ) : null}

            {/* Pagination identique au style des écrans Formateur */}
            {!trainingError && filteredTrainings.length > 0 ? (
              <View
                className="mt-[14px] mb-[8px] rounded-[22px] border bg-[#FFFFFF] px-[12px] py-[12px]" style={{
                    borderColor: theme.colors.border,
                  }}
              >
                <View className="mb-[12px] flex-row items-center justify-between">
                  <Text
                    className="text-[13px] font-bold" style={{
                        color:
                          theme.colors.foregroundMuted,
                      }}
                  >
                    {firstVisible}–{lastVisible} sur{" "}
                    {filteredTrainings.length}
                  </Text>

                  <View className="rounded-full bg-[#F3EEFF] px-[10px] py-[4px]">
                    <Text
                      className="text-[12px] font-black" style={{
                          color: theme.colors.accent,
                        }}
                    >
                      Page {currentPage} / {totalPages}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-center gap-[6px]">
                  <PaginationArrow
                    previous
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
                          className="w-[24px] h-[36px] items-center justify-center"
                        >
                          <Text
                            className="text-[15px] font-bold" style={{
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
                      item === currentPage;

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
                          color: "transparent",
                        }}
                        className="w-[36px] h-[36px] rounded-[12px] border items-center justify-center" style={{
                            backgroundColor: active
                              ? theme.colors.accent
                              : theme.colors.surface,
                            borderColor: active
                              ? theme.colors.accent
                              : theme.colors.border,
                          }}
                      >
                        <Text
                          className="text-[13px] font-black" style={{
                              color: active
                                ? "#FFFFFF"
                                : theme.colors
                                    .foregroundMuted,
                            }}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}

                  <PaginationArrow
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
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function OverviewStat({
  label,
  value,
  icon,
  tint,
  background,
  divider = false,
}: {
  label: string;
  value: string;
  icon: SymbolName;
  tint: string;
  background: string;
  divider?: boolean;
}) {
  return (
    <View className="relative min-h-[68px] min-w-0 flex-1 justify-center px-[6px]">
      <View className="flex-row items-center justify-between">
        <View
          className="h-[28px] w-[28px] items-center justify-center rounded-[9px]"
          style={{
            backgroundColor: background,
          }}
        >
          <SymbolView
            name={icon}
            tintColor={tint}
            size={13}
            weight="bold"
          />
        </View>

        <Text
          className="ml-[3px] text-[17px] leading-[20px] font-black tracking-[-0.4px]"
          style={{
            color: "#111827",
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.86}
        className="mt-[6px] text-[10px] leading-[13px] font-extrabold"
        style={{
          color: "#667085",
        }}
      >
        {label}
      </Text>

      <View
        className="mt-[6px] h-[3px] w-[20px] rounded-full"
        style={{
          backgroundColor: tint,
        }}
      />

      {divider ? (
        <View className="absolute bottom-[8px] right-0 top-[8px] w-[1px] bg-[#E9E4EC]" />
      ) : null}
    </View>
  );
}

function FilterPill({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      android_ripple={{ color: "transparent" }}
      className="min-h-[40px] flex-1 flex-row items-center justify-center rounded-[12px] border px-[8px]"
      style={{
        backgroundColor: active ? "#7C3AED" : "#FFFFFF",
        borderColor: active ? "#7C3AED" : "#E7E2EB",
      }}
    >
      <Text
        numberOfLines={1}
        className="text-[11px] font-extrabold"
        style={{
          color: active ? "#FFFFFF" : "#475467",
        }}
      >
        {label}
      </Text>

      <View
        className="ml-[5px] min-w-[20px] items-center justify-center rounded-full px-[5px] py-[2px]"
        style={{
          backgroundColor: active
            ? "rgba(255,255,255,0.18)"
            : "#F3EEFF",
        }}
      >
        <Text
          className="text-[9px] font-black"
          style={{
            color: active ? "#FFFFFF" : "#7C3AED",
          }}
        >
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

function PaginationArrow({
  previous = false,
  disabled,
  onPress,
}: {
  previous?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

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
      className="w-[36px] h-[36px] rounded-[12px] border items-center justify-center" style={{
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

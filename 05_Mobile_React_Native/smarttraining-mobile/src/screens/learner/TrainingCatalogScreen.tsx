import { SymbolView } from "expo-symbols";
import {
  type ComponentProps,
  useEffect,
  useMemo,
  useState,
} from "react";
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
import ScreenContainer from "../../components/ScreenContainer";
import CatalogLearningPathCard from "../../components/learner/CatalogLearningPathCard";
import CatalogTrainingCard from "../../components/learner/CatalogTrainingCard";
import {
  getLearningPathCatalog,
} from "../../features/learningPaths/learningPathService";
import {
  enrollWithAccessCode,
  getLearnerAccessRequests,
  getLearnerCatalog,
  getLearnerEnrollments,
  requestTrainingAccess,
  selfEnroll,
} from "../../features/trainings/catalogService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import { LearningPathCatalog } from "../../types/learningPath";
import {
  LearnerAccessRequest,
  LearnerCatalogTraining,
  LearnerEnrollment,
} from "../../types/learnerCatalog";

type TrainingCatalogScreenProps = {
  learnerId: number;
  onOpenTraining: (trainingId: number) => void;
  onOpenLearningPath: (pathId: number) => void;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];
type PaginationItem = number | "ellipsis";

const PAGE_SIZE = 5;

function apiErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      response?: {
        data?: {
          message?: string;
          error?: string;
        };
      };
    };

    const backendMessage =
      candidate.response?.data?.message ||
      candidate.response?.data?.error;

    if (backendMessage) {
      return backendMessage;
    }
  }

  return "L’action n’a pas pu être réalisée. Réessaie dans quelques instants.";
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

export default function TrainingCatalogScreen({
  learnerId,
  onOpenTraining,
  onOpenLearningPath,
}: TrainingCatalogScreenProps) {
  const { theme } = useSmartTrainingTheme();

  const [trainings, setTrainings] = useState<LearnerCatalogTraining[]>([]);
  const [learningPaths, setLearningPaths] =
    useState<LearningPathCatalog[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [enrollments, setEnrollments] = useState<LearnerEnrollment[]>([]);
  const [requests, setRequests] = useState<LearnerAccessRequest[]>([]);
  const [accessCodes, setAccessCodes] = useState<Record<number, string>>({});
  const [accessMessages, setAccessMessages] =
    useState<Record<number, string>>({});
  const [busyTrainingId, setBusyTrainingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [trainingPage, setTrainingPage] = useState(1);

  useEffect(() => {
    let active = true;

    void Promise.all([
      getLearnerCatalog(),
      getLearningPathCatalog(),
      getLearnerEnrollments(learnerId),
      getLearnerAccessRequests(learnerId),
    ])
      .then(
        ([
          catalog,
          pathCatalog,
          learnerEnrollments,
          learnerRequests,
        ]) => {
          if (!active) return;

          setTrainings(catalog);
          setLearningPaths(pathCatalog);
          setEnrollments(learnerEnrollments);
          setRequests(learnerRequests);
          setErrorMessage("");
        },
      )
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMessage(apiErrorMessage(error));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [learnerId]);

  const enrolledTrainingIds = useMemo(
    () =>
      new Set(
        enrollments
          .filter((enrollment) => enrollment.status !== "CANCELLED")
          .map((enrollment) => enrollment.trainingId),
      ),
    [enrollments],
  );

  const pendingRequestTrainingIds = useMemo(
    () =>
      new Set(
        requests
          .filter((request) => request.status === "PENDING")
          .map((request) => request.trainingId),
      ),
    [requests],
  );

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          trainings
            .map((training) => training.category?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b, "fr")),
    [trainings],
  );

  const levels = useMemo(
    () =>
      Array.from(
        new Set(
          trainings
            .map((training) => training.level?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b, "fr")),
    [trainings],
  );

  const visibleTrainings = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");

    return trainings.filter((training) => {
      const queryMatches =
        !normalized ||
        [
          training.title,
          training.shortDescription,
          training.description,
          training.category,
          training.level,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(normalized);

      const categoryMatches =
        categoryFilter === "ALL" ||
        training.category === categoryFilter;

      const levelMatches =
        levelFilter === "ALL" ||
        training.level === levelFilter;

      return queryMatches && categoryMatches && levelMatches;
    });
  }, [
    categoryFilter,
    levelFilter,
    query,
    trainings,
  ]);

  const visibleLearningPaths = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");

    if (!normalized) {
      return learningPaths;
    }

    return learningPaths.filter((path) =>
      [
        path.title,
        path.shortDescription,
        path.description,
        path.objectives,
        ...path.trainings.map(
          (training) => training.trainingTitle,
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(normalized),
    );
  }, [learningPaths, query]);

  const activeFilterCount =
    (categoryFilter === "ALL" ? 0 : 1) +
    (levelFilter === "ALL" ? 0 : 1);

  const enrolledCount = useMemo(
    () =>
      trainings.filter((training) =>
        enrolledTrainingIds.has(training.id),
      ).length,
    [enrolledTrainingIds, trainings],
  );

  const requestPendingCount = useMemo(
    () =>
      trainings.filter((training) =>
        pendingRequestTrainingIds.has(training.id),
      ).length,
    [pendingRequestTrainingIds, trainings],
  );

  const trainingTotalPages = Math.max(
    1,
    Math.ceil(visibleTrainings.length / PAGE_SIZE),
  );

  const currentTrainingPage = Math.min(
    Math.max(trainingPage, 1),
    trainingTotalPages,
  );

  const trainingFirstIndex =
    (currentTrainingPage - 1) * PAGE_SIZE;

  const paginatedTrainings = visibleTrainings.slice(
    trainingFirstIndex,
    trainingFirstIndex + PAGE_SIZE,
  );

  const trainingFirstVisible =
    visibleTrainings.length === 0
      ? 0
      : trainingFirstIndex + 1;

  const trainingLastVisible = Math.min(
    trainingFirstIndex + PAGE_SIZE,
    visibleTrainings.length,
  );

  const trainingPaginationItems = useMemo(
    () =>
      buildPagination(
        currentTrainingPage,
        trainingTotalPages,
      ),
    [currentTrainingPage, trainingTotalPages],
  );

  function updateQuery(value: string) {
    setQuery(value);
    setTrainingPage(1);
  }

  function updateCategory(value: string) {
    setCategoryFilter(value);
    setTrainingPage(1);
  }

  function updateLevel(value: string) {
    setLevelFilter(value);
    setTrainingPage(1);
  }

  function resetFilters() {
    setCategoryFilter("ALL");
    setLevelFilter("ALL");
    setTrainingPage(1);
  }

  async function refreshCatalog() {
    try {
      setRefreshing(true);
      setErrorMessage("");

      const [
        catalog,
        pathCatalog,
        learnerEnrollments,
        learnerRequests,
      ] = await Promise.all([
        getLearnerCatalog(),
        getLearningPathCatalog(),
        getLearnerEnrollments(learnerId),
        getLearnerAccessRequests(learnerId),
      ]);

      setTrainings(catalog);
      setLearningPaths(pathCatalog);
      setEnrollments(learnerEnrollments);
      setRequests(learnerRequests);
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSelfEnroll(
    training: LearnerCatalogTraining,
  ) {
    try {
      setBusyTrainingId(training.id);
      setErrorMessage("");
      setSuccessMessage("");

      const enrollment = await selfEnroll(training.id);

      setEnrollments((current) => [
        ...current.filter(
          (item) => item.trainingId !== training.id,
        ),
        enrollment,
      ]);

      setSuccessMessage(
        `Inscription confirmée : ${training.title} est maintenant disponible dans tes formations.`,
      );
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setBusyTrainingId(null);
    }
  }

  async function handleAccessCodeEnroll(
    training: LearnerCatalogTraining,
  ) {
    const accessCode =
      accessCodes[training.id]?.trim() || "";

    if (!accessCode) {
      setErrorMessage(
        "Saisis le code d’accès de la formation.",
      );
      return;
    }

    try {
      setBusyTrainingId(training.id);
      setErrorMessage("");
      setSuccessMessage("");

      const enrollment = await enrollWithAccessCode(
        training.id,
        accessCode,
      );

      setEnrollments((current) => [
        ...current.filter(
          (item) => item.trainingId !== training.id,
        ),
        enrollment,
      ]);

      setAccessCodes((current) => ({
        ...current,
        [training.id]: "",
      }));

      setSuccessMessage(
        `Code validé : ${training.title} est maintenant disponible dans tes formations.`,
      );
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setBusyTrainingId(null);
    }
  }

  async function handleRequestAccess(
    training: LearnerCatalogTraining,
  ) {
    try {
      setBusyTrainingId(training.id);
      setErrorMessage("");
      setSuccessMessage("");

      const request = await requestTrainingAccess(
        training.id,
        accessMessages[training.id],
      );

      setRequests((current) => [
        ...current.filter(
          (item) => item.trainingId !== training.id,
        ),
        request,
      ]);

      setAccessMessages((current) => ({
        ...current,
        [training.id]: "",
      }));

      setSuccessMessage(
        `Demande envoyée pour ${training.title}.`,
      );
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setBusyTrainingId(null);
    }
  }

  if (loading) {
    return (
      <LoadingState message="Chargement du catalogue..." />
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
      <KeyboardAvoidingView
        className="flex-1"
        behavior={
          Platform.OS === "ios" ? "padding" : undefined
        }
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow px-[14px] pt-[12px] pb-[6px]"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refreshCatalog()}
              tintColor={theme.colors.accent}
              colors={[theme.colors.accent]}
            />
          }
        >
          <View className="w-full max-w-[760px] self-center">
            <View
              className="overflow-hidden rounded-[26px] border bg-[#FFFFFF] p-[16px]" style={[{ shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: {
      width: 0,
      height: 4,
    }, elevation: 2 }, {
                  borderColor: theme.colors.border,
                  shadowColor: theme.colors.shadow,
                }]}
            >
              <View className="absolute w-[180px] h-[180px] rounded-[90px] right-[-80px] top-[-90px] bg-[#F3EEFF]" />
              <View className="absolute w-[76px] h-[76px] rounded-[38px] right-[28px] top-[-34px] bg-[#E2D4FF] opacity-[0.82]" />

              <View className="flex-row items-center">
                <View className="w-[48px] h-[48px] rounded-[15px] bg-[#FAF8F5] items-center justify-center">
                  <SymbolView
                    name={{
                      ios: "safari.fill",
                      android: "explore",
                      web: "explore",
                    }}
                    tintColor="#7C3AED"
                    size={22}
                    weight="bold"
                  />
                </View>

                <View className="ml-[10px] min-h-[28px] px-[11px] rounded-full bg-[#F3EEFF] items-center justify-center">
                  <Text className="text-[#7C3AED] text-[11px] font-black tracking-[0.8px]">
                    CATALOGUE
                  </Text>
                </View>
              </View>

              <Text className="mt-[14px] text-[#111827] text-[24px] leading-[29px] font-black tracking-[-0.6px]">
                Explorer les contenus
              </Text>

              <Text className="mt-[5px] max-w-[92%] text-[#667085] text-[14px] leading-[20px]">
                Découvre les formations et parcours réellement
                disponibles pour ton compte.
              </Text>

              <View className="mt-[16px] overflow-hidden rounded-[20px] border border-[#E9E4EC] bg-[#FCFBFD] py-[10px] px-[5px] flex-row">
                <HeroStat
                  label="Formations"
                  value={trainings.length}
                  icon={{
                    ios: "book.pages.fill",
                    android: "menu_book",
                    web: "menu_book",
                  }}
                  tint="#7C3AED"
                  background="#F3EEFF"
                  divider
                />

                <HeroStat
                  label="Parcours"
                  value={learningPaths.length}
                  icon={{
                    ios: "point.topleft.down.curvedto.point.bottomright.up",
                    android: "route",
                    web: "route",
                  }}
                  tint="#2563EB"
                  background="#EFF6FF"
                  divider
                />

                <HeroStat
                  label="Inscrites"
                  value={enrolledCount}
                  icon={{
                    ios: "checkmark.seal.fill",
                    android: "verified",
                    web: "verified",
                  }}
                  tint="#16A36A"
                  background="#ECFDF3"
                />
              </View>

              {requestPendingCount > 0 ? (
                <View className="mt-[10px] min-h-[34px] rounded-[11px] bg-[#FFF7ED] px-[9px] flex-row items-center">
                  <SymbolView
                    name={{
                      ios: "clock.fill",
                      android: "schedule",
                      web: "schedule",
                    }}
                    tintColor="#D97706"
                    size={12}
                    weight="bold"
                  />

                  <Text className="ml-[6px] text-[#B45309] text-[12px] font-extrabold">
                    {requestPendingCount} demande
                    {requestPendingCount > 1 ? "s" : ""} d’accès
                    en attente
                  </Text>
                </View>
              ) : null}
            </View>

            <View
              className="min-h-[54px] mt-[18px] rounded-[18px] border bg-[#FFFFFF] px-[8px] flex-row items-center" style={[{ shadowOpacity: 0.04, shadowRadius: 9, shadowOffset: {
      width: 0,
      height: 3,
    }, elevation: 2 }, {
                  borderColor: theme.colors.border,
                  shadowColor: theme.colors.shadow,
                }]}
            >
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
                accessibilityLabel="Rechercher dans les formations et parcours"
                value={query}
                onChangeText={updateQuery}
                placeholder="Rechercher dans les formations et parcours"
                placeholderTextColor="#98A2B3"
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 min-w-[0px] min-h-[52px] px-[11px] text-[14px] leading-[19px] font-bold" style={{
                    color: theme.colors.foreground,
                  }}
              />

              {query ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Effacer la recherche"
                  onPress={() => updateQuery("")}
                  android_ripple={{
                    color: "transparent",
                  }}
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

            {trainings.length > 0 ? (
              <View
                className="mt-[12px] rounded-[20px] border bg-[#FFFFFF] p-[11px]" style={[{ shadowOpacity: 0.035, shadowRadius: 8, shadowOffset: {
      width: 0,
      height: 3,
    }, elevation: 1 }, {
                    borderColor: theme.colors.border,
                    shadowColor: theme.colors.shadow,
                  }]}
              >
                <View className="min-h-[46px] mb-[10px] flex-row items-center justify-between gap-[8px]">
                  <View className="flex-1 min-w-[0px] flex-row items-center">
                    <View className="w-[38px] h-[38px] rounded-[13px] mr-[9px] bg-[#F3EEFF] items-center justify-center">
                      <SymbolView
                        name={{
                          ios: "slider.horizontal.3",
                          android: "tune",
                          web: "tune",
                        }}
                        tintColor="#7C3AED"
                        size={17}
                        weight="bold"
                      />
                    </View>

                    <View className="flex-1 min-w-[0px]">
                      <View className="flex-row items-center gap-[6px]">
                        <Text className="text-[#111827] text-[15px] leading-[19px] font-black">
                          Affiner
                        </Text>

                        {activeFilterCount > 0 ? (
                          <View className="min-w-[22px] h-[22px] px-[6px] rounded-full bg-[#7C3AED] items-center justify-center">
                            <Text className="text-[#FFFFFF] text-[10px] font-black">
                              {activeFilterCount}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <Text className="mt-[2px] text-[#667085] text-[12px] leading-[16px]">
                        Catégorie et niveau
                      </Text>
                    </View>
                  </View>

                  {activeFilterCount > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Réinitialiser les filtres"
                      onPress={resetFilters}
                      android_ripple={{
                        color: "transparent",
                      }}
                      className="min-h-[34px] px-[10px] rounded-full border border-[#DCCFF0] bg-[#FAF7FF] flex-row items-center gap-[5px]"
                    >
                      <SymbolView
                        name={{
                          ios: "arrow.counterclockwise",
                          android: "refresh",
                          web: "refresh",
                        }}
                        tintColor="#7C3AED"
                        size={12}
                        weight="bold"
                      />
                      <Text className="text-[#7C3AED] text-[10px] font-black">
                        Réinitialiser
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <View className="gap-[9px]">
                  <FilterGroup
                    label="Catégorie"
                    allLabel="Toutes"
                    values={categories}
                    selected={categoryFilter}
                    onSelect={updateCategory}
                    icon={{
                      ios: "tag.fill",
                      android: "label",
                      web: "label",
                    }}
                    tint="#7C3AED"
                    background="#F3EEFF"
                  />

                  <FilterGroup
                    label="Niveau"
                    allLabel="Tous"
                    values={levels}
                    selected={levelFilter}
                    onSelect={updateLevel}
                    icon={{
                      ios: "chart.bar.fill",
                      android: "bar_chart",
                      web: "bar_chart",
                    }}
                    tint="#2563EB"
                    background="#EFF6FF"
                  />
                </View>
              </View>
            ) : null}

            {successMessage ? (
              <View className="mt-[14px] min-h-[62px] rounded-[17px] border border-[#BBF7D0] bg-[#ECFDF3] p-[10px] flex-row items-center">
                <View className="w-[38px] h-[38px] rounded-[12px] mr-[9px] bg-[#FFFFFF] items-center justify-center">
                  <SymbolView
                    name={{
                      ios: "checkmark.circle.fill",
                      android: "check_circle",
                      web: "check_circle",
                    }}
                    tintColor="#16A36A"
                    size={17}
                    weight="bold"
                  />
                </View>

                <View className="flex-1 min-w-[0px]">
                  <Text className="text-[#15803D] text-[11px] font-black">
                    C’est fait
                  </Text>
                  <Text className="mt-[2px] text-[#475467] text-[10px] leading-[14px]">
                    {successMessage}
                  </Text>
                </View>
              </View>
            ) : null}

            {errorMessage ? (
              <View className="mt-[14px]">
                <ErrorMessage
                  title="Action impossible"
                  message={errorMessage}
                  onRetry={() => void refreshCatalog()}
                />
              </View>
            ) : null}

            <View className="mt-[25px]">
              <SectionTitle
                title="Formations disponibles"
                subtitle="Choisis une formation selon son mode d’accès."
                count={visibleTrainings.length}
                icon={{
                  ios: "books.vertical.fill",
                  android: "library_books",
                  web: "library_books",
                }}
                tint="#7C3AED"
                background="#F3EEFF"
              />

              {trainings.length === 0 ? (
                <EmptyState
                  title="Aucune formation disponible"
                  description="Le catalogue ne contient actuellement aucune formation publique publiée."
                  icon={{
                    ios: "books.vertical.fill",
                    android: "library_books",
                    web: "library_books",
                  }}
                  tint="#7C3AED"
                  background="#F3EEFF"
                />
              ) : visibleTrainings.length === 0 ? (
                <EmptyState
                  title="Aucune formation correspondante"
                  description="Modifie la recherche, la catégorie ou le niveau."
                  icon={{
                    ios: "magnifyingglass",
                    android: "search_off",
                    web: "search_off",
                  }}
                  tint="#7C3AED"
                  background="#F3EEFF"
                />
              ) : (
                <>
                  <View className="gap-[11px]">
                    {paginatedTrainings.map(
                      (training) => (
                        <CatalogTrainingCard
                          key={training.id}
                          training={training}
                          enrolled={enrolledTrainingIds.has(
                            training.id,
                          )}
                          pendingRequest={pendingRequestTrainingIds.has(
                            training.id,
                          )}
                          busy={
                            busyTrainingId === training.id
                          }
                          accessCode={
                            accessCodes[training.id] || ""
                          }
                          accessMessage={
                            accessMessages[training.id] || ""
                          }
                          onAccessCodeChange={(value) =>
                            setAccessCodes((current) => ({
                              ...current,
                              [training.id]: value,
                            }))
                          }
                          onAccessMessageChange={(value) =>
                            setAccessMessages((current) => ({
                              ...current,
                              [training.id]: value,
                            }))
                          }
                          onSelfEnroll={() =>
                            void handleSelfEnroll(training)
                          }
                          onAccessCodeEnroll={() =>
                            void handleAccessCodeEnroll(
                              training,
                            )
                          }
                          onRequestAccess={() =>
                            void handleRequestAccess(training)
                          }
                          onOpenTraining={() =>
                            onOpenTraining(training.id)
                          }
                        />
                      ),
                    )}
                  </View>
                </>
              )}
            </View>

            <View className="mt-[25px]">
              <SectionTitle
                title="Parcours à découvrir"
                subtitle="Des séquences de formations organisées par ton équipe pédagogique."
                count={visibleLearningPaths.length}
                icon={{
                  ios: "point.topleft.down.curvedto.point.bottomright.up",
                  android: "route",
                  web: "route",
                }}
                tint="#2563EB"
                background="#EFF6FF"
              />

              {learningPaths.length === 0 ? (
                <EmptyState
                  title="Aucun parcours disponible"
                  description="Les parcours publics ou qui te sont affectés apparaîtront ici."
                  icon={{
                    ios: "point.topleft.down.curvedto.point.bottomright.up",
                    android: "route",
                    web: "route",
                  }}
                  tint="#2563EB"
                  background="#EFF6FF"
                />
              ) : visibleLearningPaths.length === 0 ? (
                <EmptyState
                  title="Aucun parcours correspondant"
                  description="Modifie la recherche pour afficher d’autres parcours."
                  icon={{
                    ios: "magnifyingglass",
                    android: "search_off",
                    web: "search_off",
                  }}
                  tint="#2563EB"
                  background="#EFF6FF"
                />
              ) : (
                <>
                  <View className="gap-[11px]">
                    {visibleLearningPaths.map((path) => (
                      <CatalogLearningPathCard
                        key={path.id}
                        path={path}
                        onOpen={() =>
                          onOpenLearningPath(path.id)
                        }
                      />
                    ))}
                  </View>
                </>
              )}
            </View>

            {visibleTrainings.length > 0 ? (
              <View className="mt-[4px] mb-[2px]">
                <TrainerPagination
                  firstVisible={trainingFirstVisible}
                  lastVisible={trainingLastVisible}
                  total={visibleTrainings.length}
                  currentPage={currentTrainingPage}
                  totalPages={trainingTotalPages}
                  items={trainingPaginationItems}
                  onChangePage={setTrainingPage}
                />
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function HeroStat({
  label,
  value,
  icon,
  tint,
  background,
  divider = false,
}: {
  label: string;
  value: number;
  icon: SymbolName;
  tint: string;
  background: string;
  divider?: boolean;
}) {
  return (
    <View className="relative flex-1 min-w-[0px] min-h-[76px] px-[10px] justify-center">
      <View className="flex-row items-center justify-between">
        <View
          className="w-[34px] h-[34px] rounded-[11px] items-center justify-center" style={{ backgroundColor: background }}
        >
          <SymbolView
            name={icon}
            tintColor={tint}
            size={15}
            weight="bold"
          />
        </View>

        <Text className="text-[#111827] text-[21px] leading-[24px] font-black tracking-[-0.5px]">
          {value}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        className="mt-[7px] text-[#667085] text-[11px] leading-[14px] font-extrabold"
      >
        {label}
      </Text>

      <View
        className="w-[24px] h-[3px] mt-[7px] rounded-full" style={{ backgroundColor: tint }}
      />

      {divider ? (
        <View className="absolute top-[10px] right-[0px] bottom-[10px] w-[1px] bg-[#E9E4EC]" />
      ) : null}
    </View>
  );
}

function FilterGroup({
  label,
  allLabel,
  values,
  selected,
  onSelect,
  icon,
  tint,
  background,
}: {
  label: string;
  allLabel: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
  icon: SymbolName;
  tint: string;
  background: string;
}) {
  return (
    <View className="rounded-[15px] border border-[#EEE9F0] bg-[#FBFAFC] py-[9px] px-[9px]">
      <View className="mb-[8px] flex-row items-center">
        <View
          className="w-[28px] h-[28px] rounded-[9px] mr-[7px] items-center justify-center" style={{ backgroundColor: background }}
        >
          <SymbolView
            name={icon}
            tintColor={tint}
            size={13}
            weight="bold"
          />
        </View>

        <Text className="text-[#344054] text-[12px] leading-[16px] font-black">
          {label}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-[7px] pr-[18px]"
      >
        {["ALL", ...values].map((value) => {
          const active = selected === value;

          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{
                selected: active,
              }}
              onPress={() => onSelect(value)}
              android_ripple={{
                color: "transparent",
              }}
              className="min-h-[38px] shrink-0 flex-row items-center justify-center gap-[5px] rounded-[12px] border px-[14px]"
              style={{
                backgroundColor: active ? "#7C3AED" : "#FFFFFF",
                borderColor: active ? "#7C3AED" : "#E2DCE6",
              }}
            >
              {active ? (
                <SymbolView
                  name={{
                    ios: "checkmark",
                    android: "check",
                    web: "check",
                  }}
                  tintColor="#FFFFFF"
                  size={10}
                  weight="bold"
                />
              ) : null}

              <Text
                className="text-[12px] leading-[16px] font-black"
                style={{
                  color: active ? "#FFFFFF" : "#475467",
                }}
              >
                {value === "ALL"
                  ? allLabel
                  : value}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SectionTitle({
  title,
  subtitle,
  count,
  icon,
  tint,
  background,
}: {
  title: string;
  subtitle: string;
  count: number;
  icon: SymbolName;
  tint: string;
  background: string;
}) {
  return (
    <View className="mb-[11px] flex-row items-center">
      <View
        className="w-[42px] h-[42px] rounded-[14px] mr-[10px] items-center justify-center" style={{ backgroundColor: background }}
      >
        <SymbolView
          name={icon}
          tintColor={tint}
          size={17}
          weight="bold"
        />
      </View>

      <View className="flex-1 min-w-[0px]">
        <Text className="text-[#111827] text-[20px] leading-[24px] font-black">
          {title}
        </Text>
        <Text className="mt-[2px] text-[#667085] text-[12px] leading-[17px]">
          {subtitle}
        </Text>
      </View>

      <View
        className="min-w-[34px] h-[30px] px-[9px] rounded-full items-center justify-center" style={{ backgroundColor: background }}
      >
        <Text
          className="text-[11px] font-black" style={{ color: tint }}
        >
          {count}
        </Text>
      </View>
    </View>
  );
}

function EmptyState({
  title,
  description,
  icon,
  tint,
  background,
}: {
  title: string;
  description: string;
  icon: SymbolName;
  tint: string;
  background: string;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      className="min-h-[92px] rounded-[19px] border bg-[#FFFFFF] p-[12px] flex-row items-center" style={{ borderColor: theme.colors.border }}
    >
      <View
        className="w-[44px] h-[44px] rounded-[14px] mr-[10px] items-center justify-center" style={{ backgroundColor: background }}
      >
        <SymbolView
          name={icon}
          tintColor={tint}
          size={18}
          weight="bold"
        />
      </View>

      <View className="flex-1 min-w-[0px]">
        <Text
          className="text-[14px] leading-[18px] font-black" style={{ color: theme.colors.foreground }}
        >
          {title}
        </Text>

        <Text
          className="mt-[3px] text-[12px] leading-[17px]" style={{
              color:
                theme.colors.foregroundMuted,
            }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

function TrainerPagination({
  firstVisible,
  lastVisible,
  total,
  currentPage,
  totalPages,
  items,
  onChangePage,
}: {
  firstVisible: number;
  lastVisible: number;
  total: number;
  currentPage: number;
  totalPages: number;
  items: PaginationItem[];
  onChangePage: (page: number) => void;
}) {
  const { theme } = useSmartTrainingTheme();

  if (total === 0) {
    return null;
  }

  return (
    <View
      className="mt-[14px] rounded-[22px] border bg-[#FFFFFF] p-[12px]" style={{
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
          {firstVisible}–{lastVisible} sur {total}
        </Text>

        <View className="rounded-full bg-[#F3EEFF] px-[10px] py-[4px]">
          <Text
            className="text-[12px] font-black" style={{ color: theme.colors.accent }}
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
            onChangePage(currentPage - 1)
          }
        />

        {items.map((item, index) =>
          item === "ellipsis" ? (
            <View
              key={`ellipsis-${index}`}
              className="w-[24px] h-[36px] items-center justify-center"
            >
              <Text
                className="text-[15px] font-bold" style={{
                    color:
                      theme.colors.foregroundSubtle,
                  }}
              >
                …
              </Text>
            </View>
          ) : (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{
                selected: item === currentPage,
              }}
              onPress={() => onChangePage(item)}
              android_ripple={{
                color: "transparent",
              }}
              className="w-[36px] h-[36px] rounded-[12px] border items-center justify-center" style={{
                  borderColor:
                    item === currentPage
                      ? theme.colors.accent
                      : theme.colors.border,
                  backgroundColor:
                    item === currentPage
                      ? theme.colors.accent
                      : theme.colors.surface,
                }}
            >
              <Text
                className="text-[14px] font-black" style={{
                    color:
                      item === currentPage
                        ? "#FFFFFF"
                        : theme.colors
                            .foregroundMuted,
                  }}
              >
                {item}
              </Text>
            </Pressable>
          ),
        )}

        <PaginationArrow
          disabled={currentPage === totalPages}
          onPress={() =>
            onChangePage(currentPage + 1)
          }
        />
      </View>
    </View>
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
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{
        color: "transparent",
      }}
      className="w-[36px] h-[36px] rounded-[12px] border items-center justify-center" style={{
          borderColor: theme.colors.border,
          backgroundColor: disabled
            ? "#F8F6F3"
            : theme.colors.surface,
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
        size={13}
        weight="bold"
      />
    </Pressable>
  );
}

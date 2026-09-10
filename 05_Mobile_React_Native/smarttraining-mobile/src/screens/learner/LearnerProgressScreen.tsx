import { SymbolView } from "expo-symbols";
import {
  type ComponentProps,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LearnerProgressCard from "../../components/learner/LearnerProgressCard";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  getMyProgress,
  getMyRecommendations,
  getMyRiskIndicator,
} from "../../features/analytics/analyticsService";
import {
  getMyLearnerTrainings,
} from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
  LearnerProgressResponse,
  RiskIndicatorResponse,
} from "../../types/analytics";
import { LearnerMyTraining } from "../../types/learnerTraining";

type Props = {
  onOpenTraining: (trainingId: number) => void;
  onOpenRecommendations: () => void;
  onBackHome: () => void;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];
type FilterKey =
  | "ALL"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "AT_RISK";
type PaginationItem = number | "ellipsis";

const PAGE_SIZE = 5;

function clamp(value?: number | null): number {
  if (
    typeof value !== "number" ||
    Number.isNaN(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(value)),
  );
}

function formatActivityDate(
  value?: string | null,
): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function riskTitle(level?: string): string {
  if (level === "DATA_INSUFFICIENT") {
    return "Analyse en cours de construction";
  }

  if (level === "HIGH") {
    return "Accompagnement conseillé";
  }

  if (level === "MEDIUM") {
    return "Progression à surveiller";
  }

  return "Rythme satisfaisant";
}

function riskMessage(
  risk: RiskIndicatorResponse | null,
): string {
  if (
    !risk ||
    risk.riskLevel === "DATA_INSUFFICIENT"
  ) {
    return "Il n’y a pas encore assez d’activité pour personnaliser ton accompagnement. Continue ton parcours normalement.";
  }

  const suggestion = risk.recommendations?.[0];

  if (suggestion) {
    return suggestion;
  }

  if (risk.riskLevel === "HIGH") {
    return "Reprends les activités prioritaires et sollicite ton formateur si tu rencontres un blocage.";
  }

  if (risk.riskLevel === "MEDIUM") {
    return "Avance régulièrement et consulte les recommandations proposées pour ton parcours.";
  }

  return "Continue à avancer régulièrement dans tes formations.";
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
    return [
      1,
      2,
      3,
      "ellipsis",
      totalPages,
    ];
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

export default function LearnerProgressScreen({
  onOpenTraining,
  onOpenRecommendations,
  onBackHome,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [progressList, setProgressList] =
    useState<LearnerProgressResponse[]>([]);
  const [trainings, setTrainings] =
    useState<LearnerMyTraining[]>([]);
  const [risk, setRisk] =
    useState<RiskIndicatorResponse | null>(null);
  const [
    recommendationCount,
    setRecommendationCount,
  ] = useState<number | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] =
    useState<FilterKey>("ALL");
  const [page, setPage] = useState(1);

  async function load() {
    const [progressData, trainingData] =
      await Promise.all([
        getMyProgress(),
        getMyLearnerTrainings(),
      ]);

    setProgressList(progressData);
    setTrainings(trainingData);

    try {
      setRisk(await getMyRiskIndicator());
    } catch {
      setRisk(null);
    }

    try {
      const recommendationData =
        await getMyRecommendations();

      setRecommendationCount(
        recommendationData.length,
      );
    } catch {
      setRecommendationCount(null);
    }
  }

  useEffect(() => {
    let active = true;

    void Promise.all([
      getMyProgress(),
      getMyLearnerTrainings(),
    ])
      .then(
        async ([progressData, trainingData]) => {
          if (!active) return;

          setProgressList(progressData);
          setTrainings(trainingData);
          setError("");

          try {
            const riskData =
              await getMyRiskIndicator();

            if (active) {
              setRisk(riskData);
            }
          } catch {
            if (active) {
              setRisk(null);
            }
          }

          try {
            const recommendationData =
              await getMyRecommendations();

            if (active) {
              setRecommendationCount(
                recommendationData.length,
              );
            }
          } catch {
            if (active) {
              setRecommendationCount(null);
            }
          }
        },
      )
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger ta progression. Réessaie dans quelques instants.",
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
        "Impossible d’actualiser ta progression. Réessaie dans quelques instants.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  const progressByTraining = useMemo(
    () =>
      new Map(
        progressList.map((item) => [
          item.trainingId,
          item,
        ]),
      ),
    [progressList],
  );

  const percentages = useMemo(
    () =>
      trainings.map((training) => {
        const analyticsProgress =
          progressByTraining.get(training.id)
            ?.progressPercentage;

        return clamp(
          analyticsProgress ??
            training.progressPercentage,
        );
      }),
    [progressByTraining, trainings],
  );

  const averageProgress =
    percentages.length > 0
      ? Math.round(
          percentages.reduce(
            (sum, value) => sum + value,
            0,
          ) / percentages.length,
        )
      : 0;

  const completedCount =
    percentages.filter(
      (value) => value >= 100,
    ).length;

  const scores = progressList
    .map((item) => item.averageScore)
    .filter(
      (value): value is number =>
        typeof value === "number" &&
        Number.isFinite(value),
    );

  const averageScore =
    scores.length > 0
      ? Math.round(
          scores.reduce(
            (sum, value) => sum + value,
            0,
          ) / scores.length,
        )
      : null;

  const recentActivity = useMemo(() => {
    const trainingById = new Map(
      trainings.map((training) => [
        training.id,
        training.title,
      ]),
    );

    return progressList
      .filter((item) =>
        Boolean(item.lastActivityAt),
      )
      .map((item) => ({
        id: item.id,
        title:
          trainingById.get(item.trainingId) ||
          "Formation suivie",
        description: `${clamp(
          item.progressPercentage,
        )} % de progression • ${
          item.status === "COMPLETED"
            ? "Formation terminée"
            : item.status === "AT_RISK"
              ? "Progression à surveiller"
              : item.status ===
                  "IN_PROGRESS"
                ? "Formation en cours"
                : "Formation à commencer"
        }`,
        timestamp: formatActivityDate(
          item.lastActivityAt,
        ),
        sortValue: item.lastActivityAt
          ? Date.parse(item.lastActivityAt)
          : 0,
      }))
      .sort(
        (a, b) =>
          b.sortValue - a.sortValue,
      )
      .slice(0, 3);
  }, [progressList, trainings]);

  const statusForTraining = (
    training: LearnerMyTraining,
  ) => {
    const progress =
      progressByTraining.get(training.id);

    const percentage = clamp(
      progress?.progressPercentage ??
        training.progressPercentage,
    );

    if (
      progress?.status === "AT_RISK"
    ) {
      return "AT_RISK";
    }

    if (
      progress?.status === "COMPLETED" ||
      percentage >= 100
    ) {
      return "COMPLETED";
    }

    if (
      progress?.status === "IN_PROGRESS" ||
      percentage > 0
    ) {
      return "IN_PROGRESS";
    }

    return "NOT_STARTED";
  };

  const filterCounts = useMemo(
    () => ({
      all: trainings.length,
      active: trainings.filter(
        (training) =>
          statusForTraining(training) ===
          "IN_PROGRESS",
      ).length,
      completed: trainings.filter(
        (training) =>
          statusForTraining(training) ===
          "COMPLETED",
      ).length,
      atRisk: trainings.filter(
        (training) =>
          statusForTraining(training) ===
          "AT_RISK",
      ).length,
    }),
    [trainings, progressByTraining],
  );

  const filteredTrainings =
    useMemo(() => {
      if (filter === "ALL") {
        return trainings;
      }

      return trainings.filter(
        (training) =>
          statusForTraining(training) ===
          filter,
      );
    }, [
      filter,
      trainings,
      progressByTraining,
    ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredTrainings.length /
        PAGE_SIZE,
    ),
  );

  const currentPage = Math.min(
    Math.max(page, 1),
    totalPages,
  );

  const firstIndex =
    (currentPage - 1) *
    PAGE_SIZE;

  const visibleTrainings =
    filteredTrainings.slice(
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
    () =>
      buildPagination(
        currentPage,
        totalPages,
      ),
    [currentPage, totalPages],
  );

  function updateFilter(
    nextFilter: FilterKey,
  ) {
    setFilter(nextFilter);
    setPage(1);
  }

  if (loading) {
    return (
      <LoadingState message="Chargement de ta progression..." />
    );
  }

  const riskAccent =
    risk?.riskLevel === "HIGH"
      ? theme.colors.danger
      : risk?.riskLevel === "MEDIUM"
        ? theme.colors.warning
        : risk?.riskLevel === "LOW"
          ? theme.colors.success
          : theme.colors.info;

  const riskSoft =
    risk?.riskLevel === "HIGH"
      ? "#FEF2F2"
      : risk?.riskLevel === "MEDIUM"
        ? "#FFF7ED"
        : risk?.riskLevel === "LOW"
          ? "#ECFDF3"
          : "#EFF6FF";

  return (
    <ScreenContainer
      edges={["left", "right"]}
      style={{
    padding: 0,
    backgroundColor: "#F8F6F3",
  }}
    >
      <ScrollView
        className="flex-1 min-h-[0px]"
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
        contentContainerClassName="grow px-[14px] pt-[12px] pb-[6px]"
        showsVerticalScrollIndicator={
          false
        }
      >
        <View className="w-full max-w-[760px] self-center">
          <View
            className="overflow-hidden rounded-[26px] border bg-[#FFFFFF] p-[16px]" style={[{ shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: {
      width: 0,
      height: 4,
    }, elevation: 2 }, {
                borderColor:
                  theme.colors.border,
                shadowColor:
                  theme.colors.shadow,
              }]}
          >
            <View
              className="absolute w-[180px] h-[180px] rounded-[90px] right-[-80px] top-[-90px] bg-[#F3EEFF]"
            />
            <View
              className="absolute w-[76px] h-[76px] rounded-[38px] right-[30px] top-[-34px] bg-[#E2D4FF] opacity-[0.82]"
            />

            <View
              className="flex-row items-center"
            >
              <View
                className="w-[48px] h-[48px] rounded-[15px] bg-[#FAF8F5] items-center justify-center"
              >
                <SymbolView
                  name={{
                    ios: "chart.line.uptrend.xyaxis",
                    android: "monitoring",
                    web: "monitoring",
                  }}
                  tintColor="#7C3AED"
                  size={22}
                  weight="bold"
                />
              </View>

              <View
                className="ml-[10px] min-h-[28px] px-[11px] rounded-full bg-[#F3EEFF] items-center justify-center"
              >
                <Text
                  className="text-[#7C3AED] text-[11px] font-black tracking-[0.7px]"
                >
                  SUIVI APPRENANT
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retour à l’accueil"
                onPress={onBackHome}
                android_ripple={{
                  color: "transparent",
                }}
                className="w-[38px] h-[38px] ml-auto rounded-[12px] border border-[#DCCFF0] bg-[#FFFFFF] items-center justify-center"
              >
                <SymbolView
                  name={{
                    ios: "house.fill",
                    android: "home",
                    web: "home",
                  }}
                  tintColor="#7C3AED"
                  size={14}
                  weight="bold"
                />
              </Pressable>
            </View>

            <Text
              className="mt-[14px] text-[#111827] text-[24px] leading-[29px] font-black tracking-[-0.6px]"
            >
              Mon activité
            </Text>

            <Text
              className="mt-[5px] max-w-[92%] text-[#667085] text-[14px] leading-[20px]"
            >
              Visualise ton rythme,
              ta progression et les
              dernières activités
              réellement enregistrées.
            </Text>

            <View
              className="mt-[15px] flex-row flex-wrap gap-[8px]"
            >
              <SummaryCard
                label="Formations"
                value={String(
                  trainings.length,
                )}
                icon={{
                  ios: "books.vertical.fill",
                  android: "library_books",
                  web: "library_books",
                }}
                tint="#7C3AED"
                background="#F3EEFF"
              />

              <SummaryCard
                label="Progression"
                value={`${averageProgress}%`}
                icon={{
                  ios: "chart.bar.fill",
                  android: "bar_chart",
                  web: "bar_chart",
                }}
                tint="#2563EB"
                background="#EFF6FF"
              />

              <SummaryCard
                label="Terminées"
                value={String(
                  completedCount,
                )}
                icon={{
                  ios: "checkmark.seal.fill",
                  android: "verified",
                  web: "verified",
                }}
                tint="#16A36A"
                background="#ECFDF3"
              />

              <SummaryCard
                label="Score moyen"
                value={
                  averageScore === null
                    ? "—"
                    : `${averageScore}%`
                }
                icon={{
                  ios: "star.fill",
                  android: "star",
                  web: "star",
                }}
                tint="#D97706"
                background="#FFF7ED"
              />
            </View>
          </View>

          {error ? (
            <View
              className="mt-[14px]"
            >
              <ErrorMessage
                message={error}
                onRetry={() =>
                  void refresh()
                }
              />
            </View>
          ) : null}

          <View
            className="mt-[16px] rounded-[21px] border p-[12px]" style={{
                borderColor:
                  riskAccent,
                backgroundColor:
                  riskSoft,
              }}
          >
            <View
              className="flex-row items-center"
            >
              <View
                className="w-[42px] h-[42px] rounded-[14px] mr-[10px] items-center justify-center" style={{
                    backgroundColor:
                      "#FFFFFF",
                  }}
              >
                <SymbolView
                  name={{
                    ios:
                      risk?.riskLevel ===
                        "HIGH" ||
                      risk?.riskLevel ===
                        "MEDIUM"
                        ? "exclamationmark.triangle.fill"
                        : "sparkles",
                    android:
                      risk?.riskLevel ===
                        "HIGH" ||
                      risk?.riskLevel ===
                        "MEDIUM"
                        ? "warning"
                        : "auto_awesome",
                    web:
                      risk?.riskLevel ===
                        "HIGH" ||
                      risk?.riskLevel ===
                        "MEDIUM"
                        ? "warning"
                        : "auto_awesome",
                  }}
                  tintColor={
                    riskAccent
                  }
                  size={18}
                  weight="bold"
                />
              </View>

              <View
                className="flex-1 min-w-[0px]"
              >
                <Text
                  className="text-[10px] leading-[13px] font-black tracking-[0.55px]" style={{
                      color:
                        riskAccent,
                    }}
                >
                  ACCOMPAGNEMENT
                </Text>

                <Text
                  className="mt-[2px] text-[#111827] text-[17px] leading-[21px] font-black"
                >
                  {riskTitle(
                    risk?.riskLevel,
                  )}
                </Text>
              </View>
            </View>

            <Text
              className="mt-[9px] text-[#475467] text-[12px] leading-[17px]"
            >
              {riskMessage(risk)}
            </Text>

            {recommendationCount === 0 ? (
              <View
                className="mt-[10px] rounded-[14px] border border-[rgba(102,112,133,0.16)] bg-[rgba(255,255,255,0.68)] p-[9px] flex-row items-start"
              >
                <View
                  className="w-[28px] h-[28px] rounded-[9px] mr-[7px] bg-[#FFFFFF] items-center justify-center"
                >
                  <SymbolView
                    name={{
                      ios: "info.circle.fill",
                      android: "info",
                      web: "info",
                    }}
                    tintColor={riskAccent}
                    size={14}
                    weight="bold"
                  />
                </View>

                <Text
                  className="flex-1 min-w-[0px] text-[#667085] text-[11px] leading-[16px]"
                >
                  Aucun plan d’action personnalisé n’est enregistré pour le moment. Le conseil ci-dessus vient de ton indicateur d’accompagnement.
                </Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={
                onOpenRecommendations
              }
              android_ripple={{
                color: "transparent",
              }}
              className="mt-[10px] min-h-[52px] rounded-[15px] bg-[#7C3AED] px-[7px] flex-row items-center"
            >
              <View
                className="w-[36px] h-[36px] rounded-[12px] mr-[9px] bg-[rgba(255,255,255,0.16)] items-center justify-center"
              >
                <SymbolView
                  name={{
                    ios: "sparkles",
                    android: "auto_awesome",
                    web: "auto_awesome",
                  }}
                  tintColor="#FFFFFF"
                  size={13}
                  weight="bold"
                />
              </View>

              <View
                className="flex-1 min-w-[0px]"
              >
                <Text
                  className="text-[rgba(255,255,255,0.78)] text-[9px] leading-[11px] font-black tracking-[0.45px]"
                >
                  {recommendationCount !== null &&
                  recommendationCount > 0
                    ? `${recommendationCount} RECOMMANDATION${
                        recommendationCount > 1
                          ? "S"
                          : ""
                      }`
                    : "RECOMMANDATIONS"}
                </Text>
                <Text
                  className="mt-[2px] text-[#FFFFFF] text-[12px] leading-[16px] font-black"
                >
                  Voir mes recommandations
                </Text>
              </View>

              <View
                className="w-[30px] h-[30px] rounded-[15px] bg-[rgba(255,255,255,0.16)] items-center justify-center"
              >
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
              </View>
            </Pressable>
          </View>

          <View
            className="mt-[25px]"
          >
            <SectionHeading
              title="Activité récente"
              subtitle="Les dernières activités horodatées dans tes formations."
              count={
                recentActivity.length
              }
              icon={{
                ios: "clock.arrow.circlepath",
                android: "history",
                web: "history",
              }}
              tint="#2563EB"
              background="#EFF6FF"
            />

            {recentActivity.length >
            0 ? (
              <View
                className="rounded-[20px] border border-[#E7E2EB] bg-[#FFFFFF] px-[11px] py-[4px]"
              >
                {recentActivity.map(
                  (item, index) => (
                    <RecentActivityItem
                      key={item.id}
                      title={item.title}
                      description={
                        item.description
                      }
                      timestamp={
                        item.timestamp
                      }
                      isLast={
                        index ===
                        recentActivity.length -
                          1
                      }
                    />
                  ),
                )}
              </View>
            ) : (
              <EmptyState
                title="Aucune activité récente"
                description="Aucune activité horodatée n’est encore disponible pour ton compte."
                icon={{
                  ios: "clock.fill",
                  android: "schedule",
                  web: "schedule",
                }}
                tint="#2563EB"
                background="#EFF6FF"
              />
            )}
          </View>

          <View
            className="mt-[25px]"
          >
            <SectionHeading
              title="Progression par formation"
              subtitle="Avancement, activités terminées, score et dernière activité."
              count={
                filteredTrainings.length
              }
              icon={{
                ios: "chart.bar.doc.horizontal.fill",
                android: "analytics",
                web: "analytics",
              }}
              tint="#7C3AED"
              background="#F3EEFF"
            />

            {trainings.length >
            0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                className="mb-[14px]"
                contentContainerClassName="gap-[8px] pr-[18px]"
              >
                <FilterPill
                  label="Toutes"
                  count={
                    filterCounts.all
                  }
                  active={
                    filter === "ALL"
                  }
                  onPress={() =>
                    updateFilter(
                      "ALL",
                    )
                  }
                />

                <FilterPill
                  label="En cours"
                  count={
                    filterCounts.active
                  }
                  active={
                    filter ===
                    "IN_PROGRESS"
                  }
                  onPress={() =>
                    updateFilter(
                      "IN_PROGRESS",
                    )
                  }
                />

                <FilterPill
                  label="Terminées"
                  count={
                    filterCounts.completed
                  }
                  active={
                    filter ===
                    "COMPLETED"
                  }
                  onPress={() =>
                    updateFilter(
                      "COMPLETED",
                    )
                  }
                />

                <FilterPill
                  label="À reprendre"
                  count={
                    filterCounts.atRisk
                  }
                  active={
                    filter ===
                    "AT_RISK"
                  }
                  onPress={() =>
                    updateFilter(
                      "AT_RISK",
                    )
                  }
                />
              </ScrollView>
            ) : null}

            {trainings.length ===
            0 ? (
              <EmptyState
                title="Aucune formation à suivre"
                description="Ta progression apparaîtra ici dès qu’une formation sera disponible dans ton espace."
                icon={{
                  ios: "books.vertical.fill",
                  android: "library_books",
                  web: "library_books",
                }}
                tint="#7C3AED"
                background="#F3EEFF"
              />
            ) : filteredTrainings.length ===
              0 ? (
              <EmptyState
                title="Aucune formation dans ce filtre"
                description="Choisis un autre état pour afficher tes formations."
                icon={{
                  ios: "line.3.horizontal.decrease.circle",
                  android: "filter_alt_off",
                  web: "filter_alt_off",
                }}
                tint="#7C3AED"
                background="#F3EEFF"
              />
            ) : (
              <>
                <View
                  className="gap-[11px]"
                >
                  {visibleTrainings.map(
                    (training) => (
                      <LearnerProgressCard
                        key={training.id}
                        trainingTitle={
                          training.title
                        }
                        fallbackPercentage={
                          training.progressPercentage
                        }
                        progress={progressByTraining.get(
                          training.id,
                        )}
                        onOpenTraining={() =>
                          onOpenTraining(
                            training.id,
                          )
                        }
                      />
                    ),
                  )}
                </View>

                <TrainerPagination
                  firstVisible={
                    firstVisible
                  }
                  lastVisible={
                    lastVisible
                  }
                  total={
                    filteredTrainings.length
                  }
                  currentPage={
                    currentPage
                  }
                  totalPages={
                    totalPages
                  }
                  items={
                    paginationItems
                  }
                  onChangePage={
                    setPage
                  }
                />
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function SummaryCard({
    label,
    value,
    icon,
    tint,
    background,
  }: {
    label: string;
    value: string;
    icon: SymbolName;
    tint: string;
    background: string;
  }) {
    return (
      <View
        className="w-[48.5%] min-h-[88px] rounded-[17px] border border-[#E9E4EC] bg-[#FCFBFD] p-[10px]"
      >
        <View
          className="flex-row items-center justify-between"
        >
          <View
            className="w-[34px] h-[34px] rounded-[11px] items-center justify-center" style={{
                backgroundColor:
                  background,
              }}
          >
            <SymbolView
              name={icon}
              tintColor={tint}
              size={15}
              weight="bold"
            />
          </View>

          <Text
            className="text-[#111827] text-[21px] leading-[24px] font-black tracking-[-0.4px]"
          >
            {value}
          </Text>
        </View>

        <Text
          className="mt-[7px] text-[#667085] text-[11px] leading-[14px] font-extrabold"
        >
          {label}
        </Text>

        <View
          className="w-[24px] h-[3px] mt-[7px] rounded-full" style={{
              backgroundColor:
                tint,
            }}
        />
      </View>
    );
  }
}

function SectionHeading({
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
    <View
      className="mb-[12px] flex-row items-center"
    >
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

      <View
        className="flex-1 min-w-[0px]"
      >
        <Text
          className="text-[#111827] text-[20px] leading-[24px] font-black"
        >
          {title}
        </Text>

        <Text
          className="mt-[2px] text-[#667085] text-[12px] leading-[17px]"
        >
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

function RecentActivityItem({
  title,
  description,
  timestamp,
  isLast,
}: {
  title: string;
  description: string;
  timestamp: string;
  isLast: boolean;
}) {
  return (
    <View
      className="min-h-[92px] flex-row"
    >
      <View
        className="w-[34px] items-center"
      >
        <View
          className="w-[28px] h-[28px] mt-[13px] rounded-[10px] bg-[#F3EEFF] items-center justify-center"
        >
          <SymbolView
            name={{
              ios: "checkmark",
              android: "check",
              web: "check",
            }}
            tintColor="#7C3AED"
            size={10}
            weight="bold"
          />
        </View>

        {!isLast ? (
          <View
            className="flex-1 w-[2px] my-[4px] rounded-full bg-[#E9E4EC]"
          />
        ) : null}
      </View>

      <View
        className="flex-1 min-w-[0px] pt-[12px] pb-[12px] pl-[6px] border-b border-b-[#F0ECF2]"
      >
        <Text
          numberOfLines={2}
          className="text-[#111827] text-[14px] leading-[18px] font-black"
        >
          {title}
        </Text>

        <Text
          className="mt-[4px] text-[#667085] text-[11px] leading-[15px]"
        >
          {description}
        </Text>

        {timestamp ? (
          <View
            className="mt-[6px] flex-row items-center gap-[5px]"
          >
            <SymbolView
              name={{
                ios: "clock.fill",
                android: "schedule",
                web: "schedule",
              }}
              tintColor="#98A2B3"
              size={10}
              weight="bold"
            />

            <Text
              className="text-[#98A2B3] text-[10px] font-bold"
            >
              {timestamp}
            </Text>
          </View>
        ) : null}
      </View>
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
      accessibilityState={{
        selected: active,
      }}
      onPress={onPress}
      android_ripple={{
        color: "transparent",
      }}
      className="min-h-[40px] shrink-0 flex-row items-center justify-center rounded-[12px] border px-[13px]"
      style={{
        backgroundColor: active ? "#7C3AED" : "#FFFFFF",
        borderColor: active ? "#7C3AED" : "#E2DCE6",
      }}
    >
      <Text
        numberOfLines={1}
        className="text-[11px] font-black"
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
  const { theme } =
    useSmartTrainingTheme();

  return (
    <View
      className="min-h-[94px] rounded-[19px] border bg-[#FFFFFF] p-[12px] flex-row items-center" style={{
          borderColor:
            theme.colors.border,
        }}
    >
      <View
        className="w-[44px] h-[44px] rounded-[14px] mr-[10px] items-center justify-center" style={{
            backgroundColor:
              background,
          }}
      >
        <SymbolView
          name={icon}
          tintColor={tint}
          size={18}
          weight="bold"
        />
      </View>

      <View
        className="flex-1 min-w-[0px]"
      >
        <Text
          className="text-[#111827] text-[14px] leading-[18px] font-black"
        >
          {title}
        </Text>

        <Text
          className="mt-[3px] text-[#667085] text-[12px] leading-[17px]"
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
  const { theme } =
    useSmartTrainingTheme();

  if (total === 0) {
    return null;
  }

  return (
    <View
      className="mt-[14px] mb-[8px] rounded-[22px] border bg-[#FFFFFF] p-[12px]"
      style={{
        borderColor:
          theme.colors.border,
      }}
    >
      <View className="mb-[12px] flex-row items-center justify-between">
        <Text
          className="text-[13px] font-bold"
          style={{
            color:
              theme.colors.foregroundMuted,
          }}
        >
          {firstVisible}–{lastVisible} sur {total}
        </Text>

        <View className="rounded-full bg-[#F3EEFF] px-[10px] py-[4px]">
          <Text
            className="text-[12px] font-black"
            style={{
              color:
                theme.colors.accent,
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
            onChangePage(
              currentPage - 1,
            )
          }
        />

        {items.map((item, index) =>
          item === "ellipsis" ? (
            <View
              key={`ellipsis-${index}`}
              className="h-[36px] w-[24px] items-center justify-center"
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
          ) : (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`Page ${item}`}
              accessibilityState={{
                selected:
                  item === currentPage,
              }}
              onPress={() =>
                onChangePage(item)
              }
              android_ripple={{
                color: "transparent",
              }}
              className="h-[36px] w-[36px] items-center justify-center rounded-[12px] border"
              style={{
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
                className="text-[13px] font-black"
                style={{
                  color:
                    item === currentPage
                      ? "#FFFFFF"
                      : theme.colors.foregroundMuted,
                }}
              >
                {item}
              </Text>
            </Pressable>
          ),
        )}

        <PaginationArrow
          disabled={
            currentPage === totalPages
          }
          onPress={() =>
            onChangePage(
              currentPage + 1,
            )
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
  const { theme } =
    useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        previous
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
      className="h-[36px] w-[36px] items-center justify-center rounded-[12px] border"
      style={{
        borderColor:
          theme.colors.border,
        backgroundColor: disabled
          ? "#F8F6F3"
          : theme.colors.surface,
        opacity:
          disabled ? 0.45 : 1,
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

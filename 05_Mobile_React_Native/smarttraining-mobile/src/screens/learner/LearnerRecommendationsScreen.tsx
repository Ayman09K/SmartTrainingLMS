/* eslint-disable react-hooks/set-state-in-effect */
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
import LearnerRecommendationCard from "../../components/learner/LearnerRecommendationCard";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  acceptRecommendation,
  completeRecommendation,
  dismissRecommendation,
  getMyRecommendations,
} from "../../features/analytics/analyticsService";
import {
  getMyLearnerTrainings,
} from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
  RecommendationResponse,
  RecommendationStatus,
} from "../../types/analytics";
import { LearnerMyTraining } from "../../types/learnerTraining";

type Props = {
  onOpenTraining: (trainingId: number) => void;
  onBackHome: () => void;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];
type FilterKey = "ALL" | RecommendationStatus;
type PaginationItem = number | "ellipsis";

const PAGE_SIZE = 5;

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

export default function LearnerRecommendationsScreen({
  onOpenTraining,
  onBackHome,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [
    recommendations,
    setRecommendations,
  ] = useState<
    RecommendationResponse[]
  >([]);

  const [
    trainings,
    setTrainings,
  ] = useState<
    LearnerMyTraining[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    busyId,
    setBusyId,
  ] = useState<
    number | null
  >(null);

  const [error, setError] =
    useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState<FilterKey>("ALL");

  const [
    page,
    setPage,
  ] = useState(1);

  async function load() {
    const [
      recommendationData,
      trainingData,
    ] = await Promise.all([
      getMyRecommendations(),
      getMyLearnerTrainings(),
    ]);

    setRecommendations(
      recommendationData,
    );

    setTrainings(
      trainingData,
    );
  }

  useEffect(() => {
    let active = true;

    void Promise.all([
      getMyRecommendations(),
      getMyLearnerTrainings(),
    ])
      .then(
        ([
          recommendationData,
          trainingData,
        ]) => {
          if (!active) {
            return;
          }

          setRecommendations(
            recommendationData,
          );

          setTrainings(
            trainingData,
          );

          setError("");
        },
      )
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger tes recommandations. Réessaie dans quelques instants.",
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
        "Impossible d’actualiser tes recommandations.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function updateRecommendation(
    recommendationId: number,
    action:
      | "ACCEPT"
      | "COMPLETE"
      | "DISMISS",
  ) {
    setBusyId(
      recommendationId,
    );

    setError("");
    setSuccess("");

    try {
      const updated =
        action === "ACCEPT"
          ? await acceptRecommendation(
              recommendationId,
            )
          : action === "COMPLETE"
            ? await completeRecommendation(
                recommendationId,
              )
            : await dismissRecommendation(
                recommendationId,
              );

      setRecommendations(
        (current) =>
          current.map((item) =>
            item.id === updated.id
              ? updated
              : item,
          ),
      );

      setSuccess(
        action === "ACCEPT"
          ? "La recommandation est maintenant dans tes actions en cours."
          : action === "COMPLETE"
            ? "La recommandation a été marquée comme terminée."
            : "La recommandation a été ignorée.",
      );
    } catch {
      setError(
        "Cette recommandation n’a pas pu être mise à jour.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const trainingTitles =
    useMemo(
      () =>
        new Map(
          trainings.map(
            (training) => [
              training.id,
              training.title,
            ],
          ),
        ),
      [trainings],
    );

  const sortedRecommendations =
    useMemo(
      () =>
        [
          ...recommendations,
        ].sort(
          (
            left,
            right,
          ) => {
            const rank: Record<
              string,
              number
            > = {
              PROPOSED: 0,
              ACCEPTED: 1,
              COMPLETED: 2,
              DISMISSED: 3,
            };

            return (
              (rank[
                left.status
              ] ?? 9) -
              (rank[
                right.status
              ] ?? 9)
            );
          },
        ),
      [recommendations],
    );

  const statusCounts =
    useMemo(
      () => ({
        all:
          recommendations.length,
        proposed:
          recommendations.filter(
            (item) =>
              item.status ===
              "PROPOSED",
          ).length,
        accepted:
          recommendations.filter(
            (item) =>
              item.status ===
              "ACCEPTED",
          ).length,
        completed:
          recommendations.filter(
            (item) =>
              item.status ===
              "COMPLETED",
          ).length,
        dismissed:
          recommendations.filter(
            (item) =>
              item.status ===
              "DISMISSED",
          ).length,
      }),
      [recommendations],
    );

  const filteredRecommendations =
    useMemo(
      () =>
        filter === "ALL"
          ? sortedRecommendations
          : sortedRecommendations.filter(
              (item) =>
                item.status ===
                filter,
            ),
      [
        filter,
        sortedRecommendations,
      ],
    );

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredRecommendations.length /
        PAGE_SIZE,
    ),
  );

  const currentPage =
    Math.min(
      Math.max(page, 1),
      totalPages,
    );

  const pageStart =
    (currentPage - 1) *
    PAGE_SIZE;

  const visibleRecommendations =
    filteredRecommendations.slice(
      pageStart,
      pageStart + PAGE_SIZE,
    );

  const firstVisible =
    filteredRecommendations.length ===
    0
      ? 0
      : pageStart + 1;

  const lastVisible =
    Math.min(
      pageStart + PAGE_SIZE,
      filteredRecommendations.length,
    );

  const paginationItems =
    useMemo(
      () =>
        buildPagination(
          currentPage,
          totalPages,
        ),
      [
        currentPage,
        totalPages,
      ],
    );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function updateFilter(
    next: FilterKey,
  ) {
    setFilter(next);
    setPage(1);
  }

  if (loading) {
    return (
      <LoadingState message="Chargement de tes recommandations..." />
    );
  }

  return (
    <ScreenContainer
      style={{
      padding: 0,
      backgroundColor:
        "#F8F6F3",
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
        contentContainerClassName="grow px-[14px] pt-[12px] pb-[18px]"
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
              className="absolute w-[76px] h-[76px] rounded-[38px] right-[28px] top-[-34px] bg-[#E2D4FF] opacity-[0.82]"
            />

            <View
              className="flex-row items-center"
            >
              <View
                className="w-[48px] h-[48px] rounded-[15px] bg-[#FAF8F5] items-center justify-center"
              >
                <SymbolView
                  name={{
                    ios: "sparkles",
                    android: "auto_awesome",
                    web: "auto_awesome",
                  }}
                  tintColor="#7C3AED"
                  size={23}
                  weight="bold"
                />
              </View>

              <View
                className="ml-[10px] min-h-[28px] px-[11px] rounded-full bg-[#F3EEFF] items-center justify-center"
              >
                <Text
                  className="text-[#7C3AED] text-[11px] font-black tracking-[0.75px]"
                >
                  PERSONNALISÉ
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retour à l’accueil"
                onPress={onBackHome}
                android_ripple={{
                  color:
                    "transparent",
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
              Mes recommandations
            </Text>

            <Text
              className="mt-[5px] max-w-[92%] text-[#667085] text-[14px] leading-[20px]"
            >
              Retrouve les actions
              pédagogiques proposées
              pour avancer dans tes
              formations.
            </Text>

            <View
              className="mt-[16px] overflow-hidden rounded-[20px] border border-[#E9E4EC] bg-[#FCFBFD] py-[10px] px-[5px] flex-row"
            >
              <StatItem
                label="À consulter"
                value={
                  statusCounts.proposed
                }
                icon={{
                  ios: "lightbulb.fill",
                  android: "lightbulb",
                  web: "lightbulb",
                }}
                tint="#7C3AED"
                background="#F3EEFF"
                divider
              />

              <StatItem
                label="En cours"
                value={
                  statusCounts.accepted
                }
                icon={{
                  ios: "play.circle.fill",
                  android: "play_circle",
                  web: "play_circle",
                }}
                tint="#2563EB"
                background="#EFF6FF"
                divider
              />

              <StatItem
                label="Terminées"
                value={
                  statusCounts.completed
                }
                icon={{
                  ios: "checkmark.seal.fill",
                  android: "verified",
                  web: "verified",
                }}
                tint="#16A36A"
                background="#ECFDF3"
              />
            </View>
          </View>

          <View
            className="mt-[14px] min-h-[74px] rounded-[18px] border bg-[#FFFFFF] p-[11px] flex-row items-center" style={{
                borderColor:
                  theme.colors.border,
              }}
          >
            <View
              className="w-[40px] h-[40px] rounded-[13px] mr-[10px] bg-[#F3EEFF] items-center justify-center"
            >
              <SymbolView
                name={{
                  ios: "wand.and.stars",
                  android: "auto_awesome",
                  web: "auto_awesome",
                }}
                tintColor="#7C3AED"
                size={17}
                weight="bold"
              />
            </View>

            <View
              className="flex-1 min-w-[0px]"
            >
              <Text
                className="text-[#111827] text-[13px] leading-[17px] font-black"
              >
                Conseils adaptés à ton
                activité
              </Text>

              <Text
                className="mt-[3px] text-[#667085] text-[11px] leading-[16px]"
              >
                Tu peux suivre,
                terminer ou ignorer
                chaque recommandation
                selon ce qui t’est
                utile.
              </Text>
            </View>
          </View>

          {success ? (
            <View
              className="mt-[14px] min-h-[68px] rounded-[18px] border border-[#BBF7D0] bg-[#ECFDF3] p-[11px] flex-row items-center"
            >
              <View
                className="w-[40px] h-[40px] rounded-[13px] mr-[10px] bg-[#FFFFFF] items-center justify-center"
              >
                <SymbolView
                  name={{
                    ios: "checkmark.circle.fill",
                    android: "check_circle",
                    web: "check_circle",
                  }}
                  tintColor="#16A36A"
                  size={18}
                  weight="bold"
                />
              </View>

              <View
                className="flex-1 min-w-[0px]"
              >
                <Text
                  className="text-[#15803D] text-[13px] font-black"
                >
                  C’est fait
                </Text>

                <Text
                  className="mt-[3px] text-[#475467] text-[11px] leading-[16px]"
                >
                  {success}
                </Text>
              </View>
            </View>
          ) : null}

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
            className="mt-[25px]"
          >
            <SectionHeading
              title="Mes actions"
              subtitle="Priorise les recommandations qui peuvent t’aider à avancer."
              count={
                filteredRecommendations.length
              }
              icon={{
                ios: "checklist",
                android: "checklist",
                web: "checklist",
              }}
              tint="#7C3AED"
              background="#F3EEFF"
            />

            {recommendations.length >
            0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                className="mb-[14px]"
                contentContainerClassName="gap-[8px] pr-[8px]"
              >
                <FilterPill
                  label="Toutes"
                  count={
                    statusCounts.all
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
                  label="À consulter"
                  count={
                    statusCounts.proposed
                  }
                  active={
                    filter ===
                    "PROPOSED"
                  }
                  onPress={() =>
                    updateFilter(
                      "PROPOSED",
                    )
                  }
                />

                <FilterPill
                  label="En cours"
                  count={
                    statusCounts.accepted
                  }
                  active={
                    filter ===
                    "ACCEPTED"
                  }
                  onPress={() =>
                    updateFilter(
                      "ACCEPTED",
                    )
                  }
                />

                <FilterPill
                  label="Terminées"
                  count={
                    statusCounts.completed
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
                  label="Ignorées"
                  count={
                    statusCounts.dismissed
                  }
                  active={
                    filter ===
                    "DISMISSED"
                  }
                  onPress={() =>
                    updateFilter(
                      "DISMISSED",
                    )
                  }
                />
              </ScrollView>
            ) : null}

            {recommendations.length ===
            0 ? (
              <EmptyState
                title="Aucune recommandation pour le moment"
                description="Les conseils personnalisés apparaîtront ici lorsque ton activité permettra de proposer une prochaine action utile."
              />
            ) : filteredRecommendations.length ===
              0 ? (
              <EmptyState
                title="Aucune recommandation dans ce filtre"
                description="Choisis un autre état pour retrouver tes recommandations."
              />
            ) : (
              <>
                <View
                  className="gap-[11px]"
                >
                  {visibleRecommendations.map(
                    (
                      recommendation,
                    ) => (
                      <LearnerRecommendationCard
                        key={
                          recommendation.id
                        }
                        recommendation={
                          recommendation
                        }
                        trainingTitle={
                          trainingTitles.get(
                            recommendation.trainingId,
                          ) ||
                          "Formation associée"
                        }
                        busy={
                          busyId ===
                          recommendation.id
                        }
                        onAccept={() =>
                          void updateRecommendation(
                            recommendation.id,
                            "ACCEPT",
                          )
                        }
                        onComplete={() =>
                          void updateRecommendation(
                            recommendation.id,
                            "COMPLETE",
                          )
                        }
                        onDismiss={() =>
                          void updateRecommendation(
                            recommendation.id,
                            "DISMISS",
                          )
                        }
                        onOpenTraining={() =>
                          onOpenTraining(
                            recommendation.trainingId,
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
                    filteredRecommendations.length
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
}

function StatItem({
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

        <Text className="text-[#111827] text-[21px] leading-[24px] font-black tracking-[-0.5px]">
          {value}
        </Text>
      </View>

      <Text className="mt-[7px] text-[#667085] text-[11px] leading-[14px] font-extrabold">
        {label}
      </Text>

      <View
        className="w-[24px] h-[3px] mt-[7px] rounded-full" style={{
            backgroundColor: tint,
          }}
      />

      {divider ? (
        <View
          className="absolute top-[10px] right-[0px] bottom-[10px] w-[1px] bg-[#E9E4EC]"
        />
      ) : null}
    </View>
  );
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
        className="w-[42px] h-[42px] rounded-[14px] mr-[10px] items-center justify-center" style={{
            backgroundColor:
              background,
          }}
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
        className="min-w-[34px] h-[30px] px-[9px] rounded-full items-center justify-center" style={{
            backgroundColor:
              background,
          }}
      >
        <Text
          className="text-[11px] font-black" style={{
              color: tint,
            }}
        >
          {count}
        </Text>
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
      className={`min-h-[42px] px-[16px] rounded-full border border-[#E2DCE6] bg-[#FFFFFF] items-center justify-center ${(active ? "border-[#7C3AED] bg-[#7C3AED]" : "")}`}
    >
      <Text
        className={`text-[#475467] text-[12px] font-black ${(active ? "text-[#FFFFFF]" : "")}`}
      >
        {label} ({count})
      </Text>
    </Pressable>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { theme } =
    useSmartTrainingTheme();

  return (
    <View
      className="min-h-[102px] rounded-[19px] border bg-[#FFFFFF] p-[12px] flex-row items-center" style={{
          borderColor:
            theme.colors.border,
        }}
    >
      <View
        className="w-[44px] h-[44px] rounded-[14px] mr-[10px] bg-[#F3EEFF] items-center justify-center"
      >
        <SymbolView
          name={{
            ios: "sparkles",
            android: "auto_awesome",
            web: "auto_awesome",
          }}
          tintColor="#7C3AED"
          size={19}
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

  return (
    <View
      className="mt-[14px] mb-[2px] rounded-[22px] border bg-[#FFFFFF] p-[12px]" style={{
          borderColor:
            theme.colors.border,
        }}
    >
      <View
        className="mb-[12px] flex-row items-center justify-between"
      >
        <Text
          className="text-[13px] font-bold" style={{
              color:
                theme.colors.foregroundMuted,
            }}
        >
          {firstVisible}–{lastVisible} sur {total}
        </Text>

        <View
          className="rounded-full bg-[#F3EEFF] px-[10px] py-[4px]"
        >
          <Text
            className="text-[#7C3AED] text-[12px] font-black"
          >
            Page {currentPage} / {totalPages}
          </Text>
        </View>
      </View>

      <View
        className="flex-row items-center justify-center gap-[6px]"
      >
        <PaginationArrow
          previous
          disabled={
            currentPage === 1
          }
          onPress={() =>
            onChangePage(
              currentPage - 1,
            )
          }
        />

        {items.map(
          (item, index) =>
            item === "ellipsis" ? (
              <View
                key={`ellipsis-${index}`}
                className="w-[24px] h-[36px] items-center justify-center"
              >
                <Text
                  className="text-[#98A2B3] text-[15px] font-bold"
                >
                  …
                </Text>
              </View>
            ) : (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{
                  selected:
                    item ===
                    currentPage,
                }}
                onPress={() =>
                  onChangePage(item)
                }
                android_ripple={{
                  color:
                    "transparent",
                }}
                className={`w-[36px] h-[36px] rounded-[12px] border border-[#E7E2EB] bg-[#FFFFFF] items-center justify-center ${(item ===
                  currentPage ? "border-[#7C3AED] bg-[#7C3AED]" : "")}`}
              >
                <Text
                  className={`text-[#667085] text-[13px] font-black ${(item ===
                    currentPage ? "text-[#FFFFFF]" : "")}`}
                >
                  {item}
                </Text>
              </Pressable>
            ),
        )}

        <PaginationArrow
          disabled={
            currentPage ===
            totalPages
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled,
      }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{
        color: "transparent",
      }}
      className={`w-[36px] h-[36px] rounded-[12px] border border-[#E7E2EB] bg-[#FFFFFF] items-center justify-center ${(disabled ? "bg-[#F8F6F3] opacity-[0.45]" : "")}`}
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
            ? "#C8C2CB"
            : "#7C3AED"
        }
        size={13}
        weight="bold"
      />
    </Pressable>
  );
}

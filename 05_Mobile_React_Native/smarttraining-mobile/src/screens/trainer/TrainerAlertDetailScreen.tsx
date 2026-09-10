import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import {
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
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  getTrainerAlertDetail,
  ignoreTrainerAlert,
  markTrainerAlertInProgress,
  resolveTrainerAlert,
} from "../../features/trainer/trainerAlertService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerAlert,
  TrainerAlertDetailData,
  TrainerRiskFactor,
  TrainerRiskIndicator,
} from "../../types/trainerAlertMobile";

type Props = {
  alertId: number;
};

type SymbolName =
  ComponentProps<typeof SymbolView>["name"];

type Tone = {
  color: string;
  soft: string;
  icon: SymbolName;
};

function learnerName(
  data: TrainerAlertDetailData,
): string {
  const learner = data.learner;

  return (
    learner.fullName ||
    [learner.firstName, learner.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    learner.email
  );
}

function statusLabel(
  value?: string | null,
): string {
  const labels: Record<string, string> = {
    OPEN: "À traiter",
    IN_PROGRESS: "En cours",
    RESOLVED: "Résolue",
    IGNORED: "Ignorée",
  };

  return value
    ? labels[value] || "À examiner"
    : "À examiner";
}

function statusTone(
  value?: string | null,
): Tone {
  if (value === "OPEN") {
    return {
      color: "#B45309",
      soft: "#FFF4E5",
      icon: {
        ios: "exclamationmark.circle.fill",
        android: "error",
        web: "error",
      },
    };
  }

  if (value === "IN_PROGRESS") {
    return {
      color: "#2563EB",
      soft: "#EAF3FF",
      icon: {
        ios: "clock.fill",
        android: "schedule",
        web: "schedule",
      },
    };
  }

  if (value === "RESOLVED") {
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

  if (value === "IGNORED") {
    return {
      color: "#667085",
      soft: "#F2F4F7",
      icon: {
        ios: "eye.slash.fill",
        android: "visibility_off",
        web: "visibility_off",
      },
    };
  }

  return {
    color: "#7C3AED",
    soft: "#F1E9FF",
    icon: {
      ios: "bell.fill",
      android: "notifications",
      web: "notifications",
    },
  };
}

function severityLabel(
  value?: string | null,
): string {
  const labels: Record<string, string> = {
    LOW: "Faible",
    MEDIUM: "Moyenne",
    HIGH: "Élevée",
  };

  return value
    ? labels[value] || "À examiner"
    : "À examiner";
}

function severityTone(
  value?: string | null,
): Tone {
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
    color: "#667085",
    soft: "#F2F4F7",
    icon: {
      ios: "questionmark.circle.fill",
      android: "help",
      web: "help",
    },
  };
}

function typeLabel(
  value?: string | null,
): string {
  const labels: Record<string, string> = {
    LOW_PROGRESS: "Progression faible",
    LOW_SCORE: "Score à renforcer",
    INACTIVITY: "Inactivité",
    AI_RISK: "Signal d’accompagnement",
    QUIZ_FAILURE: "Quiz à reprendre",
    LOW_ACTIVITY: "Activité faible",
  };

  return value
    ? labels[value] || "Signal pédagogique"
    : "Signal pédagogique";
}

function typeIcon(
  value?: string | null,
): SymbolName {
  if (value === "LOW_PROGRESS") {
    return {
      ios: "chart.line.downtrend.xyaxis",
      android: "trending_down",
      web: "trending_down",
    };
  }

  if (value === "LOW_SCORE") {
    return {
      ios: "chart.bar.fill",
      android: "bar_chart",
      web: "bar_chart",
    };
  }

  if (value === "INACTIVITY") {
    return {
      ios: "clock.badge.exclamationmark.fill",
      android: "schedule",
      web: "schedule",
    };
  }

  if (value === "AI_RISK") {
    return {
      ios: "sparkles",
      android: "auto_awesome",
      web: "auto_awesome",
    };
  }

  if (value === "QUIZ_FAILURE") {
    return {
      ios: "questionmark.circle.fill",
      android: "quiz",
      web: "quiz",
    };
  }

  if (value === "LOW_ACTIVITY") {
    return {
      ios: "waveform.path.ecg",
      android: "monitoring",
      web: "monitoring",
    };
  }

  return {
    ios: "bell.fill",
    android: "notifications",
    web: "notifications",
  };
}

function formatDate(
  value?: string | null,
): string {
  if (!value) {
    return "Non disponible";
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

function insufficient(
  risk?: TrainerRiskIndicator | null,
): boolean {
  return (
    !risk ||
    risk.dataStatus === "INSUFFICIENT" ||
    risk.riskLevel === "DATA_INSUFFICIENT"
  );
}

function riskLabel(
  risk?: TrainerRiskIndicator | null,
): string {
  if (insufficient(risk)) {
    return "Données insuffisantes";
  }

  if (risk?.riskLevel === "HIGH") {
    return "Risque élevé";
  }

  if (risk?.riskLevel === "MEDIUM") {
    return "Risque moyen";
  }

  if (risk?.riskLevel === "LOW") {
    return "Risque faible";
  }

  return "Niveau à examiner";
}

function riskTone(
  risk?: TrainerRiskIndicator | null,
): Tone {
  if (insufficient(risk)) {
    return {
      color: "#667085",
      soft: "#F2F4F7",
      icon: {
        ios: "info.circle.fill",
        android: "info",
        web: "info",
      },
    };
  }

  if (risk?.riskLevel === "HIGH") {
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

  if (risk?.riskLevel === "MEDIUM") {
    return {
      color: "#B45309",
      soft: "#FFF4E5",
      icon: {
        ios: "chart.line.uptrend.xyaxis",
        android: "monitoring",
        web: "monitoring",
      },
    };
  }

  if (risk?.riskLevel === "LOW") {
    return {
      color: "#16845A",
      soft: "#EAFBF3",
      icon: {
        ios: "checkmark.shield.fill",
        android: "verified_user",
        web: "verified_user",
      },
    };
  }

  return {
    color: "#7C3AED",
    soft: "#F1E9FF",
    icon: {
      ios: "waveform.path.ecg",
      android: "monitoring",
      web: "monitoring",
    },
  };
}

function fallbackFactors(
  risk: TrainerRiskIndicator | null,
): TrainerRiskFactor[] {
  if (!risk) {
    return [];
  }

  if (risk.factors?.length) {
    return risk.factors;
  }

  return (risk.riskFactors ?? []).map(
    (value) => ({
      label: value,
      explanation: null,
    }),
  );
}

function percentValue(
  value?: number | null,
): string {
  return value == null ? "—" : `${value} %`;
}

function numberValue(
  value?: number | null,
): string {
  return value == null ? "—" : String(value);
}

export default function TrainerAlertDetailScreen({
  alertId,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [data, setData] =
    useState<TrainerAlertDetailData | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [acting, setActing] =
    useState(false);
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");

  async function load() {
    const loaded =
      await getTrainerAlertDetail(alertId);
    setData(loaded);
  }

  useEffect(() => {
    let active = true;

    if (
      !Number.isFinite(alertId) ||
      alertId <= 0
    ) {
      setError("Alerte invalide.");
      setLoading(false);

      return () => {
        active = false;
      };
    }

    void getTrainerAlertDetail(alertId)
      .then((loaded) => {
        if (active) {
          setData(loaded);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible d’ouvrir cette alerte ou elle ne fait pas partie de votre périmètre.",
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
  }, [alertId]);

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError(
        "Impossible d’actualiser cette alerte.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function act(
    action:
      | "IN_PROGRESS"
      | "RESOLVE"
      | "IGNORE",
  ) {
    if (!data || acting) {
      return;
    }

    setActing(true);
    setError("");
    setSuccess("");

    try {
      let updated: TrainerAlert;

      if (action === "IN_PROGRESS") {
        updated =
          await markTrainerAlertInProgress(
            data.alert.id,
          );
        setSuccess(
          "L’alerte est maintenant prise en charge.",
        );
      } else if (action === "RESOLVE") {
        updated =
          await resolveTrainerAlert(
            data.alert.id,
          );
        setSuccess(
          "L’alerte a été résolue.",
        );
      } else {
        updated =
          await ignoreTrainerAlert(
            data.alert.id,
          );
        setSuccess(
          "L’alerte a été ignorée.",
        );
      }

      setData({
        ...data,
        alert: updated,
      });
    } catch {
      setError(
        "L’action n’a pas pu être enregistrée.",
      );
    } finally {
      setActing(false);
    }
  }

  const factors = useMemo(
    () =>
      fallbackFactors(data?.risk ?? null),
    [data?.risk],
  );

  if (loading) {
    return (
      <LoadingState message="Ouverture de l’alerte..." />
    );
  }

  if (!data) {
    return (
      <ScreenContainer>
        <View className="mx-auto w-full max-w-[720px] pt-6">
          <ErrorMessage
            message={
              error ||
              "Alerte indisponible."
            }
            onRetry={() => void refresh()}
          />
        </View>
      </ScreenContainer>
    );
  }

  const riskIsInsufficient =
    insufficient(data.risk);
  const alertStatus =
    statusTone(data.alert.status);
  const alertSeverity =
    severityTone(data.alert.severity);
  const riskVisual =
    riskTone(data.risk);

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{
        padding: 0,
        backgroundColor: "#F8F6F3",
      }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: 28,
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
          {/* ALERT HERO */}
          <View
            className="mt-4 overflow-hidden rounded-[22px] border bg-white"
            style={{
              borderColor: "#E5DFE8",
              shadowColor: "#0F172A",
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.045,
              shadowRadius: 9,
              elevation: 1,
            }}
          >
            <View className="p-4">
              <View className="flex-row items-start">
                <View
                  className="h-12 w-12 items-center justify-center rounded-[15px]"
                  style={{
                    backgroundColor:
                      alertStatus.soft,
                  }}
                >
                  <SymbolView
                    name={typeIcon(
                      data.alert.alertType,
                    )}
                    tintColor={
                      alertStatus.color
                    }
                    size={20}
                    weight="bold"
                  />
                </View>

                <View className="ml-3 min-w-0 flex-1">
                  <View className="flex-row flex-wrap gap-1.5">
                    <ToneBadge
                      text={statusLabel(
                        data.alert.status,
                      )}
                      tone={alertStatus}
                    />

                    <ToneBadge
                      text={`Priorité de l’alerte : ${severityLabel(
                        data.alert.severity,
                      )}`}
                      tone={alertSeverity}
                    />
                  </View>

                  <Text
                    className="mt-2.5 text-[20px] font-black leading-[25px]"
                    style={{
                      color:
                        theme.colors
                          .foreground,
                    }}
                  >
                    {data.alert.title ||
                      "Alerte pédagogique"}
                  </Text>

                  <View className="mt-2 flex-row items-center">
                    <SymbolView
                      name={{
                        ios: "waveform.path.ecg",
                        android:
                          "monitoring",
                        web: "monitoring",
                      }}
                      tintColor="#7C3AED"
                      size={12}
                    />

                    <Text
                      className="ml-1.5 text-[12px] font-black"
                      style={{
                        color: "#7C3AED",
                      }}
                    >
                      {typeLabel(
                        data.alert
                          .alertType,
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              {data.alert.message ? (
                <Text
                  className="mt-3 text-[13px] leading-[17px]"
                  style={{
                    color:
                      theme.colors
                        .foregroundMuted,
                  }}
                >
                  {data.alert.message}
                </Text>
              ) : null}
            </View>

            <View
              className="flex-row items-center border-t px-4 py-2.5"
              style={{
                borderTopColor:
                  "#EEE9F0",
                backgroundColor:
                  "#FCFBFD",
              }}
            >
              <SymbolView
                name={{
                  ios: "calendar",
                  android:
                    "calendar_today",
                  web: "calendar_today",
                }}
                tintColor={
                  theme.colors
                    .foregroundSubtle
                }
                size={11}
              />

              <Text
                className="ml-1.5 text-[11px]"
                style={{
                  color:
                    theme.colors
                      .foregroundMuted,
                }}
              >
                Créée le{" "}
                {formatDate(
                  data.alert.createdAt,
                )}
              </Text>
            </View>
          </View>

          {/* SUCCESS / ERROR */}
          {success ? (
            <View
              className="mt-3 flex-row items-center rounded-[15px] px-3 py-2.5"
              style={{
                backgroundColor:
                  "#EAFBF3",
              }}
            >
              <SymbolView
                name={{
                  ios: "checkmark.circle.fill",
                  android:
                    "check_circle",
                  web: "check_circle",
                }}
                tintColor="#16845A"
                size={15}
                weight="bold"
              />

              <Text
                className="ml-2 flex-1 text-[12px] font-bold"
                style={{
                  color: "#16845A",
                }}
              >
                {success}
              </Text>
            </View>
          ) : null}

          {error ? (
            <View className="mt-3">
              <ErrorMessage
                message={error}
                onRetry={() =>
                  void refresh()
                }
              />
            </View>
          ) : null}

          {/* CONTEXT */}
          <SectionTitle
            eyebrow="Contexte"
            title="Apprenant et formation"
            icon={{
              ios: "person.crop.circle.fill",
              android: "person",
              web: "person",
            }}
          />

          <View
            className="overflow-hidden rounded-[20px] border bg-white"
            style={{
              borderColor: "#E5DFE8",
            }}
          >
            <ContextRow
              icon={{
                ios: "person.fill",
                android: "person",
                web: "person",
              }}
              label="Apprenant"
              value={learnerName(data)}
            />

            <View
              className="mx-3 h-px"
              style={{
                backgroundColor:
                  "#EEE9F0",
              }}
            />

            <ContextRow
              icon={{
                ios: "graduationcap.fill",
                android: "school",
                web: "school",
              }}
              label="Formation"
              value={
                data.training.title
              }
            />
          </View>

          {/* RISK */}
          <SectionTitle
            eyebrow="Analyse"
            title="Lecture du risque"
            icon={{
              ios: "waveform.path.ecg",
              android: "monitoring",
              web: "monitoring",
            }}
          />

          <View
            className="overflow-hidden rounded-[20px] border bg-white"
            style={{
              borderColor: "#E5DFE8",
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.035,
              shadowRadius: 7,
              elevation: 1,
            }}
          >
            <View
              className="h-1 w-full"
              style={{
                backgroundColor: riskVisual.color,
              }}
            />

            <View className="p-4">
              <View className="flex-row items-center">
                <View
                  className="h-10 w-10 items-center justify-center rounded-[13px]"
                  style={{
                    backgroundColor:
                      riskVisual.soft,
                  }}
                >
                  <SymbolView
                    name={riskVisual.icon}
                    tintColor={
                      riskVisual.color
                    }
                    size={17}
                    weight="bold"
                  />
                </View>

                <View className="ml-3 min-w-0 flex-1">
                  <Text
                    className="text-[11px] font-black uppercase tracking-[0.5px]"
                    style={{
                      color: theme.colors.foregroundSubtle,
                    }}
                  >
                    Niveau de risque
                  </Text>

                  <Text
                    className="mt-0.5 text-[16px] font-black"
                    style={{
                      color: riskVisual.color,
                    }}
                  >
                    {riskLabel(data.risk)}
                  </Text>

                  <Text
                    numberOfLines={2}
                    className="mt-1 text-[10px] leading-[12px]"
                    style={{
                      color: theme.colors.foregroundMuted,
                    }}
                  >
                    {learnerName(data)} · {data.training.title}
                  </Text>
                </View>
              </View>

              {riskIsInsufficient ? (
                <Text
                  className="mt-3 text-[12px] leading-[16px]"
                  style={{
                    color:
                      theme.colors
                        .foregroundMuted,
                  }}
                >
                  Il n’y a pas encore assez d’activité pour conclure à un niveau de risque. Continuez le suivi sans classer cet apprenant en risque élevé.
                </Text>
              ) : (
                <View className="mt-4 flex-row flex-wrap gap-2">
                  <Metric
                    icon={{
                      ios: "chart.line.uptrend.xyaxis",
                      android:
                        "trending_up",
                      web: "trending_up",
                    }}
                    label="Progression"
                    value={percentValue(
                      data.risk
                        ?.averageProgress,
                    )}
                  />

                  <Metric
                    icon={{
                      ios: "chart.bar.fill",
                      android:
                        "bar_chart",
                      web: "bar_chart",
                    }}
                    label="Score moyen"
                    value={percentValue(
                      data.risk
                        ?.averageScore,
                    )}
                  />

                  <Metric
                    icon={{
                      ios: "bolt.fill",
                      android:
                        "bolt",
                      web: "bolt",
                    }}
                    label="Activités"
                    value={numberValue(
                      data.risk
                        ?.totalEvents,
                    )}
                  />

                  <Metric
                    icon={{
                      ios: "questionmark.bubble.fill",
                      android:
                        "help",
                      web: "help",
                    }}
                    label="Demandes d’aide"
                    value={numberValue(
                      data.risk
                        ?.helpRequests,
                    )}
                  />
                </View>
              )}
            </View>
          </View>

          {/* FACTORS */}
          <SectionTitle
            eyebrow="Explication"
            title="Facteurs observés"
            icon={{
              ios: "list.bullet.clipboard.fill",
              android:
                "fact_check",
              web: "fact_check",
            }}
          />

          {factors.length === 0 ? (
            <View
              className="rounded-[18px] border bg-white px-4 py-4"
              style={{
                borderColor: "#E5DFE8",
              }}
            >
              <View className="flex-row items-center">
                <View
                  className="h-9 w-9 items-center justify-center rounded-[11px]"
                  style={{
                    backgroundColor:
                      "#F2F4F7",
                  }}
                >
                  <SymbolView
                    name={{
                      ios: "info.circle.fill",
                      android: "info",
                      web: "info",
                    }}
                    tintColor="#667085"
                    size={15}
                  />
                </View>

                <Text
                  className="ml-3 flex-1 text-[12px] leading-[15px]"
                  style={{
                    color:
                      theme.colors
                        .foregroundMuted,
                  }}
                >
                  Aucun facteur explicable supplémentaire n’est disponible.
                </Text>
              </View>
            </View>
          ) : (
            <View className="gap-2">
              {factors.map(
                (factor, index) => (
                  <View
                    key={`${
                      factor.type ??
                      factor.label ??
                      "facteur"
                    }-${index}`}
                    className="rounded-[18px] border bg-white p-3.5"
                    style={{
                      borderColor:
                        "#E5DFE8",
                    }}
                  >
                    <View className="flex-row items-start">
                      <View
                        className="h-8 w-8 items-center justify-center rounded-[10px]"
                        style={{
                          backgroundColor:
                            "#F1E9FF",
                        }}
                      >
                        <Text
                          className="text-[12px] font-black"
                          style={{
                            color:
                              "#7C3AED",
                          }}
                        >
                          {index + 1}
                        </Text>
                      </View>

                      <View className="ml-2.5 min-w-0 flex-1">
                        <Text
                          className="text-[14px] font-black leading-[16px]"
                          style={{
                            color:
                              theme
                                .colors
                                .foreground,
                          }}
                        >
                          {factor.label ||
                            "Facteur observé"}
                        </Text>

                        {factor.explanation ? (
                          <Text
                            className="mt-1 text-[12px] leading-[15px]"
                            style={{
                              color:
                                theme
                                  .colors
                                  .foregroundMuted,
                            }}
                          >
                            {
                              factor.explanation
                            }
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ),
              )}
            </View>
          )}

          {/* RECOMMENDATIONS */}
          {(data.risk?.recommendations
            ?.length ?? 0) > 0 ? (
            <>
              <SectionTitle
                eyebrow="Accompagnement"
                title="Pistes recommandées"
                icon={{
                  ios: "lightbulb.fill",
                  android:
                    "lightbulb",
                  web: "lightbulb",
                }}
              />

              <View className="gap-2">
                {data.risk?.recommendations?.map(
                  (
                    recommendation,
                    index,
                  ) => (
                    <View
                      key={`${recommendation}-${index}`}
                      className="flex-row items-start rounded-[16px] border bg-white px-3 py-3"
                      style={{
                        borderColor: "#E6D8FF",
                      }}
                    >
                      <View
                        className="h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
                        style={{
                          backgroundColor: "#F1E9FF",
                        }}
                      >
                        <Text
                          className="text-[12px] font-black"
                          style={{
                            color: "#7C3AED",
                          }}
                        >
                          {index + 1}
                        </Text>
                      </View>

                      <Text
                        className="ml-3 min-w-0 flex-1 text-[12px] leading-[16px]"
                        style={{
                          color: theme.colors.foregroundMuted,
                        }}
                      >
                        {recommendation}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            </>
          ) : null}

          {/* ACTIONS */}
          <SectionTitle
            eyebrow="Traitement"
            title="Prise en charge"
            icon={{
              ios: "checklist",
              android:
                "task_alt",
              web: "task_alt",
            }}
          />

          {data.alert.status === "OPEN" ||
          data.alert.status ===
            "IN_PROGRESS" ? (
            <View
              className="rounded-[20px] border bg-white p-3"
              style={{
                borderColor: "#E5DFE8",
              }}
            >
              <Text
                className="mb-3 text-[12px] leading-[15px]"
                style={{
                  color:
                    theme.colors
                      .foregroundMuted,
                }}
              >
                Enregistrez l’état réel de votre prise en charge.
              </Text>

              {data.alert.status === "OPEN" ? (
                <ActionButton
                  title={
                    acting
                      ? "Enregistrement..."
                      : "Prendre en charge"
                  }
                  icon={{
                    ios: "hand.raised.fill",
                    android: "front_hand",
                    web: "front_hand",
                  }}
                  tone="primary"
                  disabled={acting}
                  onPress={() =>
                    void act("IN_PROGRESS")
                  }
                />
              ) : null}

              <View
                className={
                  data.alert.status === "OPEN"
                    ? "mt-3 flex-row gap-3"
                    : "flex-row gap-3"
                }
              >
                <ActionButton
                  title={
                    acting
                      ? "Enregistrement..."
                      : "Résoudre"
                  }
                  icon={{
                    ios: "checkmark.circle.fill",
                    android: "check_circle",
                    web: "check_circle",
                  }}
                  tone="success"
                  compact
                  disabled={acting}
                  onPress={() =>
                    void act("RESOLVE")
                  }
                />

                <ActionButton
                  title={
                    acting
                      ? "Enregistrement..."
                      : "Ignorer"
                  }
                  icon={{
                    ios: "eye.slash.fill",
                    android: "visibility_off",
                    web: "visibility_off",
                  }}
                  tone="neutral"
                  compact
                  disabled={acting}
                  onPress={() =>
                    void act("IGNORE")
                  }
                />
              </View>
            </View>
          ) : (
            <View
              className="flex-row items-center rounded-[18px] border px-3.5 py-3"
              style={{
                backgroundColor:
                  alertStatus.soft,
                borderColor:
                  alertStatus.color,
              }}
            >
              <View
                className="h-9 w-9 items-center justify-center rounded-[11px]"
                style={{
                  backgroundColor:
                    "#FFFFFF",
                }}
              >
                <SymbolView
                  name={alertStatus.icon}
                  tintColor={
                    alertStatus.color
                  }
                  size={15}
                  weight="bold"
                />
              </View>

              <View className="ml-3 min-w-0 flex-1">
                <Text
                  className="text-[13px] font-black"
                  style={{
                    color:
                      alertStatus.color,
                  }}
                >
                  {statusLabel(
                    data.alert.status,
                  )}
                </Text>

                <Text
                  className="mt-0.5 text-[11px] leading-[14px]"
                  style={{
                    color:
                      theme.colors
                        .foregroundMuted,
                  }}
                >
                  Cette alerte est clôturée pour le suivi courant.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function ToneBadge({
    text,
    tone,
  }: {
    text: string;
    tone: Tone;
  }) {
    return (
      <View
        className="flex-row items-center rounded-full px-2 py-1"
        style={{
          backgroundColor: tone.soft,
        }}
      >
        <SymbolView
          name={tone.icon}
          tintColor={tone.color}
          size={9}
          weight="bold"
        />

        <Text
          className="ml-1 text-[10px] font-black"
          style={{
            color: tone.color,
          }}
        >
          {text}
        </Text>
      </View>
    );
  }

  function SectionTitle({
    eyebrow,
    title,
    icon,
  }: {
    eyebrow: string;
    title: string;
    icon: SymbolName;
  }) {
    return (
      <View className="mb-2.5 mt-5 flex-row items-center">
        <View
          className="h-9 w-9 items-center justify-center rounded-[11px]"
          style={{
            backgroundColor: "#F1E9FF",
          }}
        >
          <SymbolView
            name={icon}
            tintColor="#7C3AED"
            size={14}
            weight="bold"
          />
        </View>

        <View className="ml-2.5 min-w-0 flex-1">
          <Text
            className="text-[10px] font-black uppercase tracking-[0.6px]"
            style={{
              color:
                theme.colors
                  .foregroundSubtle,
            }}
          >
            {eyebrow}
          </Text>

          <Text
            className="mt-0.5 text-[16px] font-black"
            style={{
              color:
                theme.colors.foreground,
            }}
          >
            {title}
          </Text>
        </View>
      </View>
    );
  }

  function ContextRow({
    icon,
    label,
    value,
  }: {
    icon: SymbolName;
    label: string;
    value: string;
  }) {
    return (
      <View className="flex-row items-center px-3.5 py-3">
        <View
          className="h-9 w-9 items-center justify-center rounded-[11px]"
          style={{
            backgroundColor: "#F7F3FA",
          }}
        >
          <SymbolView
            name={icon}
            tintColor="#7C3AED"
            size={14}
            weight="bold"
          />
        </View>

        <View className="ml-3 min-w-0 flex-1">
          <Text
            className="text-[10px] font-black uppercase tracking-[0.5px]"
            style={{
              color:
                theme.colors
                  .foregroundSubtle,
            }}
          >
            {label}
          </Text>

          <Text
            numberOfLines={2}
            className="mt-0.5 text-[13px] font-black leading-[15px]"
            style={{
              color:
                theme.colors.foreground,
            }}
          >
            {value}
          </Text>
        </View>
      </View>
    );
  }

  function Metric({
    icon,
    label,
    value,
  }: {
    icon: SymbolName;
    label: string;
    value: string;
  }) {
    return (
      <View
        className="min-w-[46%] flex-1 rounded-[14px] px-3 py-2.5"
        style={{
          backgroundColor: "#F8F6F9",
        }}
      >
        <View className="flex-row items-center">
          <SymbolView
            name={icon}
            tintColor="#7C3AED"
            size={11}
            weight="bold"
          />

          <Text
            className="ml-1.5 text-[10px] font-bold"
            style={{
              color:
                theme.colors
                  .foregroundMuted,
            }}
          >
            {label}
          </Text>
        </View>

        <Text
          className="mt-1.5 text-[17px] font-black"
          style={{
            color:
              theme.colors.foreground,
          }}
        >
          {value}
        </Text>
      </View>
    );
  }

  function ActionButton({
    title,
    icon,
    tone,
    compact = false,
    disabled,
    onPress,
  }: {
    title: string;
    icon: SymbolName;
    tone:
      | "primary"
      | "success"
      | "neutral";
    compact?: boolean;
    disabled: boolean;
    onPress: () => void;
  }) {
    const palette =
      tone === "success"
        ? {
            background: "#EAFBF3",
            border: "#BDEED6",
            color: "#16845A",
          }
        : tone === "neutral"
          ? {
              background: "#F5F3F6",
              border: "#E3DEE6",
              color: "#667085",
            }
          : {
              background:
                theme.colors.accent,
              border:
                theme.colors.accent,
              color:
                theme.colors
                  .accentForeground,
            };

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
        className={`h-[54px] flex-row items-center justify-center rounded-[15px] border px-4 ${
          compact ? "min-w-0 flex-1" : "w-full"
        }`}
        style={{
          backgroundColor:
            palette.background,
          borderColor: palette.border,
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <SymbolView
          name={icon}
          tintColor={palette.color}
          size={16}
          weight="bold"
        />

        <Text
          numberOfLines={1}
          className="ml-2 text-[14px] font-black"
          style={{
            color: palette.color,
          }}
        >
          {title}
        </Text>
      </Pressable>
    );
  }
}

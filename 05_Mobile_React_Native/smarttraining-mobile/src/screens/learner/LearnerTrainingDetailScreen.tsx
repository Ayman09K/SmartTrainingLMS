/* eslint-disable react-hooks/set-state-in-effect */
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { SymbolView } from "expo-symbols";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import { Text } from "../../components/nativewindui/Text";
import {
  getPublishedQuizzesByTraining,
} from "../../features/evaluation/evaluationService";
import { selfUnenroll } from "../../features/trainings/catalogService";
import {
  getMyLearnerTrainingContent,
} from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  LearnerTrainingContent,
} from "../../types/learnerTraining";

type Props = {
  trainingId: number;
  onOpenCourse: (replay?: boolean) => void;
  onOpenQuizzes: () => void;
  onBack: () => void;
};

type DeadlinePresentation = {
  label: string;
  detail: string;
  tone: "info" | "warning" | "danger";
};

type SymbolName =
  ComponentProps<typeof SymbolView>["name"];

function formatDeadline(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function deadlinePresentation(
  dueAt?: string | null,
  completed = false,
): DeadlinePresentation | null {
  if (!dueAt) {
    return null;
  }

  const due = new Date(dueAt);

  if (Number.isNaN(due.getTime())) {
    return null;
  }

  const detail = formatDeadline(dueAt);

  if (completed) {
    return {
      label: "Échéance",
      detail,
      tone: "info",
    };
  }

  const remainingMs = due.getTime() - Date.now();

  if (remainingMs < 0) {
    return {
      label: "Échéance dépassée",
      detail,
      tone: "danger",
    };
  }

  const remainingDays = Math.ceil(
    remainingMs / (24 * 60 * 60 * 1000),
  );

  if (remainingDays <= 3) {
    return {
      label:
        remainingDays <= 1
          ? "Échéance dans moins de 24 h"
          : `Échéance dans ${remainingDays} jours`,
      detail,
      tone: "warning",
    };
  }

  return {
    label: "À terminer avant",
    detail,
    tone: "info",
  };
}

function levelLabel(level?: string | null): string {
  if (level === "DEBUTANT") return "Débutant";
  if (level === "INTERMEDIAIRE") return "Intermédiaire";
  if (level === "AVANCE") return "Avancé";

  return level || "Niveau non indiqué";
}

function clampProgress(value?: number | null): number {
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

function MetricCard({
  label,
  value,
  icon,
  tint,
  background,
}: {
  label: string;
  value: string | number;
  icon: SymbolName;
  tint: string;
  background: string;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      className="w-[31.7%] rounded-[18px] border bg-white px-[10px] py-[10px]"
      style={{
        minHeight: 102,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.03,
        shadowRadius: 6,
        shadowOffset: {
          width: 0,
          height: 3,
        },
        elevation: 1,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View
          className="h-[36px] w-[36px] items-center justify-center rounded-[12px]"
          style={{ backgroundColor: background }}
        >
          <SymbolView
            name={icon}
            tintColor={tint}
            size={16}
            weight="bold"
          />
        </View>

        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          className="ml-[4px] text-[19px] font-black leading-[23px]"
          style={{ color: theme.colors.foreground }}
        >
          {value}
        </Text>
      </View>

      <Text
        numberOfLines={2}
        className="mt-[13px] text-[10px] font-extrabold leading-[13px]"
        style={{ color: theme.colors.foregroundMuted }}
      >
        {label}
      </Text>
    </View>
  );
}

function InfoPanel({
  title,
  text,
  icon,
  tint,
  background,
}: {
  title: string;
  text: string;
  icon: SymbolName;
  tint: string;
  background: string;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      className="rounded-[20px] border bg-white p-[13px]"
      style={{
        borderColor: theme.colors.border,
      }}
    >
      <View className="flex-row items-center">
        <View
          className="h-[38px] w-[38px] items-center justify-center rounded-[13px]"
          style={{ backgroundColor: background }}
        >
          <SymbolView
            name={icon}
            tintColor={tint}
            size={15}
            weight="bold"
          />
        </View>

        <Text
          className="ml-[10px] text-[14px] font-black"
          style={{ color: theme.colors.foreground }}
        >
          {title}
        </Text>
      </View>

      <Text
        className="mt-[9px] text-[12px] leading-[19px]"
        style={{ color: theme.colors.foregroundMuted }}
      >
        {text}
      </Text>
    </View>
  );
}

export default function LearnerTrainingDetailScreen({
  trainingId,
  onOpenCourse,
  onOpenQuizzes,
  onBack,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [training, setTraining] =
    useState<LearnerTrainingContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasPublishedQuiz, setHasPublishedQuiz] =
    useState(false);
  const [unenrollBusy, setUnenrollBusy] =
    useState(false);

  useEffect(() => {
    let active = true;

    void getMyLearnerTrainingContent(trainingId)
      .then((data) => {
        if (active) {
          setTraining(data);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Cette formation ne peut pas être chargée depuis ton espace apprenant.",
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
  }, [trainingId]);

  async function performSelfUnenroll() {
    if (
      !training?.canSelfUnenroll ||
      unenrollBusy
    ) {
      return;
    }

    setUnenrollBusy(true);
    setError("");

    try {
      await selfUnenroll(trainingId);
      onBack();
    } catch {
      setError(
        "La désinscription n'a pas pu etre effectuee. Reessaie dans quelques instants.",
      );
    } finally {
      setUnenrollBusy(false);
    }
  }

  function confirmSelfUnenroll() {
    if (
      !training?.canSelfUnenroll ||
      unenrollBusy
    ) {
      return;
    }

    Alert.alert(
      "Se désinscrire ?",
      "Tu perdras l'acces a la formation, mais ta progression, tes resultats et tes certificats resteront conserves. Tu pourras te reinscrire plus tard.",
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Se désinscrire",
          style: "destructive",
          onPress: () =>
            void performSelfUnenroll(),
        },
      ],
    );
  }

  useEffect(() => {
    let active = true;

    setHasPublishedQuiz(false);

    void getPublishedQuizzesByTraining(
      trainingId,
    )
      .then((items) => {
        if (active) {
          setHasPublishedQuiz(
            items.length > 0,
          );
        }
      })
      .catch(() => {
        if (active) {
          setHasPublishedQuiz(false);
        }
      });

    return () => {
      active = false;
    };
  }, [trainingId]);

  if (loading) {
    return (
      <LoadingState message="Chargement de la formation..." />
    );
  }

  if (!training) {
    return (
      <ScreenContainer style={{ padding: 0 }}>
        <View className="flex-1 px-[14px] pt-[12px]">
          <View
            className="rounded-[20px] border bg-white p-[14px]"
            style={{
              borderColor: theme.colors.border,
            }}
          >
            <ErrorMessage
              message={
                error ||
                "Formation indisponible."
              }
            />

            <Pressable
              accessibilityRole="button"
              onPress={onBack}
              android_ripple={{
                color: "transparent",
              }}
              className="mt-[12px] min-h-[46px] flex-row items-center justify-center rounded-[13px] border bg-white px-[12px]"
              style={{
                borderColor:
                  theme.colors.border,
              }}
            >
              <SymbolView
                name={{
                  ios: "chevron.left",
                  android: "arrow_back",
                  web: "arrow_back",
                }}
                tintColor={
                  theme.colors.accent
                }
                size={13}
                weight="bold"
              />

              <Text
                className="ml-[7px] text-[11px] font-black"
                style={{
                  color:
                    theme.colors.foreground,
                }}
              >
                Retour
              </Text>
            </Pressable>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const progress = clampProgress(
    training.progressPercentage,
  );

  const completed =
    training.enrollmentStatus ===
      "COMPLETED" || progress >= 100;

  const deadline =
    deadlinePresentation(
      training.dueAt,
      completed,
    );

  const deadlineColor = deadline
    ? deadline.tone === "danger"
      ? theme.colors.danger
      : deadline.tone === "warning"
        ? theme.colors.warning
        : theme.colors.info
    : theme.colors.info;

  const lessonCount =
    training.modules.reduce(
      (total, module) =>
        total + module.lessons.length,
      0,
    );

  const resourceCount =
    training.modules.reduce(
      (total, module) =>
        total +
        module.lessons.reduce(
          (lessonTotal, lesson) =>
            lessonTotal +
            lesson.resources.length,
          0,
        ),
      0,
    );

  return (
    <ScreenContainer style={{ padding: 0 }}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="grow px-[14px] pt-[10px]"
        contentContainerStyle={{
          paddingBottom: Math.max(
            24,
            theme.shape.cardPadding * 1.5,
          ),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-[760px] self-center">
          {error ? (
            <View className="mb-[10px]">
              <ErrorMessage message={error} />
            </View>
          ) : null}

          {/* HERO */}
          <View
            className="relative overflow-hidden rounded-[26px] border bg-white p-[15px]"
            style={{
              borderColor:
                theme.colors.border,
              shadowColor:
                theme.colors.shadow,
              shadowOpacity: 0.05,
              shadowRadius: 11,
              shadowOffset: {
                width: 0,
                height: 4,
              },
              elevation: 2,
            }}
          >
            <View className="absolute -right-[58px] -top-[70px] h-[170px] w-[170px] rounded-full bg-[#F3EEFF]" />
            <View className="absolute right-[12px] top-[-44px] h-[86px] w-[86px] rounded-full bg-[#E5D8FF]/70" />

            <View className="flex-row items-center">
              <View className="h-[48px] w-[48px] items-center justify-center rounded-[15px] bg-[#F3EEFF]">
                <SymbolView
                  name={{
                    ios: "book.pages.fill",
                    android: "menu_book",
                    web: "menu_book",
                  }}
                  tintColor="#7C3AED"
                  size={20}
                  weight="bold"
                />
              </View>

              <View className="ml-[10px] rounded-full bg-[#F3EEFF] px-[11px] py-[6px]">
                <Text className="text-[9px] font-black uppercase tracking-[0.65px] text-[#7C3AED]">
                  Formation
                </Text>
              </View>
            </View>

            <Text
              className="mt-[14px] max-w-[94%] text-[25px] font-black leading-[31px] tracking-[-0.5px]"
              style={{
                color:
                  theme.colors.foreground,
              }}
            >
              {training.title}
            </Text>

            {training.shortDescription ? (
              <Text
                className="mt-[6px] max-w-[94%] text-[13px] leading-[20px]"
                style={{
                  color:
                    theme.colors.foregroundMuted,
                }}
              >
                {training.shortDescription}
              </Text>
            ) : null}

            <View className="mt-[13px] flex-row flex-wrap gap-[7px]">
              <View
                className="min-h-[38px] flex-row items-center rounded-[12px] border bg-white px-[9px]"
                style={{
                  borderColor:
                    theme.colors.border,
                }}
              >
                <View className="h-[25px] w-[25px] items-center justify-center rounded-[8px] bg-[#EFF6FF]">
                  <SymbolView
                    name={{
                      ios: "chart.bar.fill",
                      android:
                        "signal_cellular_alt",
                      web:
                        "signal_cellular_alt",
                    }}
                    tintColor="#2563EB"
                    size={11}
                    weight="bold"
                  />
                </View>

                <Text
                  className="ml-[6px] text-[10px] font-black"
                  style={{
                    color:
                      theme.colors.foregroundMuted,
                  }}
                >
                  {levelLabel(training.level)}
                </Text>
              </View>

              <View
                className="min-h-[38px] flex-row items-center rounded-[12px] border bg-white px-[9px]"
                style={{
                  borderColor:
                    theme.colors.border,
                }}
              >
                <View className="h-[25px] w-[25px] items-center justify-center rounded-[8px] bg-[#FFF7ED]">
                  <SymbolView
                    name={{
                      ios: "clock.fill",
                      android: "schedule",
                      web: "schedule",
                    }}
                    tintColor="#D97706"
                    size={11}
                    weight="bold"
                  />
                </View>

                <Text
                  className="ml-[6px] text-[10px] font-black"
                  style={{
                    color:
                      theme.colors.foregroundMuted,
                  }}
                >
                  {training.estimatedDurationHours
                    ? `${training.estimatedDurationHours} h`
                    : "Durée non indiquée"}
                </Text>
              </View>
            </View>

            <View className="mt-[16px]">
              <Text
                className="text-[18px] font-black"
                style={{
                  color:
                    theme.colors.foreground,
                }}
              >
                Indicateurs clés
              </Text>

              <Text
                className="mt-[2px] text-[11px] leading-[16px]"
                style={{
                  color:
                    theme.colors.foregroundMuted,
                }}
              >
                Une vue rapide du contenu réel de la formation.
              </Text>

              <View className="mt-[10px] flex-row justify-between">
                <MetricCard
                  label="Modules"
                  value={training.modules.length}
                  icon={{
                    ios: "square.grid.2x2.fill",
                    android: "view_module",
                    web: "view_module",
                  }}
                  tint="#7C3AED"
                  background="#F3EEFF"
                />

                <MetricCard
                  label="Leçons"
                  value={lessonCount}
                  icon={{
                    ios: "book.pages.fill",
                    android: "menu_book",
                    web: "menu_book",
                  }}
                  tint="#2563EB"
                  background="#EFF6FF"
                />

                <MetricCard
                  label="Ressources"
                  value={resourceCount}
                  icon={{
                    ios: "folder.fill",
                    android: "folder",
                    web: "folder",
                  }}
                  tint="#16A36A"
                  background="#ECFDF3"
                />
              </View>
            </View>
          </View>

          {/* PROGRESSION */}
          <View
            className="mt-[11px] rounded-[23px] border p-[13px]"
            style={{
              backgroundColor: "#F7F1FF",
              borderColor: "#E2D4F7",
            }}
          >
            <View className="flex-row items-center">
              <View className="h-[44px] w-[44px] items-center justify-center rounded-[14px] bg-white">
                <SymbolView
                  name={{
                    ios: completed
                      ? "checkmark.seal.fill"
                      : "chart.line.uptrend.xyaxis",
                    android: completed
                      ? "verified"
                      : "insights",
                    web: completed
                      ? "verified"
                      : "insights",
                  }}
                  tintColor={
                    completed
                      ? "#16A36A"
                      : "#7C3AED"
                  }
                  size={17}
                  weight="bold"
                />
              </View>

              <View className="ml-[10px] min-w-0 flex-1">
                <Text className="text-[9px] font-black uppercase tracking-[0.6px] text-[#7C3AED]">
                  Progression
                </Text>

                <Text
                  className="mt-[1px] text-[17px] font-black"
                  style={{
                    color:
                      theme.colors.foreground,
                  }}
                >
                  {completed
                    ? "Formation terminée"
                    : progress > 0
                      ? "Formation en cours"
                      : "Formation à commencer"}
                </Text>
              </View>

              <Text
                className="ml-[8px] text-[27px] font-black tracking-[-0.5px]"
                style={{
                  color: completed
                    ? theme.colors.success
                    : theme.colors.accent,
                }}
              >
                {progress}%
              </Text>
            </View>

            <View
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: progress,
              }}
              className="mt-[11px] h-[8px] w-full overflow-hidden rounded-full bg-[#E9DDF8]"
            >
              <View
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  backgroundColor: completed
                    ? theme.colors.success
                    : theme.colors.accent,
                }}
              />
            </View>

            {deadline ? (
              <View
                className="mt-[10px] flex-row items-center rounded-[13px] border bg-white px-[10px] py-[9px]"
                style={{
                  borderColor:
                    deadlineColor,
                }}
              >
                <View
                  className="h-[32px] w-[32px] items-center justify-center rounded-[10px]"
                  style={{
                    backgroundColor:
                      theme.colors.surfaceSoft,
                  }}
                >
                  <SymbolView
                    name={{
                      ios: "calendar.badge.clock",
                      android: "event",
                      web: "event",
                    }}
                    tintColor={deadlineColor}
                    size={12}
                    weight="bold"
                  />
                </View>

                <View className="ml-[8px] min-w-0 flex-1">
                  <Text
                    className="text-[9px] font-black uppercase tracking-[0.45px]"
                    style={{
                      color:
                        deadlineColor,
                    }}
                  >
                    {deadline.label}
                  </Text>

                  <Text
                    className="mt-[1px] text-[11px] font-extrabold"
                    style={{
                      color:
                        theme.colors.foreground,
                    }}
                  >
                    {deadline.detail}
                  </Text>
                </View>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() =>
                onOpenCourse(progress >= 100)
              }
              android_ripple={{
                color: "transparent",
              }}
              className="mt-[11px] min-h-[56px] flex-row items-center rounded-[16px] bg-[#7C3AED] px-[9px]"
            >
              <View className="h-[40px] w-[40px] items-center justify-center rounded-[13px] bg-white/15">
                <SymbolView
                  name={{
                    ios:
                      progress >= 100
                        ? "arrow.counterclockwise"
                        : "play.fill",
                    android:
                      progress >= 100
                        ? "replay"
                        : "play_arrow",
                    web:
                      progress >= 100
                        ? "replay"
                        : "play_arrow",
                  }}
                  tintColor="#FFFFFF"
                  size={15}
                  weight="bold"
                />
              </View>

              <View className="ml-[10px] min-w-0 flex-1">
                <Text
                  className="text-[9px] font-black uppercase tracking-[0.55px]"
                  style={{
                    color:
                      "rgba(255,255,255,0.74)",
                  }}
                >
                  {progress >= 100
                    ? "FORMATION TERMINÉE"
                    : progress > 0
                      ? "EN COURS"
                      : "PRÊT À DÉMARRER"}
                </Text>

                <Text
                  className="mt-[1px] text-[13px] font-black"
                  style={{
                    color: "#FFFFFF",
                  }}
                >
                  {progress >= 100
                    ? "Revoir la formation"
                    : progress > 0
                      ? "Reprendre la formation"
                      : "Commencer la formation"}
                </Text>
              </View>

              <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-white/15">
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

          {/* QUIZ */}
          {hasPublishedQuiz ? (
            <View
              className="relative mt-[11px] overflow-hidden rounded-[22px] border p-[13px]"
              style={{
                backgroundColor: "#FBF9FF",
                borderColor: "#E4D8F4",
              }}
            >
              <View className="absolute -right-[34px] -top-[34px] h-[100px] w-[100px] rounded-full bg-[#F3EEFF]" />

              <View className="flex-row items-start">
                <View className="h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[15px] bg-[#7C3AED]">
                  <SymbolView
                    name={{
                      ios: "checklist.checked",
                      android: "quiz",
                      web: "quiz",
                    }}
                    tintColor="#FFFFFF"
                    size={17}
                    weight="bold"
                  />
                </View>

                <View className="ml-[11px] min-w-0 flex-1 pr-[4px]">
                  <Text className="text-[9px] font-black uppercase tracking-[0.65px] text-[#7C3AED]">
                    Évaluations
                  </Text>

                  <Text
                    className="mt-[2px] text-[16px] font-black leading-[21px]"
                    style={{
                      color: theme.colors.foreground,
                    }}
                  >
                    Quiz de la formation
                  </Text>

                  <Text
                    className="mt-[4px] text-[11px] leading-[17px]"
                    style={{
                      color: theme.colors.foregroundMuted,
                    }}
                  >
                    Consulte les quiz disponibles, tes tentatives et tes résultats.
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={onOpenQuizzes}
                android_ripple={{
                  color: "transparent",
                }}
                className="mt-[12px] min-h-[52px] flex-row items-center rounded-[15px] bg-[#7C3AED] px-[9px]"
              >
                <View className="h-[36px] w-[36px] items-center justify-center rounded-[12px] bg-white/15">
                  <SymbolView
                    name={{
                      ios: "checklist.checked",
                      android: "quiz",
                      web: "quiz",
                    }}
                    tintColor="#FFFFFF"
                    size={14}
                    weight="bold"
                  />
                </View>

                <View className="ml-[9px] min-w-0 flex-1">
                  <Text
                    className="text-[8px] font-black uppercase tracking-[0.55px]"
                    style={{
                      color: "rgba(255,255,255,0.72)",
                    }}
                  >
                    Évaluations disponibles
                  </Text>

                  <Text
                    className="mt-[1px] text-[12px] font-black"
                    style={{ color: "#FFFFFF" }}
                  >
                    Accéder aux quiz
                  </Text>
                </View>

                <View className="h-[32px] w-[32px] items-center justify-center rounded-full bg-white/15">
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
          ) : null}

          {/* DESINSCRIPTION */}
          {training.canSelfUnenroll ? (
            <View
              className="mt-[10px] flex-row items-center rounded-[16px] border bg-white px-[10px] py-[9px]"
              style={{
                borderColor: theme.colors.border,
              }}
            >
              <View className="h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-[#FEF2F2]">
                <SymbolView
                  name={{
                    ios: "rectangle.portrait.and.arrow.right",
                    android: "logout",
                    web: "logout",
                  }}
                  tintColor={theme.colors.danger}
                  size={13}
                  weight="bold"
                />
              </View>

              <View className="ml-[9px] min-w-0 flex-1">
                <Text
                  className="text-[11px] font-black"
                  style={{
                    color: theme.colors.foreground,
                  }}
                >
                  Ne plus suivre cette formation
                </Text>

                <Text
                  className="mt-[1px] text-[9px] leading-[14px]"
                  style={{
                    color: theme.colors.foregroundMuted,
                  }}
                  numberOfLines={2}
                >
                  Ta progression et tes résultats restent conservés.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  disabled: unenrollBusy,
                }}
                disabled={unenrollBusy}
                onPress={confirmSelfUnenroll}
                android_ripple={{
                  color: "transparent",
                }}
                className="ml-[8px] min-h-[36px] shrink-0 items-center justify-center rounded-[10px] px-[9px]"
                style={{
                  backgroundColor: "#FFF7F7",
                  opacity: unenrollBusy ? 0.65 : 1,
                }}
              >
                {unenrollBusy ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.danger}
                  />
                ) : (
                  <Text
                    className="text-[9px] font-black"
                    style={{
                      color: theme.colors.danger,
                    }}
                  >
                    Se désinscrire
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}

          {/* INFORMATIONS */}
          {(training.description ||
            training.objectives ||
            training.prerequisites ||
            training.targetAudience) ? (
            <View className="mt-[16px]">
              <View className="mb-[9px] flex-row items-center">
                <View className="h-[40px] w-[40px] items-center justify-center rounded-[13px] bg-[#EFF6FF]">
                  <SymbolView
                    name={{
                      ios: "doc.text.fill",
                      android: "description",
                      web: "description",
                    }}
                    tintColor="#2563EB"
                    size={16}
                    weight="bold"
                  />
                </View>

                <View className="ml-[10px] min-w-0 flex-1">
                  <Text
                    className="text-[17px] font-black"
                    style={{
                      color: theme.colors.foreground,
                    }}
                  >
                    À propos de la formation
                  </Text>

                  <Text
                    className="mt-[1px] text-[10px]"
                    style={{
                      color: theme.colors.foregroundMuted,
                    }}
                  >
                    Informations pédagogiques
                  </Text>
                </View>
              </View>

              <View
                className="mt-[4px] overflow-hidden rounded-[21px] border bg-white"
                style={{
                  borderColor: theme.colors.border,
                }}
              >
                {training.description ? (
                  <View className="p-[12px]">
                    <View className="flex-row items-center">
                      <View className="h-[32px] w-[32px] items-center justify-center rounded-[10px] bg-[#EFF6FF]">
                        <SymbolView
                          name={{
                            ios: "doc.text.fill",
                            android: "description",
                            web: "description",
                          }}
                          tintColor="#2563EB"
                          size={13}
                          weight="bold"
                        />
                      </View>

                      <Text
                        className="ml-[9px] text-[12px] font-black"
                        style={{
                          color: theme.colors.foreground,
                        }}
                      >
                        À propos
                      </Text>
                    </View>

                    <Text
                      className="mt-[7px] text-[11px] leading-[17px]"
                      style={{
                        color: theme.colors.foregroundMuted,
                      }}
                    >
                      {training.description}
                    </Text>
                  </View>
                ) : null}

                {training.objectives ? (
                  <View
                    className="border-t p-[12px]"
                    style={{
                      borderColor: theme.colors.border,
                    }}
                  >
                    <View className="flex-row items-center">
                      <View className="h-[32px] w-[32px] items-center justify-center rounded-[10px] bg-[#ECFDF3]">
                        <SymbolView
                          name={{
                            ios: "target",
                            android: "track_changes",
                            web: "track_changes",
                          }}
                          tintColor="#16A36A"
                          size={13}
                          weight="bold"
                        />
                      </View>

                      <Text
                        className="ml-[9px] text-[12px] font-black"
                        style={{
                          color: theme.colors.foreground,
                        }}
                      >
                        Objectifs
                      </Text>
                    </View>

                    <Text
                      className="mt-[7px] text-[11px] leading-[17px]"
                      style={{
                        color: theme.colors.foregroundMuted,
                      }}
                    >
                      {training.objectives}
                    </Text>
                  </View>
                ) : null}

                {training.prerequisites ? (
                  <View
                    className="border-t p-[12px]"
                    style={{
                      borderColor: theme.colors.border,
                    }}
                  >
                    <View className="flex-row items-center">
                      <View className="h-[32px] w-[32px] items-center justify-center rounded-[10px] bg-[#FFF7ED]">
                        <SymbolView
                          name={{
                            ios: "checkmark.shield.fill",
                            android: "verified_user",
                            web: "verified_user",
                          }}
                          tintColor="#D97706"
                          size={13}
                          weight="bold"
                        />
                      </View>

                      <Text
                        className="ml-[9px] text-[12px] font-black"
                        style={{
                          color: theme.colors.foreground,
                        }}
                      >
                        Prérequis
                      </Text>
                    </View>

                    <Text
                      className="mt-[7px] text-[11px] leading-[17px]"
                      style={{
                        color: theme.colors.foregroundMuted,
                      }}
                    >
                      {training.prerequisites}
                    </Text>
                  </View>
                ) : null}

                {training.targetAudience ? (
                  <View
                    className="border-t p-[12px]"
                    style={{
                      borderColor: theme.colors.border,
                    }}
                  >
                    <View className="flex-row items-center">
                      <View className="h-[32px] w-[32px] items-center justify-center rounded-[10px] bg-[#F3EEFF]">
                        <SymbolView
                          name={{
                            ios: "person.2.fill",
                            android: "groups",
                            web: "groups",
                          }}
                          tintColor="#7C3AED"
                          size={13}
                          weight="bold"
                        />
                      </View>

                      <Text
                        className="ml-[9px] text-[12px] font-black"
                        style={{
                          color: theme.colors.foreground,
                        }}
                      >
                        Public concerné
                      </Text>
                    </View>

                    <Text
                      className="mt-[7px] text-[11px] leading-[17px]"
                      style={{
                        color: theme.colors.foregroundMuted,
                      }}
                    >
                      {training.targetAudience}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* PROGRAMME */}
          <View className="mt-[18px]">
            <View
              className="overflow-hidden rounded-[23px] border bg-white p-[13px]"
              style={{
                borderColor: theme.colors.border,
              }}
            >
              <View className="flex-row items-center">
                <View className="h-[44px] w-[44px] items-center justify-center rounded-[14px] bg-[#F3EEFF]">
                  <SymbolView
                    name={{
                      ios: "list.number",
                      android: "format_list_numbered",
                      web: "format_list_numbered",
                    }}
                    tintColor="#7C3AED"
                    size={17}
                    weight="bold"
                  />
                </View>

                <View className="ml-[10px] min-w-0 flex-1">
                  <Text className="text-[9px] font-black uppercase tracking-[0.65px] text-[#7C3AED]">
                    Programme
                  </Text>

                  <Text
                    className="mt-[1px] text-[18px] font-black"
                    style={{
                      color: theme.colors.foreground,
                    }}
                  >
                    Contenu de la formation
                  </Text>

                  <Text
                    className="mt-[2px] text-[11px] leading-[16px]"
                    style={{
                      color: theme.colors.foregroundMuted,
                    }}
                  >
                    {training.modules.length} module
                    {training.modules.length > 1 ? "s" : ""} · {lessonCount} leçon
                    {lessonCount > 1 ? "s" : ""}
                  </Text>
                </View>
              </View>

              <View className="mt-[12px] gap-[9px]">
                {training.modules.map(
                  (module, moduleIndex) => (
                    <View
                      key={module.id}
                      className="relative overflow-hidden rounded-[18px] border p-[12px]"
                      style={{
                        backgroundColor: "#FCFBFD",
                        borderColor: theme.colors.border,
                      }}
                    >
                      <View className="absolute bottom-0 left-0 top-0 w-[4px] bg-[#7C3AED]" />

                      <View className="flex-row items-start pl-[4px]">
                        <View className="h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] bg-[#F3EEFF]">
                          <Text className="text-[14px] font-black text-[#7C3AED]">
                            {String(moduleIndex + 1).padStart(2, "0")}
                          </Text>
                        </View>

                        <View className="ml-[10px] min-w-0 flex-1">
                          <Text
                            className="text-[9px] font-black uppercase tracking-[0.5px]"
                            style={{
                              color: theme.colors.foregroundSubtle,
                            }}
                          >
                            Module {moduleIndex + 1}
                          </Text>

                          <Text
                            className="mt-[2px] text-[15px] font-black leading-[20px]"
                            style={{
                              color: theme.colors.foreground,
                            }}
                          >
                            {module.title}
                          </Text>

                          {module.description ? (
                            <Text
                              className="mt-[5px] text-[11px] leading-[17px]"
                              style={{
                                color: theme.colors.foregroundMuted,
                              }}
                              numberOfLines={3}
                            >
                              {module.description}
                            </Text>
                          ) : null}

                          <View className="mt-[8px] flex-row flex-wrap gap-[6px]">
                            <View className="flex-row items-center rounded-full bg-white px-[9px] py-[5px]">
                              <SymbolView
                                name={{
                                  ios: "book.pages.fill",
                                  android: "menu_book",
                                  web: "menu_book",
                                }}
                                tintColor="#7C3AED"
                                size={9}
                                weight="bold"
                              />

                              <Text
                                className="ml-[4px] text-[9px] font-bold"
                                style={{
                                  color: theme.colors.foregroundMuted,
                                }}
                              >
                                {module.lessons.length}{" "}
                                {module.lessons.length > 1 ? "leçons" : "leçon"}
                              </Text>
                            </View>

                            {module.estimatedDurationMinutes ? (
                              <View className="flex-row items-center rounded-full bg-[#FFF7ED] px-[9px] py-[5px]">
                                <SymbolView
                                  name={{
                                    ios: "clock.fill",
                                    android: "schedule",
                                    web: "schedule",
                                  }}
                                  tintColor="#D97706"
                                  size={9}
                                  weight="bold"
                                />

                                <Text className="ml-[4px] text-[9px] font-bold text-[#B45309]">
                                  {module.estimatedDurationMinutes} min
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </View>
                  ),
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

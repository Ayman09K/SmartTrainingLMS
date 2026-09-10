import { SymbolView } from "expo-symbols";
import { Href, router } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
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
import { getTrainerLearner360 } from "../../features/trainer/trainerLearnerService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerLearner360Data,
  TrainerLearnerProgress,
  TrainerLearnerRisk,
} from "../../types/trainerLearnerMobile";

type Props = {
  trainerId: number;
  learnerId: number;
};

type TabKey =
  | "OVERVIEW"
  | "TRAININGS"
  | "ACTIVITY"
  | "ALERTS"
  | "SUPPORT";

type SymbolName = ComponentProps<typeof SymbolView>["name"];

type Tone = "violet" | "blue" | "green" | "orange" | "red";

const TONES: Record<Tone, { soft: string; icon: string }> = {
  violet: { soft: "#F3EEFF", icon: "#7C3AED" },
  blue: { soft: "#EAF2FF", icon: "#397BE8" },
  green: { soft: "#EAFBF3", icon: "#12A66A" },
  orange: { soft: "#FFF4E5", icon: "#F59E0B" },
  red: { soft: "#FFF0F1", icon: "#E5484D" },
};

function fullName(data: TrainerLearner360Data): string {
  const { identity } = data;

  return (
    identity.fullName ||
    [identity.firstName, identity.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    identity.email
  );
}

function initials(value: string): string {
  const parts = value.split(/\s+/).filter(Boolean).slice(0, 2);

  return parts.length
    ? parts
        .map((part) => part.charAt(0).toLocaleUpperCase("fr"))
        .join("")
    : "AP";
}

function formatDate(
  value?: string | null,
  fallback = "Aucune activité",
): string {
  if (!value) return fallback;

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function safeProgress(value?: number | null): number {
  return Math.max(0, Math.min(100, value ?? 0));
}

function progressStatusLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    NOT_STARTED: "Non commencée",
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminée",
    AT_RISK: "À reprendre",
  };

  return value ? labels[value] || "À examiner" : "À examiner";
}

function riskLabel(risk?: TrainerLearnerRisk): string {
  if (
    !risk ||
    risk.dataStatus === "DATA_INSUFFICIENT" ||
    risk.riskLevel === "DATA_INSUFFICIENT"
  ) {
    return "Données insuffisantes";
  }

  if (risk.riskLevel === "HIGH") return "Prioritaire";
  if (risk.riskLevel === "MEDIUM") return "À renforcer";
  if (risk.riskLevel === "LOW") return "Suivi léger";

  return "À examiner";
}

function riskTone(risk?: TrainerLearnerRisk): Tone {
  if (risk?.riskLevel === "HIGH") return "red";
  if (risk?.riskLevel === "MEDIUM") return "orange";
  if (risk?.riskLevel === "LOW") return "green";
  return "violet";
}

function eventTypeLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    TRAINING_OPENED: "Formation ouverte",
    MODULE_OPENED: "Module ouvert",
    LESSON_OPENED: "Leçon ouverte",
    LESSON_COMPLETED: "Leçon terminée",
    RESOURCE_OPENED: "Ressource ouverte",
    VIDEO_OPENED: "Vidéo ouverte",
    VIDEO_COMPLETED: "Vidéo terminée",
    PDF_OPENED: "PDF ouvert",
    SCORM_OPENED: "Module SCORM ouvert",
    QUIZ_STARTED: "Quiz commencé",
    QUIZ_SUBMITTED: "Quiz soumis",
    QUIZ_PASSED: "Quiz réussi",
    QUIZ_FAILED: "Quiz à reprendre",
    SCORE_RECORDED: "Score enregistré",
    REVIEW_CREATED: "Avis publié",
    FEEDBACK_CREATED: "Feedback envoyé",
    HELP_REQUESTED: "Demande d’aide",
  };

  return value
    ? labels[value] || "Activité pédagogique"
    : "Activité pédagogique";
}

function eventVisual(value?: string | null): {
  icon: SymbolName;
  tone: Tone;
} {
  if (
    value === "LESSON_COMPLETED" ||
    value === "VIDEO_COMPLETED" ||
    value === "QUIZ_PASSED"
  ) {
    return {
      icon: {
        ios: "checkmark",
        android: "check",
        web: "check",
      },
      tone: "green",
    };
  }

  if (value === "QUIZ_STARTED" || value === "QUIZ_SUBMITTED") {
    return {
      icon: {
        ios: "play.fill",
        android: "play_arrow",
        web: "play_arrow",
      },
      tone: "violet",
    };
  }

  if (value === "QUIZ_FAILED") {
    return {
      icon: {
        ios: "exclamationmark.triangle.fill",
        android: "warning",
        web: "warning",
      },
      tone: "orange",
    };
  }

  if (value === "HELP_REQUESTED") {
    return {
      icon: {
        ios: "questionmark.bubble.fill",
        android: "help",
        web: "help",
      },
      tone: "red",
    };
  }

  return {
    icon: {
      ios: "doc.text.fill",
      android: "description",
      web: "description",
    },
    tone: "blue",
  };
}

function alertStatusLabel(status?: string | null): string {
  const labels: Record<string, string> = {
    OPEN: "Ouverte",
    IN_PROGRESS: "En cours",
    RESOLVED: "Résolue",
    IGNORED: "Ignorée",
  };

  if (!status) return "À examiner";

  return labels[status.toUpperCase()] || status;
}

function alertTone(severity?: string | null): Tone {
  const value = severity?.toUpperCase();

  if (value === "CRITICAL" || value === "HIGH") return "red";
  if (value === "MEDIUM") return "orange";

  return "blue";
}

export default function TrainerLearner360Screen({
  trainerId,
  learnerId,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [data, setData] = useState<TrainerLearner360Data | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("OVERVIEW");
  const [trainingQuery, setTrainingQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const loaded = await getTrainerLearner360(trainerId, learnerId);
    setData(loaded);
  }

  useEffect(() => {
    let active = true;

    if (!Number.isFinite(learnerId) || learnerId <= 0) {
      setError("Apprenant invalide.");
      setLoading(false);

      return () => {
        active = false;
      };
    }

    void getTrainerLearner360(trainerId, learnerId)
      .then((loaded) => {
        if (!active) return;

        setData(loaded);
        setError("");
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible d’ouvrir ce suivi ou cet apprenant ne fait pas partie de votre périmètre.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [learnerId, trainerId]);

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError("Impossible d’actualiser le suivi 360.");
    } finally {
      setRefreshing(false);
    }
  }

  const trainingById = useMemo(() => {
    if (!data) return new Map<number, string>();

    return new Map(
      data.trainings.map((training) => [training.id, training.title]),
    );
  }, [data]);

  if (loading) {
    return <LoadingState message="Chargement du suivi 360..." />;
  }

  if (!data) {
    return (
      <ScreenContainer>
        <View className="mx-auto w-full max-w-[720px] pt-6">
          <ErrorMessage
            message={error || "Suivi indisponible."}
            onRetry={() => void refresh()}
          />
        </View>
      </ScreenContainer>
    );
  }

  const name = fullName(data);
  const { identity, overview } = data;
  const summary = overview.summary;
  const averageProgress = safeProgress(summary.averageProgress);

  const activeAlerts = overview.alerts.filter((item) => {
    const status = (item.status || "").toUpperCase();

    return status !== "RESOLVED" && status !== "IGNORED";
  });

  const filteredProgress = overview.progress.filter((progress) => {
    const title =
      trainingById.get(progress.trainingId) || "Formation suivie";

    return title
      .toLocaleLowerCase("fr")
      .includes(trainingQuery.trim().toLocaleLowerCase("fr"));
  });

  const tabs: {
    key: Exclude<TabKey, "SUPPORT">;
    label: string;
    count?: number;
  }[] = [
    { key: "OVERVIEW", label: "Vue d’ensemble" },
    { key: "TRAININGS", label: "Formations", count: overview.progress.length },
    { key: "ACTIVITY", label: "Activité", count: overview.recentEvents.length },
    { key: "ALERTS", label: "Alertes", count: activeAlerts.length },
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
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 18 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View
          className="mx-auto w-full max-w-[760px] px-4"
          style={{ backgroundColor: "#F8F6F3" }}
        >
          {/* ==========================================
              EN-TÊTE PROFIL — COMPACT COMME LA MAQUETTE
          ========================================== */}
          <View
            className="-mx-4 rounded-b-[24px] px-5 pb-5 pt-4"
            style={{
              backgroundColor: theme.colors.headerBackground,
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.10,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <View className="flex-row items-center">
              {identity.avatarDataUrl ? (
                <Image
                  source={{ uri: identity.avatarDataUrl }}
                  accessibilityLabel="Photo de l’apprenant"
                  className="h-[58px] w-[58px] rounded-full border-2 border-white/40"
                />
              ) : (
                <View className="h-[58px] w-[58px] items-center justify-center rounded-full border-2 border-white/40 bg-[#EFE5FF]">
                  <Text
                    className="text-[17px] font-black"
                    style={{ color: theme.colors.accent }}
                  >
                    {initials(name)}
                  </Text>
                </View>
              )}

              <View className="ml-3 min-w-0 flex-1">
                <View className="mb-1 flex-row items-center">
                  <SymbolView
                    name={{
                      ios: "person.crop.circle.fill",
                      android: "account_circle",
                      web: "account_circle",
                    }}
                    tintColor="#C4B5FD"
                    size={12}
                    weight="bold"
                  />
                  <Text className="ml-1 text-[9px] font-black uppercase tracking-[0.8px] text-[#C4B5FD]">
                    Apprenant suivi
                  </Text>
                </View>

                <Text
                  numberOfLines={2}
                  className="text-[17px] font-black leading-[21px] text-white"
                >
                  {name}
                </Text>

                <Text
                  numberOfLines={1}
                  className="mt-1 text-[10px] leading-[14px] text-white/70"
                >
                  {identity.email}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Accompagnement formateur"
                onPress={() => setActiveTab("SUPPORT")}
                android_ripple={{ color: "transparent" }}
                className="ml-2 h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10"
              >
                <SymbolView
                  name={{
                    ios: "ellipsis",
                    android: "more_vert",
                    web: "more_vert",
                  }}
                  tintColor="#FFFFFF"
                  size={17}
                  weight="bold"
                />
              </Pressable>
            </View>
          </View>

          {/* ==========================================
              ONGLETS — 4 SEULEMENT COMME LA MAQUETTE
          ========================================== */}
          <View
            className="-mx-4 mb-5 border-b border-[#E4DEE8] bg-white"
            style={{
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.035,
              shadowRadius: 7,
              elevation: 1,
            }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 6 }}
            >
              {tabs.map((tab) => {
                const active = activeTab === tab.key;

                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    android_ripple={{ color: "transparent" }}
                    className="relative min-h-[52px] flex-row items-center px-3"
                  >
                    <Text
                      className="text-[10px] font-extrabold"
                      style={{
                        color: active
                          ? theme.colors.accent
                          : theme.colors.foregroundMuted,
                      }}
                    >
                      {tab.label}
                    </Text>

                    {tab.count != null ? (
                      <View className="ml-1.5 min-w-[20px] items-center rounded-full bg-[#F4F1F6] px-1.5 py-1">
                        <Text
                          className="text-[8px] font-black"
                          style={{
                            color: active
                              ? theme.colors.accent
                              : theme.colors.foregroundMuted,
                          }}
                        >
                          {tab.count}
                        </Text>
                      </View>
                    ) : null}

                    {active ? (
                      <View
                        className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {error ? (
            <View className="mb-4">
              <ErrorMessage
                message={error}
                onRetry={() => void refresh()}
              />
            </View>
          ) : null}

          {/* ==========================================
              VUE D'ENSEMBLE
          ========================================== */}
          {activeTab === "OVERVIEW" ? (
            <>
              <View
                className="mb-3 rounded-[20px] border bg-white p-3.5"
                style={{
                  borderColor: "#E2DCE6",
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.06,
                  shadowRadius: 10,
                  elevation: 2,
                }}
              >
                <Text
                  className="text-[15px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  Progression globale
                </Text>

                <View className="mt-3 flex-row items-center">
                  <ProgressRing value={averageProgress} />

                  <View className="ml-4 flex-1 gap-2.5">
                    <MiniLine
                      icon={{
                        ios: "books.vertical.fill",
                        android: "menu_book",
                        web: "menu_book",
                      }}
                      value={String(summary.totalTrainings)}
                      label="Formation suivie"
                      tone="violet"
                    />

                    <MiniLine
                      icon={{
                        ios: "doc.text.fill",
                        android: "description",
                        web: "description",
                      }}
                      value={`${summary.completedLessons ?? 0}/${summary.totalLessons ?? 0}`}
                      label="Leçons terminées"
                      tone="violet"
                    />

                    <MiniLine
                      icon={{
                        ios: "questionmark.square.fill",
                        android: "quiz",
                        web: "quiz",
                      }}
                      value={String(summary.completedQuizzes ?? 0)}
                      label="Quiz passés"
                      tone="violet"
                    />

                    <MiniLine
                      icon={{
                        ios: "star.fill",
                        android: "star",
                        web: "star",
                      }}
                      value={`${summary.averageScore ?? 0} %`}
                      label="Score moyen"
                      tone="violet"
                    />
                  </View>
                </View>
              </View>

              <View className="mb-3 flex-row gap-2.5">
                <SummaryAction
                  icon={{
                    ios: "bell.fill",
                    android: "notifications",
                    web: "notifications",
                  }}
                  value={String(summary.openAlerts ?? 0)}
                  label="Alertes ouvertes"
                  tone="red"
                  onPress={() => setActiveTab("ALERTS")}
                />

                <SummaryAction
                  icon={{
                    ios: "bubble.left.fill",
                    android: "chat",
                    web: "chat",
                  }}
                  value={String(summary.helpRequests ?? 0)}
                  label="Demandes d’aide"
                  tone="blue"
                  onPress={() => setActiveTab("SUPPORT")}
                />
              </View>

              <View className="mb-2 rounded-[17px] bg-[#F2EAFF] p-3.5">
                <View className="flex-row items-center">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-white">
                    <SymbolView
                      name={{
                        ios: "clock.fill",
                        android: "schedule",
                        web: "schedule",
                      }}
                      tintColor={theme.colors.accent}
                      size={17}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-2.5 flex-1">
                    <Text
                      className="text-[9px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Dernière activité
                    </Text>
                    <Text
                      className="mt-0.5 text-[13px] font-black"
                      style={{ color: theme.colors.foreground }}
                    >
                      {formatDate(summary.lastActivityAt)}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : null}

          {/* ==========================================
              FORMATIONS
          ========================================== */}
          {activeTab === "TRAININGS" ? (
            <>
              <View className="mb-4">
                <Text
                  className="text-[23px] font-black leading-[28px]"
                  style={{ color: theme.colors.foreground }}
                >
                  Formations suivies
                </Text>

                <Text
                  className="mt-1 text-[11px] leading-[16px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  {summary.totalTrainings} formation(s) • {averageProgress} %
                  de progression moyenne
                </Text>
              </View>

              <View
                className="mb-4 min-h-[46px] flex-row items-center rounded-[16px] border bg-white px-3"
                style={{
                  borderColor: "#E2DCE6",
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                  elevation: 1,
                }}
              >
                <SymbolView
                  name={{
                    ios: "magnifyingglass",
                    android: "search",
                    web: "search",
                  }}
                  tintColor={theme.colors.foregroundSubtle}
                  size={16}
                />

                <TextInput
                  value={trainingQuery}
                  onChangeText={setTrainingQuery}
                  placeholder="Rechercher une formation..."
                  placeholderTextColor={theme.colors.foregroundSubtle}
                  className="ml-2 flex-1 py-2 text-[11px]"
                  style={{ color: theme.colors.foreground }}
                />
              </View>

              {filteredProgress.length === 0 ? (
                <EmptyCard text="Aucune formation ne correspond à votre recherche." />
              ) : (
                filteredProgress.map((progress) => (
                  <FormationListCard
                    key={progress.id}
                    progress={progress}
                    trainingName={
                      trainingById.get(progress.trainingId) ||
                      "Formation suivie"
                    }
                    risk={overview.risks.find(
                      (item) => item.trainingId === progress.trainingId,
                    )}
                  />
                ))
              )}

              {overview.recommendations.length > 0 ? (
                <View className="mt-1 flex-row rounded-[16px] bg-[#F2EAFF] p-3">
                  <View className="mr-2.5 h-8 w-8 items-center justify-center rounded-full bg-[#FFF4E5]">
                    <SymbolView
                      name={{
                        ios: "lightbulb.fill",
                        android: "lightbulb",
                        web: "lightbulb",
                      }}
                      tintColor="#F59E0B"
                      size={15}
                    />
                  </View>

                  <View className="flex-1">
                    <Text
                      className="text-[12px] font-black"
                      style={{ color: theme.colors.foreground }}
                    >
                      {overview.recommendations[0].title ||
                        "Recommandation pédagogique"}
                    </Text>

                    {overview.recommendations[0].description ? (
                      <Text
                        className="mt-0.5 text-[9px] leading-[14px]"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        {overview.recommendations[0].description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </>
          ) : null}

          {/* ==========================================
              ACTIVITÉ
          ========================================== */}
          {activeTab === "ACTIVITY" ? (
            <>
              <View className="mb-4">
                <Text
                  className="text-[23px] font-black leading-[28px]"
                  style={{ color: theme.colors.foreground }}
                >
                  Activité récente
                </Text>

                <Text
                  className="mt-1 text-[11px] leading-[16px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Derniers événements pédagogiques.
                </Text>
              </View>

              {overview.recentEvents.length === 0 ? (
                <EmptyCard text="Aucune activité pédagogique récente n’est disponible." />
              ) : (
                <Timeline events={overview.recentEvents} />
              )}
            </>
          ) : null}

          {/* ==========================================
              ALERTES
          ========================================== */}
          {activeTab === "ALERTS" ? (
            <>
              {activeAlerts.length === 0 ? (
                <View
                  className="min-h-[390px] items-center justify-center rounded-[24px] border bg-white px-5"
                  style={{
                    borderColor: "#E2DCE6",
                    shadowColor: "#0F172A",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.06,
                    shadowRadius: 10,
                    elevation: 2,
                  }}
                >
                  <View className="h-[92px] w-[92px] items-center justify-center rounded-full bg-[#EFE5FF]">
                    <SymbolView
                      name={{
                        ios: "bell.fill",
                        android: "notifications_none",
                        web: "notifications_none",
                      }}
                      tintColor={theme.colors.accent}
                      size={38}
                      weight="bold"
                    />
                  </View>

                  <Text
                    className="mt-5 text-center text-[19px] font-black"
                    style={{ color: theme.colors.foreground }}
                  >
                    Aucune alerte ouverte
                  </Text>

                  <Text
                    className="mt-2 max-w-[300px] text-center text-[11px] leading-[17px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Aucune alerte ouverte n’est actuellement retournée
                    pour cet apprenant.
                  </Text>

                </View>
              ) : (
                <>
                  <View className="mb-4">
                    <Text
                      className="text-[23px] font-black leading-[28px]"
                      style={{ color: theme.colors.foreground }}
                    >
                      Alertes
                    </Text>
                    <Text
                      className="mt-1 text-[11px] leading-[16px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Signaux d’attention liés au parcours de cet apprenant.
                    </Text>
                  </View>

                  <View className="gap-2.5">
                    {activeAlerts.map((alert) => {
                      const palette = TONES[alertTone(alert.severity)];

                      return (
                        <View
                          key={alert.id}
                          className="rounded-[18px] border bg-white p-3"
                          style={{
          borderColor: "#E2DCE6",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        }}
                        >
                          <View className="flex-row items-start">
                            <View
                              className="h-9 w-9 items-center justify-center rounded-xl"
                              style={{ backgroundColor: palette.soft }}
                            >
                              <SymbolView
                                name={{
                                  ios: "bell.fill",
                                  android: "notifications",
                                  web: "notifications",
                                }}
                                tintColor={palette.icon}
                                size={16}
                                weight="bold"
                              />
                            </View>

                            <View className="ml-2.5 flex-1">
                              <Text
                                className="text-[13px] font-black"
                                style={{ color: theme.colors.foreground }}
                              >
                                {alert.title || "Alerte pédagogique"}
                              </Text>

                              <Text
                                className="mt-1 text-[9px]"
                                style={{ color: theme.colors.foregroundMuted }}
                              >
                                {alertStatusLabel(alert.status)} •{" "}
                                {formatDate(
                                  alert.createdAt,
                                  "Date non disponible",
                                )}
                              </Text>
                            </View>
                          </View>

                          {alert.message ? (
                            <Text
                              className="mt-2 text-[10px] leading-[15px]"
                              style={{ color: theme.colors.foregroundMuted }}
                            >
                              {alert.message}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          ) : null}

          {/* ==========================================
              ACCOMPAGNEMENT — OUVERT PAR LE BOUTON ...
              On conserve toutes les données existantes.
          ========================================== */}
          {activeTab === "SUPPORT" ? (
            <>
              <View className="mb-4">
                <Text
                  className="text-[23px] font-black leading-[28px]"
                  style={{ color: theme.colors.foreground }}
                >
                  Accompagnement formateur
                </Text>
                <Text
                  className="mt-1 text-[11px] leading-[17px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Les informations utiles pour piloter l’accompagnement de cet
                  apprenant.
                </Text>
              </View>

              <SupportMenuCard
                icon={{
                  ios: "exclamationmark.triangle.fill",
                  android: "warning",
                  web: "warning",
                }}
                tone="red"
                title="Facteurs de risque"
                subtitle={`${overview.risks.length} signal(aux) disponible(s)`}
              >
                {overview.risks.length === 0 ? (
                  <InlineEmpty text="Aucun facteur de risque disponible." />
                ) : (
                  overview.risks.map((risk, index) => (
                    <View
                      key={`${risk.trainingId ?? "global"}-${index}`}
                      className="border-t border-[#EEEAF0] pt-2.5"
                    >
                      <Text
                        className="text-[12px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        {risk.trainingId
                          ? trainingById.get(risk.trainingId) ||
                            "Formation suivie"
                          : "Suivi global"}{" "}
                        • {riskLabel(risk)}
                      </Text>

                      {risk.riskFactors?.length ? (
                        <Text
                          className="mt-1 text-[9px] leading-[14px]"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          {risk.riskFactors.join(" • ")}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </SupportMenuCard>

              <SupportMenuCard
                icon={{
                  ios: "bubble.left.and.bubble.right.fill",
                  android: "forum",
                  web: "forum",
                }}
                tone="blue"
                title="Feedbacks"
                subtitle={`${overview.feedbacks.length} feedback(s)`}
              >
                {overview.feedbacks.length === 0 ? (
                  <InlineEmpty text="Aucun feedback disponible." />
                ) : (
                  overview.feedbacks.map((feedback) => (
                    <View
                      key={feedback.id}
                      className="border-t border-[#EEEAF0] pt-2.5"
                    >
                      <Text
                        className="text-[12px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        {trainingById.get(feedback.trainingId) ||
                          "Formation suivie"}
                      </Text>

                      {feedback.message ? (
                        <Text
                          className="mt-1 text-[9px] leading-[14px]"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          {feedback.message}
                        </Text>
                      ) : null}

                      {feedback.trainerResponse ? (
                        <Text
                          className="mt-1.5 text-[9px] font-bold"
                          style={{ color: theme.colors.accent }}
                        >
                          Réponse : {feedback.trainerResponse}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </SupportMenuCard>

              <SupportMenuCard
                icon={{
                  ios: "person.2.fill",
                  android: "groups",
                  web: "groups",
                }}
                tone="violet"
                title="Interventions"
                subtitle={`${overview.interventions.length} intervention(s)`}
              >
                {overview.interventions.length === 0 ? (
                  <InlineEmpty text="Aucune intervention disponible." />
                ) : (
                  overview.interventions.map((intervention) => (
                    <View
                      key={intervention.id}
                      className="border-t border-[#EEEAF0] pt-2.5"
                    >
                      <Text
                        className="text-[12px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        {intervention.interventionType || "Intervention"}
                      </Text>

                      {intervention.note ? (
                        <Text
                          className="mt-1 text-[9px] leading-[14px]"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          {intervention.note}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </SupportMenuCard>

              <SupportMenuCard
                icon={{
                  ios: "lightbulb.fill",
                  android: "lightbulb",
                  web: "lightbulb",
                }}
                tone="orange"
                title="Recommandations"
                subtitle={`${overview.recommendations.length} recommandation(s)`}
              >
                {overview.recommendations.length === 0 ? (
                  <InlineEmpty text="Aucune recommandation disponible." />
                ) : (
                  overview.recommendations.map((recommendation) => (
                    <View
                      key={recommendation.id}
                      className="border-t border-[#EEEAF0] pt-2.5"
                    >
                      <Text
                        className="text-[12px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        {recommendation.title ||
                          "Recommandation pédagogique"}
                      </Text>

                      {recommendation.description ? (
                        <Text
                          className="mt-1 text-[9px] leading-[14px]"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          {recommendation.description}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </SupportMenuCard>
            </>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function ProgressRing({ value }: { value: number }) {
    const progress = safeProgress(value);
    const track = "#E9E7F0";
    const accent = theme.colors.accent;

    return (
      <View
        className="h-[124px] w-[124px] items-center justify-center rounded-full border-[10px]"
        style={{
          borderTopColor: progress >= 12 ? accent : track,
          borderRightColor: progress >= 37 ? accent : track,
          borderBottomColor: progress >= 62 ? accent : track,
          borderLeftColor: progress >= 87 ? accent : track,
          transform: [{ rotate: "35deg" }],
        }}
      >
        <View
          className="h-[88px] w-[88px] items-center justify-center rounded-full bg-white"
          style={{ transform: [{ rotate: "-35deg" }] }}
        >
          <Text
            className="text-[23px] font-black leading-[28px]"
            style={{ color: theme.colors.foreground }}
          >
            {progress} %
          </Text>
        </View>
      </View>
    );
  }

  function MiniLine({
    icon,
    value,
    label,
    tone,
  }: {
    icon: SymbolName;
    value: string;
    label: string;
    tone: Tone;
  }) {
    const palette = TONES[tone];

    return (
      <View className="flex-row items-center">
        <View
          className="h-7 w-7 items-center justify-center rounded-[9px]"
          style={{ backgroundColor: palette.soft }}
        >
          <SymbolView
            name={icon}
            tintColor={palette.icon}
            size={13}
            weight="bold"
          />
        </View>

        <View className="ml-2 flex-1">
          <Text
            className="text-[13px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {value}
          </Text>
          <Text
            className="text-[9px] leading-[12px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {label}
          </Text>
        </View>
      </View>
    );
  }

  function SummaryAction({
    icon,
    value,
    label,
    tone,
    onPress,
  }: {
    icon: SymbolName;
    value: string;
    label: string;
    tone: Tone;
    onPress: () => void;
  }) {
    const palette = TONES[tone];

    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="min-h-[70px] min-w-0 flex-1 flex-row items-center rounded-[16px] border bg-white p-2.5"
        style={{
          borderColor: "#E2DCE6",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 7,
          elevation: 2,
        }}
      >
        <View
          className="h-8 w-8 items-center justify-center rounded-xl"
          style={{ backgroundColor: palette.soft }}
        >
          <SymbolView
            name={icon}
            tintColor={palette.icon}
            size={15}
            weight="bold"
          />
        </View>

        <View className="ml-2 flex-1">
          <Text
            className="text-[15px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {value}
          </Text>
          <Text
            className="text-[9px] leading-[12px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {label}
          </Text>
        </View>
      </Pressable>
    );
  }

  function FormationListCard({
    progress,
    trainingName,
    risk,
  }: {
    progress: TrainerLearnerProgress;
    trainingName: string;
    risk?: TrainerLearnerRisk;
  }) {
    const progressValue = safeProgress(progress.progressPercentage);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir la formation ${trainingName}`}
        onPress={() =>
          router.push(`/trainer/trainings/${progress.trainingId}` as Href)
        }
        android_ripple={{ color: "transparent" }}
        className="mb-4 rounded-[18px] border bg-white p-3"
        style={{
          borderColor: "#E2DCE6",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 7,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center">
          <View
            className="h-12 w-12 items-center justify-center rounded-[14px]"
            style={{ backgroundColor: theme.colors.surfaceSoft }}
          >
            <SymbolView
              name={{
                ios: "desktopcomputer",
                android: "computer",
                web: "computer",
              }}
              tintColor={theme.colors.accent}
              size={21}
              weight="bold"
            />
          </View>

          <View className="ml-3 min-w-0 flex-1">
            <Text
              className="text-[14px] font-black leading-[18px]"
              style={{ color: theme.colors.foreground }}
            >
              {trainingName}
            </Text>

            <View
              className="mt-1.5 self-start rounded-full px-2 py-1"
              style={{ backgroundColor: theme.colors.surfaceSoft }}
            >
              <Text
                className="text-[8px] font-black"
                style={{ color: theme.colors.accent }}
              >
                {progressStatusLabel(progress.status)}
              </Text>
            </View>
          </View>

          <SymbolView
            name={{
              ios: "chevron.right",
              android: "chevron_right",
              web: "chevron_right",
            }}
            tintColor={theme.colors.foregroundSubtle}
            size={15}
          />
        </View>

        <View className="mt-3 h-2 overflow-hidden rounded-full bg-[#ECE9F1]">
          <View
            className="h-full rounded-full"
            style={{
              width: `${progressValue}%`,
              backgroundColor: theme.colors.accent,
            }}
          />
        </View>

        <View className="mt-1.5 flex-row justify-end">
          <Text
            className="text-[12px] font-black"
            style={{ color: theme.colors.accent }}
          >
            {progressValue} %
          </Text>
        </View>

        <View className="mt-3 flex-row">
          <TrainingMini
            label="Leçons"
            value={`${progress.completedLessons ?? 0}/${progress.totalLessons ?? 0}`}
            icon={{
              ios: "doc.text.fill",
              android: "description",
              web: "description",
            }}
          />

          <TrainingMini
            label="Quiz"
            value={
              progress.completedQuizzes
                ? `${progress.averageScore ?? 0}%`
                : "Aucun"
            }
            icon={{
              ios: "questionmark.square.fill",
              android: "quiz",
              web: "quiz",
            }}
          />

          <TrainingMini
            label="Suivi"
            value={riskLabel(risk)}
            icon={{
              ios: "checkmark.seal.fill",
              android: "verified",
              web: "verified",
            }}
          />
        </View>
      </Pressable>
    );
  }

  function TrainingMini({
    label,
    value,
    icon,
  }: {
    label: string;
    value: string;
    icon: SymbolName;
  }) {
    return (
      <View className="flex-1 items-center">
        <SymbolView
          name={icon}
          tintColor={theme.colors.accent}
          size={13}
          weight="bold"
        />
        <Text
          className="mt-1 text-[8px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {label}
        </Text>
        <Text
          numberOfLines={1}
          className="mt-0.5 text-[10px] font-black"
          style={{ color: theme.colors.foreground }}
        >
          {value}
        </Text>
      </View>
    );
  }

  function Timeline({
    events,
  }: {
    events: typeof overview.recentEvents;
  }) {
    return (
      <View
        className="mb-4 rounded-[20px] border bg-white px-3 pb-2 pt-3"
        style={{
          borderColor: "#E2DCE6",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.05,
          shadowRadius: 9,
          elevation: 2,
        }}
      >
        {events.map((event, index) => {
          const training =
            event.trainingId != null
              ? trainingById.get(event.trainingId)
              : undefined;

          const score =
            event.score != null && event.totalPoints != null
              ? `Score : ${event.score}/${event.totalPoints}`
              : "";

          const description = [
            event.description || training || "",
            score,
          ]
            .filter(Boolean)
            .join(" • ");

          const visual = eventVisual(event.eventType);
          const palette = TONES[visual.tone];

          return (
            <View key={event.id} className="min-h-[74px] flex-row">
              <View className="w-[42px] items-center">
                <View
                  className="z-10 h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: palette.soft }}
                >
                  <SymbolView
                    name={visual.icon}
                    tintColor={palette.icon}
                    size={14}
                    weight="bold"
                  />
                </View>

                {index < events.length - 1 ? (
                  <View className="mt-1 w-px flex-1 bg-[#E4E5EB]" />
                ) : null}
              </View>

              <View className="ml-2 min-w-0 flex-1 pb-4">
                <Text
                  className="text-[12px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  {eventTypeLabel(event.eventType)}
                </Text>

                {description ? (
                  <Text
                    className="mt-0.5 text-[10px] leading-[15px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    {description}
                  </Text>
                ) : null}

                <Text
                  className="mt-1 text-[9px]"
                  style={{ color: theme.colors.foregroundSubtle }}
                >
                  {formatDate(event.eventDate)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  function SupportMenuCard({
    icon,
    tone,
    title,
    subtitle,
    children,
  }: {
    icon: SymbolName;
    tone: Tone;
    title: string;
    subtitle: string;
    children: ReactNode;
  }) {
    const palette = TONES[tone];

    return (
      <View
        className="mb-3 rounded-[18px] border bg-white p-3"
        style={{
          borderColor: "#E2DCE6",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 7,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center">
          <View
            className="h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: palette.soft }}
          >
            <SymbolView
              name={icon}
              tintColor={palette.icon}
              size={16}
              weight="bold"
            />
          </View>

          <View className="ml-2.5 flex-1">
            <Text
              className="text-[12px] font-black"
              style={{ color: theme.colors.foreground }}
            >
              {title}
            </Text>
            <Text
              className="mt-0.5 text-[9px]"
              style={{ color: theme.colors.foregroundMuted }}
            >
              {subtitle}
            </Text>
          </View>
        </View>

        <View className="mt-3 gap-2">{children}</View>
      </View>
    );
  }

  function InlineEmpty({ text }: { text: string }) {
    return (
      <Text
        className="py-1 text-[9px] leading-[14px]"
        style={{ color: theme.colors.foregroundMuted }}
      >
        {text}
      </Text>
    );
  }

  function EmptyCard({ text }: { text: string }) {
    return (
      <View
        className="rounded-[18px] border bg-white p-4"
        style={{
          borderColor: "#E2DCE6",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 7,
          elevation: 2,
        }}
      >
        <Text
          className="text-[10px] leading-[15px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {text}
        </Text>
      </View>
    );
  }
}

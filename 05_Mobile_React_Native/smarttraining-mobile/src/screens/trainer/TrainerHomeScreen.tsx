import { SymbolView } from "expo-symbols";
import { Href, router } from "expo-router";
import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { API_BASE_URL } from "../../api/apiConfig";
import AppButton from "../../components/AppButton";
import SmartTrainingBrandMark from "../../components/branding/SmartTrainingBrandMark";
import ScreenContainer from "../../components/ScreenContainer";
import {
  AppEmptyState,
  AppErrorState,
  AppLoadingState,
} from "../../components/ux/AppStates";
import { getMyProfile } from "../../features/auth/learnerProfileService";
import { getTrainerDashboardSummary } from "../../features/trainer/trainerDashboardService";
import { getTrainerGroups } from "../../features/trainer/trainerGroupService";
import {
  getTrainerLearner360,
  getTrainerLearners,
} from "../../features/trainer/trainerLearnerService";
import { getTrainerSupportSessions } from "../../features/trainer/trainerActionService";
import {
  computeTrainingMetrics,
  getTrainerTrainingEnrollments,
  getTrainerTrainings,
} from "../../features/trainer/trainerTrainingService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type { ConnectedUser } from "../../types/auth";
import type { LearnerProfile } from "../../types/learnerProfile";
import type { TrainerSupportSessionListItem } from "../../types/trainerActionMobile";
import type { TrainerLearnerGroup } from "../../types/trainerGroupMobile";
import type {
  TrainerLearner360Data,
  TrainerLearnerEvent,
  TrainerLearnerListItem,
  TrainerLearnerRisk,
} from "../../types/trainerLearnerMobile";
import type {
  TrainerDashboardSummary,
  TrainerTraining,
  TrainerTrainingMetrics,
} from "../../types/trainerMobile";

type Props = {
  user: ConnectedUser;
  onCreateTraining: () => void;
  onImportScorm: () => void;
  onOpenTrainings: () => void;
  onOpenTraining: (trainingId: number) => void;
  onOpenLearners: () => void;
  onOpenLearner: (learnerId: number) => void;
  onOpenAlerts: () => void;
  onOpenGroups: () => void;
  onOpenGroup: (groupId: number) => void;
  onOpenSupportSessions: () => void;
  onOpenSupportSession: (sessionId: number) => void;
};

type TrainingRow = {
  training: TrainerTraining;
  metrics: TrainerTrainingMetrics | null;
};

type TrainingRowsResult = {
  items: TrainingRow[];
  metricsFailures: number;
};

type DashboardData = {
  summary: TrainerDashboardSummary | null;
  trainings: TrainingRow[];
  learners: TrainerLearnerListItem[];
  learner360: TrainerLearner360Data[];
  groups: TrainerLearnerGroup[];
  sessions: TrainerSupportSessionListItem[];
  referenceNow: number;
  degradedSections: string[];
};

type PriorityLearner = {
  data: TrainerLearner360Data;
  risk: TrainerLearnerRisk | null;
  score: number;
};

type ActivityRow = {
  event: TrainerLearnerEvent;
  learnerName: string;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];

function resolveMediaUrl(value?: string | null): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const base = API_BASE_URL.replace(/\/api\/?$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

function safeTimestamp(value?: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "Date non disponible";
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

function formatSessionDay(value?: string | null): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(date);
}

function formatSessionMonth(value?: string | null): string {
  if (!value) return "---";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "---";
  return new Intl.DateTimeFormat("fr-FR", { month: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase();
}

function formatSessionTime(value?: string | null): string {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function displayName(user: ConnectedUser): string {
  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || user.email;
}

function dynamicGreeting(date = new Date()): string {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return "Bonjour";
  }

  if (hour >= 12 && hour < 18) {
    return "Bon après-midi";
  }

  return "Bonsoir";
}

function greetingEmoji(date = new Date()): string {
  const hour = date.getHours();

  if (hour >= 5 && hour < 18) {
    return "👋";
  }

  return "🌙";
}

function profileInitials(
  profile: LearnerProfile | null,
  user: ConnectedUser,
): string {
  const first = (profile?.firstName || user.firstName || "")
    .trim()
    .charAt(0);
  const last = (profile?.lastName || user.lastName || "")
    .trim()
    .charAt(0);
  const initials = `${first}${last}`.toUpperCase();

  return initials || displayName(user).slice(0, 2).toUpperCase();
}

function learnerName(data: TrainerLearner360Data): string {
  return (
    data.identity.fullName ||
    [data.identity.firstName, data.identity.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    data.identity.email
  );
}

function learnerInitials(data: TrainerLearner360Data): string {
  const name = learnerName(data).trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
  return initials || data.identity.email.slice(0, 2).toUpperCase();
}

function trainingStatusLabel(value: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Brouillon",
    PUBLISHED: "Publiée",
    ARCHIVED: "Archivée",
  };

  return labels[value] || value;
}

function eventLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    TRAINING_OPENED: "Formation ouverte",
    MODULE_OPENED: "Module ouvert",
    LESSON_OPENED: "Leçon ouverte",
    RESOURCE_OPENED: "Ressource ouverte",
    VIDEO_OPENED: "Vidéo ouverte",
    QUIZ_SUBMITTED: "Quiz envoyé",
    SCORE_RECORDED: "Score enregistré",
  };

  return value
    ? labels[value] || "Activité d’apprentissage"
    : "Activité d’apprentissage";
}

function riskRank(value?: string | null): number {
  if (value === "HIGH") return 4;
  if (value === "MEDIUM") return 3;
  if (value === "LOW") return 2;
  if (value === "DATA_INSUFFICIENT") return 1;
  return 0;
}

function selectRisk(data: TrainerLearner360Data): TrainerLearnerRisk | null {
  return (
    [...data.overview.risks].sort((a, b) => {
      const level = riskRank(b.riskLevel) - riskRank(a.riskLevel);
      if (level !== 0) return level;
      return (b.riskScore ?? 0) - (a.riskScore ?? 0);
    })[0] ?? null
  );
}

function priorityScore(
  data: TrainerLearner360Data,
  risk: TrainerLearnerRisk | null,
): number {
  return (
    riskRank(risk?.riskLevel) * 1000 +
    Math.round((risk?.riskScore ?? 0) * 100) +
    data.overview.summary.openAlerts * 100 +
    data.overview.summary.helpRequests * 50 +
    Math.max(0, 100 - data.overview.summary.averageProgress)
  );
}

function isInsufficient(risk: TrainerLearnerRisk | null): boolean {
  return (
    risk?.riskLevel === "DATA_INSUFFICIENT" ||
    risk?.dataStatus === "INSUFFICIENT" ||
    risk?.dataStatus === "DATA_INSUFFICIENT"
  );
}

function trainingTitleById(
  trainings: TrainingRow[],
  trainingId?: number | null,
): string {
  if (!trainingId) {
    return "Formation non précisée";
  }

  return (
    trainings.find((item) => item.training.id === trainingId)?.training.title ||
    `Formation ${trainingId}`
  );
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function fetchTrainingRows(
  trainerId: number,
): Promise<TrainingRowsResult> {
  const trainings = await getTrainerTrainings(trainerId);
  const enrollmentResults = await Promise.allSettled(
    trainings.map((training) => getTrainerTrainingEnrollments(training.id)),
  );

  let metricsFailures = 0;
  const items = trainings.map((training, index) => {
    const result = enrollmentResults[index];

    if (result.status === "fulfilled") {
      return {
        training,
        metrics: computeTrainingMetrics(result.value),
      };
    }

    metricsFailures += 1;
    return {
      training,
      metrics: null,
    };
  });

  return { items, metricsFailures };
}

async function fetchDashboard(trainerId: number): Promise<DashboardData> {
  const [
    summaryResult,
    trainingsResult,
    learnersResult,
    groupsResult,
    sessionsResult,
  ] = await Promise.allSettled([
    getTrainerDashboardSummary(trainerId),
    fetchTrainingRows(trainerId),
    getTrainerLearners(trainerId),
    getTrainerGroups(),
    getTrainerSupportSessions(trainerId),
  ]);

  const degradedSections: string[] = [];

  const summary =
    summaryResult.status === "fulfilled" ? summaryResult.value : null;
  if (summaryResult.status === "rejected") degradedSections.push("indicateurs");

  const trainings =
    trainingsResult.status === "fulfilled" ? trainingsResult.value.items : [];
  if (trainingsResult.status === "rejected") {
    degradedSections.push("formations");
  } else if (trainingsResult.value.metricsFailures > 0) {
    degradedSections.push("progression formations");
  }

  const learners =
    learnersResult.status === "fulfilled" ? learnersResult.value : [];
  if (learnersResult.status === "rejected") degradedSections.push("apprenants");

  const groups = groupsResult.status === "fulfilled" ? groupsResult.value : [];
  if (groupsResult.status === "rejected") degradedSections.push("groupes");

  const sessions =
    sessionsResult.status === "fulfilled" ? sessionsResult.value : [];
  if (sessionsResult.status === "rejected") degradedSections.push("séances");

  const learner360: TrainerLearner360Data[] = [];
  let learner360Failures = 0;

  for (let index = 0; index < learners.length; index += 8) {
    const batch = learners.slice(index, index + 8);
    const batchResults = await Promise.allSettled(
      batch.map((item) => getTrainerLearner360(trainerId, item.identity.id)),
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        learner360.push(result.value);
      } else {
        learner360Failures += 1;
      }
    }
  }

  if (learner360Failures > 0) {
    degradedSections.push("suivi 360");
  }

  if (summary?.degradedSections.length) {
    degradedSections.push(...summary.degradedSections);
  }

  return {
    summary,
    trainings,
    learners,
    learner360,
    groups,
    sessions,
    referenceNow: Date.now(),
    degradedSections: Array.from(new Set(degradedSections)),
  };
}

function SectionHeading({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

  const sectionBarColor: Record<string, string> = {
    "Indicateurs clés": "#7C3AED",
    "Apprenants prioritaires": "#EF4444",
    "Séances à venir": "#D97706",
    "Mes formations": "#2563EB",
    "Activité récente": "#16A36A",
    "Groupes actifs": "#7C3AED",
  };

  const barColor =
    sectionBarColor[title] || "#7C3AED";

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-start">
          <View
            className="mr-3 mt-1 h-9 w-1.5 rounded-full"
            style={{
              backgroundColor: barColor,
            }}
          />

          <View className="min-w-0 flex-1">
            <Text
              className="text-[20px] font-black tracking-[-0.3px]"
              style={{ color: theme.colors.foreground }}
            >
              {title}
            </Text>

            <Text
              className="mt-1 text-[13px] leading-[18px]"
              style={{ color: theme.colors.foregroundMuted }}
            >
              {subtitle}
            </Text>
          </View>
        </View>

        {onPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Voir tout — ${title}`}
            onPress={onPress}
            hitSlop={8}
            android_ripple={{ color: "transparent" }}
            className="mb-0.5 flex-row items-center rounded-full border border-violet-100 bg-white px-3 py-2"
          >
            <Text className="text-[12px] font-extrabold text-violet-700">
              Voir tout
            </Text>
            <Text className="ml-1 text-[17px] font-bold leading-[17px] text-violet-700">
              ›
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function DashboardMetricCard({
  label,
  value,
  icon,
  color,
  background,
}: {
  label: string;
  value: string | number;
  icon: SymbolName;
  color: string;
  background: string;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      accessible
      accessibilityLabel={`${label} : ${value}`}
      className="w-[48.5%] rounded-[22px] border bg-white px-3.5 py-3.5"
      style={{
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.035,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View
          className="h-9 w-9 items-center justify-center rounded-[13px]"
          style={{ backgroundColor: background }}
        >
          <SymbolView name={icon} tintColor={color} size={18} weight="bold" />
        </View>
        <Text
          className="text-[24px] font-black leading-[28px] tracking-[-0.7px]"
          style={{ color: theme.colors.foreground }}
        >
          {value}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        className="mt-3 text-[11px] font-extrabold"
        style={{ color: theme.colors.foregroundMuted }}
      >
        {label}
      </Text>
    </View>
  );
}

function PriorityLearnerCard({
  learner,
  risk,
  trainings,
  onPress,
}: {
  learner: TrainerLearner360Data;
  risk: TrainerLearnerRisk | null;
  trainings: TrainingRow[];
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();
  const progress = clampProgress(
    risk?.averageProgress ?? learner.overview.summary.averageProgress,
  );
  const insufficient = isInsufficient(risk);
  const alerts = learner.overview.summary.openAlerts;
  const helpRequests = learner.overview.summary.helpRequests;
  const name = learnerName(learner);
  const trainingTitle = trainingTitleById(trainings, risk?.trainingId);

  const riskLabel = insufficient
    ? "Données limitées"
    : risk?.riskLevel === "HIGH"
      ? "Risque élevé"
      : risk?.riskLevel === "MEDIUM"
        ? "Risque moyen"
        : risk?.riskLevel === "LOW"
          ? "Risque faible"
          : "À examiner";

  const riskColor = insufficient
    ? "#667085"
    : risk?.riskLevel === "HIGH"
      ? "#DC2626"
      : risk?.riskLevel === "MEDIUM"
        ? "#D97706"
        : risk?.riskLevel === "LOW"
          ? "#16A36A"
          : "#7C3AED";

  const riskBackground = insufficient
    ? "#F2F4F7"
    : risk?.riskLevel === "HIGH"
      ? "#FEF2F2"
      : risk?.riskLevel === "MEDIUM"
        ? "#FFF7ED"
        : risk?.riskLevel === "LOW"
          ? "#ECFDF3"
          : "#F5F3FF";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir le suivi de ${name}`}
      onPress={onPress}
      android_ripple={{ color: "transparent" }}
      className="mb-3 rounded-[22px] border bg-white p-3.5"
      style={{
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.035,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
      }}
    >
      <View className="flex-row items-center">
        {learner.identity.avatarDataUrl ? (
          <Image
            source={{ uri: learner.identity.avatarDataUrl }}
            className="h-11 w-11 rounded-[15px]"
            accessibilityLabel={`Avatar de ${name}`}
          />
        ) : (
          <View className="h-11 w-11 items-center justify-center rounded-[15px] bg-violet-100">
            <Text className="text-[13px] font-black text-violet-700">
              {learnerInitials(learner)}
            </Text>
          </View>
        )}

        <View className="ml-3 min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className="text-[14px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {name}
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className="mt-0.5 text-[11px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {learner.identity.email}
          </Text>
        </View>

        <View className="ml-2 rounded-full px-2.5 py-1" style={{ backgroundColor: riskBackground }}>
          <Text className="text-[9px] font-black" style={{ color: riskColor }}>
            {riskLabel}
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center">
        <Text className="w-[72px] text-[10px] font-bold" style={{ color: theme.colors.foregroundMuted }}>
          Progression
        </Text>
        <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EDE9E3]">
          <View className="h-1.5 rounded-full bg-violet-600" style={{ width: `${progress}%` as `${number}%` }} />
        </View>
        <Text className="ml-2 w-[34px] text-right text-[10px] font-black text-violet-700">
          {progress}%
        </Text>
      </View>

      <View className="mt-3 flex-row items-center border-t border-[#F1EDE8] pt-3">
        <SymbolView name={{ ios: "book.closed", android: "menu_book", web: "menu_book" }} tintColor="#7C3AED" size={14} />
        <Text numberOfLines={1} className="ml-2 flex-1 text-[10px] font-semibold" style={{ color: theme.colors.foregroundMuted }}>
          {trainingTitle}
        </Text>
        {alerts > 0 ? <Text className="ml-2 text-[9px] font-black text-red-600">{alerts}A</Text> : null}
        {helpRequests > 0 ? <Text className="ml-2 text-[9px] font-black text-amber-600">{helpRequests}H</Text> : null}
        <Text className="ml-2 text-[18px] font-bold text-violet-600">›</Text>
      </View>
    </Pressable>
  );
}

function SessionCard({
  item,
  onPress,
}: {
  item: TrainerSupportSessionListItem;
  referenceNow?: number;
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir la séance ${item.session.title}`}
      onPress={onPress}
      android_ripple={{ color: "transparent" }}
      className="mb-3 flex-row items-center rounded-[22px] border bg-white p-3.5"
      style={{
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.035,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
      }}
    >
      <View className="w-[54px] overflow-hidden rounded-[17px] bg-violet-50">
        <View className="items-center bg-violet-600 py-1">
          <Text className="text-[9px] font-black text-white">
            {formatSessionMonth(item.session.scheduledAt)}
          </Text>
        </View>
        <Text className="mt-1.5 text-center text-[22px] font-black leading-[24px] text-slate-900">
          {formatSessionDay(item.session.scheduledAt)}
        </Text>
        <Text className="mb-1.5 mt-0.5 text-center text-[9px] font-extrabold text-violet-700">
          {formatSessionTime(item.session.scheduledAt)}
        </Text>
      </View>

      <View className="ml-3 min-w-0 flex-1">
        <View className="flex-row items-start gap-2">
          <Text numberOfLines={2} className="flex-1 text-[14px] font-black leading-[18px]" style={{ color: theme.colors.foreground }}>
            {item.session.title}
          </Text>
          <View className="rounded-full bg-violet-50 px-2 py-1">
            <Text className="text-[8px] font-black text-violet-700">Planifiée</Text>
          </View>
        </View>

        <Text numberOfLines={1} className="mt-2 text-[10px] font-semibold" style={{ color: theme.colors.foregroundMuted }}>
          {item.learner?.fullName || item.learner?.email || "Apprenant"}
        </Text>
        <Text numberOfLines={1} className="mt-1 text-[10px]" style={{ color: theme.colors.foregroundSubtle }}>
          {item.training?.title || "Formation"}
        </Text>
      </View>

      <View className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-violet-50">
        <Text className="text-[22px] font-bold text-violet-700">›</Text>
      </View>
    </Pressable>
  );
}

function TrainingCard({
  item,
  onPress,
}: {
  item: TrainingRow;
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();
  const cover = resolveMediaUrl(item.training.coverImageUrl);
  const progress = item.metrics ? clampProgress(item.metrics.averageProgress) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir la formation ${item.training.title}`}
      onPress={onPress}
      android_ripple={{ color: "transparent" }}
      className="mb-3 overflow-hidden rounded-[22px] border bg-white"
      style={{
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.035,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
      }}
    >
      <View className="flex-row">
        {cover ? (
          <Image source={{ uri: cover }} className="h-[112px] w-[112px] bg-violet-50" resizeMode="cover" accessibilityLabel={`Couverture ${item.training.title}`} />
        ) : (
          <View className="h-[112px] w-[112px] items-center justify-center bg-violet-100">
            <SymbolView name={{ ios: "book.pages.fill", android: "menu_book", web: "menu_book" }} tintColor="#7C3AED" size={25} weight="bold" />
          </View>
        )}

        <View className="min-w-0 flex-1 p-3.5">
          <View className="flex-row items-center justify-between gap-2">
            <View className="rounded-full bg-violet-50 px-2 py-1">
              <Text className="text-[8px] font-black uppercase text-violet-700">{trainingStatusLabel(item.training.status)}</Text>
            </View>
            {item.training.category ? (
              <Text numberOfLines={1} className="max-w-[48%] text-[9px] font-bold" style={{ color: theme.colors.foregroundSubtle }}>
                {item.training.category}
              </Text>
            ) : null}
          </View>

          <Text numberOfLines={2} className="mt-2 text-[14px] font-black leading-[18px]" style={{ color: theme.colors.foreground }}>
            {item.training.title}
          </Text>

          <View className="mt-auto pt-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-[9px] font-bold" style={{ color: theme.colors.foregroundMuted }}>
                {item.metrics ? `${item.metrics.learners} apprenant${item.metrics.learners > 1 ? "s" : ""}` : "Données indisponibles"}
              </Text>
              {progress !== null ? <Text className="text-[9px] font-black text-violet-700">{progress}%</Text> : null}
            </View>
            {progress !== null ? (
              <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#EEEAE5]">
                <View className="h-1.5 rounded-full bg-violet-600" style={{ width: `${progress}%` as `${number}%` }} />
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function ActivityCard({
  row,
  trainings,
  isLast,
}: {
  row: ActivityRow;
  trainings: TrainingRow[];
  isLast: boolean;
}) {
  const { theme } = useSmartTrainingTheme();
  const { event, learnerName: name } = row;
  const details = [
    event.description || null,
    event.trainingId ? trainingTitleById(trainings, event.trainingId) : null,
  ].filter(Boolean).join(" • ");

  return (
    <View className="flex-row">
      <View className="w-6 items-center">
        <View className="mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-violet-100 bg-violet-600" />
        {!isLast ? <View className="w-[1.5px] flex-1 bg-violet-100" /> : null}
      </View>
      <View className="mb-3 flex-1 rounded-[18px] border bg-white px-3.5 py-3" style={{ borderColor: theme.colors.border }}>
        <Text numberOfLines={1} className="text-[12px] font-black" style={{ color: theme.colors.foreground }}>
          {name} — {eventLabel(event.eventType)}
        </Text>
        {details ? <Text numberOfLines={2} className="mt-1 text-[10px] leading-[14px]" style={{ color: theme.colors.foregroundMuted }}>{details}</Text> : null}
        <Text className="mt-1.5 text-[9px] font-bold text-violet-600">{formatDateTime(event.eventDate)}</Text>
      </View>
    </View>
  );
}

function GroupCard({
  group,
  onPress,
}: {
  group: TrainerLearnerGroup;
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir le groupe ${group.name}`}
      onPress={onPress}
      android_ripple={{ color: "transparent" }}
      className="mb-3 flex-row items-center rounded-[22px] border bg-white p-3.5"
      style={{
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.035,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
      }}
    >
      <View className="h-11 w-11 items-center justify-center rounded-[15px] bg-violet-100">
        <SymbolView name={{ ios: "person.3.fill", android: "groups", web: "groups" }} tintColor="#7C3AED" size={20} weight="bold" />
      </View>

      <View className="ml-3 min-w-0 flex-1">
        <Text numberOfLines={1} className="text-[14px] font-black" style={{ color: theme.colors.foreground }}>
          {group.name}
        </Text>
        <Text numberOfLines={1} className="mt-1 text-[10px]" style={{ color: theme.colors.foregroundMuted }}>
          {group.description || "Cohorte active"}
        </Text>
      </View>

      <View className="ml-2 items-end">
        <Text className="text-[18px] font-black text-violet-700">{group.memberCount}</Text>
        <Text className="text-[8px] font-black uppercase tracking-[0.5px] text-violet-500">membres</Text>
      </View>
      <Text className="ml-2 text-[20px] font-bold text-violet-600">›</Text>
    </Pressable>
  );
}

export default function TrainerHomeScreen({
  user,
  onCreateTraining,
  onImportScorm,
  onOpenTrainings,
  onOpenTraining,
  onOpenLearners,
  onOpenLearner,
  onOpenAlerts,
  onOpenGroups,
  onOpenGroup,
  onOpenSupportSessions,
  onOpenSupportSession,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fatalError, setFatalError] = useState("");
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    void fetchDashboard(user.userId)
      .then((loaded) => {
        if (active) {
          setData(loaded);
          setFatalError("");
        }
      })
      .catch(() => {
        if (active) {
          setFatalError("Impossible de charger le tableau de bord formateur.");
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
  }, [user.userId]);

  useEffect(() => {
    let active = true;

    void getMyProfile()
      .then((loadedProfile) => {
        if (active && loadedProfile.role === "FORMATEUR") {
          setProfile(loadedProfile);
        }
      })
      .catch(() => {
        // Le dashboard reste utilisable avec les données de session ;
        // l’avatar retombera simplement sur les initiales.
      });

    return () => {
      active = false;
    };
  }, []);

  async function refresh() {
    if (!mountedRef.current) return;
    setRefreshing(true);

    try {
      const loaded = await fetchDashboard(user.userId);
      if (!mountedRef.current) return;
      setData(loaded);
      setFatalError("");
    } catch {
      if (mountedRef.current) {
        setFatalError("Impossible d’actualiser le tableau de bord formateur.");
      }
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }

  const visibleTrainings = useMemo(() => {
    if (!data) return [];

    return [...data.trainings]
      .sort((a, b) => {
        const published =
          Number(b.training.status === "PUBLISHED") -
          Number(a.training.status === "PUBLISHED");
        if (published !== 0) return published;
        return (
          safeTimestamp(b.training.updatedAt) -
          safeTimestamp(a.training.updatedAt)
        );
      })
      .slice(0, 2);
  }, [data]);

  const priorities = useMemo<PriorityLearner[]>(() => {
    if (!data) return [];

    return data.learner360
      .map((item) => {
        const risk = selectRisk(item);
        return {
          data: item,
          risk,
          score: priorityScore(item, risk),
        };
      })
      .filter(
        (item) =>
          item.risk !== null ||
          item.data.overview.summary.openAlerts > 0 ||
          item.data.overview.summary.helpRequests > 0,
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
  }, [data]);

  const activities = useMemo<ActivityRow[]>(() => {
    if (!data) return [];

    return data.learner360
      .flatMap((item) =>
        item.overview.recentEvents.map((event) => ({
          event,
          learnerName: learnerName(item),
        })),
      )
      .sort(
        (a, b) =>
          safeTimestamp(b.event.eventDate) - safeTimestamp(a.event.eventDate),
      )
      .slice(0, 3);
  }, [data]);

  const upcomingSessions = useMemo(() => {
    if (!data) return [];

    return data.sessions
      .filter((item) => item.session.status === "SCHEDULED")
      .sort(
        (a, b) =>
          safeTimestamp(a.session.scheduledAt) -
          safeTimestamp(b.session.scheduledAt),
      );
  }, [data]);

  const activeGroups = useMemo(() => {
    if (!data) return [];

    return [...data.groups]
      .filter((group) => group.memberCount > 0)
      .sort((a, b) => b.memberCount - a.memberCount);
  }, [data]);

  const totalLearners = data?.learners.length ?? 0;
  const summary = data?.summary;
  const referenceNow = data?.referenceNow;

  if (loading) {
    return (
      <ScreenContainer>
        <AppLoadingState label="Ouverture de l’espace formateur…" />
      </ScreenContainer>
    );
  }

  if (!data && fatalError) {
    return (
      <ScreenContainer>
        <AppErrorState
          description={fatalError}
          actionLabel="Réessayer"
          onAction={() => void refresh()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      edges={["left", "right"]}
      style={{ padding: 0, backgroundColor: theme.colors.background }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
      >
        {/* HERO */}
        <View
          className="overflow-hidden rounded-[24px] border bg-white p-4"
          style={{
            borderColor: theme.colors.border,
            shadowColor: theme.colors.shadow,
            shadowOpacity: 0.045,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="rounded-[14px] bg-[#FAF8F5] p-1.5">
                <SmartTrainingBrandMark size={34} />
              </View>
              <View className="ml-2.5 rounded-full bg-violet-50 px-2.5 py-1">
                <Text className="text-[9px] font-black uppercase tracking-[1px] text-violet-700">Espace formateur</Text>
              </View>
            </View>

            <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir Mon compte" hitSlop={8} onPress={() => router.push("/trainer/profile" as Href)} android_ripple={{ color: "transparent" }}>
              {profile?.avatarDataUrl ? (
                <Image source={{ uri: profile.avatarDataUrl }} className="h-12 w-12 rounded-[16px] border-2 border-violet-100" accessibilityLabel="Photo du profil formateur" />
              ) : (
                <View className="h-12 w-12 items-center justify-center rounded-[16px] border-2 border-violet-100 bg-violet-50">
                  <Text className="text-[13px] font-black text-violet-700">{profileInitials(profile, user)}</Text>
                </View>
              )}
            </Pressable>
          </View>

          <Text className="mt-3 text-[24px] font-black leading-[28px] tracking-[-0.7px]" style={{ color: theme.colors.foreground }}>
            {dynamicGreeting()} {displayName(user)} {greetingEmoji()}
          </Text>
          <Text className="mt-1.5 text-[12px] leading-[18px]" style={{ color: theme.colors.foregroundMuted }}>
            Pilotez vos formations et repérez rapidement les apprenants à accompagner.
          </Text>

          <View className="mt-4 gap-2.5">
            <AppButton title="Créer une formation" onPress={onCreateTraining} style={{ width: "100%" }} />
            <AppButton title="Importer un SCORM" onPress={onImportScorm} variant="secondary" style={{ width: "100%" }} />
          </View>
        </View>

        {fatalError ? (
          <View className="mt-4">
            <AppErrorState
              title="Actualisation incomplète"
              description={fatalError}
              actionLabel="Réessayer"
              onAction={() => void refresh()}
            />
          </View>
        ) : null}

        {data?.degradedSections.length ? (
          <View className="mt-4">
            <AppErrorState
              title="Certaines données sont indisponibles"
              description={`Sections concernées : ${data.degradedSections.join(", ")}. Les données disponibles restent affichées.`}
              actionLabel="Actualiser"
              onAction={() => void refresh()}
            />
          </View>
        ) : null}

        {/* INDICATEURS */}
        <View className="mt-7">
          <SectionHeading title="Indicateurs clés" subtitle="Une vue compacte de votre activité." />
          <View className="flex-row flex-wrap justify-between gap-y-3">
            <DashboardMetricCard
              label="Formations"
              value={summary?.trainings ?? data?.trainings.length ?? "—"}
              icon={{ ios: "book.pages.fill", android: "menu_book", web: "menu_book" }}
              color="#7C3AED"
              background="#F3EEFF"
            />
            <DashboardMetricCard
              label="Apprenants suivis"
              value={totalLearners}
              icon={{ ios: "person.2.fill", android: "group", web: "group" }}
              color="#2563EB"
              background="#EFF6FF"
            />
            <DashboardMetricCard
              label="Formations publiées"
              value={summary?.publishedTrainings ?? data?.trainings.filter((item) => item.training.status === "PUBLISHED").length ?? "—"}
              icon={{ ios: "checkmark.seal.fill", android: "verified", web: "verified" }}
              color="#16A36A"
              background="#ECFDF3"
            />
            <DashboardMetricCard
              label="Alertes ouvertes"
              value={summary?.openAlerts ?? "—"}
              icon={{ ios: "exclamationmark.triangle.fill", android: "warning", web: "warning" }}
              color="#DC2626"
              background="#FEF2F2"
            />
            <DashboardMetricCard
              label="Séances planifiées"
              value={summary?.scheduledSessions ?? upcomingSessions.length}
              icon={{ ios: "calendar.badge.clock", android: "event", web: "event" }}
              color="#D97706"
              background="#FFF7ED"
            />
            <DashboardMetricCard
              label="Groupes actifs"
              value={activeGroups.length}
              icon={{ ios: "person.3.fill", android: "groups", web: "groups" }}
              color="#7C3AED"
              background="#F5F3FF"
            />
          </View>
        </View>

        {/* APPRENANTS PRIORITAIRES */}
        <View className="mt-7">
          <SectionHeading
            title="Apprenants prioritaires"
            subtitle="Les situations qui demandent votre attention maintenant."
            onPress={onOpenLearners}
          />

          {priorities.length ? (
            priorities.map(({ data: learnerData, risk }) => (
              <PriorityLearnerCard
                key={learnerData.identity.id}
                learner={learnerData}
                risk={risk}
                trainings={data?.trainings ?? []}
                onPress={() => onOpenLearner(learnerData.identity.id)}
              />
            ))
          ) : (
            <AppEmptyState
              title="Aucune situation prioritaire détectée"
              description="Les suivis 360 disponibles ne remontent actuellement ni risque, ni alerte, ni demande d’aide prioritaire."
              actionLabel="Ouvrir les alertes"
              onAction={onOpenAlerts}
            />
          )}
        </View>

        {/* SEANCES */}
        <View className="mt-7">
          <SectionHeading
            title="Séances à venir"
            subtitle="Vos prochains rendez-vous d’accompagnement."
            onPress={onOpenSupportSessions}
          />

          {upcomingSessions.length ? (
            upcomingSessions.slice(0, 2).map((item) => (
              <SessionCard
                key={item.session.id}
                item={item}
                referenceNow={referenceNow}
                onPress={() => onOpenSupportSession(item.session.id)}
              />
            ))
          ) : (
            <AppEmptyState
              title="Aucune séance planifiée"
              description="Aucune séance d’accompagnement au statut SCHEDULED n’est disponible."
              actionLabel="Gérer les séances"
              onAction={onOpenSupportSessions}
            />
          )}
        </View>

        {/* FORMATIONS */}
        <View className="mt-7">
          <SectionHeading
            title="Mes formations"
            subtitle="Vos contenus récents et leur niveau d’avancement."
            onPress={onOpenTrainings}
          />

          {visibleTrainings.length ? (
            visibleTrainings.map((item) => (
              <TrainingCard
                key={item.training.id}
                item={item}
                onPress={() => onOpenTraining(item.training.id)}
              />
            ))
          ) : (
            <AppEmptyState
              title="Aucune formation à afficher"
              description="Créez une formation ou importez un package SCORM pour commencer."
              actionLabel="Créer une formation"
              onAction={onCreateTraining}
            />
          )}
        </View>

        {/* ACTIVITE */}
        <View className="mt-7">
          <SectionHeading
            title="Activité récente"
            subtitle="Les derniers événements d’apprentissage remontés."
          />

          {activities.length ? (
            activities.map((row, index) => (
              <ActivityCard
                key={`${row.event.learnerId}-${row.event.id}`}
                row={row}
                trainings={data?.trainings ?? []}
                isLast={index === activities.length - 1}
              />
            ))
          ) : (
            <AppEmptyState
              title="Aucune activité récente disponible"
              description="Aucun événement d’apprentissage récent n’est remonté dans les suivis 360 actuellement chargés."
            />
          )}
        </View>

        {/* GROUPES */}
        <View className="mt-7">
          <SectionHeading
            title="Groupes actifs"
            subtitle="Vos cohortes les plus actives, avec leur effectif."
            onPress={onOpenGroups}
          />

          {activeGroups.length ? (
            activeGroups.slice(0, 2).map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onPress={() => onOpenGroup(group.id)}
              />
            ))
          ) : (
            <AppEmptyState
              title="Aucun groupe actif"
              description="Aucun groupe contenant des membres n’est actuellement disponible."
              actionLabel="Ouvrir les groupes"
              onAction={onOpenGroups}
            />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

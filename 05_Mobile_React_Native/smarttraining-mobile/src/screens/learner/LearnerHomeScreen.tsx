import { Href, router } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { API_BASE_URL } from "../../api/apiConfig";
import SmartTrainingBrandMark from "../../components/branding/SmartTrainingBrandMark";
import ScreenContainer from "../../components/ScreenContainer";
import {
  AppEmptyState,
  AppErrorState,
  AppLoadingState,
} from "../../components/ux/AppStates";
import {
  getMyProgress,
  getMyRecommendations,
  getMyRiskIndicator,
} from "../../features/analytics/analyticsService";
import { getMyProfile } from "../../features/auth/learnerProfileService";
import { getMyCertificates } from "../../features/trainings/learnerCertificateService";
import { getMyLearnerTrainings } from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type { ConnectedUser } from "../../types/auth";
import type { LearnerProfile } from "../../types/learnerProfile";

type LearnerTraining =
  Awaited<ReturnType<typeof getMyLearnerTrainings>>[number];

type LearnerProgress =
  Awaited<ReturnType<typeof getMyProgress>>[number];

type Recommendation =
  Awaited<ReturnType<typeof getMyRecommendations>>[number];

type Certificate =
  Awaited<ReturnType<typeof getMyCertificates>>[number];

type RiskIndicator =
  Awaited<ReturnType<typeof getMyRiskIndicator>>;

type LearnerHomeScreenProps = {
  user: ConnectedUser;
  onOpenCatalog: () => void;
  onOpenInvitations: () => void;
  onOpenTrainings: () => void;
  onOpenTraining: (trainingId: number) => void;
  onOpenProgress: () => void;
  onOpenRecommendations: () => void;
  onOpenCertificates: () => void;
  onOpenReviewsFeedback: () => void;
  onOpenSessions: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
};

type DashboardResults = Awaited<
  ReturnType<typeof fetchDashboardResults>
>;

type SymbolName = ComponentProps<typeof SymbolView>["name"];

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
  const firstName = (
    profile?.firstName ||
    user.firstName ||
    ""
  )
    .trim()
    .charAt(0);

  const lastName = (
    profile?.lastName ||
    user.lastName ||
    ""
  )
    .trim()
    .charAt(0);

  const initials = `${firstName}${lastName}`.toUpperCase();

  if (initials) {
    return initials;
  }

  return (
    (user.email || "?")
      .trim()
      .charAt(0)
      .toUpperCase() || "?"
  );
}

function clampProgress(value?: number | null): number {
  return Math.min(
    100,
    Math.max(0, Math.round(value ?? 0)),
  );
}

function sortableDate(
  value?: string | null,
  missing = Number.POSITIVE_INFINITY,
): number {
  if (!value) {
    return missing;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? missing : parsed;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "Date non disponible";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatDateTime(value?: string | null): string {
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

function resolveCoverUrl(
  training: LearnerTraining,
): string | null {
  const withCover = training as LearnerTraining & {
    coverImageUrl?: string | null;
  };

  const value = withCover.coverImageUrl?.trim();

  if (!value) {
    return null;
  }

  if (
    /^https?:\/\//i.test(value) ||
    value.startsWith("data:") ||
    value.startsWith("file:")
  ) {
    return value;
  }

  const apiRoot = API_BASE_URL
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");

  return `${apiRoot}${
    value.startsWith("/") ? "" : "/"
  }${value}`;
}

function nextStepLabel(
  training: LearnerTraining,
): string {
  const progress = clampProgress(
    training.progressPercentage,
  );

  if (
    training.enrollmentStatus === "COMPLETED" ||
    progress >= 100
  ) {
    return "Formation terminée";
  }

  if (progress > 0) {
    return "Reprendre là où tu t’es arrêté";
  }

  return "Commencer la formation";
}

function deadlineStatus(
  dueAt?: string | null,
): {
  label: string;
  overdue: boolean;
} {
  if (!dueAt) {
    return {
      label: "Planifiée",
      overdue: false,
    };
  }

  const due = new Date(dueAt).getTime();

  if (Number.isNaN(due)) {
    return {
      label: "Planifiée",
      overdue: false,
    };
  }

  const remainingDays = Math.ceil(
    (due - Date.now()) /
      (24 * 60 * 60 * 1000),
  );

  if (remainingDays < 0) {
    return {
      label: "En retard",
      overdue: true,
    };
  }

  if (remainingDays <= 7) {
    return {
      label: "À faire bientôt",
      overdue: false,
    };
  }

  return {
    label: "Planifiée",
    overdue: false,
  };
}

function riskLevelLabel(
  level?: RiskIndicator["riskLevel"],
): string {
  if (level === "HIGH") return "Élevé";
  if (level === "MEDIUM") return "Modéré";
  if (level === "LOW") return "Faible";
  if (level === "DATA_INSUFFICIENT") {
    return "Données insuffisantes";
  }

  return "Indéterminé";
}

function recommendationTone(
  priority: Recommendation["priority"],
): {
  color: string;
  background: string;
} {
  if (priority === "HIGH") {
    return {
      color: "#D97706",
      background: "#FFF7ED",
    };
  }

  if (priority === "LOW") {
    return {
      color: "#16A36A",
      background: "#ECFDF3",
    };
  }

  return {
    color: "#7C3AED",
    background: "#F3EEFF",
  };
}

async function fetchDashboardResults() {
  return Promise.allSettled(
    [
      getMyLearnerTrainings(),
      getMyProgress(),
      getMyRecommendations(),
      getMyCertificates(),
      getMyRiskIndicator(),
    ] as const,
  );
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
    "Continuer mon parcours": "#2563EB",
    "Ma progression": "#16A36A",
    "Mes échéances": "#D97706",
    "Mes recommandations": "#E53E5D",
    "Activité récente": "#0F9F8F",
    "Mes certificats": "#B7791F",
    "Accès rapides": "#7C3AED",
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
              className="text-[20px] font-black tracking-[-0.35px]"
              style={{
                color: theme.colors.foreground,
              }}
            >
              {title}
            </Text>

            <Text
              className="mt-1 text-[12px] leading-[17px]"
              style={{
                color: theme.colors.foregroundMuted,
              }}
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
            android_ripple={{
              color: "transparent",
            }}
            className="flex-row items-center rounded-full border border-violet-100 bg-white px-3 py-2"
            style={({ pressed }) => ({
              opacity: pressed ? 0.72 : 1,
            })}
          >
            <Text className="text-[11px] font-black text-violet-700">
              Voir tout
            </Text>

            <Text className="ml-1 text-[16px] font-black leading-[16px] text-violet-700">
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
  onPress,
}: {
  label: string;
  value: string | number;
  icon: SymbolName;
  color: string;
  background: string;
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value}`}
      onPress={onPress}
      android_ripple={{
        color: "transparent",
      }}
      className="w-[31.7%] rounded-[19px] border bg-white px-2.5 py-2.5"
      style={{
        minHeight: 104,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.035,
        shadowRadius: 7,
        shadowOffset: {
          width: 0,
          height: 3,
        },
        elevation: 1,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View
          className="h-9 w-9 items-center justify-center rounded-[12px]"
          style={{
            backgroundColor: background,
          }}
        >
          <SymbolView
            name={icon}
            tintColor={color}
            size={17}
            weight="bold"
          />
        </View>

        <Text
          className="ml-1 text-[19px] font-black leading-[23px] tracking-[-0.5px]"
          style={{
            color: theme.colors.foreground,
          }}
        >
          {value}
        </Text>
      </View>

      <View className="mt-3 min-h-[26px] justify-end pr-3">
        <Text
          numberOfLines={label === "Recommandations" ? 1 : 2}
          className="text-[10px] font-extrabold leading-[13px] tracking-[-0.1px]"
          style={{
            color: theme.colors.foregroundMuted,
          }}
        >
          {label}
        </Text>

        <View className="absolute bottom-0 right-0">
          <SymbolView
            name={{
              ios: "chevron.right",
              android: "chevron_right",
              web: "chevron_right",
            }}
            tintColor="#98A2B3"
            size={9}
            weight="bold"
          />
        </View>
      </View>
    </Pressable>
  );
}

function LearnerHeroArtwork() {
  return (
    <View
      pointerEvents="none"
      className="relative h-[150px] w-[108px] items-center justify-end overflow-hidden"
    >
      <View className="absolute right-[-28px] top-[18px] h-[96px] w-[96px] rounded-full bg-violet-100/90" />
      <View className="absolute left-[2px] top-[54px] h-[58px] w-[58px] rounded-full bg-violet-50" />
      <View className="absolute right-[7px] top-[19px] h-5 w-5 rotate-45 rounded-[6px] bg-violet-200" />

      <View className="absolute top-[26px] z-20">
        <View className="rounded-[18px] bg-violet-700 px-3 py-2 shadow-sm">
          <SymbolView
            name={{
              ios: "graduationcap.fill",
              android: "school",
              web: "school",
            }}
            tintColor="#FFFFFF"
            size={36}
            weight="bold"
          />
        </View>
      </View>

      <View className="mb-[10px] w-[88px]">
        <View className="h-[25px] rounded-[8px] border border-violet-200 bg-white shadow-sm">
          <View className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full bg-violet-200" />
        </View>
        <View className="-mt-[3px] ml-[7px] h-[25px] w-[81px] rounded-[8px] border border-violet-200 bg-[#F7F3FF] shadow-sm">
          <View className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full bg-violet-300" />
        </View>
        <View className="-mt-[3px] ml-[14px] h-[25px] w-[74px] rounded-[8px] border border-violet-300 bg-white shadow-sm">
          <View className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full bg-violet-300" />
        </View>
      </View>
    </View>
  );
}

function LearningMotivationBanner({
  onPress,
}: {
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continuer à apprendre"
      onPress={onPress}
      android_ripple={{
        color: "transparent",
      }}
      className="mt-4 flex-row items-center overflow-hidden rounded-[20px] border border-violet-100 bg-violet-50 px-3.5 py-3"
    >
      <View className="absolute -right-5 -top-8 h-24 w-24 rounded-full bg-violet-100" />

      <View className="h-11 w-11 items-center justify-center rounded-[15px] bg-violet-600">
        <SymbolView
          name={{
            ios: "paperplane.fill",
            android: "rocket_launch",
            web: "rocket_launch",
          }}
          tintColor="#FFFFFF"
          size={18}
          weight="bold"
        />
      </View>

      <View className="ml-3 min-w-0 flex-1">
        <Text className="text-[13px] font-black text-violet-700">
          Continue à apprendre !
        </Text>
        <Text
          className="mt-0.5 text-[10px] leading-[14px]"
          style={{
            color: theme.colors.foregroundMuted,
          }}
        >
          Chaque petite étape te rapproche de tes objectifs.
        </Text>
      </View>

      <View className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-white">
        <SymbolView
          name={{
            ios: "chevron.right",
            android: "chevron_right",
            web: "chevron_right",
          }}
          tintColor="#7C3AED"
          size={11}
          weight="bold"
        />
      </View>
    </Pressable>
  );
}

function ResumeTrainingCard({
  training,
  onPress,
}: {
  training: LearnerTraining;
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();
  const progress = clampProgress(
    training.progressPercentage,
  );
  const coverUrl = resolveCoverUrl(training);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir ${training.title}`}
      onPress={onPress}
      android_ripple={{
        color: "transparent",
      }}
      className="overflow-hidden rounded-[22px] border bg-white"
      style={{
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.035,
        shadowRadius: 8,
        shadowOffset: {
          width: 0,
          height: 3,
        },
        elevation: 1,
      }}
    >
      {coverUrl ? (
        <Image
          source={{
            uri: coverUrl,
          }}
          resizeMode="cover"
          className="h-[150px] w-full bg-slate-100"
        />
      ) : (
        <View className="relative h-[142px] w-full overflow-hidden bg-[#0D5577]">
          <View className="absolute -right-9 -top-12 h-[150px] w-[150px] rounded-full bg-cyan-400/20" />
          <View className="absolute -bottom-16 -left-7 h-[120px] w-[120px] rounded-full bg-violet-500/25" />
          <View className="flex-1 items-center justify-center">
            <SymbolView
              name={{
                ios: "graduationcap.fill",
                android: "school",
                web: "school",
              }}
              tintColor="#FFFFFF"
              size={30}
              weight="bold"
            />
          </View>
        </View>
      )}

      <View className="p-3.5">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center rounded-full bg-violet-50 px-2.5 py-1.5">
            <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-violet-600" />
            <Text className="text-[10px] font-black text-violet-700">
              {progress > 0
                ? "À reprendre"
                : "À commencer"}
            </Text>
          </View>

          {training.dueAt ? (
            <View className="max-w-[58%] flex-row items-center rounded-full bg-orange-50 px-2.5 py-1.5">
              <SymbolView
                name={{
                  ios: "calendar",
                  android: "event",
                  web: "event",
                }}
                tintColor="#D97706"
                size={11}
                weight="bold"
              />
              <Text
                numberOfLines={1}
                className="ml-1.5 flex-shrink text-[10px] font-bold text-orange-700"
              >
                {formatDate(training.dueAt)}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          numberOfLines={2}
          className="mt-2.5 text-[16px] font-black leading-[21px]"
          style={{
            color: theme.colors.foreground,
          }}
        >
          {training.title}
        </Text>

        <Text
          numberOfLines={2}
          className="mt-1 text-[12px] leading-[18px]"
          style={{
            color: theme.colors.foregroundMuted,
          }}
        >
          {training.shortDescription ||
            "Formation disponible dans ton espace apprenant."}
        </Text>

        <View className="mt-3 flex-row items-center justify-between">
          <Text
            className="text-[11px] font-bold"
            style={{
              color: theme.colors.foregroundMuted,
            }}
          >
            Progression
          </Text>

          <Text
            className="text-[12px] font-black"
            style={{
              color: theme.colors.foreground,
            }}
          >
            {progress} %
          </Text>
        </View>

        <View className="mt-1.5 h-2 overflow-hidden rounded-full bg-violet-100">
          <View
            className="h-full rounded-full bg-violet-600"
            style={{
              width: `${progress}%`,
            }}
          />
        </View>

        <View className="mt-3 flex-row items-center rounded-[14px] bg-violet-600 px-3 py-2.5">
          <Text className="min-w-0 flex-1 text-[11px] font-black text-white">
            {nextStepLabel(training)}
          </Text>

          <View className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-white/15">
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
        </View>
      </View>
    </Pressable>
  );
}

function RecommendationCard({
  item,
  onPress,
}: {
  item: Recommendation;
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();
  const tone = recommendationTone(
    item.priority,
  );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{
        color: "transparent",
      }}
      className="mb-3 flex-row items-center rounded-[20px] border bg-white p-3"
      style={{
        borderColor: theme.colors.border,
      }}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-[13px]"
        style={{
          backgroundColor: tone.background,
        }}
      >
        <SymbolView
          name={{
            ios: "lightbulb.fill",
            android: "lightbulb",
            web: "lightbulb",
          }}
          tintColor={tone.color}
          size={16}
          weight="bold"
        />
      </View>

      <View className="ml-3 min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className="text-[13px] font-black"
          style={{
            color: theme.colors.foreground,
          }}
        >
          {item.title}
        </Text>

        <Text
          numberOfLines={2}
          className="mt-1 text-[11px] leading-[16px]"
          style={{
            color: theme.colors.foregroundMuted,
          }}
        >
          {item.description}
        </Text>
      </View>

      <View className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-violet-50">
        <SymbolView
          name={{
            ios: "chevron.right",
            android: "chevron_right",
            web: "chevron_right",
          }}
          tintColor="#7C3AED"
          size={11}
          weight="bold"
        />
      </View>
    </Pressable>
  );
}

function QuickAction({
  title,
  subtitle,
  icon,
  color,
  background,
  onPress,
  fullWidth = false,
}: {
  title: string;
  subtitle: string;
  icon: SymbolName;
  color: string;
  background: string;
  onPress: () => void;
  fullWidth?: boolean;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      android_ripple={{
        color: "transparent",
      }}
      className={`relative overflow-hidden rounded-[20px] border bg-white ${
        fullWidth ? "w-full" : "w-[48.5%]"
      }`}
      style={{
        minHeight: 112,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.035,
        shadowRadius: 7,
        shadowOffset: {
          width: 0,
          height: 3,
        },
        elevation: 1,
      }}
    >
      <View
        className="absolute bottom-0 left-0 top-0 w-1"
        style={{
          backgroundColor: color,
        }}
      />

      <View className="p-3.5 pl-4">
        <View className="flex-row items-start justify-between">
          <View
            className="h-11 w-11 items-center justify-center rounded-[14px]"
            style={{
              backgroundColor: background,
            }}
          >
            <SymbolView
              name={icon}
              tintColor={color}
              size={18}
              weight="bold"
            />
          </View>

          <View
            className="h-8 w-8 items-center justify-center rounded-full"
            style={{
              backgroundColor: background,
            }}
          >
            <SymbolView
              name={{
                ios: "chevron.right",
                android: "chevron_right",
                web: "chevron_right",
              }}
              tintColor={color}
              size={10}
              weight="bold"
            />
          </View>
        </View>

        <Text
          numberOfLines={1}
          className="mt-3 text-[13px] font-black"
          style={{
            color: theme.colors.foreground,
          }}
        >
          {title}
        </Text>

        <Text
          numberOfLines={2}
          className="mt-1 text-[10px] leading-[14px]"
          style={{
            color: theme.colors.foregroundMuted,
          }}
        >
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

export default function LearnerHomeScreen({
  user,
  onOpenCatalog,
  onOpenInvitations,
  onOpenTrainings,
  onOpenTraining,
  onOpenProgress,
  onOpenRecommendations,
  onOpenCertificates,
  onOpenReviewsFeedback,
  onOpenSessions,
  onOpenProfile,
  onLogout,
}: LearnerHomeScreenProps) {
  const { theme } = useSmartTrainingTheme();

  const [profile, setProfile] =
    useState<LearnerProfile | null>(null);

  const [trainings, setTrainings] =
    useState<LearnerTraining[]>([]);

  const [progressRows, setProgressRows] =
    useState<LearnerProgress[]>([]);

  const [
    recommendations,
    setRecommendations,
  ] = useState<Recommendation[]>([]);

  const [certificates, setCertificates] =
    useState<Certificate[]>([]);

  const [risk, setRisk] =
    useState<RiskIndicator | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [coreError, setCoreError] =
    useState("");

  const [
    progressUnavailable,
    setProgressUnavailable,
  ] = useState(false);

  const [
    recommendationsUnavailable,
    setRecommendationsUnavailable,
  ] = useState(false);

  const [
    certificatesUnavailable,
    setCertificatesUnavailable,
  ] = useState(false);

  const [
    riskUnavailable,
    setRiskUnavailable,
  ] = useState(false);

  const applyResults = useCallback(
    (results: DashboardResults) => {
      const [
        trainingsResult,
        progressResult,
        recommendationsResult,
        certificatesResult,
        riskResult,
      ] = results;

      if (
        trainingsResult.status === "fulfilled"
      ) {
        setTrainings(trainingsResult.value);
        setCoreError("");
      } else {
        setTrainings([]);
        setCoreError(
          "Impossible de charger tes formations pour le moment.",
        );
      }

      if (
        progressResult.status === "fulfilled"
      ) {
        setProgressRows(progressResult.value);
        setProgressUnavailable(false);
      } else {
        setProgressRows([]);
        setProgressUnavailable(true);
      }

      if (
        recommendationsResult.status ===
        "fulfilled"
      ) {
        setRecommendations(
          recommendationsResult.value,
        );
        setRecommendationsUnavailable(false);
      } else {
        setRecommendations([]);
        setRecommendationsUnavailable(true);
      }

      if (
        certificatesResult.status ===
        "fulfilled"
      ) {
        setCertificates(
          certificatesResult.value,
        );
        setCertificatesUnavailable(false);
      } else {
        setCertificates([]);
        setCertificatesUnavailable(true);
      }

      if (riskResult.status === "fulfilled") {
        setRisk(riskResult.value);
        setRiskUnavailable(false);
      } else {
        setRisk(null);
        setRiskUnavailable(true);
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;

    void getMyProfile()
      .then((nextProfile) => {
        if (active) {
          setProfile(nextProfile);
        }
      })
      .catch(() => {
        if (active) {
          setProfile(null);
        }
      });

    return () => {
      active = false;
    };
  }, [user.userId]);

  useEffect(() => {
    let active = true;

    void fetchDashboardResults()
      .then((results) => {
        if (active) {
          applyResults(results);
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
  }, [applyResults]);

  async function refresh() {
    setRefreshing(true);

    try {
      applyResults(
        await fetchDashboardResults(),
      );
    } finally {
      setRefreshing(false);
    }
  }

  const summary = useMemo(() => {
    const completed = trainings.filter(
      (training) =>
        training.enrollmentStatus ===
          "COMPLETED" ||
        clampProgress(
          training.progressPercentage,
        ) >= 100,
    ).length;

    const averageProgress = trainings.length
      ? Math.round(
          trainings.reduce(
            (total, training) =>
              total +
              clampProgress(
                training.progressPercentage,
              ),
            0,
          ) / trainings.length,
        )
      : 0;

    return {
      completed,
      averageProgress,
    };
  }, [trainings]);

  const trainingTitleById = useMemo(
    () =>
      new Map(
        trainings.map((training) => [
          training.id,
          training.title,
        ] as const),
      ),
    [trainings],
  );

  const heroTraining = useMemo(() => {
    const candidates = trainings.filter(
      (training) =>
        training.enrollmentStatus !==
          "COMPLETED" &&
        clampProgress(
          training.progressPercentage,
        ) < 100,
    );

    return (
      [...candidates].sort((a, b) => {
        const aStarted =
          clampProgress(
            a.progressPercentage,
          ) > 0
            ? 0
            : 1;

        const bStarted =
          clampProgress(
            b.progressPercentage,
          ) > 0
            ? 0
            : 1;

        if (aStarted !== bStarted) {
          return aStarted - bStarted;
        }

        const deadlineDelta =
          sortableDate(a.dueAt) -
          sortableDate(b.dueAt);

        if (
          Number.isFinite(deadlineDelta) &&
          deadlineDelta !== 0
        ) {
          return deadlineDelta;
        }

        return (
          clampProgress(
            b.progressPercentage,
          ) -
          clampProgress(
            a.progressPercentage,
          )
        );
      })[0] ?? null
    );
  }, [trainings]);

  /*
   * IMPORTANT :
   * - allDeadlines / allActiveRecommendations servent aux compteurs réels.
   * - deadlines / activeRecommendations ne servent qu'à limiter
   *   le nombre de cartes affichées sur l'accueil.
   * Ainsi, aucun KPI n'est artificiellement plafonné à 3 ou 2.
   */
  const allDeadlines = useMemo(
    () =>
      trainings
        .filter(
          (training) =>
            Boolean(training.dueAt) &&
            training.enrollmentStatus !==
              "COMPLETED" &&
            clampProgress(
              training.progressPercentage,
            ) < 100,
        )
        .sort(
          (a, b) =>
            sortableDate(a.dueAt) -
            sortableDate(b.dueAt),
        ),
    [trainings],
  );

  const deadlines = useMemo(
    () => allDeadlines.slice(0, 3),
    [allDeadlines],
  );

  const allActiveRecommendations = useMemo(
    () =>
      recommendations
        .filter(
          (item) =>
            item.status !== "COMPLETED" &&
            item.status !== "DISMISSED",
        )
        .sort((a, b) => {
          const rank = {
            HIGH: 0,
            MEDIUM: 1,
            LOW: 2,
          } as const;

          const priorityDelta =
            rank[a.priority] -
            rank[b.priority];

          if (priorityDelta !== 0) {
            return priorityDelta;
          }

          return (
            sortableDate(
              b.createdAt,
              0,
            ) -
            sortableDate(
              a.createdAt,
              0,
            )
          );
        }),
    [recommendations],
  );

  const activeRecommendations = useMemo(
    () => allActiveRecommendations.slice(0, 2),
    [allActiveRecommendations],
  );

  const recentActivity = useMemo(
    () =>
      progressRows
        .filter((row) =>
          Boolean(row.lastActivityAt),
        )
        .sort(
          (a, b) =>
            sortableDate(
              b.lastActivityAt,
              0,
            ) -
            sortableDate(
              a.lastActivityAt,
              0,
            ),
        )
        .slice(0, 4),
    [progressRows],
  );

  const latestCertificates = useMemo(
    () =>
      [...certificates]
        .sort(
          (a, b) =>
            sortableDate(
              b.issuedAt,
              0,
            ) -
            sortableDate(
              a.issuedAt,
              0,
            ),
        )
        .slice(0, 2),
    [certificates],
  );

  if (loading) {
    return (
      <ScreenContainer>
        <AppLoadingState label="Ouverture de l’espace apprenant…" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      edges={["left", "right"]}
      style={{
        padding: 0,
        backgroundColor:
          theme.colors.background,
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 24,
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
          />
        }
      >
        {/* =================================================
            HERO — maquette apprenant premium V3
            Aucun asset ajouté : l’illustration est construite en code.
        ================================================= */}
        <View
          className="relative overflow-hidden rounded-[26px] border bg-white p-4"
          style={{
            borderColor: theme.colors.border,
            shadowColor: theme.colors.shadow,
            shadowOpacity: 0.055,
            shadowRadius: 14,
            shadowOffset: {
              width: 0,
              height: 5,
            },
            elevation: 3,
          }}
        >
          <View className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-violet-50" />
          <View className="absolute right-5 top-[-30px] h-20 w-20 rounded-full bg-violet-100/80" />

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-[15px] bg-[#FAF8F5]">
                <SmartTrainingBrandMark
                  size={34}
                />
              </View>

              <View className="ml-2.5 rounded-full bg-violet-50 px-3 py-1.5">
                <Text className="text-[9px] font-black uppercase tracking-[1px] text-violet-700">
                  Espace apprenant
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ouvrir Mon compte"
              hitSlop={8}
              onPress={() =>
                router.push(
                  "/learner/profile" as Href,
                )
              }
              android_ripple={{
                color: "transparent",
              }}
              className="relative"
            >
              {profile?.avatarDataUrl ? (
                <Image
                  source={{
                    uri: profile.avatarDataUrl,
                  }}
                  className="h-12 w-12 rounded-full border-2 border-white"
                  style={{
                    shadowColor: "#0F172A",
                    shadowOpacity: 0.12,
                    shadowRadius: 5,
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                  }}
                  accessibilityLabel="Photo du profil apprenant"
                />
              ) : (
                <View
                  className="h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-violet-100"
                  style={{
                    shadowColor: "#0F172A",
                    shadowOpacity: 0.08,
                    shadowRadius: 5,
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    elevation: 2,
                  }}
                >
                  <Text className="text-[13px] font-black text-violet-700">
                    {profileInitials(
                      profile,
                      user,
                    )}
                  </Text>
                </View>
              )}

            </Pressable>
          </View>

          <Text
            className="mt-3 text-[24px] font-black leading-[29px] tracking-[-0.7px]"
            style={{
              color: theme.colors.foreground,
            }}
          >
            {dynamicGreeting()}{" "}
            {displayName(user)}{" "}
            {greetingEmoji()}
          </Text>

          <View className="mt-1 flex-row items-end gap-2">
            <View className="min-w-0 flex-1 pb-1">
              <Text
                className="text-[12px] leading-[18px]"
                style={{
                  color: theme.colors.foregroundMuted,
                }}
              >
                Reprends tes formations et suis simplement ta progression.
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={onOpenTrainings}
                android_ripple={{
                  color: "transparent",
                }}
                className="mt-3 min-h-[46px] flex-row items-center rounded-[15px] bg-violet-600 px-3"
              >
                <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-white/15">
                  <SymbolView
                    name={{
                      ios: "books.vertical.fill",
                      android: "library_books",
                      web: "library_books",
                    }}
                    tintColor="#FFFFFF"
                    size={15}
                    weight="bold"
                  />
                </View>

                <Text
                  numberOfLines={1}
                  className="ml-2 min-w-0 flex-1 text-[11px] font-black text-white"
                >
                  Mes formations
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

              <Pressable
                accessibilityRole="button"
                onPress={onOpenCatalog}
                android_ripple={{
                  color: "transparent",
                }}
                className="mt-2 min-h-[46px] flex-row items-center rounded-[15px] border border-slate-200 bg-white px-3"
              >
                <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-violet-50">
                  <SymbolView
                    name={{
                      ios: "magnifyingglass",
                      android: "search",
                      web: "search",
                    }}
                    tintColor="#7C3AED"
                    size={15}
                    weight="bold"
                  />
                </View>

                <Text
                  numberOfLines={1}
                  className="ml-2 min-w-0 flex-1 text-[11px] font-black"
                  style={{
                    color: theme.colors.foreground,
                  }}
                >
                  Explorer le catalogue
                </Text>

                <SymbolView
                  name={{
                    ios: "chevron.right",
                    android: "chevron_right",
                    web: "chevron_right",
                  }}
                  tintColor="#667085"
                  size={11}
                  weight="bold"
                />
              </Pressable>
            </View>

            <LearnerHeroArtwork />
          </View>
        </View>
        {coreError ? (
          <View className="mt-4">
            <AppErrorState
              title="Actualisation incomplète"
              description={coreError}
              actionLabel="Réessayer"
              onAction={() =>
                void refresh()
              }
            />
          </View>
        ) : null}

        {/* =================================================
            INDICATEURS — 3 colonnes comme la nouvelle maquette
        ================================================= */}
        <View className="mt-7">
          <SectionHeading
            title="Indicateurs clés"
            subtitle="Chaque indicateur ouvre directement le détail correspondant."
          />

          <View className="flex-row flex-wrap justify-between gap-y-3">
            <DashboardMetricCard
              label="Formations"
              value={trainings.length}
              icon={{
                ios: "book.pages.fill",
                android: "menu_book",
                web: "menu_book",
              }}
              color="#7C3AED"
              background="#F3EEFF"
              onPress={onOpenTrainings}
            />

            <DashboardMetricCard
              label="Terminées"
              value={summary.completed}
              icon={{
                ios: "checkmark.seal.fill",
                android: "verified",
                web: "verified",
              }}
              color="#16A36A"
              background="#ECFDF3"
              onPress={onOpenTrainings}
            />

            <DashboardMetricCard
              label="Progression globale"
              value={`${summary.averageProgress}%`}
              icon={{
                ios: "chart.bar.fill",
                android: "bar_chart",
                web: "bar_chart",
              }}
              color="#2563EB"
              background="#EFF6FF"
              onPress={onOpenProgress}
            />

            <DashboardMetricCard
              label="Échéances"
              value={allDeadlines.length}
              icon={{
                ios: "calendar.badge.clock",
                android: "event",
                web: "event",
              }}
              color="#D97706"
              background="#FFF7ED"
              onPress={onOpenTrainings}
            />

            <DashboardMetricCard
              label="Recommandations"
              value={allActiveRecommendations.length}
              icon={{
                ios: "star.fill",
                android: "star",
                web: "star",
              }}
              color="#E53E5D"
              background="#FFF0F3"
              onPress={onOpenRecommendations}
            />

            <DashboardMetricCard
              label="Certificats"
              value={certificates.length}
              icon={{
                ios: "rosette",
                android: "workspace_premium",
                web: "workspace_premium",
              }}
              color="#7C3AED"
              background="#F5F3FF"
              onPress={onOpenCertificates}
            />
          </View>

          <LearningMotivationBanner
            onPress={onOpenTrainings}
          />
        </View>

        {/* =================================================
            CONTINUER
        ================================================= */}
        <View className="mt-7">
          <SectionHeading
            title="Continuer mon parcours"
            subtitle="La prochaine action utile à partir de tes formations réelles."
            onPress={onOpenTrainings}
          />

          {heroTraining ? (
            <ResumeTrainingCard
              training={heroTraining}
              onPress={() =>
                onOpenTraining(
                  heroTraining.id,
                )
              }
            />
          ) : trainings.length ? (
            <AppEmptyState
              title="Tout est à jour"
              description="Aucune formation n’attend une reprise immédiate."
              actionLabel="Voir mes formations"
              onAction={onOpenTrainings}
            />
          ) : (
            <AppEmptyState
              title="Aucune formation affectée"
              description="Explore le catalogue pour découvrir les formations disponibles."
              actionLabel="Explorer"
              onAction={onOpenCatalog}
            />
          )}
        </View>

        {/* =================================================
            PROGRESSION
        ================================================= */}
        <View className="mt-7">
          <SectionHeading
            title="Ma progression"
            subtitle="Une lecture simple de ton avancement global."
            onPress={onOpenProgress}
          />

          {progressUnavailable ? (
            <AppErrorState
              title="Progression indisponible"
              description="Les données de progression ne peuvent pas être chargées pour le moment."
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={onOpenProgress}
              android_ripple={{
                color: "transparent",
              }}
              className="rounded-[22px] border bg-white p-3.5"
              style={{
                borderColor:
                  theme.colors.border,
                shadowColor:
                  theme.colors.shadow,
                shadowOpacity: 0.035,
                shadowRadius: 8,
                shadowOffset: {
                  width: 0,
                  height: 3,
                },
                elevation: 1,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[14px] font-black"
                    style={{
                      color:
                        theme.colors.foreground,
                    }}
                  >
                    Progression moyenne
                  </Text>

                  <Text
                    className="mt-1 text-[11px]"
                    style={{
                      color:
                        theme.colors.foregroundMuted,
                    }}
                  >
                    {trainings.length} formation
                    {trainings.length > 1
                      ? "s"
                      : ""}{" "}
                    dans ton espace
                  </Text>
                </View>

                <Text className="ml-3 text-[24px] font-black text-violet-700">
                  {summary.averageProgress} %
                </Text>
              </View>

              <View className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100">
                <View
                  className="h-full rounded-full bg-violet-600"
                  style={{
                    width: `${summary.averageProgress}%`,
                  }}
                />
              </View>

              {!riskUnavailable &&
              risk ? (
                <View
                  className="mt-3 flex-row items-center rounded-[14px] px-3 py-2.5"
                  style={{
                    backgroundColor:
                      risk.riskLevel ===
                      "HIGH"
                        ? "#FEF2F2"
                        : risk.riskLevel ===
                            "MEDIUM"
                          ? "#FFF7ED"
                          : "#ECFDF3",
                  }}
                >
                  <SymbolView
                    name={{
                      ios:
                        risk.riskLevel ===
                        "HIGH"
                          ? "exclamationmark.triangle.fill"
                          : "checkmark.shield.fill",
                      android:
                        risk.riskLevel ===
                        "HIGH"
                          ? "warning"
                          : "verified_user",
                      web:
                        risk.riskLevel ===
                        "HIGH"
                          ? "warning"
                          : "verified_user",
                    }}
                    tintColor={
                      risk.riskLevel ===
                      "HIGH"
                        ? "#DC2626"
                        : risk.riskLevel ===
                            "MEDIUM"
                          ? "#D97706"
                          : "#16A36A"
                    }
                    size={14}
                    weight="bold"
                  />

                  <Text
                    className="ml-2 min-w-0 flex-1 text-[11px] leading-[16px]"
                    style={{
                      color:
                        theme.colors.foregroundMuted,
                    }}
                  >
                    Niveau
                    d’accompagnement :{" "}
                    <Text className="font-black">
                      {riskLevelLabel(
                        risk.riskLevel,
                      )}
                    </Text>
                  </Text>
                </View>
              ) : null}
            </Pressable>
          )}
        </View>

        {/* =================================================
            ECHEANCES
        ================================================= */}
        <View className="mt-7">
          <SectionHeading
            title="Mes échéances"
            subtitle="Les prochaines dates liées à tes formations actives."
          />

          {deadlines.length ? (
            deadlines.map(
              (training) => {
                const status =
                  deadlineStatus(
                    training.dueAt,
                  );

                return (
                  <Pressable
                    key={training.id}
                    accessibilityRole="button"
                    onPress={() =>
                      onOpenTraining(
                        training.id,
                      )
                    }
                    android_ripple={{
                      color:
                        "transparent",
                    }}
                    className="mb-3 flex-row items-center rounded-[20px] border bg-white p-3"
                    style={{
                      borderColor:
                        status.overdue
                          ? "#FECACA"
                          : theme.colors
                              .border,
                    }}
                  >
                    <View
                      className="h-10 w-10 items-center justify-center rounded-[13px]"
                      style={{
                        backgroundColor:
                          status.overdue
                            ? "#FEF2F2"
                            : "#F3EEFF",
                      }}
                    >
                      <SymbolView
                        name={{
                          ios: "calendar",
                          android: "event",
                          web: "event",
                        }}
                        tintColor={
                          status.overdue
                            ? "#DC2626"
                            : "#7C3AED"
                        }
                        size={16}
                        weight="bold"
                      />
                    </View>

                    <View className="ml-3 min-w-0 flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-[13px] font-black"
                        style={{
                          color:
                            theme.colors.foreground,
                        }}
                      >
                        {training.title}
                      </Text>

                      <Text
                        className="mt-1 text-[11px]"
                        style={{
                          color:
                            theme.colors
                              .foregroundMuted,
                        }}
                      >
                        Échéance :{" "}
                        {formatDate(
                          training.dueAt,
                        )}
                      </Text>
                    </View>

                    <View
                      className="ml-2 rounded-full px-2 py-1"
                      style={{
                        backgroundColor:
                          status.overdue
                            ? "#FEF2F2"
                            : "#F3EEFF",
                      }}
                    >
                      <Text
                        className="text-[9px] font-black"
                        style={{
                          color:
                            status.overdue
                              ? "#DC2626"
                              : "#7C3AED",
                        }}
                      >
                        {status.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              },
            )
          ) : (
            <AppEmptyState
              title="Aucune échéance proche"
              description="Aucune date limite n’est actuellement enregistrée."
            />
          )}
        </View>

        {/* =================================================
            RECOMMANDATIONS
        ================================================= */}
        <View className="mt-7">
          <SectionHeading
            title="Mes recommandations"
            subtitle="Actions pédagogiques proposées à partir de tes données."
            onPress={onOpenRecommendations}
          />

          {recommendationsUnavailable ? (
            <AppErrorState
              title="Recommandations indisponibles"
              description="Les recommandations ne peuvent pas être chargées pour le moment."
            />
          ) : activeRecommendations.length ? (
            activeRecommendations.map(
              (item) => (
                <RecommendationCard
                  key={item.id}
                  item={item}
                  onPress={
                    onOpenRecommendations
                  }
                />
              ),
            )
          ) : (
            <AppEmptyState
              title="Aucune recommandation en attente"
              description="Aucune action particulière ne t’est proposée pour le moment."
              actionLabel="Voir ma progression"
              onAction={onOpenProgress}
            />
          )}
        </View>

        {/* =================================================
            ACTIVITE
        ================================================= */}
        <View className="mt-7">
          <SectionHeading
            title="Activité récente"
            subtitle="Dernières progressions réellement enregistrées."
            onPress={onOpenProgress}
          />

          {progressUnavailable ? (
            <AppErrorState
              title="Activité indisponible"
              description="L’activité récente ne peut pas être chargée pour le moment."
            />
          ) : recentActivity.length ? (
            <View
              className="rounded-[20px] border bg-white px-3"
              style={{
                borderColor:
                  theme.colors.border,
              }}
            >
              {recentActivity.map(
                (row, index) => (
                  <View
                    key={row.id}
                    className={`flex-row items-start py-3 ${
                      index <
                      recentActivity.length -
                        1
                        ? "border-b border-slate-100"
                        : ""
                    }`}
                  >
                    <View className="mt-1.5 h-2.5 w-2.5 rounded-full bg-violet-600" />

                    <View className="ml-3 min-w-0 flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-[13px] font-black"
                        style={{
                          color:
                            theme.colors.foreground,
                        }}
                      >
                        {trainingTitleById.get(
                          row.trainingId,
                        ) ||
                          "Formation suivie"}
                      </Text>

                      <Text
                        className="mt-1 text-[11px]"
                        style={{
                          color:
                            theme.colors
                              .foregroundMuted,
                        }}
                      >
                        Progression
                        enregistrée :{" "}
                        {clampProgress(
                          row.progressPercentage,
                        )} %
                      </Text>

                      <Text
                        className="mt-1 text-[10px]"
                        style={{
                          color:
                            theme.colors
                              .foregroundSubtle,
                        }}
                      >
                        {formatDateTime(
                          row.lastActivityAt,
                        )}
                      </Text>
                    </View>
                  </View>
                ),
              )}
            </View>
          ) : (
            <AppEmptyState
              title="Aucune activité récente"
              description="Commence ou poursuis une formation pour alimenter ton activité."
            />
          )}
        </View>

        {/* =================================================
            CERTIFICATS
        ================================================= */}
        <View className="mt-7">
          <SectionHeading
            title="Mes certificats"
            subtitle="Tes dernières réussites délivrées par SmartTraining."
            onPress={onOpenCertificates}
          />

          {certificatesUnavailable ? (
            <AppErrorState
              title="Certificats indisponibles"
              description="Tes certificats ne peuvent pas être chargés pour le moment."
            />
          ) : latestCertificates.length ? (
            latestCertificates.map(
              (certificate) => (
                <Pressable
                  key={certificate.id}
                  accessibilityRole="button"
                  onPress={
                    onOpenCertificates
                  }
                  android_ripple={{
                    color: "transparent",
                  }}
                  className="mb-3 flex-row items-center rounded-[20px] border bg-white p-3"
                  style={{
                    borderColor:
                      theme.colors.border,
                  }}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-orange-50">
                    <SymbolView
                      name={{
                        ios: "rosette",
                        android:
                          "workspace_premium",
                        web:
                          "workspace_premium",
                      }}
                      tintColor="#D97706"
                      size={17}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-[13px] font-black"
                      style={{
                        color:
                          theme.colors.foreground,
                      }}
                    >
                      {
                        certificate.trainingTitle
                      }
                    </Text>

                    <Text
                      className="mt-1 text-[11px]"
                      style={{
                        color:
                          theme.colors
                            .foregroundMuted,
                      }}
                    >
                      Délivré le{" "}
                      {formatDate(
                        certificate.issuedAt,
                      )}
                    </Text>
                  </View>

                  <View className="ml-2 flex-row items-center rounded-full bg-emerald-50 px-2 py-1">
                    <View className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    <Text className="text-[9px] font-black text-emerald-700">
                      {certificate.status ===
                      "ACTIVE"
                        ? "Valide"
                        : certificate.status}
                    </Text>
                  </View>
                </Pressable>
              ),
            )
          ) : (
            <AppEmptyState
              title="Aucun certificat pour le moment"
              description="Termine une formation éligible pour obtenir ton premier certificat."
              actionLabel="Mes formations"
              onAction={onOpenTrainings}
            />
          )}
        </View>

        {/* =================================================
            ACCES RAPIDES — toutes les actions existantes
        ================================================= */}
        <View className="mt-7">
          <SectionHeading
            title="Accès rapides"
            subtitle="Retrouve les fonctions utiles à ton apprentissage."
          />

          <View className="flex-row flex-wrap justify-between gap-y-3">
            <QuickAction
              title="Invitations"
              subtitle="Consulter tes invitations."
              icon={{
                ios: "envelope.open.fill",
                android: "mail",
                web: "mail",
              }}
              color="#7C3AED"
              background="#F3EEFF"
              onPress={onOpenInvitations}
            />

            <QuickAction
              title="Mes séances"
              subtitle="Voir ton accompagnement."
              icon={{
                ios: "calendar",
                android: "event",
                web: "event",
              }}
              color="#D97706"
              background="#FFF7ED"
              onPress={onOpenSessions}
            />

            <QuickAction
              title="Avis & feedback"
              subtitle="Retrouver tes échanges."
              icon={{
                ios: "bubble.left.and.bubble.right.fill",
                android: "forum",
                web: "forum",
              }}
              color="#16A36A"
              background="#ECFDF3"
              onPress={
                onOpenReviewsFeedback
              }
              fullWidth
            />


          </View>
        </View>

        {/* Déconnexion séparée — même style exact que l’Admin. */}
        <View className="mb-2 mt-7 border-t border-[#ECE9EF] pt-5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Se déconnecter"
            onPress={onLogout}
            android_ripple={{ color: "transparent" }}
            className="flex-row items-center justify-center rounded-[16px] border border-[#F1E5E5] bg-white px-4 py-3"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <SymbolView
              name={{
                ios: "rectangle.portrait.and.arrow.right",
                android: "logout",
                web: "logout",
              }}
              tintColor="#B45353"
              size={17}
              weight="semibold"
            />
            <Text className="ml-2 text-[12px] font-extrabold text-[#9F4B4B]">
              Se déconnecter
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}

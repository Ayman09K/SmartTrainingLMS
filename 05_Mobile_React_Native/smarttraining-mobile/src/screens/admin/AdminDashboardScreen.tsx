import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Href, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import SmartTrainingBrandMark from "../../components/branding/SmartTrainingBrandMark";
import ScreenContainer from "../../components/ScreenContainer";
import {
  AppEmptyState,
  AppErrorState,
  AppLoadingState,
} from "../../components/ux/AppStates";
import { getAdminDashboardSummary } from "../../features/admin/adminDashboardService";
import { getMyProfile } from "../../features/auth/learnerProfileService";
import { getAdminOpenAlerts } from "../../features/admin/adminFeedbackAlertService";
import { getAdminGroups } from "../../features/admin/adminGroupService";
import {
  getAdminFullTraining,
  getAdminTrainings,
} from "../../features/admin/adminTrainingService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type { ConnectedUser } from "../../types/auth";
import type { LearnerProfile } from "../../types/learnerProfile";

type Props = {
  user: ConnectedUser;
  onLogout: () => void;
};

type DashboardSummary = Awaited<ReturnType<typeof getAdminDashboardSummary>>;
type AdminTraining = Awaited<ReturnType<typeof getAdminTrainings>>[number];
type AdminFullTraining = Awaited<ReturnType<typeof getAdminFullTraining>>;
type AdminAlert = Awaited<ReturnType<typeof getAdminOpenAlerts>>[number];
type AdminGroup = Awaited<ReturnType<typeof getAdminGroups>>[number];

type TrainingRow = {
  summary: AdminTraining;
  full: AdminFullTraining | null;
};

type ActivityRow = {
  key: string;
  title: string;
  description?: string;
  at: string;
  timestamp: number;
};

type DashboardData = {
  summary: DashboardSummary | null;
  trainings: TrainingRow[];
  alerts: AdminAlert[];
  groups: AdminGroup[];
  degradedSections: string[];
};

type AlertTone = "info" | "warning" | "error";

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
  const firstName = (profile?.firstName || user.firstName || "").trim();
  const lastName = (profile?.lastName || user.lastName || "").trim();
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  if (initials) return initials;

  return (user.email || "?").trim().charAt(0).toUpperCase() || "?";
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

function trainingStatusLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    DRAFT: "Brouillon",
    PUBLISHED: "Publiée",
    ARCHIVED: "Archivée",
  };

  if (!value) {
    return "Statut non renseigné";
  }

  return labels[value] || value;
}

function isDataInsufficient(alert: AdminAlert): boolean {
  const text = [
    alert.alertType || "",
    alert.title || "",
    alert.message || "",
    alert.source || "",
  ]
    .join(" ")
    .toUpperCase();

  return text.includes("DATA_INSUFFICIENT") || text.includes("INSUFFICIENT");
}

function alertSeverity(alert: AdminAlert): AlertTone {
  if (isDataInsufficient(alert)) {
    return "info";
  }

  const severity = String(alert.severity || "").toUpperCase();

  if (severity === "HIGH" || severity === "CRITICAL") {
    return "error";
  }

  if (severity === "MEDIUM") {
    return "warning";
  }

  return "info";
}

function alertLabel(alert: AdminAlert): string {
  if (isDataInsufficient(alert)) {
    return "Données insuffisantes";
  }

  return alert.title?.trim() || alert.alertType?.trim() || "Alerte pédagogique";
}

function alertDescription(
  alert: AdminAlert,
  trainingById: Map<number, string>,
): string {
  const parts: string[] = [];
  const trainingTitle =
    typeof alert.trainingId === "number"
      ? trainingById.get(alert.trainingId)
      : undefined;

  if (trainingTitle) {
    parts.push(trainingTitle);
  }

  const message = alert.message?.trim();
  if (message) {
    parts.push(message);
  }

  if (isDataInsufficient(alert)) {
    parts.push(
      "Le signal reste distinct d’un risque élevé tant que les données ne suffisent pas.",
    );
  }

  return parts.join(" • ") || "Signal à examiner depuis l’espace Pilotage.";
}

function activityRows(
  trainings: TrainingRow[],
  alerts: AdminAlert[],
  groups: AdminGroup[],
): ActivityRow[] {
  const rows: ActivityRow[] = [];

  for (const alert of alerts) {
    if (!alert.createdAt) {
      continue;
    }

    rows.push({
      key: `alert-${alert.id}`,
      title: isDataInsufficient(alert)
        ? "Données encore insuffisantes"
        : alert.title?.trim() || "Alerte ouverte",
      description: alert.message?.trim() || "Signal de pilotage à examiner.",
      at: alert.createdAt,
      timestamp: safeTimestamp(alert.createdAt),
    });
  }

  for (const group of groups) {
    const at = group.updatedAt || group.createdAt;

    if (!at) {
      continue;
    }

    rows.push({
      key: `group-${group.id}`,
      title: `Groupe mis à jour : ${group.name}`,
      description: `${group.memberCount} membre${group.memberCount > 1 ? "s" : ""}`,
      at,
      timestamp: safeTimestamp(at),
    });
  }

  for (const row of trainings) {
    const at = row.full?.updatedAt || row.full?.publishedAt || row.full?.createdAt;

    if (!at) {
      continue;
    }

    rows.push({
      key: `training-${row.summary.id}`,
      title: `Formation : ${row.summary.title}`,
      description: trainingStatusLabel(row.summary.status),
      at,
      timestamp: safeTimestamp(at),
    });
  }

  return rows
    .filter((row) => row.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3);
}

async function loadDashboardData(): Promise<DashboardData> {
  const [summaryResult, trainingsResult, alertsResult, groupsResult] =
    await Promise.allSettled([
      getAdminDashboardSummary(),
      getAdminTrainings(),
      getAdminOpenAlerts(),
      getAdminGroups(),
    ]);

  const degradedSections: string[] = [];

  const summary =
    summaryResult.status === "fulfilled" ? summaryResult.value : null;
  if (!summary) {
    degradedSections.push("synthèse");
  } else {
    degradedSections.push(...summary.degradedSections);
  }

  const trainings =
    trainingsResult.status === "fulfilled" ? trainingsResult.value : [];
  if (trainingsResult.status === "rejected") {
    degradedSections.push("formations");
  }

  const alerts = alertsResult.status === "fulfilled" ? alertsResult.value : [];
  if (alertsResult.status === "rejected") {
    degradedSections.push("alertes");
  }

  const groups = groupsResult.status === "fulfilled" ? groupsResult.value : [];
  if (groupsResult.status === "rejected") {
    degradedSections.push("groupes");
  }

  const selectedTrainings = [...trainings]
    .sort((a, b) => {
      const aPublished = a.status === "PUBLISHED" ? 1 : 0;
      const bPublished = b.status === "PUBLISHED" ? 1 : 0;

      if (aPublished !== bPublished) {
        return bPublished - aPublished;
      }

      return a.title.localeCompare(b.title, "fr");
    })
    .slice(0, 2);

  const detailResults = await Promise.allSettled(
    selectedTrainings.map((training) => getAdminFullTraining(training.id)),
  );

  const trainingRows = selectedTrainings.map((training, index) => {
    const detail = detailResults[index];

    return {
      summary: training,
      full: detail?.status === "fulfilled" ? detail.value : null,
    };
  });

  if (detailResults.some((result) => result.status === "rejected")) {
    degradedSections.push("détails des formations");
  }

  return {
    summary,
    trainings: trainingRows,
    alerts,
    groups,
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
    "Pilotage prioritaire": "#EF4444",
    "Formations à superviser": "#2563EB",
    "Activité récente": "#16A36A",
    "Groupes actifs": "#D97706",
  };
  const barColor = sectionBarColor[title] || "#7C3AED";

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-start">
          <View className="mr-3 mt-1 h-9 w-1.5 rounded-full" style={{ backgroundColor: barColor }} />

          <View className="min-w-0 flex-1">
            <Text
              className="text-[20px] font-black tracking-[-0.45px]"
              style={{ color: theme.colors.foreground }}
            >
              {title}
            </Text>
            <Text
              className="mt-1 text-[12px] leading-[17px]"
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
            className="flex-row items-center rounded-full bg-violet-50 px-3 py-2"
            style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
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
  value: number;
  icon: SymbolViewProps["name"];
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
      android_ripple={{ color: "transparent" }}
      className="relative w-[48.5%] overflow-hidden rounded-[20px] border border-[#EEE9F1] bg-white px-3.5 pb-3.5 pt-4"
      style={({ pressed }) => ({
        opacity: pressed ? 0.84 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
        shadowColor: "#312E4A",
        shadowOpacity: 0.045,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      })}
    >
      <View
        pointerEvents="none"
        className="absolute left-0 right-0 top-0 h-[3px]"
        style={{ backgroundColor: color }}
      />

      <View className="flex-row items-center justify-between">
        <View
          className="h-10 w-10 items-center justify-center rounded-[14px]"
          style={{ backgroundColor: background }}
        >
          <SymbolView name={icon} tintColor={color} size={19} weight="bold" />
        </View>

        <Text
          className="text-[26px] font-black leading-[30px] tracking-[-0.9px]"
          style={{ color: theme.colors.foreground }}
        >
          {value}
        </Text>
      </View>

      <View className="mt-3 flex-row items-center justify-between gap-2">
        <Text
          numberOfLines={2}
          className="min-w-0 flex-1 text-[11px] font-extrabold leading-[14px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {label}
        </Text>

        <View
          className="h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: background }}
        >
          <Text className="text-[15px] font-black leading-[15px]" style={{ color }}>
            ›
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function AdminTrainingCard({
  item,
  onPress,
}: {
  item: TrainingRow;
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();
  const category =
    item.summary.category || item.full?.category || "Sans catégorie";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir la formation ${item.summary.title}`}
      onPress={onPress}
      android_ripple={{ color: "transparent" }}
      className="mb-3 flex-row items-center rounded-[22px] bg-white p-3.5"
      style={({ pressed }) => ({
        opacity: pressed ? 0.84 : 1,
        shadowColor: "#0F172A",
        shadowOpacity: 0.035,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
      })}
    >
      <View className="h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-[#F3EEFF]">
        <SymbolView
          name={{
            ios: "books.vertical.fill",
            android: "library_books",
            web: "library_books",
          }}
          tintColor="#7C3AED"
          size={23}
          weight="bold"
        />
      </View>

      <View className="ml-3 min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <View className="rounded-full bg-violet-50 px-2 py-1">
            <Text className="text-[8px] font-black uppercase text-violet-700">
              {trainingStatusLabel(item.summary.status)}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            className="min-w-0 flex-1 text-right text-[9px] font-bold"
            style={{ color: theme.colors.foregroundSubtle }}
          >
            {category}
          </Text>
        </View>

        <Text
          numberOfLines={2}
          className="mt-2 text-[14px] font-black leading-[18px]"
          style={{ color: theme.colors.foreground }}
        >
          {item.summary.title}
        </Text>

        <Text
          numberOfLines={1}
          className="mt-1 text-[10px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {item.full?.shortDescription || "Formation du catalogue SmartTraining"}
        </Text>
      </View>

      <View className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-violet-50">
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
          tintColor="#7C3AED"
          size={16}
          weight="bold"
        />
      </View>
    </Pressable>
  );
}

function PriorityAlertCard({
  title,
  description,
  tone,
  onPress,
}: {
  title: string;
  description: string;
  tone: AlertTone;
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

  const palette =
    tone === "error"
      ? {
          color: "#DC2626",
          background: "#FEF2F2",
          icon: {
            ios: "exclamationmark.triangle.fill",
            android: "warning",
            web: "warning",
          } as SymbolViewProps["name"],
          label: "Prioritaire",
        }
      : tone === "warning"
        ? {
            color: "#D97706",
            background: "#FFF7ED",
            icon: {
              ios: "exclamationmark.circle.fill",
              android: "error_outline",
              web: "error_outline",
            } as SymbolViewProps["name"],
            label: "À examiner",
          }
        : {
            color: "#2563EB",
            background: "#EFF6FF",
            icon: {
              ios: "info.circle.fill",
              android: "info",
              web: "info",
            } as SymbolViewProps["name"],
            label: "Information",
          };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      android_ripple={{ color: "transparent" }}
      className="relative mb-3 overflow-hidden rounded-[22px] border border-[#E8E2EA] bg-[#FFFDFC] p-3.5"
      style={({ pressed }) => ({
        opacity: pressed ? 0.84 : 1,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.035,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
      })}
    >
      <View
        pointerEvents="none"
        className="absolute -right-7 -top-8 h-20 w-20 rounded-full"
        style={{ backgroundColor: palette.background, opacity: 0.7 }}
      />
      <View className="flex-row items-start">
        <View
          className="h-10 w-10 items-center justify-center rounded-[14px]"
          style={{ backgroundColor: palette.background }}
        >
          <SymbolView
            name={palette.icon}
            tintColor={palette.color}
            size={19}
            weight="bold"
          />
        </View>

        <View className="ml-3 min-w-0 flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text
              numberOfLines={2}
              className="flex-1 text-[14px] font-black leading-[18px]"
              style={{ color: "#111827" }}
            >
              {title}
            </Text>
            <View
              className="rounded-full px-2 py-1"
              style={{ backgroundColor: palette.background }}
            >
              <Text
                className="text-[8px] font-black uppercase"
                style={{ color: palette.color }}
              >
                {palette.label}
              </Text>
            </View>
          </View>

          <Text
            numberOfLines={3}
            className="mt-1.5 text-[10px] leading-[15px]"
            style={{ color: "#6B7280" }}
          >
            {description}
          </Text>

          <View className="mt-2 flex-row items-center justify-end">
            <Text className="text-[10px] font-black text-violet-700">
              Ouvrir le pilotage
            </Text>
            <Text className="ml-1 text-[18px] font-bold leading-[18px] text-violet-700">
              ›
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function ActivityCard({
  item,
  isLast,
}: {
  item: ActivityRow;
  isLast: boolean;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View className="flex-row">
      <View className="w-6 items-center">
        <View className="mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-violet-100 bg-violet-600" />
        {!isLast ? <View className="w-[1.5px] flex-1 bg-violet-100" /> : null}
      </View>

      <View
        className="mb-3 flex-1 rounded-[18px] bg-white px-3.5 py-3"
        style={{
          shadowColor: "#0F172A",
          shadowOpacity: 0.025,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        }}
      >
        <Text
          numberOfLines={2}
          className="text-[12px] font-black leading-[16px]"
          style={{ color: theme.colors.foreground }}
        >
          {item.title}
        </Text>
        {item.description ? (
          <Text
            numberOfLines={2}
            className="mt-1 text-[10px] leading-[14px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {item.description}
          </Text>
        ) : null}
        <Text className="mt-1.5 text-[9px] font-bold text-violet-600">
          {formatDateTime(item.at)}
        </Text>
      </View>
    </View>
  );
}

function GroupCard({
  group,
  onPress,
}: {
  group: AdminGroup;
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir le groupe ${group.name}`}
      onPress={onPress}
      android_ripple={{ color: "transparent" }}
      className="mb-3 flex-row items-center rounded-[22px] bg-white p-3.5"
      style={({ pressed }) => ({
        opacity: pressed ? 0.84 : 1,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.035,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
      })}
    >
      <View className="h-11 w-11 items-center justify-center rounded-[15px] bg-violet-100">
        <SymbolView
          name={{ ios: "person.3.fill", android: "groups", web: "groups" }}
          tintColor="#7C3AED"
          size={20}
          weight="bold"
        />
      </View>

      <View className="ml-3 min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className="text-[14px] font-black"
          style={{ color: theme.colors.foreground }}
        >
          {group.name}
        </Text>
        <Text
          numberOfLines={2}
          className="mt-1 text-[10px] leading-[14px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {group.description || `Propriétaire : ${group.ownerRole}`}
        </Text>
      </View>

      <View className="ml-2 items-end">
        <Text className="text-[18px] font-black text-violet-700">
          {group.memberCount}
        </Text>
        <Text className="text-[8px] font-black uppercase tracking-[0.5px] text-violet-500">
          membres
        </Text>
      </View>
      <Text className="ml-2 text-[20px] font-bold text-violet-600">›</Text>
    </Pressable>
  );
}


function QuickActionRow({
  title,
  subtitle,
  icon,
  color,
  background,
  onPress,
  isLast = false,
}: {
  title: string;
  subtitle: string;
  icon: SymbolViewProps["name"];
  color: string;
  background: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      android_ripple={{ color: "transparent" }}
      className={`flex-row items-center px-3.5 py-3.5 ${isLast ? "" : "border-b border-[#F0ECF2]"}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-[14px]"
        style={{ backgroundColor: background }}
      >
        <SymbolView name={icon} tintColor={color} size={19} weight="bold" />
      </View>

      <View className="ml-3 min-w-0 flex-1">
        <Text
          className="text-[13px] font-black"
          style={{ color: theme.colors.foreground }}
        >
          {title}
        </Text>
        <Text
          numberOfLines={1}
          className="mt-0.5 text-[10px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {subtitle}
        </Text>
      </View>

      <View
        className="ml-3 h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: background }}
      >
        <Text className="text-[18px] font-black leading-[18px]" style={{ color }}>
          ›
        </Text>
      </View>
    </Pressable>
  );
}

export default function AdminDashboardScreen({ user, onLogout }: Props) {
  const { theme } = useSmartTrainingTheme();
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void getMyProfile()
      .then((nextProfile) => {
        if (active && nextProfile.role === "ADMIN") {
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

    void loadDashboardData()
      .then((loaded) => {
        if (!active) {
          return;
        }

        setData(loaded);
        setError("");
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger le tableau de bord administrateur.");
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
      const loaded = await loadDashboardData();
      setData(loaded);
      setError("");
    } catch {
      setError("Impossible d’actualiser le tableau de bord administrateur.");
    } finally {
      setRefreshing(false);
    }
  }

  const summary = data?.summary;

  const activeGroups = useMemo(
    () =>
      (data?.groups || [])
        .filter((group) => group.memberCount > 0)
        .slice(0, 2),
    [data?.groups],
  );

  const priorityAlerts = useMemo(() => {
    const severityRank: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    return [...(data?.alerts || [])]
      .sort((a, b) => {
        const aInsufficient = isDataInsufficient(a) ? 1 : 0;
        const bInsufficient = isDataInsufficient(b) ? 1 : 0;

        if (aInsufficient !== bInsufficient) {
          return aInsufficient - bInsufficient;
        }

        const severityDelta =
          (severityRank[String(b.severity || "").toUpperCase()] || 0) -
          (severityRank[String(a.severity || "").toUpperCase()] || 0);

        if (severityDelta !== 0) {
          return severityDelta;
        }

        return safeTimestamp(b.createdAt) - safeTimestamp(a.createdAt);
      })
      .slice(0, 2);
  }, [data?.alerts]);

  const trainingById = useMemo(
    () =>
      new Map(
        (data?.trainings || []).map((row) => [
          row.summary.id,
          row.summary.title,
        ]),
      ),
    [data?.trainings],
  );

  const recentActivity = useMemo(
    () =>
      activityRows(
        data?.trainings || [],
        data?.alerts || [],
        data?.groups || [],
      ),
    [data?.alerts, data?.groups, data?.trainings],
  );

  const dataInsufficientCount = useMemo(
    () => (data?.alerts || []).filter(isDataInsufficient).length,
    [data?.alerts],
  );

  if (loading) {
    return (
      <ScreenContainer>
        <AppLoadingState label="Ouverture de l’espace administrateur…" />
      </ScreenContainer>
    );
  }

  if (!data) {
    return (
      <ScreenContainer>
        {error ? (
          <AppErrorState
            title="Tableau de bord indisponible"
            description={error}
            actionLabel="Réessayer"
            onAction={() => void refresh()}
          />
        ) : (
          <AppEmptyState
            title="Aucune donnée de pilotage disponible"
            description="Le tableau de bord n’a renvoyé aucune donnée exploitable pour le moment."
            actionLabel="Actualiser"
            onAction={() => void refresh()}
          />
        )}
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
        {/* HERO — même langage visuel que le Dashboard Formateur */}
        <View
          className="overflow-hidden rounded-[24px] border border-[#E6E0E8] bg-[#FFFDFC] p-4"
          style={{
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
                <Text className="text-[9px] font-black uppercase tracking-[1px] text-violet-700">
                  Espace administrateur
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ouvrir Mon compte"
              hitSlop={8}
              onPress={() => router.push("/admin/profile" as Href)}
              android_ripple={{ color: "transparent" }}
            >
              {profile?.avatarDataUrl ? (
                <Image
                  source={{ uri: profile.avatarDataUrl }}
                  className="h-12 w-12 rounded-[16px] border-2 border-violet-100"
                  accessibilityLabel="Photo du profil administrateur"
                />
              ) : (
                <View className="h-12 w-12 items-center justify-center rounded-[16px] border-2 border-violet-100 bg-violet-50">
                  <Text className="text-[13px] font-black text-violet-700">
                    {profileInitials(profile, user)}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          <Text
            className="mt-3 text-[24px] font-black leading-[28px] tracking-[-0.7px]"
            style={{ color: "#111827" }}
          >
            {dynamicGreeting()} {displayName(user)} {greetingEmoji()}
          </Text>
          <Text
            className="mt-1.5 text-[12px] leading-[18px]"
            style={{ color: "#6B7280" }}
          >
            Supervisez la plateforme et repérez rapidement les éléments qui
            demandent votre attention.
          </Text>

        </View>

        {error ? (
          <View className="mt-4">
            <AppErrorState
              title="Actualisation incomplète"
              description={error}
              actionLabel="Réessayer"
              onAction={() => void refresh()}
            />
          </View>
        ) : null}

        {data.degradedSections.length > 0 ? (
          <View className="mt-4">
            <AppErrorState
              title="Certaines données sont indisponibles"
              description={`Sections concernées : ${data.degradedSections.join(", ")}. Les valeurs indisponibles ne sont pas remplacées par de faux zéros.`}
              actionLabel="Actualiser"
              onAction={() => void refresh()}
            />
          </View>
        ) : null}

        {/* INDICATEURS */}
        <View className="mt-7">
          <SectionHeading
            title="Indicateurs clés"
            subtitle="Une vue compacte de l’activité de la plateforme."
          />

          {summary ? (
            <View className="flex-row flex-wrap justify-between gap-y-3">
              <DashboardMetricCard
                label="Utilisateurs"
                value={summary.users}
                icon={{ ios: "person.2.fill", android: "group", web: "group" }}
                color="#7C3AED"
                background="#F3EEFF"
                onPress={() => router.push("/admin/users" as Href)}
              />
              <DashboardMetricCard
                label="Utilisateurs actifs"
                value={summary.activeUsers}
                icon={{
                  ios: "person.crop.circle.badge.checkmark",
                  android: "verified_user",
                  web: "verified_user",
                }}
                color="#2563EB"
                background="#EFF6FF"
                onPress={() => router.push("/admin/users" as Href)}
              />
              <DashboardMetricCard
                label="Formations"
                value={summary.trainings}
                icon={{
                  ios: "books.vertical.fill",
                  android: "library_books",
                  web: "library_books",
                }}
                color="#7C3AED"
                background="#F5F3FF"
                onPress={() => router.push("/admin/trainings" as Href)}
              />
              <DashboardMetricCard
                label="Formations publiées"
                value={summary.publishedTrainings}
                icon={{
                  ios: "checkmark.seal.fill",
                  android: "task_alt",
                  web: "task_alt",
                }}
                color="#16A36A"
                background="#ECFDF3"
                onPress={() => router.push("/admin/trainings" as Href)}
              />
              <DashboardMetricCard
                label="Alertes ouvertes"
                value={summary.openAlerts}
                icon={{
                  ios: "exclamationmark.triangle.fill",
                  android: "warning",
                  web: "warning",
                }}
                color="#DC2626"
                background="#FEF2F2"
                onPress={() => router.push("/admin/alerts" as Href)}
              />
              <DashboardMetricCard
                label="Demandes formateur"
                value={summary.pendingTrainerRequests}
                icon={{
                  ios: "person.badge.plus",
                  android: "person_add",
                  web: "person_add",
                }}
                color="#D97706"
                background="#FFF7ED"
                onPress={() => router.push("/admin/trainer-requests" as Href)}
              />
            </View>
          ) : (
            <AppEmptyState
              title="Synthèse momentanément indisponible"
              description="Les autres sections restent affichées lorsqu’elles ont pu être chargées."
            />
          )}
        </View>

        {/* PILOTAGE PRIORITAIRE */}
        <View className="mt-7">
          <SectionHeading
            title="Pilotage prioritaire"
            subtitle="Les signaux qui nécessitent votre attention maintenant."
            onPress={() => router.push("/admin/alerts" as Href)}
          />

          {dataInsufficientCount > 0 ? (
            <PriorityAlertCard
              title="Données insuffisantes"
              description={`${dataInsufficientCount} ${dataInsufficientCount > 1 ? "signaux" : "signal"} ${dataInsufficientCount > 1 ? "ne disposent" : "ne dispose"} pas encore d’assez de données pour conclure à un risque.`}
              tone="info"
              onPress={() => router.push("/admin/alerts" as Href)}
            />
          ) : null}

          {priorityAlerts.length > 0 ? (
            <>
              {priorityAlerts.map((alert) => (
                <PriorityAlertCard
                  key={alert.id}
                  title={alertLabel(alert)}
                  description={alertDescription(alert, trainingById)}
                  tone={alertSeverity(alert)}
                  onPress={() => router.push("/admin/alerts" as Href)}
                />
              ))}
              <AppButton
                title="Ouvrir le pilotage"
                onPress={() => router.push("/admin/alerts" as Href)}
                style={{ width: "100%", marginTop: 2 }}
              />
            </>
          ) : dataInsufficientCount === 0 ? (
            <AppEmptyState
              title="Aucune alerte ouverte"
              description="Aucun signal de pilotage n’est actuellement remonté."
              actionLabel="Ouvrir le pilotage"
              onAction={() => router.push("/admin/alerts" as Href)}
            />
          ) : null}
        </View>

        {/* FORMATIONS */}
        <View className="mt-7">
          <SectionHeading
            title="Formations à superviser"
            subtitle="Les contenus du catalogue à surveiller en priorité."
            onPress={() => router.push("/admin/trainings" as Href)}
          />

          {data.trainings.length > 0 ? (
            data.trainings.map((row) => (
              <AdminTrainingCard
                key={row.summary.id}
                item={row}
                onPress={() => router.push("/admin/trainings" as Href)}
              />
            ))
          ) : (
            <AppEmptyState
              title="Aucune formation à afficher"
              description="Le catalogue administrateur ne contient actuellement aucune formation disponible dans cette vue."
              actionLabel="Ouvrir les formations"
              onAction={() => router.push("/admin/trainings" as Href)}
            />
          )}
        </View>

        {/* ACTIVITÉ */}
        <View className="mt-7">
          <SectionHeading
            title="Activité récente"
            subtitle="Les derniers événements administratifs utiles."
          />

          {recentActivity.length > 0 ? (
            recentActivity.map((item, index) => (
              <ActivityCard
                key={item.key}
                item={item}
                isLast={index === recentActivity.length - 1}
              />
            ))
          ) : (
            <AppEmptyState
              title="Pas encore d’activité récente"
              description="Aucun horodatage métier exploitable n’est disponible dans les données chargées."
            />
          )}
        </View>

        {/* GROUPES */}
        <View className="mt-7">
          <SectionHeading
            title="Groupes actifs"
            subtitle="Les cohortes avec des membres actifs."
            onPress={() => router.push("/admin/groups" as Href)}
          />

          {activeGroups.length > 0 ? (
            <>
              {activeGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onPress={() => router.push(`/admin/groups/${group.id}` as Href)}
                />
              ))}

            </>
          ) : (
            <AppEmptyState
              title="Aucun groupe actif"
              description="Aucun groupe avec membre n’est actuellement disponible."
              actionLabel="Ouvrir les groupes"
              onAction={() => router.push("/admin/groups" as Href)}
            />
          )}
        </View>

        {/* ACCÈS RAPIDES — mêmes routes, présentation plus compacte */}
        <View className="mt-7">
          <Text
            className="text-[18px] font-black tracking-[-0.35px]"
            style={{ color: theme.colors.foreground }}
          >
            Accès rapides
          </Text>
          <Text
            className="mt-1 text-[11px] leading-[16px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            Accédez directement aux principales zones d’administration.
          </Text>

          <View
            className="mt-3 overflow-hidden rounded-[22px] border border-[#EAE5ED] bg-white"
            style={{
              shadowColor: theme.colors.shadow,
              shadowOpacity: 0.03,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 1,
            }}
          >
            <QuickActionRow
              title="Voir tous les groupes"
              subtitle="Consulter les cohortes et leurs membres"
              icon={{ ios: "person.3.fill", android: "groups", web: "groups" }}
              color="#D97706"
              background="#FFF7ED"
              onPress={() => router.push("/admin/groups" as Href)}
            />
            <QuickActionRow
              title="Gérer les utilisateurs"
              subtitle="Comptes, rôles et statuts des utilisateurs"
              icon={{ ios: "person.2.fill", android: "group", web: "group" }}
              color="#7C3AED"
              background="#F3EEFF"
              onPress={() => router.push("/admin/users" as Href)}
            />
            <QuickActionRow
              title="Superviser les formations"
              subtitle="Catalogue, publication et suivi des contenus"
              icon={{ ios: "books.vertical.fill", android: "library_books", web: "library_books" }}
              color="#2563EB"
              background="#EFF6FF"
              onPress={() => router.push("/admin/trainings" as Href)}
              isLast
            />
          </View>
        </View>

        {/* Déconnexion séparée et conservée uniquement tout en bas du Dashboard. */}
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
              name={{ ios: "rectangle.portrait.and.arrow.right", android: "logout", web: "logout" }}
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

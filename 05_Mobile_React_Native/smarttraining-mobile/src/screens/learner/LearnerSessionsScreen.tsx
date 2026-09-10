import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import { getMySupportSessions } from "../../features/analytics/learnerSupportSessionService";
import { getMyLearnerTrainings } from "../../features/trainings/learnerTrainingService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import {
  LearnerSupportSession,
  LearnerSupportSessionStatus,
} from "../../types/learnerSupportSession";
import { LearnerMyTraining } from "../../types/learnerTraining";

type Props = {
  onBackHome: () => void;
};

const PAGE_SIZE = 3;

function statusLabel(status: LearnerSupportSessionStatus): string {
  if (status === "SCHEDULED") return "Planifiée";
  if (status === "COMPLETED") return "Terminée";
  return "Annulée";
}

function statusTone(status: LearnerSupportSessionStatus): {
  tint: string;
  soft: string;
} {
  if (status === "SCHEDULED") {
    return { tint: "#7C3AED", soft: "#F3E8FF" };
  }

  if (status === "COMPLETED") {
    return { tint: "#059669", soft: "#ECFDF5" };
  }

  return { tint: "#DC2626", soft: "#FEF2F2" };
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDay(value: string): string {
  const date = parseDate(value);
  if (!date) return "--";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(date);
}

function formatMonth(value: string): string {
  const date = parseDate(value);
  if (!date) return "---";
  return new Intl.DateTimeFormat("fr-FR", { month: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase();
}

function formatLongDate(value: string): string {
  const date = parseDate(value);
  if (!date) return "Date à confirmer";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string): string {
  const date = parseDate(value);
  if (!date) return "--:--";
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isSafeMeetingLink(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value);
}

function pageNumbers(current: number, total: number): number[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(current - 2, total - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <View className="mt-3 rounded-[18px] border border-slate-200 bg-white px-3 py-3">
      <View className="mb-2.5 flex-row items-center justify-between">
        <Text
          allowFontScaling={false}
          className="text-[10px] font-black uppercase tracking-[0.8px] text-slate-400"
        >
          Navigation
        </Text>
        <Text
          allowFontScaling={false}
          className="text-[11px] font-black text-slate-600"
        >
          Page {page} sur {totalPages}
        </Text>
      </View>

      <View className="flex-row items-center justify-between gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Page précédente"
          disabled={page <= 1}
          onPress={() => onChange(Math.max(1, page - 1))}
          className="h-10 w-10 items-center justify-center rounded-[13px] border border-slate-200 bg-slate-50"
          style={{ opacity: page <= 1 ? 0.35 : 1 }}
        >
          <SymbolView
            name={{ ios: "chevron.left", android: "chevron_left", web: "chevron_left" }}
            size={17}
            tintColor="#475569"
            weight="bold"
          />
        </Pressable>

        <View className="min-w-0 flex-1 flex-row items-center justify-center gap-1.5">
          {pageNumbers(page, totalPages).map((item) => {
            const selected = item === page;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={`Page ${item}`}
                accessibilityState={{ selected }}
                onPress={() => onChange(item)}
                className="h-10 min-w-10 items-center justify-center rounded-[13px] border px-2"
                style={{
                  backgroundColor: selected ? "#7C3AED" : "#FFFFFF",
                  borderColor: selected ? "#7C3AED" : "#E2E8F0",
                }}
              >
                <Text
                  allowFontScaling={false}
                  className="text-[12px] font-black"
                  style={{ color: selected ? "#FFFFFF" : "#64748B" }}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Page suivante"
          disabled={page >= totalPages}
          onPress={() => onChange(Math.min(totalPages, page + 1))}
          className="h-10 w-10 items-center justify-center rounded-[13px] border border-slate-200 bg-slate-50"
          style={{ opacity: page >= totalPages ? 0.35 : 1 }}
        >
          <SymbolView
            name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
            size={17}
            tintColor="#475569"
            weight="bold"
          />
        </Pressable>
      </View>
    </View>
  );
}

export default function LearnerSessionsScreen({ onBackHome }: Props) {
  void onBackHome;
  const { theme } = useSmartTrainingTheme();
  const [sessions, setSessions] = useState<LearnerSupportSession[]>([]);
  const [trainings, setTrainings] = useState<LearnerMyTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  async function load() {
    const [sessionData, trainingData] = await Promise.all([
      getMySupportSessions(),
      getMyLearnerTrainings(),
    ]);

    setSessions(sessionData);
    setTrainings(trainingData);
  }

  useEffect(() => {
    let active = true;

    void Promise.all([getMySupportSessions(), getMyLearnerTrainings()])
      .then(([sessionData, trainingData]) => {
        if (!active) return;
        setSessions(sessionData);
        setTrainings(trainingData);
        setError("");
      })
      .catch(() => {
        if (active) setError("Impossible de charger tes séances.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const trainingTitles = useMemo(
    () => new Map(trainings.map((training) => [training.id, training.title])),
    [trainings],
  );

  const upcoming = useMemo(
    () =>
      sessions
        .filter((session) => session.status === "SCHEDULED")
        .sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
        ),
    [sessions],
  );

  const history = useMemo(
    () =>
      sessions
        .filter((session) => session.status !== "SCHEDULED")
        .sort(
          (a, b) =>
            new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
        ),
    [sessions],
  );

  const completedCount = useMemo(
    () => sessions.filter((session) => session.status === "COMPLETED").length,
    [sessions],
  );

  const upcomingPages = Math.max(1, Math.ceil(upcoming.length / PAGE_SIZE));
  const historyPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const safeUpcomingPage = Math.min(upcomingPage, upcomingPages);
  const safeHistoryPage = Math.min(historyPage, historyPages);

  const visibleUpcoming = useMemo(
    () =>
      upcoming.slice(
        (safeUpcomingPage - 1) * PAGE_SIZE,
        safeUpcomingPage * PAGE_SIZE,
      ),
    [upcoming, safeUpcomingPage],
  );

  const visibleHistory = useMemo(
    () =>
      history.slice(
        (safeHistoryPage - 1) * PAGE_SIZE,
        safeHistoryPage * PAGE_SIZE,
      ),
    [history, safeHistoryPage],
  );

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
      setUpcomingPage(1);
      setHistoryPage(1);
      setError("");
    } catch {
      setError("Impossible d’actualiser tes séances.");
    } finally {
      setRefreshing(false);
    }
  }

  async function openMeeting(session: LearnerSupportSession) {
    if (session.status !== "SCHEDULED" || !isSafeMeetingLink(session.meetingLink)) {
      setError("Le lien de cette séance n’est pas disponible.");
      return;
    }

    setOpeningId(session.id);
    setError("");

    try {
      const supported = await Linking.canOpenURL(session.meetingLink);
      if (!supported) {
        setError("Ce lien de réunion ne peut pas être ouvert.");
        return;
      }
      await Linking.openURL(session.meetingLink);
    } catch {
      setError("Impossible d’ouvrir le lien de réunion.");
    } finally {
      setOpeningId(null);
    }
  }

  function renderSession(session: LearnerSupportSession, allowJoin: boolean) {
    const trainingTitle =
      trainingTitles.get(session.trainingId) ?? "Formation associée";
    const tone = statusTone(session.status);
    const canJoin =
      allowJoin &&
      session.status === "SCHEDULED" &&
      isSafeMeetingLink(session.meetingLink);

    if (allowJoin) {
      return (
        <View
          key={session.id}
          className="mb-4 overflow-hidden rounded-[24px] border"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            shadowColor: "#0F172A",
            shadowOpacity: 0.055,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 2,
          }}
        >
          <View className="h-1 bg-amber-500" />

          <View className="p-4">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5">
                <SymbolView
                  name={{ ios: "calendar", android: "event", web: "event" }}
                  size={14}
                  tintColor="#D97706"
                  weight="bold"
                />
                <Text
                  allowFontScaling={false}
                  className="text-[10px] font-black uppercase tracking-[0.8px] text-amber-700"
                >
                  {formatMonth(session.scheduledAt)} {formatDay(session.scheduledAt)} · {formatTime(session.scheduledAt)}
                </Text>
              </View>

              <View className="rounded-full bg-violet-50 px-3 py-1.5">
                <Text
                  allowFontScaling={false}
                  className="text-[10px] font-black text-violet-700"
                >
                  {statusLabel(session.status)}
                </Text>
              </View>
            </View>

            <Text
              allowFontScaling={false}
              numberOfLines={1}
              className="mt-4 text-[10px] font-black uppercase tracking-[1px]"
              style={{ color: theme.colors.accent }}
            >
              {trainingTitle}
            </Text>

            <Text
              className="mt-1.5 text-[19px] font-black leading-[24px]"
              style={{ color: theme.colors.foreground }}
            >
              {session.title}
            </Text>

            <View
              className="mt-4 flex-row items-center gap-3 rounded-[17px] border px-3.5 py-3"
              style={{
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.border,
              }}
            >
              <View className="h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white">
                <SymbolView
                  name={{ ios: "clock.fill", android: "schedule", web: "schedule" }}
                  size={17}
                  tintColor="#7C3AED"
                  weight="bold"
                />
              </View>

              <View className="min-w-0 flex-1">
                <Text
                  allowFontScaling={false}
                  className="text-[10px] font-black uppercase tracking-[0.8px]"
                  style={{ color: theme.colors.foregroundSubtle }}
                >
                  Rendez-vous
                </Text>
                <Text
                  className="mt-0.5 text-[13px] font-black capitalize leading-[18px]"
                  style={{ color: theme.colors.foreground }}
                >
                  {formatLongDate(session.scheduledAt)}
                </Text>
                <Text
                  allowFontScaling={false}
                  className="mt-0.5 text-[11px] font-bold"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  {formatTime(session.scheduledAt)}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row items-start gap-3">
              <View className="mt-0.5 h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-amber-50">
                <SymbolView
                  name={{ ios: "scope", android: "flag", web: "flag" }}
                  size={16}
                  tintColor="#D97706"
                  weight="bold"
                />
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  allowFontScaling={false}
                  className="text-[10px] font-black uppercase tracking-[0.8px]"
                  style={{ color: theme.colors.foregroundSubtle }}
                >
                  Objectif
                </Text>
                <Text
                  className="mt-1 text-[13px] leading-[19px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  {session.objective}
                </Text>
              </View>
            </View>

            {session.note ? (
              <View className="mt-4 flex-row gap-3 rounded-[17px] bg-violet-50 p-3.5">
                <View className="h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-white">
                  <SymbolView
                    name={{ ios: "quote.bubble.fill", android: "chat", web: "chat" }}
                    size={16}
                    tintColor="#7C3AED"
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[11px] font-black text-violet-700">
                    Note du formateur
                  </Text>
                  <Text
                    className="mt-1 text-[12px] leading-[18px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    {session.note}
                  </Text>
                </View>
              </View>
            ) : null}

            {canJoin ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rejoindre la séance"
                disabled={openingId === session.id}
                onPress={() => void openMeeting(session)}
                className="mt-4 min-h-[52px] flex-row items-center justify-center gap-2 rounded-[16px] bg-violet-600 px-4"
                style={{
                  opacity: openingId === session.id ? 0.65 : 1,
                  shadowColor: "#7C3AED",
                  shadowOpacity: 0.16,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 2,
                }}
              >
                <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-white/15">
                  <SymbolView
                    name={{ ios: "video.fill", android: "videocam", web: "videocam" }}
                    size={17}
                    tintColor="#FFFFFF"
                  />
                </View>
                <Text className="text-[14px] font-black text-white">
                  {openingId === session.id ? "Ouverture…" : "Rejoindre la séance"}
                </Text>
                <SymbolView
                  name={{ ios: "arrow.up.right", android: "north_east", web: "north_east" }}
                  size={15}
                  tintColor="#FFFFFF"
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      );
    }

    return (
      <View
        key={session.id}
        className="mb-3.5 overflow-hidden rounded-[22px] border"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: "#0F172A",
          shadowOpacity: 0.03,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        }}
      >
        <View className="flex-row">
          <View className="w-1.5" style={{ backgroundColor: tone.tint }} />

          <View className="min-w-0 flex-1 p-4">
            <View className="flex-row items-start gap-3">
              <View
                className="h-10 w-10 shrink-0 items-center justify-center rounded-[13px]"
                style={{ backgroundColor: tone.soft }}
              >
                <SymbolView
                  name={{
                    ios:
                      session.status === "COMPLETED"
                        ? "checkmark.circle.fill"
                        : "xmark.circle.fill",
                    android:
                      session.status === "COMPLETED" ? "check_circle" : "cancel",
                    web:
                      session.status === "COMPLETED" ? "check_circle" : "cancel",
                  }}
                  size={19}
                  tintColor={tone.tint}
                />
              </View>

              <View className="min-w-0 flex-1">
                <View className="flex-row items-center justify-between gap-2">
                  <Text
                    allowFontScaling={false}
                    numberOfLines={1}
                    className="min-w-0 flex-1 text-[10px] font-black uppercase tracking-[0.8px]"
                    style={{ color: theme.colors.accent }}
                  >
                    {trainingTitle}
                  </Text>
                  <View
                    className="shrink-0 rounded-full px-2.5 py-1.5"
                    style={{ backgroundColor: tone.soft }}
                  >
                    <Text
                      allowFontScaling={false}
                      className="text-[9px] font-black"
                      style={{ color: tone.tint }}
                    >
                      {statusLabel(session.status)}
                    </Text>
                  </View>
                </View>

                <Text
                  className="mt-1.5 text-[16px] font-black leading-[21px]"
                  style={{ color: theme.colors.foreground }}
                >
                  {session.title}
                </Text>

                <View className="mt-2.5 flex-row items-center gap-1.5">
                  <SymbolView
                    name={{ ios: "calendar", android: "event", web: "event" }}
                    size={13}
                    tintColor={theme.colors.foregroundSubtle}
                  />
                  <Text
                    allowFontScaling={false}
                    className="min-w-0 flex-1 text-[11px] font-bold capitalize"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    {formatLongDate(session.scheduledAt)} · {formatTime(session.scheduledAt)}
                  </Text>
                </View>
              </View>
            </View>

            <View
              className="mt-3.5 rounded-[15px] border px-3.5 py-3"
              style={{
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.border,
              }}
            >
              <View className="flex-row items-center gap-2">
                <SymbolView
                  name={{ ios: "scope", android: "flag", web: "flag" }}
                  size={14}
                  tintColor={tone.tint}
                />
                <Text
                  allowFontScaling={false}
                  className="text-[9px] font-black uppercase tracking-[0.8px]"
                  style={{ color: theme.colors.foregroundSubtle }}
                >
                  Objectif
                </Text>
              </View>
              <Text
                className="mt-1.5 text-[12px] leading-[18px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                {session.objective}
              </Text>
            </View>

            {session.note ? (
              <View className="mt-3 flex-row gap-2.5 rounded-[15px] bg-violet-50 px-3.5 py-3">
                <SymbolView
                  name={{ ios: "quote.bubble.fill", android: "chat", web: "chat" }}
                  size={14}
                  tintColor="#7C3AED"
                />
                <View className="min-w-0 flex-1">
                  <Text
                    allowFontScaling={false}
                    className="text-[10px] font-black text-violet-700"
                  >
                    Note du formateur
                  </Text>
                  <Text
                    className="mt-1 text-[12px] leading-[18px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    {session.note}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return <LoadingState message="Chargement de tes séances..." />;
  }

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{ padding: 0, backgroundColor: theme.colors.background }}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-[14px] pb-6 pt-3"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full self-center" style={{ maxWidth: 760 }}>
        <View
          className="overflow-hidden rounded-[24px] border px-4 py-3.5"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            shadowColor: "#0F172A",
            shadowOpacity: 0.055,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 2,
          }}
        >
          <View className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-amber-100/60" />

          <View className="flex-row items-start gap-3">
            <View className="h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-amber-50">
              <SymbolView
                name={{ ios: "person.2.fill", android: "groups", web: "groups" }}
                size={23}
                tintColor="#D97706"
                weight="bold"
              />
            </View>

            <View className="min-w-0 flex-1 pt-0.5">
              <Text className="text-[10px] font-black uppercase tracking-[1.1px] text-amber-600">
                Accompagnement
              </Text>
              <Text
                className="mt-1 text-[21px] font-black leading-[26px]"
                style={{ color: theme.colors.foreground }}
              >
                Tes séances avec ton formateur
              </Text>
              <Text
                className="mt-1.5 text-[13px] leading-[19px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Retrouve tes rendez-vous, leurs objectifs et les liens de réunion disponibles.
              </Text>
            </View>

            <View className="h-11 w-11 shrink-0 rotate-6 items-center justify-center rounded-[15px] bg-amber-500">
              <SymbolView
                name={{ ios: "calendar.badge.clock", android: "event", web: "event" }}
                size={21}
                tintColor="#FFFFFF"
                weight="bold"
              />
            </View>
          </View>

          <View className="mt-3.5 flex-row gap-2">
            <View className="min-w-0 flex-1 rounded-[16px] border border-slate-200 bg-white px-3 py-2.5">
              <Text allowFontScaling={false} className="text-[20px] font-black text-amber-600">
                {upcoming.length}
              </Text>
              <Text allowFontScaling={false} className="mt-0.5 text-[10px] font-bold text-slate-500">
                À venir
              </Text>
            </View>
            <View className="min-w-0 flex-1 rounded-[16px] border border-slate-200 bg-white px-3 py-2.5">
              <Text allowFontScaling={false} className="text-[20px] font-black text-emerald-600">
                {completedCount}
              </Text>
              <Text allowFontScaling={false} className="mt-0.5 text-[10px] font-bold text-slate-500">
                Terminées
              </Text>
            </View>
            <View className="min-w-0 flex-1 rounded-[16px] border border-slate-200 bg-white px-3 py-2.5">
              <Text
                allowFontScaling={false}
                className="text-[20px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                {sessions.length}
              </Text>
              <Text allowFontScaling={false} className="mt-0.5 text-[10px] font-bold text-slate-500">
                Total
              </Text>
            </View>
          </View>
        </View>

        {error ? <View className="mt-4"><ErrorMessage message={error} /></View> : null}

        <View className="mt-5 rounded-[22px] border p-3.5" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-amber-50">
              <SymbolView name={{ ios: "calendar.badge.clock", android: "event_upcoming", web: "event_upcoming" }} size={20} tintColor="#D97706" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[20px] font-black" style={{ color: theme.colors.foreground }}>À venir</Text>
              <Text className="mt-0.5 text-[12px] leading-[18px]" style={{ color: theme.colors.foregroundMuted }}>Tes prochains rendez-vous planifiés.</Text>
            </View>
            <View className="rounded-[12px] bg-amber-50 px-3 py-2">
              <Text allowFontScaling={false} className="text-[12px] font-black text-amber-700">{upcoming.length}</Text>
            </View>
          </View>
        </View>

        <View className="mt-3.5">
          {upcoming.length === 0 ? (
            <View className="rounded-[22px] border p-5" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-amber-50">
                <SymbolView name={{ ios: "calendar.badge.plus", android: "event", web: "event" }} size={21} tintColor="#D97706" />
              </View>
              <Text className="mt-3 text-[16px] font-black" style={{ color: theme.colors.foreground }}>Aucune séance planifiée</Text>
              <Text className="mt-1 text-[13px] leading-[19px]" style={{ color: theme.colors.foregroundMuted }}>Les prochains rendez-vous fixés par ton formateur apparaîtront ici.</Text>
            </View>
          ) : (
            visibleUpcoming.map((session) => renderSession(session, true))
          )}
          {upcoming.length > 0 ? (
            <Pagination
              page={safeUpcomingPage}
              totalPages={upcomingPages}
              onChange={setUpcomingPage}
            />
          ) : null}
        </View>

        <View className="mt-6 rounded-[22px] border p-3.5" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-slate-100">
              <SymbolView name={{ ios: "clock.arrow.circlepath", android: "history", web: "history" }} size={20} tintColor="#64748B" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[20px] font-black" style={{ color: theme.colors.foreground }}>Historique</Text>
              <Text className="mt-0.5 text-[12px] leading-[18px]" style={{ color: theme.colors.foregroundMuted }}>Tes séances terminées ou annulées, classées de la plus récente à la plus ancienne.</Text>
            </View>
            <View className="rounded-[12px] bg-slate-100 px-3 py-2">
              <Text allowFontScaling={false} className="text-[12px] font-black text-slate-600">{history.length}</Text>
            </View>
          </View>
        </View>

        <View className="mt-3.5">
          {history.length === 0 ? (
            <View className="rounded-[22px] border p-5" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
              <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-slate-100">
                <SymbolView name={{ ios: "clock", android: "schedule", web: "schedule" }} size={20} tintColor="#64748B" />
              </View>
              <Text className="mt-3 text-[16px] font-black" style={{ color: theme.colors.foreground }}>Aucun historique</Text>
              <Text className="mt-1 text-[13px] leading-[19px]" style={{ color: theme.colors.foregroundMuted }}>Les séances terminées ou annulées apparaîtront ici.</Text>
            </View>
          ) : (
            visibleHistory.map((session) => renderSession(session, false))
          )}
          {history.length > 0 ? (
            <Pagination
              page={safeHistoryPage}
              totalPages={historyPages}
              onChange={setHistoryPage}
            />
          ) : null}
        </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

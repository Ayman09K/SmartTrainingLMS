import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
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
  cancelTrainerSupportSession,
  completeTrainerSupportSession,
  getTrainerSupportSessionDetail,
} from "../../features/trainer/trainerActionService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerSupportSessionDetailData,
  TrainerSupportSessionResponse,
} from "../../types/trainerActionMobile";

type Props = {
  sessionId: number;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];
type ConfirmAction = () => void;

function learnerName(data: TrainerSupportSessionDetailData): string {
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

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function statusLabel(value: string): string {
  const labels: Record<string, string> = {
    SCHEDULED: "Planifiée",
    COMPLETED: "Réalisée",
    CANCELLED: "Annulée",
  };

  return labels[value] || "À examiner";
}

function statusTone(value: string): {
  color: string;
  soft: string;
  icon: SymbolName;
} {
  if (value === "SCHEDULED") {
    return {
      color: "#B45309",
      soft: "#FFF4E5",
      icon: { ios: "clock.fill", android: "schedule", web: "schedule" },
    };
  }

  if (value === "COMPLETED") {
    return {
      color: "#16845A",
      soft: "#EAFBF3",
      icon: { ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" },
    };
  }

  return {
    color: "#667085",
    soft: "#F2F4F7",
    icon: { ios: "xmark.circle.fill", android: "cancel", web: "cancel" },
  };
}

function formatDate(value?: string | null): string {
  if (!value) return "Non disponible";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function confirmMobileAction(
  title: string,
  message: string,
  destructive: boolean,
  action: ConfirmAction,
) {
  const browserConfirm = (
    globalThis as typeof globalThis & {
      confirm?: (message?: string) => boolean;
    }
  ).confirm;

  if (Platform.OS === "web" && typeof browserConfirm === "function") {
    if (browserConfirm(`${title}\n\n${message}`)) {
      action();
    }
    return;
  }

  Alert.alert(title, message, [
    {
      text: "Retour",
      style: "cancel",
    },
    {
      text: "Confirmer",
      style: destructive ? "destructive" : "default",
      onPress: action,
    },
  ]);
}

export default function TrainerSupportSessionDetailScreen({
  sessionId,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [data, setData] = useState<TrainerSupportSessionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const loaded = await getTrainerSupportSessionDetail(sessionId);
    setData(loaded);
  }

  useEffect(() => {
    let active = true;

    void getTrainerSupportSessionDetail(sessionId)
      .then((loaded) => {
        if (active) {
          setData(loaded);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError("Impossible d’ouvrir cette séance.");
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
  }, [sessionId]);

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError("Impossible d’actualiser cette séance.");
    } finally {
      setRefreshing(false);
    }
  }

  function apply(session: TrainerSupportSessionResponse) {
    setData((current) =>
      current
        ? {
            ...current,
            session,
          }
        : current,
    );
  }

  async function openMeeting() {
    if (!data) return;

    try {
      const canOpen = await Linking.canOpenURL(data.session.meetingLink);

      if (!canOpen) {
        setError("Ce lien de réunion ne peut pas être ouvert sur cet appareil.");
        return;
      }

      await Linking.openURL(data.session.meetingLink);
    } catch {
      setError("Impossible d’ouvrir le lien de réunion.");
    }
  }

  async function complete() {
    if (!data || acting) return;

    setActing(true);
    setError("");
    setSuccess("");

    try {
      const updated = await completeTrainerSupportSession(data.session.id);
      apply(updated);
      setSuccess("Séance marquée comme réalisée.");
    } catch {
      setError("Impossible de clôturer cette séance.");
    } finally {
      setActing(false);
    }
  }

  async function cancel() {
    if (!data || acting) return;

    setActing(true);
    setError("");
    setSuccess("");

    try {
      const updated = await cancelTrainerSupportSession(data.session.id);
      apply(updated);
      setSuccess("Séance annulée.");
    } catch {
      setError("Impossible d’annuler cette séance.");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return <LoadingState message="Ouverture de la séance..." />;
  }

  if (!data) {
    return (
      <ScreenContainer>
        <View className="mx-auto w-full max-w-[720px] pt-6">
          <ErrorMessage
            message={error || "Séance indisponible."}
            onRetry={() => void refresh()}
          />
        </View>
      </ScreenContainer>
    );
  }

  const scheduled = data.session.status === "SCHEDULED";
  const name = learnerName(data);
  const tone = statusTone(data.session.status);

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{ padding: 0, backgroundColor: "#F8F6F3" }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-[760px] px-4">
          <View
            className="mt-4 overflow-hidden rounded-[24px] border bg-white"
            style={{
              borderColor: "#E5DFE8",
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.05,
              shadowRadius: 9,
              elevation: 2,
            }}
          >
            <View className="h-1.5 bg-[#7C3AED]" />
            <View className="p-4">
              <View className="flex-row items-start">
                <View className="h-12 w-12 items-center justify-center rounded-[16px] bg-[#F1E9FF]">
                  <SymbolView
                    name={{ ios: "video.fill", android: "video_call", web: "video_call" }}
                    tintColor="#7C3AED"
                    size={20}
                    weight="bold"
                  />
                </View>

                <View className="ml-3 min-w-0 flex-1">
                  <View
                    className="self-start flex-row items-center rounded-full px-2.5 py-1"
                    style={{ backgroundColor: tone.soft }}
                  >
                    <SymbolView name={tone.icon} tintColor={tone.color} size={9} weight="bold" />
                    <Text className="ml-1 text-[9px] font-black" style={{ color: tone.color }}>
                      {statusLabel(data.session.status)}
                    </Text>
                  </View>

                  <Text className="mt-2 text-[19px] font-black leading-[24px]" style={{ color: theme.colors.foreground }}>
                    {data.session.title}
                  </Text>

                  <Text className="mt-1 text-[10px] leading-[15px]" style={{ color: theme.colors.foregroundMuted }}>
                    Séance d’accompagnement pédagogique.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {error ? (
            <View className="mt-3">
              <ErrorMessage message={error} onRetry={() => void refresh()} />
            </View>
          ) : null}

          {success ? (
            <View className="mt-3 flex-row items-center rounded-[15px] bg-[#EAFBF3] px-3 py-2.5">
              <SymbolView
                name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }}
                tintColor="#16845A"
                size={15}
                weight="bold"
              />
              <Text className="ml-2 flex-1 text-[10px] font-bold text-[#16845A]">
                {success}
              </Text>
            </View>
          ) : null}

          <SectionTitle
            eyebrow="Rendez-vous"
            title="Date et réunion"
            icon={{ ios: "calendar", android: "calendar_month", web: "calendar_month" }}
          />

          <View className="overflow-hidden rounded-[20px] border bg-white" style={{ borderColor: "#E5DFE8" }}>
            <InfoLine
              icon={{ ios: "clock.fill", android: "schedule", web: "schedule" }}
              label="Date prévue"
              value={formatDate(data.session.scheduledAt)}
            />

            <Divider />

            <View className="px-3.5 py-3">
              <View className="flex-row items-center">
                <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-[#F1E9FF]">
                  <SymbolView name={{ ios: "link", android: "link", web: "link" }} tintColor="#7C3AED" size={13} weight="bold" />
                </View>
                <View className="ml-3 min-w-0 flex-1">
                  <Text className="text-[8px] font-black uppercase tracking-[0.5px]" style={{ color: theme.colors.foregroundSubtle }}>
                    Lien de réunion
                  </Text>
                  <Text numberOfLines={1} className="mt-0.5 text-[9px]" style={{ color: theme.colors.foregroundMuted }}>
                    {data.session.meetingLink}
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Ouvrir le lien de réunion"
                onPress={() => void openMeeting()}
                android_ripple={{ color: "transparent" }}
                className="mt-3 h-[48px] w-full flex-row items-center justify-center rounded-[13px]"
                style={{ backgroundColor: theme.colors.accent }}
              >
                <SymbolView
                  name={{ ios: "video.fill", android: "video_call", web: "video_call" }}
                  tintColor={theme.colors.accentForeground}
                  size={14}
                  weight="bold"
                />
                <Text className="ml-2 text-[10px] font-black" style={{ color: theme.colors.accentForeground }}>
                  Ouvrir la réunion
                </Text>
              </Pressable>
            </View>
          </View>

          <SectionTitle
            eyebrow="Contexte"
            title="Apprenant et formation"
            icon={{ ios: "person.crop.circle.fill", android: "person", web: "person" }}
          />

          <View className="overflow-hidden rounded-[20px] border bg-white" style={{ borderColor: "#E5DFE8" }}>
            <View className="flex-row items-center p-3.5">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F1E9FF]">
                <Text className="text-[11px] font-black text-[#7C3AED]">{initials(name)}</Text>
              </View>
              <View className="ml-3 min-w-0 flex-1">
                <Text className="text-[12px] font-black" style={{ color: theme.colors.foreground }}>
                  {name}
                </Text>
                <Text numberOfLines={1} className="mt-0.5 text-[9px]" style={{ color: theme.colors.foregroundMuted }}>
                  {data.learner.email}
                </Text>
              </View>
            </View>

            <Divider />

            <InfoLine
              icon={{ ios: "book.closed.fill", android: "menu_book", web: "menu_book" }}
              label="Formation"
              value={data.training.title}
            />
          </View>

          <SectionTitle
            eyebrow="Pédagogie"
            title="Objectif"
            icon={{ ios: "target", android: "track_changes", web: "track_changes" }}
          />

          <View className="rounded-[20px] border bg-white p-3.5" style={{ borderColor: "#E5DFE8" }}>
            <Text className="text-[13px] leading-[20px]" style={{ color: theme.colors.foreground }}>
              {data.session.objective}
            </Text>
          </View>

          {data.session.note ? (
            <>
              <SectionTitle
                eyebrow="Interne"
                title="Note"
                icon={{ ios: "note.text", android: "notes", web: "notes" }}
              />

              <View className="rounded-[20px] border bg-white p-3.5" style={{ borderColor: "#E5DFE8" }}>
                <Text className="text-[12px] leading-[19px]" style={{ color: theme.colors.foregroundMuted }}>
                  {data.session.note}
                </Text>
              </View>
            </>
          ) : null}

          <SectionTitle
            eyebrow="Traitement"
            title={scheduled ? "Actions" : "État de la séance"}
            icon={{ ios: "checklist", android: "task_alt", web: "task_alt" }}
          />

          {scheduled ? (
            <View className="gap-2.5">
              <ActionButton
                label={acting ? "Enregistrement..." : "Marquer comme réalisée"}
                icon={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }}
                disabled={acting}
                tone="primary"
                onPress={() =>
                  confirmMobileAction(
                    "Confirmer la clôture",
                    "Marquer cette séance comme réalisée ?",
                    false,
                    () => void complete(),
                  )
                }
              />

              <ActionButton
                label={acting ? "Enregistrement..." : "Annuler la séance"}
                icon={{ ios: "xmark.circle.fill", android: "cancel", web: "cancel" }}
                disabled={acting}
                tone="danger"
                onPress={() =>
                  confirmMobileAction(
                    "Confirmer l’annulation",
                    "Annuler cette séance d’accompagnement ?",
                    true,
                    () => void cancel(),
                  )
                }
              />
            </View>
          ) : (
            <View
              className="mb-2 flex-row items-center rounded-[18px] border px-3.5 py-3"
              style={{
                backgroundColor: tone.soft,
                borderColor: data.session.status === "COMPLETED" ? "#C7EBD9" : "#E2E5EA",
              }}
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                <SymbolView name={tone.icon} tintColor={tone.color} size={15} weight="bold" />
              </View>
              <View className="ml-3 min-w-0 flex-1">
                <Text className="text-[11px] font-black" style={{ color: tone.color }}>
                  {statusLabel(data.session.status)}
                </Text>
                <Text className="mt-0.5 text-[9px] leading-[13px]" style={{ color: theme.colors.foregroundMuted }}>
                  Cette séance est clôturée pour le suivi courant.
                </Text>
              </View>
            </View>
          )}

          {data.session.closedAt ? (
            <View className="mt-3 flex-row items-center rounded-[14px] bg-[#F7F4F8] px-3 py-2.5">
              <SymbolView
                name={{ ios: "clock.fill", android: "history", web: "history" }}
                tintColor={theme.colors.foregroundSubtle}
                size={11}
              />
              <Text className="ml-2 text-[9px] font-bold" style={{ color: theme.colors.foregroundMuted }}>
                Clôturée le {formatDate(data.session.closedAt)}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );

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
        <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-[#F1E9FF]">
          <SymbolView name={icon} tintColor="#7C3AED" size={13} weight="bold" />
        </View>
        <View className="ml-2.5 min-w-0 flex-1">
          <Text className="text-[8px] font-black uppercase tracking-[0.6px]" style={{ color: theme.colors.foregroundSubtle }}>
            {eyebrow}
          </Text>
          <Text className="mt-0.5 text-[16px] font-black" style={{ color: theme.colors.foreground }}>
            {title}
          </Text>
        </View>
      </View>
    );
  }

  function InfoLine({
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
        <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-[#F7F3FA]">
          <SymbolView name={icon} tintColor="#7C3AED" size={13} weight="bold" />
        </View>
        <View className="ml-3 min-w-0 flex-1">
          <Text className="text-[8px] font-black uppercase tracking-[0.5px]" style={{ color: theme.colors.foregroundSubtle }}>
            {label}
          </Text>
          <Text className="mt-0.5 text-[10px] font-black" style={{ color: theme.colors.foreground }}>
            {value}
          </Text>
        </View>
      </View>
    );
  }

  function Divider() {
    return <View className="mx-3 h-px bg-[#EEE9F0]" />;
  }

  function ActionButton({
    label,
    icon,
    disabled,
    tone: actionTone,
    onPress,
  }: {
    label: string;
    icon: SymbolName;
    disabled: boolean;
    tone: "primary" | "danger";
    onPress: () => void;
  }) {
    const danger = actionTone === "danger";

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="h-[52px] w-full flex-row items-center justify-center rounded-[14px] border"
        style={{
          backgroundColor: danger ? "#FFF5F4" : theme.colors.accent,
          borderColor: danger ? "#F4C7C2" : theme.colors.accent,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <SymbolView
          name={icon}
          tintColor={danger ? "#C2413A" : theme.colors.accentForeground}
          size={14}
          weight="bold"
        />
        <Text
          className="ml-2 text-[11px] font-black"
          style={{ color: danger ? "#C2413A" : theme.colors.accentForeground }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }
}

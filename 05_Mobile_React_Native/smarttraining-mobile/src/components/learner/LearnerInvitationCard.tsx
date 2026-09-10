import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";

import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import { LearnerTrainingInvitation } from "../../types/learnerInvitation";

type LearnerInvitationCardProps = {
  invitation: LearnerTrainingInvitation;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onOpenMyTrainings: () => void;
};

function statusLabel(status: string): string {
  if (status === "PENDING") return "En attente";
  if (status === "ACCEPTED") return "Acceptée";
  if (status === "DECLINED") return "Refusée";
  if (status === "CANCELLED") return "Annulée";
  if (status === "EXPIRED") return "Expirée";
  return "Statut indisponible";
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function LearnerInvitationCard({
  invitation,
  busy,
  onAccept,
  onDecline,
  onOpenMyTrainings,
}: LearnerInvitationCardProps) {
  const { theme } = useSmartTrainingTheme();
  const expiration = formatDate(invitation.expiresAt);
  const created = formatDate(invitation.createdAt);

  const statusColor =
    invitation.status === "ACCEPTED"
      ? theme.colors.success
      : invitation.status === "PENDING"
        ? theme.colors.warning
        : invitation.status === "DECLINED" ||
            invitation.status === "CANCELLED" ||
            invitation.status === "EXPIRED"
          ? theme.colors.foregroundSubtle
          : theme.colors.info;

  const statusIcon: ComponentProps<typeof SymbolView>["name"] =
    invitation.status === "ACCEPTED"
      ? {
          ios: "checkmark.circle.fill",
          android: "check_circle",
          web: "check_circle",
        }
      : invitation.status === "PENDING"
        ? { ios: "clock.fill", android: "schedule", web: "schedule" }
        : { ios: "info.circle.fill", android: "info", web: "info" };

  return (
    <View
      className="mb-4 w-full rounded-[24px] border p-4"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.04,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
      }}
    >
      {/* Header */}
      <View className="flex-row items-start">
        <View
          className="h-12 w-12 shrink-0 items-center justify-center rounded-[16px]"
          style={{ backgroundColor: theme.colors.surfaceSoft }}
        >
          <SymbolView
            name={{ ios: "envelope.fill", android: "mail", web: "mail" }}
            tintColor={theme.colors.accent}
            size={22}
            weight="semibold"
          />
        </View>

        <View className="ml-3 min-w-0 flex-1 pr-2">
          <Text
            maxFontSizeMultiplier={1.05}
            className="mb-1 text-[9px] font-black leading-[12px] tracking-[0.65px]"
            style={{ color: theme.colors.accent }}
          >
            INVITATION À UNE FORMATION
          </Text>
          <Text
            maxFontSizeMultiplier={1.1}
            className="text-[20px] font-black leading-[24px] tracking-[-0.25px]"
            style={{ color: theme.colors.foreground }}
          >
            {invitation.trainingTitle || "Formation"}
          </Text>
        </View>

        <View
          className="min-h-[30px] shrink-0 flex-row items-center rounded-full px-2.5"
          style={{ backgroundColor: theme.colors.surfaceSoft }}
        >
          <SymbolView
            name={statusIcon}
            tintColor={statusColor}
            size={14}
            weight="semibold"
          />
          <Text
            maxFontSizeMultiplier={1.05}
            className="ml-1.5 text-[10px] font-black leading-[14px]"
            style={{ color: statusColor }}
          >
            {statusLabel(invitation.status)}
          </Text>
        </View>
      </View>

      {/* Dates */}
      {created || expiration ? (
        <View className="mt-4 flex-row items-start">
          {created ? (
            <View className="min-w-0 flex-1 flex-row items-center pr-2">
              <SymbolView
                name={{
                  ios: "calendar",
                  android: "calendar_today",
                  web: "calendar_today",
                }}
                tintColor={theme.colors.foregroundMuted}
                size={15}
                weight="medium"
              />
              <Text
                maxFontSizeMultiplier={1.05}
                numberOfLines={1}
                className="ml-1.5 text-[11px] font-bold leading-[16px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Reçue le {created}
              </Text>
            </View>
          ) : null}

          {expiration ? (
            <View className="min-w-0 flex-1 flex-row items-center pl-2">
              <SymbolView
                name={{ ios: "clock", android: "schedule", web: "schedule" }}
                tintColor={theme.colors.foregroundMuted}
                size={15}
                weight="medium"
              />
              <Text
                maxFontSizeMultiplier={1.05}
                numberOfLines={1}
                className="ml-1.5 text-[11px] font-bold leading-[16px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Jusqu’au {expiration}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Trainer message */}
      {invitation.message ? (
        <View
          className="mt-4 rounded-[18px] px-3.5 py-3.5"
          style={{ backgroundColor: theme.colors.surfaceSoft }}
        >
          <View className="mb-2 flex-row items-center">
            <View
              className="h-8 w-8 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <SymbolView
                name={{ ios: "quote.bubble.fill", android: "chat", web: "chat" }}
                tintColor={theme.colors.accent}
                size={15}
                weight="semibold"
              />
            </View>
            <Text
              maxFontSizeMultiplier={1.1}
              className="ml-2.5 text-[13px] font-black leading-[17px]"
              style={{ color: theme.colors.foreground }}
            >
              Message du formateur
            </Text>
          </View>
          <Text
            maxFontSizeMultiplier={1.15}
            className="text-[13px] leading-[20px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {invitation.message}
          </Text>
        </View>
      ) : null}

      {/* Actions */}
      {invitation.status === "PENDING" ? (
        <View className="mt-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Accepter l’invitation"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={onAccept}
            className="overflow-hidden rounded-[16px]"
            style={{ opacity: busy ? 0.55 : 1 }}
          >
            <View
              className="min-h-[50px] flex-row items-center justify-center px-4"
              style={{ backgroundColor: theme.colors.accent }}
            >
              <SymbolView
                name={{ ios: "checkmark", android: "check", web: "check" }}
                tintColor={theme.colors.accentForeground}
                size={17}
                weight="bold"
              />
              <Text
                className="ml-2 text-[13px] font-black"
                style={{ color: theme.colors.accentForeground }}
              >
                {busy ? "Traitement..." : "Accepter l’invitation"}
              </Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refuser l’invitation"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={onDecline}
            className="mt-2.5 min-h-[46px] items-center justify-center rounded-[15px] border px-4"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              opacity: busy ? 0.5 : 1,
            }}
          >
            <Text
              className="text-[12px] font-black"
              style={{ color: theme.colors.foreground }}
            >
              Refuser
            </Text>
          </Pressable>
        </View>
      ) : invitation.status === "ACCEPTED" ? (
        <>
          <View
            className="mt-4 flex-row items-center rounded-[17px] border px-3.5 py-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.success,
            }}
          >
            <View
              className="h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: theme.colors.surfaceSoft }}
            >
              <SymbolView
                name={{ ios: "checkmark", android: "check", web: "check" }}
                tintColor={theme.colors.success}
                size={19}
                weight="bold"
              />
            </View>

            <View className="ml-2.5 min-w-0 flex-1">
              <Text
                maxFontSizeMultiplier={1.1}
                className="text-[12px] font-black leading-[17px]"
                style={{ color: theme.colors.success }}
              >
                Formation ajoutée à ton parcours
              </Text>
              <Text
                maxFontSizeMultiplier={1.1}
                className="mt-0.5 text-[12px] leading-[17px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Retrouve-la maintenant dans Mes formations.
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voir mes formations"
            onPress={onOpenMyTrainings}
            className="mt-3 overflow-hidden rounded-[16px]"
          >
            <View
              className="min-h-[50px] flex-row items-center justify-center px-4"
              style={{ backgroundColor: theme.colors.accent }}
            >
              <Text
                className="text-[13px] font-black"
                style={{ color: theme.colors.accentForeground }}
              >
                Voir mes formations
              </Text>
              <SymbolView
                name={{
                  ios: "arrow.right",
                  android: "arrow_forward",
                  web: "arrow_forward",
                }}
                tintColor={theme.colors.accentForeground}
                size={17}
                weight="bold"
              />
            </View>
          </Pressable>
        </>
      ) : (
        <View
          className="mt-4 flex-row items-center rounded-[16px] border p-3"
          style={{
            backgroundColor: theme.colors.surfaceSoft,
            borderColor: theme.colors.border,
          }}
        >
          <SymbolView
            name={{ ios: "info.circle.fill", android: "info", web: "info" }}
            tintColor={theme.colors.foregroundMuted}
            size={18}
            weight="medium"
          />
          <Text
            className="ml-2.5 flex-1 text-[12px] leading-[17px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            Aucune action n’est nécessaire pour cette invitation.
          </Text>
        </View>
      )}
    </View>
  );
}
import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../AppButton";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
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
  if (status === "ACCEPTED") return "Accept\u00E9e";
  if (status === "DECLINED") return "Refus\u00E9e";
  if (status === "CANCELLED") return "Annul\u00E9e";
  if (status === "EXPIRED") return "Expir\u00E9e";
  return "Statut indisponible";
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.shape.cardRadius,
          borderWidth: theme.shape.borderWidth,
          padding: theme.shape.cardPadding,
          shadowColor: theme.colors.foreground,
          shadowOpacity: theme.shape.shadowOpacity,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: statusColor,
              borderWidth: Math.max(
                1,
                theme.shape.borderWidth,
              ),
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              {
                color: statusColor,
              },
            ]}
          >
            {statusLabel(invitation.status)}
          </Text>
        </View>

        {expiration ? (
          <Text
            style={[
              styles.expiration,
              {
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            {"Jusqu\u2019au "}{expiration}
          </Text>
        ) : null}
      </View>

      <Text
        style={[
          styles.title,
          {
            color: theme.colors.foreground,
          },
        ]}
      >
        {invitation.trainingTitle || "Formation"}
      </Text>

      {invitation.message ? (
        <View
          style={[
            styles.messageBox,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderRadius: theme.shape.controlRadius,
              padding: theme.shape.cardPadding,
            },
          ]}
        >
          <Text
            style={[
              styles.messageLabel,
              {
                color: theme.colors.foregroundSubtle,
              },
            ]}
          >
            MESSAGE DU FORMATEUR
          </Text>
          <Text
            style={[
              styles.messageText,
              {
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            {invitation.message}
          </Text>
        </View>
      ) : null}

      {invitation.status === "PENDING" ? (
        <View style={styles.actions}>
          <AppButton
            title={"Accepter l\u2019invitation"}
            onPress={onAccept}
            loading={busy}
            style={styles.primaryAction}
          />
          <AppButton
            title="Refuser"
            onPress={onDecline}
            disabled={busy}
            variant="secondary"
            style={styles.secondaryAction}
          />
        </View>
      ) : invitation.status === "ACCEPTED" ? (
        <View
          style={[
            styles.stateBox,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.success,
              borderRadius: theme.shape.controlRadius,
              borderWidth: Math.max(
                1,
                theme.shape.borderWidth,
              ),
              padding: theme.shape.cardPadding,
            },
          ]}
        >
          <Text
            style={[
              styles.stateTitle,
              {
                color: theme.colors.success,
              },
            ]}
          >
            {"Formation ajout\u00E9e \u00E0 ton parcours"}
          </Text>
          <Text
            style={[
              styles.stateText,
              {
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            Tu peux maintenant la retrouver dans Mes formations.
          </Text>
          <AppButton
            title="Voir mes formations"
            onPress={onOpenMyTrainings}
            variant="secondary"
            style={styles.secondaryAction}
          />
        </View>
      ) : (
        <View
          style={[
            styles.closedBox,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderRadius: theme.shape.controlRadius,
              padding: theme.shape.cardPadding,
            },
          ]}
        >
          <Text
            style={[
              styles.closedText,
              {
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            {
              "Aucune action n\u2019est n\u00E9cessaire pour cette invitation."
            }
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    marginBottom: 18,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  expiration: {
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "900",
    marginBottom: 14,
  },
  messageBox: {
    marginBottom: 18,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  messageText: {
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  primaryAction: {
    minWidth: 190,
  },
  secondaryAction: {
    minWidth: 150,
  },
  stateBox: {},
  stateTitle: {
    fontWeight: "900",
    marginBottom: 6,
  },
  stateText: {
    lineHeight: 20,
    marginBottom: 14,
  },
  closedBox: {},
  closedText: {
    lineHeight: 20,
  },
});
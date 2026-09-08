import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../AppButton";
import {
  cancelMyAccountDeletionRequest,
  getMyAccountDeletionRequest,
  requestMyAccountDeletion,
} from "../../features/auth/accountDeletionService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  AccountDeletionRequest,
  AccountDeletionRequestStatus,
} from "../../types/accountDeletion";

function statusLabel(status: AccountDeletionRequestStatus): string {
  if (status === "PENDING") return "Demande reçue";
  if (status === "IN_PROGRESS") return "Traitement en cours";
  if (status === "COMPLETED") return "Traitement administratif terminé";
  if (status === "CANCELLED") return "Annulée";
  return "Refusée";
}

function formatDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("fr-FR");
}

function errorMessage(error: unknown): string {
  if (
    isAxiosError(error) &&
    error.response?.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return "Impossible de traiter la demande de suppression pour le moment.";
}

export default function AccountDeletionRequestCard() {
  const { theme } = useSmartTrainingTheme();
  const [request, setRequest] = useState<AccountDeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    void getMyAccountDeletionRequest()
      .then((value) => {
        if (active) {
          setRequest(value);
          setError("");
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function submitRequest() {
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const created = await requestMyAccountDeletion();
      setRequest(created);
      setConfirming(false);
      setSuccess(
        "Ta demande a été enregistrée. Un administrateur peut maintenant la prendre en charge.",
      );
    } catch (submitError: unknown) {
      setError(errorMessage(submitError));
    } finally {
      setBusy(false);
    }
  }

  async function cancelRequest() {
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const cancelled = await cancelMyAccountDeletionRequest();
      setRequest(cancelled);
      setCancelling(false);
      setSuccess("Ta demande de suppression a été annulée.");
    } catch (cancelError: unknown) {
      setError(errorMessage(cancelError));
    } finally {
      setBusy(false);
    }
  }

  const active = request?.active === true;
  const canCancel = request?.status === "PENDING";

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
        },
      ]}
    >
      <Text style={[styles.eyebrow, { color: theme.colors.danger }]}>
        SUPPRESSION DU COMPTE
      </Text>
      <Text style={[styles.title, { color: theme.colors.foreground }]}>
        Gérer ma demande de suppression
      </Text>
      <Text style={[styles.help, { color: theme.colors.foregroundMuted }]}>
        La demande est suivie par l’administration. Elle ne désactive pas et
        n’efface pas automatiquement ton compte.
      </Text>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={[styles.smallText, { color: theme.colors.foregroundMuted }]}>
            Vérification d’une demande existante...
          </Text>
        </View>
      ) : null}

      {request ? (
        <View
          style={[
            styles.statusBox,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: active ? theme.colors.warning : theme.colors.border,
              borderRadius: theme.shape.controlRadius,
              borderWidth: Math.max(1, theme.shape.borderWidth),
            },
          ]}
        >
          <Text
            style={[
              styles.statusTitle,
              {
                color: active
                  ? theme.colors.warning
                  : theme.colors.foreground,
              },
            ]}
          >
            {statusLabel(request.status)}
          </Text>
          <Text style={[styles.smallText, { color: theme.colors.foregroundMuted }]}>
            Demande #{request.id} · {formatDate(request.requestedAt)}
          </Text>
          {request.processingStartedAt ? (
            <Text style={[styles.smallText, { color: theme.colors.foregroundMuted }]}>
              Prise en charge : {formatDate(request.processingStartedAt)}
            </Text>
          ) : null}
          {request.adminComment ? (
            <Text style={[styles.comment, { color: theme.colors.foreground }]}>
              Commentaire : {request.adminComment}
            </Text>
          ) : null}
        </View>
      ) : null}

      {error ? (
        <Text style={[styles.message, { color: theme.colors.danger }]}>
          {error}
        </Text>
      ) : null}

      {success ? (
        <Text style={[styles.message, { color: theme.colors.success }]}>
          {success}
        </Text>
      ) : null}

      {confirming ? (
        <View
          style={[
            styles.confirmBox,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.warning,
              borderRadius: theme.shape.controlRadius,
              borderWidth: Math.max(1, theme.shape.borderWidth),
            },
          ]}
        >
          <Text style={[styles.confirmTitle, { color: theme.colors.warning }]}>
            Confirmer la demande
          </Text>
          <Text style={[styles.smallText, { color: theme.colors.foregroundMuted }]}>
            Un administrateur devra prendre en charge la demande et documenter
            le traitement réel des données et des historiques pédagogiques.
          </Text>
          <View style={styles.buttonRow}>
            <AppButton
              title="Annuler"
              onPress={() => setConfirming(false)}
              disabled={busy}
              variant="secondary"
              style={styles.flexButton}
            />
            <AppButton
              title={busy ? "Envoi..." : "Confirmer la demande"}
              onPress={() => void submitRequest()}
              loading={busy}
              style={styles.flexButton}
            />
          </View>
        </View>
      ) : cancelling ? (
        <View
          style={[
            styles.confirmBox,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.warning,
              borderRadius: theme.shape.controlRadius,
              borderWidth: Math.max(1, theme.shape.borderWidth),
            },
          ]}
        >
          <Text style={[styles.confirmTitle, { color: theme.colors.warning }]}>
            Annuler la demande en attente ?
          </Text>
          <Text style={[styles.smallText, { color: theme.colors.foregroundMuted }]}>
            Une demande déjà prise en charge par un administrateur ne peut plus
            être annulée depuis ton compte.
          </Text>
          <View style={styles.buttonRow}>
            <AppButton
              title="Conserver la demande"
              onPress={() => setCancelling(false)}
              disabled={busy}
              variant="secondary"
              style={styles.flexButton}
            />
            <AppButton
              title={busy ? "Annulation..." : "Confirmer l’annulation"}
              onPress={() => void cancelRequest()}
              loading={busy}
              style={styles.flexButton}
            />
          </View>
        </View>
      ) : (
        <>
          <AppButton
            title={
              active
                ? "Demande déjà enregistrée"
                : "Demander la suppression de mon compte"
            }
            onPress={() => setConfirming(true)}
            disabled={loading || busy || active}
            variant="secondary"
            style={styles.actionButton}
          />
          {canCancel ? (
            <AppButton
              title="Annuler ma demande"
              onPress={() => setCancelling(true)}
              disabled={busy}
              variant="secondary"
              style={styles.cancelButton}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 18 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    marginBottom: 6,
  },
  title: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "900",
  },
  help: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  smallText: {
    fontSize: 12,
    lineHeight: 18,
  },
  comment: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 4,
  },
  statusBox: {
    padding: 14,
    marginTop: 14,
    gap: 5,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    marginTop: 12,
  },
  confirmBox: {
    padding: 14,
    marginTop: 16,
  },
  confirmTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 6,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  flexButton: {
    flexGrow: 1,
    minWidth: 160,
  },
  actionButton: {
    alignSelf: "flex-start",
    minWidth: 240,
    marginTop: 16,
  },
  cancelButton: {
    alignSelf: "flex-start",
    minWidth: 180,
    marginTop: 10,
  },
});

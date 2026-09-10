import { isAxiosError } from "axios";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";

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

  const [request, setRequest] =
    useState<AccountDeletionRequest | null>(null);
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
        if (active) {
          setError(errorMessage(loadError));
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
      const cancelled =
        await cancelMyAccountDeletionRequest();

      setRequest(cancelled);
      setCancelling(false);
      setSuccess(
        "Ta demande de suppression a été annulée.",
      );
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
      className="overflow-hidden rounded-[18px] border bg-white"
      style={{ borderColor: theme.colors.border }}
    >
      <View className="flex-row items-start px-3.5 py-3">
        <View className="h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#FFF0F0]">
          <SymbolView
            name={{
              ios: "trash.fill",
              android: "delete",
              web: "delete",
            }}
            tintColor={theme.colors.danger}
            size={14}
            weight="bold"
          />
        </View>

        <View className="ml-3 min-w-0 flex-1">
          <Text
            className="text-[10px] font-black uppercase tracking-[0.6px]"
            style={{ color: theme.colors.danger }}
          >
            Suppression du compte
          </Text>

          <Text
            className="mt-1 text-[14px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            Gérer ma demande de suppression
          </Text>

          <Text
            className="mt-1 text-[11px] leading-[16px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            La demande est suivie par l’administration. Elle ne désactive pas et n’efface pas automatiquement ton compte.
          </Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-row items-center border-t border-[#EEE9F0] px-3.5 py-2.5">
          <ActivityIndicator
            size="small"
            color={theme.colors.accent}
          />
          <Text
            className="ml-2 text-[11px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            Vérification d’une demande existante...
          </Text>
        </View>
      ) : null}

      {request ? (
        <View
          className="mx-3.5 mb-3 rounded-[13px] border px-3 py-2.5"
          style={{
            backgroundColor: theme.colors.surfaceSoft,
            borderColor: active
              ? theme.colors.warning
              : theme.colors.border,
          }}
        >
          <Text
            className="text-[12px] font-black"
            style={{
              color: active
                ? theme.colors.warning
                : theme.colors.foreground,
            }}
          >
            {statusLabel(request.status)}
          </Text>

          <Text
            className="mt-1 text-[10px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            Demande #{request.id} · {formatDate(request.requestedAt)}
          </Text>

          {request.processingStartedAt ? (
            <Text
              className="mt-0.5 text-[10px]"
              style={{ color: theme.colors.foregroundMuted }}
            >
              Prise en charge : {formatDate(request.processingStartedAt)}
            </Text>
          ) : null}

          {request.adminComment ? (
            <Text
              className="mt-1 text-[11px] font-bold leading-[16px]"
              style={{ color: theme.colors.foreground }}
            >
              Commentaire : {request.adminComment}
            </Text>
          ) : null}
        </View>
      ) : null}

      {error ? (
        <Text
          className="mx-3.5 mb-2 text-[11px] font-bold leading-[16px]"
          style={{ color: theme.colors.danger }}
        >
          {error}
        </Text>
      ) : null}

      {success ? (
        <Text
          className="mx-3.5 mb-2 text-[11px] font-bold leading-[16px]"
          style={{ color: theme.colors.success }}
        >
          {success}
        </Text>
      ) : null}

      {confirming ? (
        <View
          className="mx-3.5 mb-3 rounded-[13px] border px-3 py-3"
          style={{
            backgroundColor: theme.colors.surfaceSoft,
            borderColor: theme.colors.warning,
          }}
        >
          <Text
            className="text-[12px] font-black"
            style={{ color: theme.colors.warning }}
          >
            Confirmer la demande
          </Text>

          <Text
            className="mt-1 text-[10px] leading-[15px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            Un administrateur devra prendre en charge la demande et documenter le traitement réel des données.
          </Text>

          <View className="mt-3 flex-row gap-2">
            <CompactButton
              label="Annuler"
              onPress={() => setConfirming(false)}
              disabled={busy}
            />
            <CompactButton
              label={busy ? "Envoi..." : "Confirmer"}
              onPress={() => void submitRequest()}
              disabled={busy}
              danger
            />
          </View>
        </View>
      ) : cancelling ? (
        <View
          className="mx-3.5 mb-3 rounded-[13px] border px-3 py-3"
          style={{
            backgroundColor: theme.colors.surfaceSoft,
            borderColor: theme.colors.warning,
          }}
        >
          <Text
            className="text-[12px] font-black"
            style={{ color: theme.colors.warning }}
          >
            Annuler la demande en attente ?
          </Text>

          <Text
            className="mt-1 text-[10px] leading-[15px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            Une demande déjà prise en charge par un administrateur ne peut plus être annulée depuis ton compte.
          </Text>

          <View className="mt-3 flex-row gap-2">
            <CompactButton
              label="Conserver"
              onPress={() => setCancelling(false)}
              disabled={busy}
            />
            <CompactButton
              label={busy ? "Annulation..." : "Confirmer"}
              onPress={() => void cancelRequest()}
              disabled={busy}
              danger
            />
          </View>
        </View>
      ) : (
        <View className="border-t border-[#EEE9F0] px-3.5 py-3">
          <CompactButton
            label={
              active
                ? "Demande déjà enregistrée"
                : "Demander la suppression"
            }
            onPress={() => setConfirming(true)}
            disabled={loading || busy || active}
            danger={!active}
          />

          {canCancel ? (
            <View className="mt-2">
              <CompactButton
                label="Annuler ma demande"
                onPress={() => setCancelling(true)}
                disabled={busy}
              />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );

  function CompactButton({
    label,
    onPress,
    disabled,
    danger = false,
  }: {
    label: string;
    onPress: () => void;
    disabled: boolean;
    danger?: boolean;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="h-10 min-w-0 flex-1 items-center justify-center rounded-[11px] border px-3"
        style={{
          backgroundColor: danger ? "#FFF2F2" : "#FBF9FC",
          borderColor: danger
            ? "#F2C8C8"
            : theme.colors.border,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text
          numberOfLines={1}
          className="text-[11px] font-black"
          style={{
            color: danger
              ? theme.colors.danger
              : theme.colors.foreground,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }
}

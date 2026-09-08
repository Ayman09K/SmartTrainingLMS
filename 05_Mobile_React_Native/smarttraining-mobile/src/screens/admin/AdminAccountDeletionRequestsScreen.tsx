import { isAxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import AdminUserManagementNav from "../../components/admin/AdminUserManagementNav";
import {
  completeAdminAccountDeletionRequest,
  getAdminAccountDeletionRequests,
  rejectAdminAccountDeletionRequest,
  startAdminAccountDeletionRequest,
} from "../../features/admin/adminAccountDeletionService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  AccountDeletionRequestStatus,
  AdminAccountDeletionRequest,
} from "../../types/accountDeletion";

type StatusFilter = AccountDeletionRequestStatus | "ALL";
type DecisionKind = "REJECT" | "COMPLETE";

type PendingDecision = {
  kind: DecisionKind;
  request: AdminAccountDeletionRequest;
};

const FILTERS: readonly StatusFilter[] = [
  "ALL",
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
];

function statusLabel(status: StatusFilter): string {
  if (status === "ALL") return "Toutes";
  if (status === "PENDING") return "En attente";
  if (status === "IN_PROGRESS") return "En cours";
  if (status === "COMPLETED") return "Traitement terminé";
  if (status === "CANCELLED") return "Annulées";
  return "Refusées";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("fr-FR");
}

function requesterPrimaryLabel(
  item: AdminAccountDeletionRequest,
): string {
  const name = item.requesterName?.trim();
  const email = item.email?.trim() || "";

  if (name && name.toLocaleLowerCase("fr") !== email.toLocaleLowerCase("fr")) {
    return name;
  }

  return email || "Utilisateur";
}

function requesterSecondaryLabel(
  item: AdminAccountDeletionRequest,
): string {
  const name = item.requesterName?.trim();
  const email = item.email?.trim();
  const hasDistinctName = Boolean(
    name &&
      email &&
      name.toLocaleLowerCase("fr") !== email.toLocaleLowerCase("fr"),
  );

  return hasDistinctName ? `${email} · ${item.role}` : item.role;
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

  return "Impossible de traiter les demandes de suppression pour le moment.";
}

export default function AdminAccountDeletionRequestsScreen() {
  const { theme } = useSmartTrainingTheme();
  const [items, setItems] = useState<AdminAccountDeletionRequest[]>([]);
  const [status, setStatus] = useState<StatusFilter>("PENDING");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [pendingDecision, setPendingDecision] =
    useState<PendingDecision | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [processingConfirmed, setProcessingConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load(nextStatus = status) {
    const data = await getAdminAccountDeletionRequests(
      nextStatus === "ALL" ? undefined : nextStatus,
    );
    setItems(data);
  }

  useEffect(() => {
    let active = true;

    void getAdminAccountDeletionRequests("PENDING")
      .then((data) => {
        if (active) {
          setItems(data);
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

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    if (!normalized) return items;

    return items.filter((item) =>
      [
        item.requesterName,
        item.email,
        item.role,
        statusLabel(item.status),
        item.handledByEmail || "",
      ]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(normalized),
    );
  }, [items, query]);

  async function changeFilter(next: StatusFilter) {
    setStatus(next);
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await load(next);
    } catch (loadError: unknown) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    setError("");

    try {
      await load();
    } catch (loadError: unknown) {
      setError(errorMessage(loadError));
    } finally {
      setRefreshing(false);
    }
  }

  async function startProcessing(requestId: number) {
    setWorkingId(requestId);
    setError("");
    setSuccess("");

    try {
      await startAdminAccountDeletionRequest(requestId);
      setSuccess("La demande est maintenant prise en charge.");
      await load();
    } catch (actionError: unknown) {
      setError(errorMessage(actionError));
    } finally {
      setWorkingId(null);
    }
  }

  function openDecision(
    kind: DecisionKind,
    request: AdminAccountDeletionRequest,
  ) {
    setPendingDecision({ kind, request });
    setAdminComment("");
    setProcessingConfirmed(false);
    setError("");
    setSuccess("");
  }

  async function confirmDecision() {
    if (!pendingDecision) return;

    const comment = adminComment.trim();
    if (!comment) {
      setError("Le commentaire administrateur est obligatoire.");
      return;
    }

    if (
      pendingDecision.kind === "COMPLETE" &&
      !processingConfirmed
    ) {
      setError(
        "Confirmez le traitement réel des données avant de clôturer.",
      );
      return;
    }

    setWorkingId(pendingDecision.request.id);
    setError("");

    try {
      if (pendingDecision.kind === "REJECT") {
        await rejectAdminAccountDeletionRequest(
          pendingDecision.request.id,
          comment,
        );
        setSuccess("La demande a été refusée avec une justification traçable.");
      } else {
        await completeAdminAccountDeletionRequest(
          pendingDecision.request.id,
          comment,
        );
        setSuccess("Le traitement administratif a été marqué comme terminé.");
      }

      setPendingDecision(null);
      setAdminComment("");
      setProcessingConfirmed(false);
      await load();
    } catch (actionError: unknown) {
      setError(errorMessage(actionError));
    } finally {
      setWorkingId(null);
    }
  }

  if (loading) {
    return <LoadingState message="Chargement des demandes de suppression..." />;
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          title="Demandes de suppression"
          subtitle="Traitez les demandes de compte avec une trace claire de chaque décision administrative."
        />

        <AdminUserManagementNav active="account-deletion" />

        {error ? <ErrorMessage message={error} /> : null}

        {success ? (
          <View
            style={[
              styles.notice,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.success,
                borderRadius: theme.shape.controlRadius,
              },
            ]}
          >
            <Text style={[styles.noticeText, { color: theme.colors.success }]}>
              {success}
            </Text>
          </View>
        ) : null}

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un nom, e-mail ou rôle"
          placeholderTextColor={theme.colors.foregroundMuted}
          style={[
            styles.search,
            {
              color: theme.colors.foreground,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.shape.controlRadius,
            },
          ]}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((value) => {
            const selected = value === status;

            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                onPress={() => void changeFilter(value)}
                style={({ pressed }) => [
                  styles.filter,
                  {
                    backgroundColor: selected
                      ? theme.colors.accent
                      : theme.colors.surfaceSoft,
                    borderColor: selected
                      ? theme.colors.accent
                      : theme.colors.border,
                  },
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: selected
                        ? theme.colors.background
                        : theme.colors.foreground,
                    },
                  ]}
                >
                  {statusLabel(value)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {!visible.length ? (
          <View
            style={[
              styles.empty,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
              Aucune demande
            </Text>
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Aucun élément ne correspond aux filtres actuels.
            </Text>
          </View>
        ) : (
          visible.map((item) => (
            <View
              key={item.id}
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
              <View style={styles.cardHeader}>
                <View style={styles.identity}>
                  <Text
                    style={[
                      styles.name,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    {requesterPrimaryLabel(item)}
                  </Text>
                  <Text
                    style={[
                      styles.email,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    {requesterSecondaryLabel(item)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.status,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor:
                        item.status === "PENDING"
                          ? theme.colors.warning
                          : item.status === "COMPLETED"
                            ? theme.colors.success
                            : item.status === "REJECTED"
                              ? theme.colors.danger
                              : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    {statusLabel(item.status)}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.meta,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Demandée le {formatDate(item.requestedAt)}
              </Text>

              {item.processingStartedAt ? (
                <Text
                  style={[
                    styles.meta,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Prise en charge le {formatDate(item.processingStartedAt)}
                  {item.handledByEmail ? ` · ${item.handledByEmail}` : ""}
                </Text>
              ) : null}

              {item.adminComment ? (
                <View
                  style={[
                    styles.commentBox,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderRadius: theme.shape.controlRadius,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.commentLabel,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    Commentaire administratif
                  </Text>
                  <Text
                    style={[
                      styles.commentText,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    {item.adminComment}
                  </Text>
                </View>
              ) : null}

              {item.status === "PENDING" ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={workingId === item.id}
                  onPress={() => void startProcessing(item.id)}
                  style={({ pressed }) => [
                    styles.primaryAction,
                    { backgroundColor: theme.colors.accent },
                    workingId === item.id ? styles.disabled : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.primaryActionText,
                      { color: theme.colors.background },
                    ]}
                  >
                    {workingId === item.id
                      ? "Prise en charge..."
                      : "Prendre en charge"}
                  </Text>
                </Pressable>
              ) : item.status === "IN_PROGRESS" ? (
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openDecision("REJECT", item)}
                    style={({ pressed }) => [
                      styles.secondaryAction,
                      {
                        borderColor: theme.colors.danger,
                        backgroundColor: theme.colors.surfaceSoft,
                      },
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryActionText,
                        { color: theme.colors.danger },
                      ]}
                    >
                      Refuser
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openDecision("COMPLETE", item)}
                    style={({ pressed }) => [
                      styles.secondaryAction,
                      {
                        borderColor: theme.colors.success,
                        backgroundColor: theme.colors.surfaceSoft,
                      },
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryActionText,
                        { color: theme.colors.success },
                      ]}
                    >
                      Traitement terminé
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))
        )}

        <View
          style={[
            styles.warning,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.warning,
              borderRadius: theme.shape.controlRadius,
            },
          ]}
        >
          <Text style={[styles.warningText, { color: theme.colors.foreground }]}>
            « Traitement terminé » n’efface pas automatiquement le compte.
            L’administrateur atteste que la procédure réelle de suppression,
            anonymisation ou conservation a été appliquée et documentée.
          </Text>
        </View>
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={pendingDecision !== null}
        onRequestClose={() => {
          if (workingId === null) setPendingDecision(null);
        }}
      >
        <View style={styles.overlay}>
          {/* PATCH20_A3_MODAL_KEYBOARD_SAFE */}
          <KeyboardAvoidingView
            style={{ flex: 1, width: "100%" }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={16}
          >
            <ScrollView
              style={{ width: "100%" }}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: 12,
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              showsVerticalScrollIndicator={false}
            >
          <View
            style={[
              styles.dialog,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
              },
            ]}
          >
            <Text
              style={[
                styles.dialogTitle,
                { color: theme.colors.foreground },
              ]}
            >
              {pendingDecision?.kind === "COMPLETE"
                ? "Confirmer la fin du traitement"
                : "Refuser la demande"}
            </Text>

            <Text
              style={[
                styles.dialogText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {pendingDecision?.request
                ? requesterPrimaryLabel(pendingDecision.request)
                : ""}
            </Text>

            <TextInput
              value={adminComment}
              onChangeText={setAdminComment}
              placeholder="Commentaire administrateur obligatoire"
              placeholderTextColor={theme.colors.foregroundMuted}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              style={[
                styles.commentInput,
                {
                  color: theme.colors.foreground,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            />

            <Text
              style={[
                styles.counter,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {adminComment.length}/1000
            </Text>

            {pendingDecision?.kind === "COMPLETE" ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: processingConfirmed }}
                onPress={() =>
                  setProcessingConfirmed((current) => !current)
                }
                style={styles.confirmRow}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: theme.colors.accent,
                      backgroundColor: processingConfirmed
                        ? theme.colors.accent
                        : theme.colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.checkmark,
                      { color: theme.colors.background },
                    ]}
                  >
                    {processingConfirmed ? "✓" : ""}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.confirmText,
                    { color: theme.colors.foreground },
                  ]}
                >
                  Je confirme avoir appliqué la procédure réelle de traitement
                  des données et des historiques associés.
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.dialogActions}>
              <Pressable
                accessibilityRole="button"
                disabled={workingId !== null}
                onPress={() => setPendingDecision(null)}
                style={({ pressed }) => [
                  styles.dialogButton,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surfaceSoft,
                  },
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.dialogButtonText,
                    { color: theme.colors.foreground },
                  ]}
                >
                  Annuler
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={
                  workingId !== null ||
                  !adminComment.trim() ||
                  (pendingDecision?.kind === "COMPLETE" &&
                    !processingConfirmed)
                }
                onPress={() => void confirmDecision()}
                style={({ pressed }) => [
                  styles.dialogButton,
                  {
                    borderColor:
                      pendingDecision?.kind === "COMPLETE"
                        ? theme.colors.success
                        : theme.colors.danger,
                    backgroundColor:
                      pendingDecision?.kind === "COMPLETE"
                        ? theme.colors.success
                        : theme.colors.danger,
                  },
                  (
                    workingId !== null ||
                    !adminComment.trim() ||
                    (pendingDecision?.kind === "COMPLETE" &&
                      !processingConfirmed)
                  )
                    ? styles.disabled
                    : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.dialogButtonText,
                    { color: theme.colors.background },
                  ]}
                >
                  {workingId !== null
                    ? "Traitement..."
                    : pendingDecision?.kind === "COMPLETE"
                      ? "Confirmer le traitement"
                      : "Confirmer le refus"}
                </Text>
              </Pressable>
            </View>
          </View>
                    </ScrollView>
          </KeyboardAvoidingView></View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 36,
  },
  notice: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
  },
  search: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 12,
  },
  filters: {
    gap: 8,
    paddingBottom: 14,
  },
  filter: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "900",
  },
  card: {
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  identity: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
  },
  email: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  status: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  meta: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  commentBox: {
    padding: 12,
    marginTop: 12,
  },
  commentLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 19,
  },
  primaryAction: {
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: "900",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 14,
  },
  secondaryAction: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "900",
  },
  empty: {
    borderWidth: 1,
    padding: 20,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  emptyText: {
    fontSize: 13,
    marginTop: 4,
  },
  warning: {
    borderWidth: 1,
    padding: 13,
    marginTop: 4,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 18,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 560,
    borderWidth: 1,
    padding: 20,
  },
  dialogTitle: {
    fontSize: 19,
    fontWeight: "900",
  },
  dialogText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  commentInput: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    fontSize: 14,
  },
  counter: {
    fontSize: 11,
    textAlign: "right",
    marginTop: 5,
  },
  confirmRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    fontSize: 15,
    fontWeight: "900",
  },
  confirmText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  dialogActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  dialogButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dialogButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.78,
  },
});

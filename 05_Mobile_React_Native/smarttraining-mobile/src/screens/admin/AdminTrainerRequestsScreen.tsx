import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
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
  approveAdminTrainerRequest,
  getAdminTrainerRequests,
  rejectAdminTrainerRequest,
} from "../../features/admin/adminTrainerRequestService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import { AdminTrainerRequestSummary } from "../../types/admin";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

type PendingDecision = {
  kind: "approve" | "reject";
  request: AdminTrainerRequestSummary;
};

function statusLabel(status: string): string {
  if (status === "PENDING") return "En attente";
  if (status === "APPROVED") return "Approuvée";
  if (status === "REJECTED") return "Rejetée";
  if (status === "CANCELLED") return "Annulée";
  return status;
}

function requesterLabel(item: AdminTrainerRequestSummary): string {
  return (
    item.requesterFullName?.trim() ||
    item.requesterEmail?.trim() ||
    "Demandeur"
  );
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "Non renseignée";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("fr-FR");
}

export default function AdminTrainerRequestsScreen() {
  const { theme } = useSmartTrainingTheme();
  const [items, setItems] = useState<AdminTrainerRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [pendingDecision, setPendingDecision] =
    useState<PendingDecision | null>(null);
  const [adminComment, setAdminComment] = useState("");

  async function load() {
    const data = await getAdminTrainerRequests();
    setItems(data);
  }

  useEffect(() => {
    let active = true;

    void getAdminTrainerRequests()
      .then((data) => {
        if (active) {
          setItems(data);
        }
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger les demandes formateur.");
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

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return items.filter((item) => {
      if (
        statusFilter !== "ALL" &&
        item.status !== statusFilter
      ) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [
        requesterLabel(item),
        item.requesterEmail || "",
        item.expertiseDomain || "",
        item.experienceSummary || "",
        item.motivation || "",
        statusLabel(item.status),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [items, query, statusFilter]);

  function openDecision(
    kind: PendingDecision["kind"],
    request: AdminTrainerRequestSummary,
  ) {
    if (request.status !== "PENDING") {
      setError("Seules les demandes en attente peuvent être traitées.");
      return;
    }

    setError("");
    setNotice("");
    setAdminComment("");
    setPendingDecision({ kind, request });
  }

  async function confirmDecision() {
    if (!pendingDecision || working) {
      return;
    }

    if (pendingDecision.request.status !== "PENDING") {
      setError("Cette demande a déjà été traitée.");
      setPendingDecision(null);
      return;
    }

    setWorking(true);
    setError("");

    try {
      const updated =
        pendingDecision.kind === "approve"
          ? await approveAdminTrainerRequest(
              pendingDecision.request.id,
              adminComment,
            )
          : await rejectAdminTrainerRequest(
              pendingDecision.request.id,
              adminComment,
            );

      setItems((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );

      setNotice(
        pendingDecision.kind === "approve"
          ? `La demande de ${requesterLabel(updated)} a été approuvée.`
          : `La demande de ${requesterLabel(updated)} a été rejetée.`,
      );

      setPendingDecision(null);
      setAdminComment("");
    } catch {
      setError("La décision n’a pas pu être enregistrée.");
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return <LoadingState message="Chargement des demandes formateur..." />;
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <SectionHeader
            title="Demandes formateur"
            subtitle="Examinez les candidatures et approuvez ou rejetez les demandes en attente."
          />

          <AdminUserManagementNav active="trainer-requests" />

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un nom, e-mail, domaine ou motivation"
            placeholderTextColor={theme.colors.foregroundSubtle}
            style={[
              styles.search,
              {
                color: theme.colors.foreground,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
              },
            ]}
          />

          <View style={styles.chips}>
            {(
              [
                ["PENDING", "En attente"],
                ["APPROVED", "Approuvées"],
                ["REJECTED", "Rejetées"],
                ["ALL", "Toutes"],
              ] as const
            ).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setStatusFilter(value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      statusFilter === value
                        ? theme.colors.surfaceSoft
                        : theme.colors.surface,
                    borderColor:
                      statusFilter === value
                        ? theme.colors.accent
                        : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      statusFilter === value
                        ? theme.colors.accent
                        : theme.colors.foregroundMuted,
                    fontWeight: statusFilter === value ? "800" : "600",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => {
                setError("");
                void load().catch(() =>
                  setError("Impossible de charger les demandes formateur."),
                );
              }}
            />
          ) : null}

          {notice ? (
            <View
              style={[
                styles.notice,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={{ color: theme.colors.foreground }}>
                {notice}
              </Text>
            </View>
          ) : null}

          <Text
            style={[
              styles.count,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            {filteredItems.length} demande
            {filteredItems.length > 1 ? "s" : ""}
          </Text>

          <View style={styles.list}>
            {filteredItems.map((item) => (
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
                <View style={styles.cardHead}>
                  <View style={styles.identity}>
                    <Text
                      style={[
                        styles.name,
                        { color: theme.colors.foreground },
                      ]}
                    >
                      {requesterLabel(item)}
                    </Text>
                    <Text
                      style={[
                        styles.email,
                        { color: theme.colors.foregroundMuted },
                      ]}
                    >
                      {item.requesterEmail || "E-mail non renseigné"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: theme.colors.surfaceSoft,
                        borderColor:
                          item.status === "PENDING"
                            ? theme.colors.accent
                            : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            item.status === "PENDING"
                              ? theme.colors.accent
                              : theme.colors.foregroundMuted,
                        },
                      ]}
                    >
                      {statusLabel(item.status)}
                    </Text>
                  </View>
                </View>

                <InfoBlock
                  label="Domaine d’expertise"
                  value={item.expertiseDomain || "Non renseigné"}
                />
                <InfoBlock
                  label="Expérience"
                  value={item.experienceSummary || "Non renseignée"}
                />
                <InfoBlock
                  label="Motivation"
                  value={item.motivation || "Non renseignée"}
                />

                <Text
                  style={[
                    styles.date,
                    { color: theme.colors.foregroundSubtle },
                  ]}
                >
                  Demande envoyée : {formatDate(item.requestedAt)}
                </Text>

                {item.adminComment ? (
                  <InfoBlock
                    label="Commentaire administrateur"
                    value={item.adminComment}
                  />
                ) : null}

                {item.reviewedAt ? (
                  <Text
                    style={[
                      styles.date,
                      { color: theme.colors.foregroundSubtle },
                    ]}
                  >
                    Traitée le : {formatDate(item.reviewedAt)}
                  </Text>
                ) : null}

                {item.status === "PENDING" ? (
                  <View style={styles.actions}>
                    <Pressable
                      disabled={working}
                      onPress={() => openDecision("reject", item)}
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: theme.colors.surfaceSoft,
                          borderColor: theme.colors.border,
                          opacity: working ? 0.6 : 1,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.colors.foreground }}>
                        Rejeter
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={working}
                      onPress={() => openDecision("approve", item)}
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: theme.colors.accent,
                          borderColor: theme.colors.accent,
                          opacity: working ? 0.6 : 1,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.colors.accentForeground }}>
                        Approuver
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          {filteredItems.length === 0 ? (
            <View
              style={[
                styles.empty,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderRadius: theme.shape.cardRadius,
                },
              ]}
            >
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Aucune demande dans cette vue
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Changez le filtre ou la recherche.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {pendingDecision ? (
        <View style={styles.overlay}>
          <View
            style={[
              styles.confirmCard,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
              },
            ]}
          >
            <Text
              style={[
                styles.confirmTitle,
                { color: theme.colors.foreground },
              ]}
            >
              {pendingDecision.kind === "approve"
                ? "Approuver la demande"
                : "Rejeter la demande"}
            </Text>

            <Text
              style={[
                styles.confirmText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {pendingDecision.kind === "approve"
                ? `Confirmer le passage de ${requesterLabel(pendingDecision.request)} au rôle Formateur ?`
                : `Confirmer le rejet de la demande de ${requesterLabel(pendingDecision.request)} ?`}
            </Text>

            <TextInput
              value={adminComment}
              onChangeText={setAdminComment}
              placeholder="Commentaire administrateur (facultatif)"
              placeholderTextColor={theme.colors.foregroundSubtle}
              multiline
              maxLength={1000}
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
                { color: theme.colors.foregroundSubtle },
              ]}
            >
              {adminComment.length}/1000
            </Text>

            <View style={styles.confirmActions}>
              <Pressable
                disabled={working}
                onPress={() => {
                  setPendingDecision(null);
                  setAdminComment("");
                }}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={{ color: theme.colors.foreground }}>
                  Annuler
                </Text>
              </Pressable>

              <Pressable
                disabled={working}
                onPress={() => void confirmDecision()}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: theme.colors.accent,
                    borderColor: theme.colors.accent,
                    opacity: working ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={{ color: theme.colors.accentForeground }}>
                  {working ? "Enregistrement..." : "Confirmer"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );

  function InfoBlock({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) {
    return (
      <View style={styles.infoBlock}>
        <Text
          style={[
            styles.infoLabel,
            { color: theme.colors.foregroundSubtle },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.infoValue,
            { color: theme.colors.foreground },
          ]}
        >
          {value}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  scroll: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, paddingBottom: 40 },
  page: { width: "100%", maxWidth: 1080, alignSelf: "center" },
  search: {
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  chip: {
    minHeight: 38,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  count: { fontSize: 12, fontWeight: "700", marginBottom: 10 },
  list: { gap: 12 },
  card: { width: "100%" },
  cardHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  identity: { flexGrow: 1, flexShrink: 1 },
  name: { fontSize: 17, fontWeight: "900" },
  email: { fontSize: 12, marginTop: 3 },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: { fontSize: 10, fontWeight: "900" },
  infoBlock: { marginBottom: 13 },
  infoLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  infoValue: { fontSize: 13, lineHeight: 20 },
  date: { fontSize: 11, marginBottom: 10 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  actionButton: {
    minWidth: 120,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  empty: { padding: 20, marginTop: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "900" },
  emptyText: { fontSize: 13, marginTop: 4 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  confirmCard: { width: "100%", maxWidth: 540, padding: 20 },
  confirmTitle: { fontSize: 19, fontWeight: "900" },
  confirmText: { fontSize: 14, lineHeight: 21, marginTop: 9 },
  commentInput: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
    marginTop: 16,
  },
  counter: { fontSize: 11, textAlign: "right", marginTop: 5 },
  confirmActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
});
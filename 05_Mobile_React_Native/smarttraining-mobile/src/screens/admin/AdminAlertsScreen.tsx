import { SymbolView, type SymbolViewProps } from "expo-symbols";
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
import {
  getAdminOpenAlerts,
  ignoreAdminAlert,
  markAdminAlertInProgress,
  resolveAdminAlert,
} from "../../features/admin/adminFeedbackAlertService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import {
  AdminAlertStatus,
  AdminAlertSummary,
} from "../../types/admin";

type AlertFilter = "ALL" | AdminAlertStatus;
type AlertAction = "IN_PROGRESS" | "RESOLVE" | "IGNORE";

type PendingAlertAction = {
  alert: AdminAlertSummary;
  action: AlertAction;
};

const alertFilters: readonly AdminAlertStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "IGNORED",
];

function statusLabel(status: string): string {
  if (status === "OPEN") return "Ouverte";
  if (status === "IN_PROGRESS") return "En cours";
  if (status === "RESOLVED") return "Résolue";
  if (status === "IGNORED") return "Ignorée";
  return status;
}

function actionLabel(action: AlertAction): string {
  if (action === "IN_PROGRESS") return "Prendre en charge";
  if (action === "RESOLVE") return "Résoudre";
  return "Ignorer";
}

function formatDate(value?: string | null): string {
  if (!value) return "Non renseignée";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("fr-FR");
}

function isDataInsufficient(alert: AdminAlertSummary): boolean {
  const text = [
    alert.alertType || "",
    alert.title || "",
    alert.message || "",
    alert.source || "",
  ]
    .join(" ")
    .toUpperCase();

  return text.includes("DATA_INSUFFICIENT");
}

function severityLabel(alert: AdminAlertSummary): string {
  if (isDataInsufficient(alert)) {
    return "Données insuffisantes";
  }

  if (alert.severity === "HIGH") return "Élevée";
  if (alert.severity === "MEDIUM") return "Moyenne";
  if (alert.severity === "LOW") return "Faible";
  return alert.severity || "Non renseignée";
}

function alertIcon(alert: AdminAlertSummary): SymbolViewProps["name"] {
  if (isDataInsufficient(alert)) {
    return { ios: "info.circle.fill", android: "info", web: "info" };
  }

  if (alert.severity === "HIGH") {
    return { ios: "exclamationmark.triangle.fill", android: "warning", web: "warning" };
  }

  if (alert.severity === "MEDIUM") {
    return { ios: "exclamationmark.circle.fill", android: "error", web: "error" };
  }

  return { ios: "bell.fill", android: "notifications", web: "notifications" };
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: SymbolViewProps["name"];
  tone: string;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      style={[
        styles.summaryCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.summaryIcon,
          { backgroundColor: theme.colors.surfaceSoft },
        ]}
      >
        <SymbolView
          name={icon}
          tintColor={tone}
          size={20}
          weight="bold"
        />
      </View>
      <Text
        style={[
          styles.summaryValue,
          { color: theme.colors.foreground },
        ]}
      >
        {value}
      </Text>
      <Text
        numberOfLines={2}
        style={[
          styles.summaryLabel,
          { color: theme.colors.foregroundMuted },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function AdminAlertsScreen() {
  const { theme } = useSmartTrainingTheme();
  const [items, setItems] = useState<AdminAlertSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AlertFilter>("ALL");
  const [pending, setPending] =
    useState<PendingAlertAction | null>(null);
  const [expandedAlertId, setExpandedAlertId] =
    useState<number | null>(null);

  async function load() {
    const data = await getAdminOpenAlerts();
    setItems(data);
  }

  useEffect(() => {
    let active = true;

    void getAdminOpenAlerts()
      .then((data) => {
        if (active) setItems(data);
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger les alertes ouvertes.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return items.filter((item) => {
      if (filter !== "ALL" && item.status !== filter) {
        return false;
      }

      if (!normalized) return true;

      return [
        item.title || "",
        item.message || "",
        item.alertType || "",
        item.severity || "",
        item.source || "",
        item.status,
        String(item.learnerId),
        String(item.trainingId),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [items, query, filter]);

  const openCount = useMemo(
    () => items.filter((item) => item.status === "OPEN").length,
    [items],
  );
  const inProgressCount = useMemo(
    () => items.filter((item) => item.status === "IN_PROGRESS").length,
    [items],
  );
  const highCount = useMemo(
    () =>
      items.filter(
        (item) =>
          !isDataInsufficient(item) &&
          String(item.severity || "").toUpperCase() === "HIGH",
      ).length,
    [items],
  );

  function openAction(
    alert: AdminAlertSummary,
    action: AlertAction,
  ) {
    if (
      alert.status === "RESOLVED" ||
      alert.status === "IGNORED"
    ) {
      return;
    }

    if (
      action === "IN_PROGRESS" &&
      alert.status !== "OPEN"
    ) {
      return;
    }

    setError("");
    setNotice("");
    setPending({ alert, action });
  }

  async function confirmAction() {
    if (!pending || working) return;

    const { alert, action } = pending;

    if (
      alert.status === "RESOLVED" ||
      alert.status === "IGNORED"
    ) {
      setPending(null);
      return;
    }

    if (
      action === "IN_PROGRESS" &&
      alert.status !== "OPEN"
    ) {
      setPending(null);
      return;
    }

    setWorking(true);
    setError("");

    try {
      const updated =
        action === "IN_PROGRESS"
          ? await markAdminAlertInProgress(alert.id)
          : action === "RESOLVE"
            ? await resolveAdminAlert(alert.id)
            : await ignoreAdminAlert(alert.id);

      setItems((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );

      setNotice(
        action === "IN_PROGRESS"
          ? "L’alerte est maintenant prise en charge."
          : action === "RESOLVE"
            ? "L’alerte a été résolue."
            : "L’alerte a été ignorée.",
      );
      setPending(null);
    } catch {
      setError("L’action sur cette alerte n’a pas pu être enregistrée.");
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return <LoadingState message="Chargement des alertes..." />;
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
            title="Pilotage"
            subtitle="Concentrez-vous sur les signaux qui demandent une action."
          />

          <View style={styles.summaryGrid}>
            <SummaryCard
              label="Ouvertes"
              tone={theme.colors.danger}
              value={openCount}
              icon={{ ios: "bell.fill", android: "notifications_active", web: "notifications_active" }}
            />
            <SummaryCard
              label="En cours"
              tone={theme.colors.info}
              value={inProgressCount}
              icon={{ ios: "clock.fill", android: "schedule", web: "schedule" }}
            />
            <SummaryCard
              label="Priorité élevée"
              tone={theme.colors.warning}
              value={highCount}
              icon={{ ios: "exclamationmark.triangle.fill", android: "warning", web: "warning" }}
            />
          </View>

          <View
            style={[
              styles.safetyCard,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.safetyRow}>
              <SymbolView
                name={{ ios: "info.circle.fill", android: "info", web: "info" }}
                tintColor={theme.colors.accent}
                size={20}
                weight="bold"
              />
              <View style={styles.safetyCopy}>
                <Text
                  style={[
                    styles.safetyTitle,
                    { color: theme.colors.foreground },
                  ]}
                >
                  Prudence IA
                </Text>
                <Text
                  style={[
                    styles.safetyText,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  DATA_INSUFFICIENT reste distinct d’un risque élevé.
                </Text>
              </View>
            </View>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher titre, message, type ou identifiant"
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
            <FilterChip
              label="Toutes"
              selected={filter === "ALL"}
              onPress={() => setFilter("ALL")}
            />
            {alertFilters.map((status) => (
              <FilterChip
                key={status}
                label={statusLabel(status)}
                selected={filter === status}
                onPress={() => setFilter(status)}
              />
            ))}
          </View>

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => {
                setError("");
                void load().catch(() =>
                  setError("Impossible de charger les alertes ouvertes."),
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
            {filtered.length} alerte
            {filtered.length > 1 ? "s" : ""}
          </Text>

          <View style={styles.list}>
            {filtered.map((item) => {
              const insufficient = isDataInsufficient(item);

              return (
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
                    <View style={styles.alertIdentityRow}>
                      <View
                        style={[
                          styles.alertIcon,
                          {
                            backgroundColor: theme.colors.surfaceSoft,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <SymbolView
                          name={alertIcon(item)}
                          tintColor={
                            insufficient
                              ? theme.colors.info
                              : item.severity === "HIGH"
                                ? theme.colors.danger
                                : item.severity === "MEDIUM"
                                  ? theme.colors.warning
                                  : theme.colors.info
                          }
                          size={20}
                          weight="bold"
                        />
                      </View>

                      <View style={styles.identity}>
                        <Text
                          style={[
                            styles.title,
                            { color: theme.colors.foreground },
                          ]}
                        >
                          {item.title || item.alertType || "Alerte"}
                        </Text>
                        <Text
                          style={[
                            styles.meta,
                            { color: theme.colors.foregroundMuted },
                          ]}
                        >
                          Apprenant #{item.learnerId} · Formation #{item.trainingId}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: theme.colors.surfaceSoft,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              item.status === "RESOLVED"
                                ? theme.colors.success
                                : item.status === "IN_PROGRESS"
                                  ? theme.colors.info
                                  : item.status === "IGNORED"
                                    ? theme.colors.foregroundMuted
                                    : theme.colors.foreground,
                          },
                        ]}
                      >
                        {statusLabel(item.status)}
                      </Text>
                    </View>
                  </View>

                  <Text
                    numberOfLines={expandedAlertId === item.id ? undefined : 2}
                    style={[
                      styles.message,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    {item.message || "Aucun détail."}
                  </Text>

                  <View style={styles.cardFooter}>
                    <Text
                      style={[
                        styles.date,
                        { color: theme.colors.foregroundSubtle },
                      ]}
                    >
                      Créée : {formatDate(item.createdAt)}
                    </Text>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Gérer l’alerte ${item.title || item.alertType || item.id}`}
                      accessibilityState={{ expanded: expandedAlertId === item.id }}
                      onPress={() =>
                        setExpandedAlertId((current) =>
                          current === item.id ? null : item.id,
                        )
                      }
                      style={[
                        styles.manageButton,
                        {
                          backgroundColor: theme.colors.surfaceSoft,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.manageButtonText,
                          { color: theme.colors.foreground },
                        ]}
                      >
                        {expandedAlertId === item.id ? "Masquer" : "Gérer ›"}
                      </Text>
                    </Pressable>
                  </View>

                  {expandedAlertId === item.id ? (
                    <View style={styles.managePanel}>
                      <View style={styles.metaGrid}>
                        <Meta
                          label="Type"
                          value={item.alertType || "Non renseigné"}
                        />
                        <Meta
                          label="Sévérité"
                          value={severityLabel(item)}
                        />
                        <Meta
                          label="Source"
                          value={item.source || "Non renseignée"}
                        />
                        <Meta
                          label="Probabilité"
                          value={
                            insufficient
                              ? "Non interprétable"
                              : item.riskProbability == null
                                ? "Non renseignée"
                                : `${Math.round(item.riskProbability * 100)} %`
                          }
                        />
                      </View>

                      {insufficient ? (
                        <View
                          style={[
                            styles.insufficientBox,
                            { backgroundColor: theme.colors.surfaceSoft },
                          ]}
                        >
                          <Text
                            style={[
                              styles.insufficientTitle,
                              { color: theme.colors.foreground },
                            ]}
                          >
                            Données insuffisantes
                          </Text>
                          <Text
                            style={[
                              styles.insufficientText,
                              { color: theme.colors.foregroundMuted },
                            ]}
                          >
                            Ce signal ne constitue pas une alerte de risque élevé.
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.actions}>
                        {item.status === "OPEN" ? (
                          <ActionButton
                            label="Prendre en charge"
                            primary={false}
                            disabled={working}
                            onPress={() => openAction(item, "IN_PROGRESS")}
                          />
                        ) : null}

                        {item.status === "OPEN" ||
                        item.status === "IN_PROGRESS" ? (
                          <>
                            <ActionButton
                              label="Ignorer"
                              primary={false}
                              disabled={working}
                              onPress={() => openAction(item, "IGNORE")}
                            />
                            <ActionButton
                              label="Résoudre"
                              primary
                              disabled={working}
                              onPress={() => openAction(item, "RESOLVE")}
                            />
                          </>
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          {filtered.length === 0 ? (
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
                Aucune alerte dans cette vue
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {pending ? (
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
              Confirmer l’action
            </Text>
            <Text
              style={[
                styles.confirmText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {`${actionLabel(pending.action)} l’alerte « ${pending.alert.title || pending.alert.alertType || pending.alert.id} » ?`}
            </Text>

            <View style={styles.confirmActions}>
              <ActionButton
                label="Annuler"
                primary={false}
                disabled={working}
                onPress={() => setPending(null)}
              />
              <ActionButton
                label={working ? "Enregistrement..." : "Confirmer"}
                primary
                disabled={working}
                onPress={() => void confirmAction()}
              />
            </View>
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );

  function FilterChip({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.chip,
          {
            backgroundColor: selected
              ? theme.colors.surface
              : theme.colors.surfaceSoft,
            borderColor: selected
              ? theme.colors.foregroundSubtle
              : theme.colors.border,
          },
        ]}
      >
        <Text
          style={{
            color: selected
              ? theme.colors.foreground
              : theme.colors.foregroundMuted,
            fontWeight: selected ? "800" : "600",
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function ActionButton({
    label,
    primary,
    disabled,
    onPress,
  }: {
    label: string;
    primary: boolean;
    disabled: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.actionButton,
          {
            backgroundColor: primary
              ? theme.colors.headerBackground
              : theme.colors.surfaceSoft,
            borderColor: primary
              ? theme.colors.headerBackground
              : theme.colors.border,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: primary
              ? theme.colors.headerForeground
              : theme.colors.foreground,
            fontWeight: "700",
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function Meta({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) {
    return (
      <View style={styles.metaCell}>
        <Text
          style={[
            styles.metaLabel,
            { color: theme.colors.foregroundSubtle },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.metaValue,
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
  summaryGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },
  summaryValue: {
    fontSize: 20,
    lineHeight: 23,
    fontWeight: "900",
  },
  summaryLabel: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "700",
    marginTop: 1,
  },
  safetyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
    marginBottom: 12,
  },
  safetyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  safetyCopy: {
    flex: 1,
    minWidth: 0,
  },
  safetyTitle: { fontSize: 12, fontWeight: "900" },
  safetyText: { fontSize: 11, lineHeight: 16, marginTop: 2 },
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
    gap: 10,
    marginBottom: 10,
  },
  alertIdentityRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  alertIcon: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, fontWeight: "900" },
  meta: { fontSize: 11, marginTop: 4 },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 10, fontWeight: "900" },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  metaCell: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 0,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  metaValue: { fontSize: 12, marginTop: 3 },
  insufficientBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  insufficientTitle: { fontSize: 12, fontWeight: "900" },
  insufficientText: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  message: { fontSize: 13, lineHeight: 19 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  date: { flex: 1, minWidth: 0, fontSize: 10 },
  manageButton: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  managePanel: {
    marginTop: 12,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    minWidth: 128,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  empty: { padding: 20, marginTop: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "900" },
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
  confirmActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
});

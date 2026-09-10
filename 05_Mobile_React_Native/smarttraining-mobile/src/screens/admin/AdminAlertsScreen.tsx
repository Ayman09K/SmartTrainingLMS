import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  getAdminOpenAlerts,
  ignoreAdminAlert,
  markAdminAlertInProgress,
  resolveAdminAlert,
} from "../../features/admin/adminFeedbackAlertService";
import { getAdminUsers } from "../../features/admin/adminUserService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type { AdminAlertSummary, AdminUserSummary } from "../../types/admin";

type AlertFilter = "ALL" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "IGNORED";
type AlertAction = "IN_PROGRESS" | "RESOLVE" | "IGNORE";
type PaginationItem = number | "ellipsis";
type Tone = { color: string; soft: string };
type PendingAlertAction = { alert: AdminAlertSummary; action: AlertAction };

const PAGE_SIZE = 4;
const ALERT_FILTERS: readonly AlertFilter[] = [
  "ALL",
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "IGNORED",
];

function statusLabel(status: string): string {
  if (status === "ALL") return "Toutes";
  if (status === "OPEN") return "À traiter";
  if (status === "IN_PROGRESS") return "En cours";
  if (status === "RESOLVED") return "Résolues";
  if (status === "IGNORED") return "Ignorées";
  return status;
}

function actionLabel(action: AlertAction): string {
  if (action === "IN_PROGRESS") return "Prendre en charge";
  if (action === "RESOLVE") return "Résoudre";
  return "Ignorer";
}

function confirmationTitle(action: AlertAction): string {
  if (action === "IN_PROGRESS") return "Prendre en charge cette alerte ?";
  if (action === "RESOLVE") return "Résoudre cette alerte ?";
  return "Ignorer cette alerte ?";
}

function confirmationDescription(action: AlertAction): string {
  if (action === "IN_PROGRESS") {
    return "Vous allez prendre en charge ce signal et le passer au statut « En cours ».";
  }
  if (action === "RESOLVE") {
    return "Vous allez clôturer ce signal en le marquant comme résolu.";
  }
  return "Vous allez clôturer ce signal en le marquant comme ignoré.";
}

function learnerDisplayName(user?: AdminUserSummary): string {
  if (!user) return "Apprenant non identifié";

  const explicitName = user.fullName?.trim();
  if (explicitName) return explicitName;

  const composedName = [user.firstName, user.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => part.trim())
    .join(" ");

  return composedName || user.email || `Utilisateur #${user.id}`;
}

function learnerInitials(user?: AdminUserSummary): string {
  if (!user) return "AP";

  const source = learnerDisplayName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  const initials = source.map((part) => part.charAt(0).toUpperCase()).join("");
  return initials || "AP";
}

function alertTypeLabel(value?: string | null): string {
  if (!value) return "Signal pédagogique";

  const labels: Record<string, string> = {
    LOW_PROGRESS: "Progression faible",
    LOW_SCORE: "Score à renforcer",
    INACTIVITY: "Inactivité",
    AI_RISK: "Signal d’accompagnement",
    QUIZ_FAILURE: "Quiz à reprendre",
    LOW_ACTIVITY: "Activité faible",
  };

  return labels[value.toUpperCase()] || value.replace(/_/g, " ");
}

function alertSourceLabel(value?: string | null): string {
  if (!value) return "Non renseignée";

  const normalized = value.toUpperCase();
  if (normalized === "RULE_BASED" || normalized === "RULES_BASED") {
    return "Règle pédagogique";
  }
  if (normalized === "AI_BASED") return "Signal IA";
  if (normalized === "MANUAL") return "Action manuelle";

  return value.replace(/_/g, " ");
}

function formatDate(value?: string | null): string {
  if (!value) return "Non renseignée";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("fr-FR");
}

function isDataInsufficient(alert: AdminAlertSummary): boolean {
  return [alert.alertType, alert.title, alert.message, alert.source]
    .filter(Boolean)
    .join(" ")
    .toUpperCase()
    .includes("DATA_INSUFFICIENT");
}

function severityLabel(alert: AdminAlertSummary): string {
  if (isDataInsufficient(alert)) return "Données insuffisantes";
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

function severityTone(alert: AdminAlertSummary): Tone {
  if (isDataInsufficient(alert)) return { color: "#3478D4", soft: "#EAF2FF" };
  if (alert.severity === "HIGH") return { color: "#C2413A", soft: "#FFF0F0" };
  if (alert.severity === "MEDIUM") return { color: "#B45309", soft: "#FFF4E5" };
  return { color: "#16845A", soft: "#EAFBF3" };
}

function statusTone(status: string): Tone {
  if (status === "RESOLVED") return { color: "#16845A", soft: "#EAFBF3" };
  if (status === "IN_PROGRESS") return { color: "#3478D4", soft: "#EAF2FF" };
  if (status === "IGNORED") return { color: "#64748B", soft: "#EEF2F7" };
  return { color: "#C2413A", soft: "#FFF0F0" };
}

function buildPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 3) return [1, 2, 3, 4, "ellipsis", totalPages];
  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}

export default function AdminAlertsScreen() {
  const { theme } = useSmartTrainingTheme();
  const scrollRef = useRef<ScrollView | null>(null);
  const listTopRef = useRef(0);
  const searchTopRef = useRef(0);
  const searchFocusedRef = useRef(false);

  const [items, setItems] = useState<AdminAlertSummary[]>([]);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AlertFilter>("ALL");
  const [page, setPage] = useState(1);
  const [expandedAlertId, setExpandedAlertId] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingAlertAction | null>(null);

  async function load(): Promise<void> {
    const [alertsResult, usersResult] = await Promise.allSettled([
      getAdminOpenAlerts(),
      getAdminUsers(),
    ]);

    if (alertsResult.status === "rejected") {
      throw alertsResult.reason;
    }

    setItems(alertsResult.value);

    if (usersResult.status === "fulfilled") {
      setUsers(usersResult.value);
    }
  }

  useEffect(() => {
    let active = true;

    void Promise.allSettled([getAdminOpenAlerts(), getAdminUsers()])
      .then(([alertsResult, usersResult]) => {
        if (!active) return;

        if (alertsResult.status === "fulfilled") {
          setItems(alertsResult.value);
          setError("");
        } else {
          setError("Impossible de charger les alertes ouvertes.");
        }

        if (usersResult.status === "fulfilled") {
          setUsers(usersResult.value);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios"
        ? "keyboardWillShow"
        : "keyboardDidShow";

    const hideEvent =
      Platform.OS === "ios"
        ? "keyboardWillHide"
        : "keyboardDidHide";

    const scrollSearchIntoView = () => {
      if (!searchFocusedRef.current) {
        return;
      }

      scrollRef.current?.scrollTo({
        y: Math.max(0, searchTopRef.current - 150),
        animated: true,
      });
    };

    const showSubscription = Keyboard.addListener(
      showEvent,
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);

        // Même comportement que dans l’espace Formateur :
        // on repositionne le champ juste après l’ouverture
        // puis une seconde fois lorsque l’animation du clavier est terminée.
        setTimeout(scrollSearchIntoView, 80);
        setTimeout(scrollSearchIntoView, 260);
      },
    );

    const hideSubscription = Keyboard.addListener(
      hideEvent,
      () => {
        setKeyboardHeight(0);
      },
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  async function refresh(): Promise<void> {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await load();
      setError("");
      setNotice("");
    } catch {
      setError("Impossible d’actualiser les alertes.");
    } finally {
      setRefreshing(false);
    }
  }

  const normalizedQuery = query.trim().toLocaleLowerCase("fr");

  const usersById = useMemo(() => {
    const map = new Map<number, AdminUserSummary>();
    users.forEach((user) => map.set(user.id, user));
    return map;
  }, [users]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filter !== "ALL" && item.status !== filter) return false;
      if (!normalizedQuery) return true;

      const learner = usersById.get(item.learnerId);

      return [
        item.title || "",
        item.message || "",
        item.alertType || "",
        alertTypeLabel(item.alertType),
        item.severity || "",
        item.source || "",
        alertSourceLabel(item.source),
        item.status,
        String(item.learnerId),
        String(item.trainingId),
        learnerDisplayName(learner),
        learner?.email || "",
      ]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(normalizedQuery);
    });
  }, [filter, items, normalizedQuery, usersById]);

  const filterCounts = useMemo(() => {
    const counts: Record<AlertFilter, number> = {
      ALL: items.length,
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      IGNORED: 0,
    };

    items.forEach((item) => {
      if (item.status === "OPEN") counts.OPEN += 1;
      if (item.status === "IN_PROGRESS") counts.IN_PROGRESS += 1;
      if (item.status === "RESOLVED") counts.RESOLVED += 1;
      if (item.status === "IGNORED") counts.IGNORED += 1;
    });

    return counts;
  }, [items]);

  const highCount = useMemo(
    () =>
      items.filter(
        (item) =>
          !isDataInsufficient(item) &&
          String(item.severity || "").toUpperCase() === "HIGH",
      ).length,
    [items],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [currentPage, filtered]);

  const hasActiveFilters = filter !== "ALL" || Boolean(query.trim());

  function updateQuery(value: string): void {
    setQuery(value);
    setPage(1);
    setExpandedAlertId(null);
  }

  function selectFilter(value: AlertFilter): void {
    setFilter(value);
    setPage(1);
    setExpandedAlertId(null);
  }

  function resetFilters(): void {
    setQuery("");
    setFilter("ALL");
    setPage(1);
    setExpandedAlertId(null);
  }

  function changePage(nextPage: number): void {
    const normalizedPage = Math.min(Math.max(nextPage, 1), totalPages);
    if (normalizedPage === currentPage) return;

    setPage(normalizedPage);
    setExpandedAlertId(null);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, listTopRef.current - 16),
        animated: true,
      });
    });
  }

  function openAction(alert: AdminAlertSummary, action: AlertAction): void {
    if (alert.status === "RESOLVED" || alert.status === "IGNORED") return;
    if (action === "IN_PROGRESS" && alert.status !== "OPEN") return;

    setError("");
    setNotice("");
    setPending({ alert, action });
  }

  async function confirmAction(): Promise<void> {
    if (!pending || working) return;
    const { alert, action } = pending;

    if (alert.status === "RESOLVED" || alert.status === "IGNORED") {
      setPending(null);
      return;
    }
    if (action === "IN_PROGRESS" && alert.status !== "OPEN") {
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
        current.map((item) => (item.id === updated.id ? updated : item)),
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
    return <LoadingState message="Chargement du pilotage..." />;
  }

  return (
    <ScreenContainer
      edges={["left", "right"]}
      style={{ padding: 0, backgroundColor: "#FFFFFF" }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          style={{ backgroundColor: "#FFFFFF" }}
          contentContainerStyle={{
            paddingBottom:
              Platform.OS === "android" && keyboardHeight > 0
                ? keyboardHeight + 24
                : 0,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor="#7C3AED"
            colors={["#7C3AED"]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-[#F8F7FA] px-4 pb-2 pt-3">
          <View
            className="overflow-hidden rounded-[22px] border bg-white"
            style={{
              borderColor: "#E7E2EB",
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
            }}
          >
            <View className="h-1 bg-[#7C3AED]" />
            <View className="relative overflow-hidden px-3.5 py-3">
              <View
                className="absolute -right-8 -top-10 h-[120px] w-[120px] rounded-full"
                style={{ backgroundColor: "#F4ECFF" }}
              />
              <View
                className="absolute right-3 top-5 h-[66px] w-[58px] rotate-6 rounded-[18px]"
                style={{ backgroundColor: "#E4D2FF" }}
              />

              <View className="flex-row items-center">
                <View className="h-12 w-12 items-center justify-center rounded-[15px] bg-[#F1E9FF]">
                  <SymbolView
                    name={{ ios: "chart.bar.fill", android: "analytics", web: "analytics" }}
                    tintColor="#7C3AED"
                    size={21}
                    weight="bold"
                  />
                </View>

                <View className="ml-3 min-w-0 flex-1 pr-[68px]">
                  <Text className="text-[10px] font-black uppercase tracking-[0.7px] text-[#7C3AED]">
                    Pilotage administratif
                  </Text>
                  <Text
                    accessibilityRole="header"
                    className="mt-1 text-[24px] font-black leading-[29px] tracking-[-0.7px]"
                    style={{ color: theme.colors.foreground }}
                  >
                    Alertes & risques
                  </Text>
                  <Text
                    className="mt-1.5 text-[12px] leading-[18px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Identifiez les signaux prioritaires et suivez leur traitement.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="mt-3 flex-row justify-between">
            <MetricCard
              label="À traiter"
              value={filterCounts.OPEN}
              color="#C2413A"
              soft="#FFF0F0"
              icon={{ ios: "exclamationmark.circle.fill", android: "error", web: "error" }}
            />
            <MetricCard
              label="En cours"
              value={filterCounts.IN_PROGRESS}
              color="#3478D4"
              soft="#EAF2FF"
              icon={{ ios: "clock.fill", android: "schedule", web: "schedule" }}
            />
            <MetricCard
              label="Priorité élevée"
              value={highCount}
              color="#B45309"
              soft="#FFF4E5"
              icon={{ ios: "exclamationmark.triangle.fill", android: "warning", web: "warning" }}
            />
          </View>

          <View
            className="mt-3 overflow-hidden rounded-[20px] border bg-white"
            style={{ borderColor: "#E7E2EB" }}
          >
            <View className="flex-row items-center px-3 pb-2.5 pt-3">
              <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-[#F1E9FF]">
                <SymbolView
                  name={{ ios: "line.3.horizontal.decrease.circle.fill", android: "filter_list", web: "filter_list" }}
                  tintColor="#7C3AED"
                  size={15}
                  weight="bold"
                />
              </View>
              <View className="ml-2.5 min-w-0 flex-1">
                <Text
                  className="text-[20px] font-black tracking-[-0.3px]"
                  style={{ color: theme.colors.foreground }}
                >
                  Vue de pilotage
                </Text>
                <Text
                  className="mt-1 text-[13px] leading-[18px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Filtrez les alertes par statut.
                </Text>
              </View>
              {hasActiveFilters ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={resetFilters}
                  className="rounded-full bg-[#F3EEFF] px-2.5 py-1.5"
                >
                  <Text className="text-[10px] font-black text-[#7C3AED]">Réinitialiser</Text>
                </Pressable>
              ) : null}
            </View>

            <View className="border-t px-3 pb-3 pt-3" style={{ borderTopColor: "#F0EBF2" }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {ALERT_FILTERS.map((value) => (
                  <FilterChip
                    key={value}
                    value={value}
                    count={filterCounts[value]}
                    selected={filter === value}
                    onPress={() => selectFilter(value)}
                  />
                ))}
              </ScrollView>
            </View>
          </View>

          <View
            className="mt-3 flex-row items-center rounded-[17px] border bg-white px-3"
            style={{ borderColor: "#E7E2EB" }}
            onLayout={(event) => {
              searchTopRef.current = event.nativeEvent.layout.y;
            }}
          >
            <SymbolView
              name={{ ios: "magnifyingglass", android: "search", web: "search" }}
              tintColor={theme.colors.foregroundSubtle}
              size={16}
            />
            <TextInput
              value={query}
              onChangeText={updateQuery}
              onFocus={() => {
                searchFocusedRef.current = true;

                setTimeout(() => {
                  scrollRef.current?.scrollTo({
                    y: Math.max(0, searchTopRef.current - 150),
                    animated: true,
                  });
                }, 50);
              }}
              onBlur={() => {
                searchFocusedRef.current = false;
              }}
              placeholder="Titre, message, type ou identifiant..."
              placeholderTextColor={theme.colors.foregroundSubtle}
              className="ml-2 min-h-[46px] min-w-0 flex-1 text-[13px]"
              style={{ color: theme.colors.foreground }}
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
                onPress={() => updateQuery("")}
                className="h-8 w-8 items-center justify-center rounded-full"
              >
                <SymbolView
                  name={{ ios: "xmark.circle.fill", android: "cancel", web: "cancel" }}
                  tintColor={theme.colors.foregroundSubtle}
                  size={15}
                />
              </Pressable>
            ) : null}
          </View>

          <View
            className="mt-3 flex-row items-start rounded-[18px] border bg-[#F8F4FF] px-3 py-3"
            style={{ borderColor: "#E9DDFC" }}
          >
            <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-[#E9DEFB]">
              <SymbolView
                name={{ ios: "info.circle.fill", android: "info", web: "info" }}
                tintColor="#7C3AED"
                size={15}
                weight="bold"
              />
            </View>
            <View className="ml-2.5 min-w-0 flex-1">
              <Text
                className="text-[13px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Comment interpréter les alertes ?
              </Text>
              <Text
                className="mt-1 text-[11px] leading-[16px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Certaines alertes proviennent de règles pédagogiques et d’autres de l’IA. Si une alerte indique « Données insuffisantes », cela signifie qu’il n’y a pas encore assez d’informations pour évaluer correctement le risque. Ce n’est donc pas automatiquement un risque élevé.
              </Text>
            </View>
          </View>

          {error ? (
            <View className="mt-3">
              <ErrorMessage message={error} onRetry={() => void refresh()} />
            </View>
          ) : null}

          {notice ? (
            <View
              className="mt-3 flex-row items-center rounded-[15px] border bg-[#EAFBF3] px-3 py-2.5"
              style={{ borderColor: "#CFEBDD" }}
            >
              <SymbolView
                name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }}
                tintColor="#16845A"
                size={15}
                weight="bold"
              />
              <Text
                className="ml-2 min-w-0 flex-1 text-[11px] font-bold"
                style={{ color: theme.colors.foreground }}
              >
                {notice}
              </Text>
            </View>
          ) : null}

          <View
            className="mt-5"
            onLayout={(event) => {
              listTopRef.current = event.nativeEvent.layout.y;
            }}
          >
            <View
              className="overflow-hidden rounded-[20px] border bg-white"
              style={{
                borderColor: "#E7E2EB",
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.035,
                shadowRadius: 7,
              }}
            >
              <View className="h-1 bg-[#7C3AED]" />

              <View className="flex-row items-center px-3.5 py-3">
                <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-[#F1E9FF]">
                  <SymbolView
                    name={{
                      ios: "waveform.path.ecg.rectangle.fill",
                      android: "monitor_heart",
                      web: "monitor_heart",
                    }}
                    tintColor="#7C3AED"
                    size={17}
                    weight="bold"
                  />
                </View>

                <View className="ml-3 min-w-0 flex-1">
                  <Text
                    accessibilityRole="header"
                    className="text-[20px] font-black tracking-[-0.3px]"
                    style={{ color: theme.colors.foreground }}
                  >
                    Signaux à suivre
                  </Text>

                  <Text
                    className="mt-1 text-[13px] leading-[18px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Consultez les alertes qui nécessitent une attention ou une action.
                  </Text>
                </View>

                <View className="rounded-full bg-[#F3EEFF] px-2.5 py-1.5">
                  <Text className="text-[10px] font-black text-[#7C3AED]">
                    {filtered.length}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {filtered.length === 0 ? (
            <View
              className="mt-3 items-center rounded-[20px] border bg-white px-5 py-7"
              style={{ borderColor: "#E7E2EB" }}
            >
              <View className="h-12 w-12 items-center justify-center rounded-full bg-[#F1E9FF]">
                <SymbolView
                  name={{ ios: "checkmark.shield.fill", android: "verified_user", web: "verified_user" }}
                  tintColor="#7C3AED"
                  size={20}
                  weight="bold"
                />
              </View>
              <Text className="mt-3 text-[15px] font-black" style={{ color: theme.colors.foreground }}>
                Aucune alerte
              </Text>
              <Text
                className="mt-1 text-center text-[11px] leading-[16px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Aucun signal ne correspond à cette vue.
              </Text>
            </View>
          ) : (
            <View className="mt-3 gap-3">
              {paginated.map((item) => {
                const insufficient = isDataInsufficient(item);
                const severity = severityTone(item);
                const status = statusTone(item.status);
                const expanded = expandedAlertId === item.id;

                return (
                  <View
                    key={item.id}
                    className="overflow-hidden rounded-[20px] border bg-white"
                    style={{ borderColor: "#E7E2EB" }}
                  >
                    <View className="p-3">
                      {/* EN-TÊTE DE L’ALERTE */}
                      <View className="flex-row items-start">
                        <View
                          className="h-10 w-10 shrink-0 items-center justify-center rounded-[13px]"
                          style={{ backgroundColor: severity.soft }}
                        >
                          <SymbolView
                            name={alertIcon(item)}
                            tintColor={severity.color}
                            size={16}
                            weight="bold"
                          />
                        </View>

                        <View className="ml-3 min-w-0 flex-1">
                          <View className="flex-row items-start justify-between">
                            <View className="min-w-0 flex-1 pr-2">
                              <Text
                                className="text-[9px] font-black uppercase tracking-[0.7px]"
                                style={{ color: severity.color }}
                              >
                                Signal détecté
                              </Text>

                              <Text
                                numberOfLines={2}
                                className="mt-1 text-[14px] font-black leading-[18px] tracking-[-0.15px]"
                                style={{ color: theme.colors.foreground }}
                              >
                                {item.title || alertTypeLabel(item.alertType)}
                              </Text>
                            </View>

                            <View
                              className="shrink-0 rounded-full px-2.5 py-1.5"
                              style={{ backgroundColor: status.soft }}
                            >
                              <Text
                                className="text-[9px] font-black"
                                style={{ color: status.color }}
                              >
                                {statusLabel(item.status)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* APPRENANT — BLOC PRINCIPAL, PLEINE LARGEUR */}
                      <View
                        className="mt-2.5 flex-row items-center rounded-[15px] border bg-[#FBFAFC] px-2.5 py-2.5"
                        style={{ borderColor: "#ECE6F0" }}
                      >
                        <View className="h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#E9DCFF]">
                          <Text className="text-[12px] font-black text-[#7C3AED]">
                            {learnerInitials(usersById.get(item.learnerId))}
                          </Text>
                        </View>

                        <View className="ml-2.5 min-w-0 flex-1">
                          <Text className="text-[9px] font-black uppercase tracking-[0.6px] text-[#7C3AED]">
                            Apprenant concerné
                          </Text>

                          <Text
                            numberOfLines={1}
                            className="mt-0.5 text-[12px] font-black leading-[16px]"
                            style={{ color: theme.colors.foreground }}
                          >
                            {usersById.has(item.learnerId)
                              ? learnerDisplayName(usersById.get(item.learnerId))
                              : `Apprenant #${item.learnerId}`}
                          </Text>

                          <Text
                            numberOfLines={1}
                            className="mt-0.5 text-[10px] leading-[14px]"
                            style={{ color: theme.colors.foregroundMuted }}
                          >
                            {usersById.get(item.learnerId)?.email ||
                              `Identifiant apprenant #${item.learnerId}`}
                          </Text>
                        </View>

                        <SymbolView
                          name={{
                            ios: "person.crop.circle.fill",
                            android: "account_circle",
                            web: "account_circle",
                          }}
                          tintColor="#B6A6CC"
                          size={18}
                        />
                      </View>

                      {/* MÉTADONNÉES PRINCIPALES */}
                      <View className="mt-2 flex-row gap-2">
                        <View
                          className="min-w-0 flex-1 rounded-[14px] border bg-white px-2.5 py-2"
                          style={{ borderColor: "#EEE9F1" }}
                        >
                          <View className="flex-row items-center">
                            <View className="h-7 w-7 items-center justify-center rounded-[9px] bg-[#F3EEFF]">
                              <SymbolView
                                name={{
                                  ios: "book.closed.fill",
                                  android: "menu_book",
                                  web: "menu_book",
                                }}
                                tintColor="#7C3AED"
                                size={12}
                                weight="bold"
                              />
                            </View>

                            <View className="ml-2 min-w-0 flex-1">
                              <Text
                                className="text-[8px] font-black uppercase tracking-[0.5px]"
                                style={{ color: theme.colors.foregroundSubtle }}
                              >
                                Formation
                              </Text>
                              <Text
                                numberOfLines={1}
                                className="mt-0.5 text-[11px] font-black"
                                style={{ color: theme.colors.foreground }}
                              >
                                #{item.trainingId}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View
                          className="min-w-0 flex-1 rounded-[14px] border px-2.5 py-2"
                          style={{
                            borderColor: severity.soft,
                            backgroundColor: severity.soft,
                          }}
                        >
                          <View className="flex-row items-center">
                            <View
                              className="h-7 w-7 items-center justify-center rounded-[9px] bg-white/70"
                            >
                              <SymbolView
                                name={{
                                  ios: "gauge.with.dots.needle.50percent",
                                  android: "speed",
                                  web: "speed",
                                }}
                                tintColor={severity.color}
                                size={12}
                                weight="bold"
                              />
                            </View>

                            <View className="ml-2 min-w-0 flex-1">
                              <Text
                                className="text-[8px] font-black uppercase tracking-[0.5px]"
                                style={{ color: severity.color }}
                              >
                                Priorité
                              </Text>
                              <Text
                                numberOfLines={1}
                                className="mt-0.5 text-[11px] font-black"
                                style={{ color: severity.color }}
                              >
                                {severityLabel(item)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* MESSAGE DU SIGNAL */}
                      <View className="mt-2.5 rounded-[14px] bg-[#F7F3FA] px-3 py-2.5">
                        <Text
                          className="text-[9px] font-black uppercase tracking-[0.55px]"
                          style={{ color: theme.colors.foregroundSubtle }}
                        >
                          Détail du signal
                        </Text>

                        <Text
                          numberOfLines={expanded ? undefined : 3}
                          className="mt-1 text-[11px] leading-[17px]"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          {item.message || "Aucun détail."}
                        </Text>
                      </View>

                      {/* PIED DE CARTE */}
                      <View
                        className="mt-2.5 flex-row items-center border-t pt-2.5"
                        style={{ borderTopColor: "#F0EBF2" }}
                      >
                        <View className="min-w-0 flex-1 flex-row items-center pr-2">
                          <SymbolView
                            name={{
                              ios: "calendar",
                              android: "event",
                              web: "event",
                            }}
                            tintColor={theme.colors.foregroundSubtle}
                            size={11}
                          />
                          <Text
                            numberOfLines={1}
                            className="ml-1.5 min-w-0 flex-1 text-[9px]"
                            style={{ color: theme.colors.foregroundSubtle }}
                          >
                            {formatDate(item.createdAt)}
                          </Text>
                        </View>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ expanded }}
                          onPress={() =>
                            setExpandedAlertId((current) => (current === item.id ? null : item.id))
                          }
                          className="flex-row items-center rounded-[12px] bg-[#F3EEFF] px-3 py-2"
                        >
                          <Text className="mr-1.5 text-[10px] font-black text-[#7C3AED]">
                            {expanded ? "Fermer" : "Gérer"}
                          </Text>
                          <SymbolView
                            name={
                              expanded
                                ? { ios: "chevron.up", android: "expand_less", web: "expand_less" }
                                : { ios: "chevron.down", android: "expand_more", web: "expand_more" }
                            }
                            tintColor="#7C3AED"
                            size={11}
                            weight="bold"
                          />
                        </Pressable>
                      </View>
                    </View>

                    {expanded ? (
                      <View
                        className="border-t bg-[#FBFAFC] px-3 pb-3 pt-3"
                        style={{ borderTopColor: "#F0EBF2" }}
                      >
                        <View className="flex-row flex-wrap gap-2">
                          <Meta label="Type" value={alertTypeLabel(item.alertType)} />
                          <Meta label="Sévérité" value={severityLabel(item)} />
                          <Meta label="Origine" value={alertSourceLabel(item.source)} />
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
                          <View className="mt-3 rounded-[14px] bg-[#EAF2FF] px-3 py-2.5">
                            <Text className="text-[11px] font-black" style={{ color: theme.colors.foreground }}>
                              Données insuffisantes
                            </Text>
                            <Text
                              className="mt-1 text-[10px] leading-[15px]"
                              style={{ color: theme.colors.foregroundMuted }}
                            >
                              Le système ne dispose pas encore de suffisamment d’éléments pour conclure à un niveau de risque fiable.
                            </Text>
                          </View>
                        ) : null}

                        {item.status === "OPEN" || item.status === "IN_PROGRESS" ? (
                          <View className="mt-3">
                            <Text
                              className="mb-2 text-[10px] font-black uppercase tracking-[0.5px]"
                              style={{ color: theme.colors.foregroundSubtle }}
                            >
                              Actions administratives
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                              {item.status === "OPEN" ? (
                                <ActionButton
                                  label="Prendre en charge"
                                  primary={false}
                                  disabled={working}
                                  onPress={() => openAction(item, "IN_PROGRESS")}
                                />
                              ) : null}
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
                            </View>
                          </View>
                        ) : (
                          <View className="mt-3 rounded-[14px] bg-[#EEF2F7] px-3 py-2.5">
                            <Text
                              className="text-[10px] font-bold"
                              style={{ color: theme.colors.foregroundMuted }}
                            >
                              Cette alerte est clôturée. Aucune action supplémentaire n’est disponible.
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              })}

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filtered.length}
                onChange={changePage}
              />
            </View>
          )}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {pending ? (() => {
        const actionTone =
          pending.action === "IN_PROGRESS"
            ? {
                color: "#3478D4",
                soft: "#EAF2FF",
                border: "#C9DCF8",
                icon: {
                  ios: "person.badge.clock.fill",
                  android: "schedule",
                  web: "schedule",
                } as SymbolViewProps["name"],
                eyebrow: "PRISE EN CHARGE",
              }
            : pending.action === "RESOLVE"
              ? {
                  color: "#16845A",
                  soft: "#EAFBF3",
                  border: "#BFECD7",
                  icon: {
                    ios: "checkmark.circle.fill",
                    android: "check_circle",
                    web: "check_circle",
                  } as SymbolViewProps["name"],
                  eyebrow: "RÉSOLUTION",
                }
              : {
                  color: "#64748B",
                  soft: "#F1F5F9",
                  border: "#DCE3EA",
                  icon: {
                    ios: "eye.slash.fill",
                    android: "visibility_off",
                    web: "visibility_off",
                  } as SymbolViewProps["name"],
                  eyebrow: "CLÔTURE",
                };

        const currentStatus = statusLabel(pending.alert.status);
        const nextStatus =
          pending.action === "IN_PROGRESS"
            ? "En cours"
            : pending.action === "RESOLVE"
              ? "Résolue"
              : "Ignorée";

        const learner = usersById.get(pending.alert.learnerId);

        return (
          <View className="absolute inset-0 bg-black/50">
            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "center",
                paddingHorizontal: 20,
                paddingVertical: 28,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                className="w-full max-w-[460px] self-center overflow-hidden rounded-[25px] border bg-white"
                style={{ borderColor: actionTone.border }}
              >
                <View
                  className="h-1.5"
                  style={{ backgroundColor: actionTone.color }}
                />

                <View className="p-4">
                  <View className="flex-row items-start">
                    <View
                      className="h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
                      style={{ backgroundColor: actionTone.soft }}
                    >
                      <SymbolView
                        name={actionTone.icon}
                        tintColor={actionTone.color}
                        size={18}
                        weight="bold"
                      />
                    </View>

                    <View className="ml-3 min-w-0 flex-1">
                      <Text
                        className="text-[9px] font-black tracking-[0.7px]"
                        style={{ color: actionTone.color }}
                      >
                        {actionTone.eyebrow}
                      </Text>

                      <Text
                        className="mt-1 text-[18px] font-black leading-[22px]"
                        style={{ color: theme.colors.foreground }}
                      >
                        {confirmationTitle(pending.action)}
                      </Text>

                      <Text
                        className="mt-1 text-[10px] leading-[15px]"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        {confirmationDescription(pending.action)}
                      </Text>
                    </View>
                  </View>

                  <View
                    className="mt-3 flex-row items-center rounded-[15px] border bg-[#FCFBFD] p-3"
                    style={{ borderColor: "#EAE4ED" }}
                  >
                    <View className="h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#E9DCFF]">
                      <Text className="text-[11px] font-black text-[#7C3AED]">
                        {learnerInitials(learner)}
                      </Text>
                    </View>

                    <View className="ml-2.5 min-w-0 flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-[11px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        {learner
                          ? learnerDisplayName(learner)
                          : `Apprenant #${pending.alert.learnerId}`}
                      </Text>

                      <Text
                        numberOfLines={1}
                        className="mt-0.5 text-[8px]"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        Formation #{pending.alert.trainingId} · {severityLabel(pending.alert)}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3 flex-row items-center gap-2">
                    <View className="min-w-0 flex-1 rounded-[13px] bg-[#F8F6F9] px-3 py-2.5">
                      <Text
                        className="text-[8px] font-black uppercase tracking-[0.4px]"
                        style={{ color: theme.colors.foregroundSubtle }}
                      >
                        Actuellement
                      </Text>
                      <Text
                        className="mt-1 text-[10px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        {currentStatus}
                      </Text>
                    </View>

                    <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3EEFF]">
                      <SymbolView
                        name={{
                          ios: "arrow.right",
                          android: "arrow_forward",
                          web: "arrow_forward",
                        }}
                        tintColor="#7C3AED"
                        size={10}
                        weight="bold"
                      />
                    </View>

                    <View
                      className="min-w-0 flex-1 rounded-[13px] px-3 py-2.5"
                      style={{ backgroundColor: actionTone.soft }}
                    >
                      <Text
                        className="text-[8px] font-black uppercase tracking-[0.4px]"
                        style={{ color: actionTone.color }}
                      >
                        Après confirmation
                      </Text>
                      <Text
                        className="mt-1 text-[10px] font-black"
                        style={{ color: actionTone.color }}
                      >
                        {nextStatus}
                      </Text>
                    </View>
                  </View>

                  <View
                    className="mt-3 flex-row items-start rounded-[14px] px-3 py-2.5"
                    style={{ backgroundColor: actionTone.soft }}
                  >
                    <SymbolView
                      name={{
                        ios: "info.circle.fill",
                        android: "info",
                        web: "info",
                      }}
                      tintColor={actionTone.color}
                      size={12}
                    />

                    <Text
                      numberOfLines={3}
                      className="ml-2 min-w-0 flex-1 text-[9px] leading-[14px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      {pending.alert.title ||
                        pending.alert.message ||
                        "Aucun détail complémentaire n’est disponible pour cette alerte."}
                    </Text>
                  </View>

                  <View className="mt-4 flex-row gap-2">
                    <Pressable
                      accessibilityRole="button"
                      disabled={working}
                      onPress={() => setPending(null)}
                      className="h-[46px] flex-1 items-center justify-center rounded-[13px] border bg-white"
                      style={{
                        borderColor: "#E7E2EB",
                        opacity: working ? 0.5 : 1,
                      }}
                    >
                      <Text
                        className="text-[10px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        Annuler
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      disabled={working}
                      onPress={() => void confirmAction()}
                      className="h-[46px] flex-1 items-center justify-center rounded-[13px]"
                      style={{
                        backgroundColor: actionTone.color,
                        opacity: working ? 0.6 : 1,
                      }}
                    >
                      <Text className="text-center text-[10px] font-black text-white">
                        {working ? "Enregistrement..." : actionLabel(pending.action)}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        );
      })() : null}
    </ScreenContainer>
  );

  function MetricCard({
    label,
    value,
    icon,
    color,
    soft,
  }: {
    label: string;
    value: number;
    icon: SymbolViewProps["name"];
    color: string;
    soft: string;
  }) {
    return (
      <View
        accessible
        accessibilityLabel={`${label} : ${value}`}
        className="relative w-[31.7%] overflow-hidden rounded-[22px] border bg-white px-3 py-3"
        style={{
          minHeight: 116,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
          shadowOpacity: 0.04,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 2,
        }}
      >
        <View
          pointerEvents="none"
          className="absolute -right-5 -top-5 h-16 w-16 rounded-full"
          style={{ backgroundColor: soft, opacity: 0.72 }}
        />
        <View className="flex-row items-center justify-between">
          <View
            className="h-9 w-9 items-center justify-center rounded-[13px]"
            style={{ backgroundColor: soft }}
          >
            <SymbolView name={icon} tintColor={color} size={18} weight="bold" />
          </View>
          <Text
            className="ml-1 text-[24px] font-black leading-[28px] tracking-[-0.7px]"
            style={{ color: theme.colors.foreground }}
          >
            {value}
          </Text>
        </View>
        <Text
          numberOfLines={2}
          className="mt-3 min-w-0 text-[11px] font-extrabold leading-[14px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {label}
        </Text>
        <View className="mt-2.5 h-1 w-8 rounded-full" style={{ backgroundColor: color }} />
      </View>
    );
  }

  function FilterChip({
    value,
    count,
    selected,
    onPress,
  }: {
    value: AlertFilter;
    count: number;
    selected: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        className="min-h-[40px] flex-row items-center rounded-[14px] border px-3"
        style={{
          backgroundColor: selected ? "#7C3AED" : "#FFFFFF",
          borderColor: selected ? "#7C3AED" : "#E7E2EB",
        }}
      >
        <Text
          className="text-[10px] font-black"
          style={{ color: selected ? "#FFFFFF" : theme.colors.foregroundMuted }}
        >
          {statusLabel(value)}
        </Text>
        <View
          className="ml-2 min-w-[20px] items-center rounded-[7px] px-1.5 py-0.5"
          style={{ backgroundColor: selected ? "rgba(255,255,255,0.20)" : "#F3EEFF" }}
        >
          <Text className="text-[9px] font-black" style={{ color: selected ? "#FFFFFF" : "#7C3AED" }}>
            {count}
          </Text>
        </View>
      </Pressable>
    );
  }

  function MiniPill({ label }: { label: string }) {
    return (
      <View className="rounded-full bg-[#F7F5F8] px-2 py-1">
        <Text className="text-[9px] font-bold" style={{ color: theme.colors.foregroundMuted }}>
          {label}
        </Text>
      </View>
    );
  }

  function Meta({ label, value }: { label: string; value: string }) {
    return (
      <View className="min-w-[46%] flex-1 rounded-[13px] bg-white px-2.5 py-2.5">
        <Text
          className="text-[9px] font-black uppercase tracking-[0.4px]"
          style={{ color: theme.colors.foregroundSubtle }}
        >
          {label}
        </Text>
        <Text className="mt-1 text-[11px] font-bold" style={{ color: theme.colors.foreground }}>
          {value}
        </Text>
      </View>
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
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        className="min-h-[40px] min-w-[112px] flex-1 items-center justify-center rounded-[13px] border px-3"
        style={{
          backgroundColor: primary ? "#7C3AED" : "#FFFFFF",
          borderColor: primary ? "#7C3AED" : "#E7E2EB",
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <Text
          className="text-center text-[10px] font-black"
          style={{ color: primary ? "#FFFFFF" : theme.colors.foreground }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function Pagination({
    currentPage: activePage,
    totalPages: pageCount,
    totalItems,
    onChange,
  }: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onChange: (nextPage: number) => void;
  }) {
    const pages = buildPaginationItems(activePage, pageCount);

    return (
      <View
        className="rounded-[17px] border bg-white px-3 py-3"
        style={{ borderColor: "#E7E2EB" }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <Text
            className="text-[10px] font-bold"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {totalItems} alerte{totalItems > 1 ? "s" : ""}
          </Text>
          <View className="rounded-full bg-[#F3EEFF] px-2.5 py-1">
            <Text className="text-[9px] font-black text-[#7C3AED]">
              Page {activePage} / {pageCount}
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap items-center justify-center gap-1.5">
          <PaginationArrow
            previous
            disabled={activePage <= 1}
            onPress={() => onChange(activePage - 1)}
          />

          {pages.map((item, index) => {
            if (item === "ellipsis") {
              return (
                <View key={`ellipsis-${index}`} className="h-9 w-6 items-center justify-center">
                  <Text className="text-[13px] font-black" style={{ color: theme.colors.foregroundSubtle }}>
                    …
                  </Text>
                </View>
              );
            }

            const selected = item === activePage;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={`Page ${item}`}
                accessibilityState={{ selected }}
                onPress={() => onChange(item)}
                className="h-9 min-w-9 items-center justify-center rounded-[11px] border px-2"
                style={{
                  backgroundColor: selected ? "#7C3AED" : "#FFFFFF",
                  borderColor: selected ? "#7C3AED" : "#E7E2EB",
                }}
              >
                <Text
                  className="text-[10px] font-black"
                  style={{ color: selected ? "#FFFFFF" : theme.colors.foregroundMuted }}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}

          <PaginationArrow
            previous={false}
            disabled={activePage >= pageCount}
            onPress={() => onChange(activePage + 1)}
          />
        </View>
      </View>
    );
  }

  function PaginationArrow({
    previous,
    disabled,
    onPress,
  }: {
    previous: boolean;
    disabled: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={previous ? "Page précédente" : "Page suivante"}
        disabled={disabled}
        onPress={onPress}
        className="h-9 w-9 items-center justify-center rounded-[11px] border bg-white"
        style={{ borderColor: "#E7E2EB", opacity: disabled ? 0.35 : 1 }}
      >
        <SymbolView
          name={{
            ios: previous ? "chevron.left" : "chevron.right",
            android: previous ? "chevron_left" : "chevron_right",
            web: previous ? "chevron_left" : "chevron_right",
          }}
          tintColor="#7C3AED"
          size={14}
          weight="bold"
        />
      </Pressable>
    );
  }
}

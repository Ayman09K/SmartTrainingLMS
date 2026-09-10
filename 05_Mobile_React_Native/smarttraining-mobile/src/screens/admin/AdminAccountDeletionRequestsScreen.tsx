import { isAxiosError } from "axios";
import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import AdminUserManagementNav from "../../components/admin/AdminUserManagementNav";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  completeAdminAccountDeletionRequest,
  getAdminAccountDeletionRequests,
  rejectAdminAccountDeletionRequest,
  startAdminAccountDeletionRequest,
} from "../../features/admin/adminAccountDeletionService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
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

type SymbolName = ComponentProps<typeof SymbolView>["name"];
type PaginationItem = number | "ellipsis";

const PAGE_SIZE = 4;

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
  if (status === "COMPLETED") return "Terminées";
  if (status === "CANCELLED") return "Annulées";
  return "Refusées";
}

function statusTone(status: AccountDeletionRequestStatus) {
  if (status === "PENDING") {
    return {
      color: "#B45309",
      soft: "#FFF4E5",
      border: "#F3D19A",
    };
  }

  if (status === "IN_PROGRESS") {
    return {
      color: "#7C3AED",
      soft: "#F3EEFF",
      border: "#D7C4FF",
    };
  }

  if (status === "COMPLETED") {
    return {
      color: "#16845A",
      soft: "#EAFBF3",
      border: "#BFE8D3",
    };
  }

  if (status === "REJECTED") {
    return {
      color: "#B42318",
      soft: "#FFF0EE",
      border: "#F3C6C1",
    };
  }

  return {
    color: "#667085",
    soft: "#F2F4F7",
    border: "#DDE1E7",
  };
}

function filterIcon(value: StatusFilter): SymbolName {
  if (value === "PENDING") {
    return {
      ios: "clock.fill",
      android: "schedule",
      web: "schedule",
    };
  }

  if (value === "IN_PROGRESS") {
    return {
      ios: "arrow.triangle.2.circlepath",
      android: "autorenew",
      web: "autorenew",
    };
  }

  if (value === "COMPLETED") {
    return {
      ios: "checkmark.circle.fill",
      android: "check_circle",
      web: "check_circle",
    };
  }

  if (value === "CANCELLED") {
    return {
      ios: "minus.circle.fill",
      android: "remove_circle",
      web: "remove_circle",
    };
  }

  if (value === "REJECTED") {
    return {
      ios: "xmark.circle.fill",
      android: "cancel",
      web: "cancel",
    };
  }

  return {
    ios: "rectangle.stack.fill",
    android: "view_agenda",
    web: "view_agenda",
  };
}

function roleLabel(role: string): string {
  if (role === "ADMIN") return "Administrateur";
  if (role === "FORMATEUR") return "Formateur";
  if (role === "APPRENANT") return "Apprenant";
  return role;
}

function formatDate(value?: string | null): string {
  if (!value) return "Non renseignée";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function requesterPrimaryLabel(
  item: AdminAccountDeletionRequest,
): string {
  const name = item.requesterName?.trim();
  const email = item.email?.trim() || "";

  if (
    name &&
    name.toLocaleLowerCase("fr") !== email.toLocaleLowerCase("fr")
  ) {
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

  return hasDistinctName ? email || "" : `Utilisateur #${item.userId}`;
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
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

function buildStatusCounts(
  data: AdminAccountDeletionRequest[],
): Record<StatusFilter, number> {
  return {
    ALL: data.length,
    PENDING: data.filter((item) => item.status === "PENDING").length,
    IN_PROGRESS: data.filter((item) => item.status === "IN_PROGRESS").length,
    COMPLETED: data.filter((item) => item.status === "COMPLETED").length,
    CANCELLED: data.filter((item) => item.status === "CANCELLED").length,
    REJECTED: data.filter((item) => item.status === "REJECTED").length,
  };
}

function buildPagination(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 2) {
    return [1, 2, 3, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 1) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis", currentPage, "ellipsis", totalPages];
}

export default function AdminAccountDeletionRequestsScreen() {
  const { theme } = useSmartTrainingTheme();

  const scrollRef = useRef<ScrollView | null>(null);
  const searchTopRef = useRef(0);
  const listTopRef = useRef(0);
  const searchFocusedRef = useRef(false);

  const [items, setItems] = useState<AdminAccountDeletionRequest[]>([]);
  const [statusCounts, setStatusCounts] =
    useState<Record<StatusFilter, number> | null>(null);
  const [status, setStatus] = useState<StatusFilter>("PENDING");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [pendingDecision, setPendingDecision] =
    useState<PendingDecision | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [processingConfirmed, setProcessingConfirmed] = useState(false);

  const [error, setError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [success, setSuccess] = useState("");

  async function load(nextStatus = status) {
    const data = await getAdminAccountDeletionRequests(
      nextStatus === "ALL" ? undefined : nextStatus,
    );

    setItems(data);
  }

  async function loadStatusCounts() {
    const data = await getAdminAccountDeletionRequests();
    setStatusCounts(buildStatusCounts(data));
  }

  useEffect(() => {
    let active = true;

    void getAdminAccountDeletionRequests("PENDING")
      .then((data) => {
        if (!active) return;

        setItems(data);
        setError("");
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    void getAdminAccountDeletionRequests()
      .then((data) => {
        if (active) {
          setStatusCounts(buildStatusCounts(data));
        }
      })
      .catch(() => {
        if (active) {
          setStatusCounts(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);

      if (!searchFocusedRef.current) return;

      const y = Math.max(0, searchTopRef.current - 145);

      setTimeout(() => {
        scrollRef.current?.scrollTo({ y, animated: true });
      }, 70);

      setTimeout(() => {
        scrollRef.current?.scrollTo({ y, animated: true });
      }, 230);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
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
        roleLabel(item.role),
        statusLabel(item.status),
        item.handledByEmail || "",
        item.adminComment || "",
        String(item.id),
        String(item.userId),
      ]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(normalized),
    );
  }, [items, query]);

  const totalPages = Math.max(
    1,
    Math.ceil(visible.length / PAGE_SIZE),
  );

  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return visible.slice(start, start + PAGE_SIZE);
  }, [currentPage, visible]);

  const paginationItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages],
  );

  async function changeFilter(next: StatusFilter) {
    if (next === status || filtering) return;

    const previous = status;

    setStatus(next);
    setPage(1);
    setExpandedId(null);
    setFiltering(true);
    setError("");
    setSuccess("");

    try {
      await load(next);
    } catch (loadError: unknown) {
      setStatus(previous);
      setError(errorMessage(loadError));
    } finally {
      setFiltering(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    setError("");

    try {
      await Promise.all([load(), loadStatusCounts()]);
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
      await Promise.all([load(), loadStatusCounts()]);
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
    Keyboard.dismiss();
    setPendingDecision({ kind, request });
    setAdminComment("");
    setProcessingConfirmed(false);
    setDialogError("");
    setError("");
    setSuccess("");
  }

  async function confirmDecision() {
    if (!pendingDecision || workingId !== null) return;

    const comment = adminComment.trim();

    if (!comment) {
      setDialogError("Le commentaire administrateur est obligatoire.");
      return;
    }

    if (
      pendingDecision.kind === "COMPLETE" &&
      !processingConfirmed
    ) {
      setDialogError(
        "Confirmez le traitement réel des données avant de clôturer.",
      );
      return;
    }

    setWorkingId(pendingDecision.request.id);
    setDialogError("");

    try {
      if (pendingDecision.kind === "REJECT") {
        await rejectAdminAccountDeletionRequest(
          pendingDecision.request.id,
          comment,
        );

        setSuccess(
          "La demande a été refusée avec une justification traçable.",
        );
      } else {
        await completeAdminAccountDeletionRequest(
          pendingDecision.request.id,
          comment,
        );

        setSuccess(
          "Le traitement administratif a été marqué comme terminé.",
        );
      }

      setPendingDecision(null);
      setAdminComment("");
      setProcessingConfirmed(false);
      setExpandedId(null);

      await Promise.all([load(), loadStatusCounts()]);
    } catch (actionError: unknown) {
      setDialogError(errorMessage(actionError));
    } finally {
      setWorkingId(null);
    }
  }

  function updateQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  function changePage(nextPage: number) {
    const normalized = Math.min(Math.max(nextPage, 1), totalPages);

    if (normalized === currentPage) return;

    setPage(normalized);
    setExpandedId(null);

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, listTopRef.current - 12),
        animated: true,
      });
    });
  }

  if (loading) {
    return (
      <LoadingState message="Chargement des demandes de suppression..." />
    );
  }

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{ padding: 0, backgroundColor: "#F8F6F3" }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            paddingBottom:
              Platform.OS === "android" && keyboardHeight > 0
                ? keyboardHeight + 24
                : 18,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
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
            {/* HERO */}
            <View
              className="mb-3 mt-4 overflow-hidden rounded-[24px] border bg-white"
              style={{
                borderColor: "#E5DFE8",
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <View className="h-1.5 w-full bg-[#B42318]" />

              <View className="relative overflow-hidden px-4 py-4">
                <View
                  pointerEvents="none"
                  className="absolute -right-8 -top-12 h-[132px] w-[132px] rounded-full bg-[#FFF0EE]"
                />
                <View
                  pointerEvents="none"
                  className="absolute right-9 top-12 h-12 w-12 rounded-[16px] bg-[#F3EEFF]"
                />

                <View className="flex-row items-start">
                  <View className="h-[52px] w-[52px] items-center justify-center rounded-[17px] bg-[#FFF0EE]">
                    <SymbolView
                      name={{
                        ios: "trash.fill",
                        android: "delete",
                        web: "delete",
                      }}
                      tintColor="#B42318"
                      size={21}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1 pr-4">
                    <View className="self-start rounded-full bg-[#FFF0EE] px-2.5 py-1">
                      <Text className="text-[10px] font-black uppercase tracking-[0.7px] text-[#B42318]">
                        Gestion des comptes
                      </Text>
                    </View>

                    <Text
                      accessibilityRole="header"
                      className="mt-2 text-[25px] font-black leading-[29px] tracking-[-0.6px]"
                      style={{ color: theme.colors.foreground }}
                    >
                      Suppressions de compte
                    </Text>

                    <Text
                      className="mt-1.5 max-w-[520px] text-[13px] leading-[18px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Traitez les demandes avec une trace claire de chaque
                      décision administrative.
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row flex-wrap gap-2">
                  <View className="flex-row items-center rounded-full bg-[#FFF7E8] px-2.5 py-1.5">
                    <SymbolView
                      name={{
                        ios: "lock.shield.fill",
                        android: "security",
                        web: "security",
                      }}
                      tintColor="#B45309"
                      size={10}
                      weight="bold"
                    />
                    <Text className="ml-1.5 text-[10px] font-bold text-[#B45309]">
                      Action sensible
                    </Text>
                  </View>

                  <View className="flex-row items-center rounded-full bg-[#EFFAF7] px-2.5 py-1.5">
                    <SymbolView
                      name={{
                        ios: "checkmark.shield.fill",
                        android: "verified_user",
                        web: "verified_user",
                      }}
                      tintColor="#16845A"
                      size={10}
                      weight="bold"
                    />
                    <Text className="ml-1.5 text-[10px] font-bold text-[#16845A]">
                      Traçabilité requise
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <AdminUserManagementNav active="account-deletion" />

            {error ? (
              <View className="mb-3">
                <ErrorMessage message={error} />
              </View>
            ) : null}

            {success ? (
              <View
                className="mb-3 flex-row items-center rounded-[16px] border px-3 py-2.5"
                style={{
                  backgroundColor: "#EAFBF3",
                  borderColor: "#BFE8D3",
                }}
              >
                <SymbolView
                  name={{
                    ios: "checkmark.circle.fill",
                    android: "check_circle",
                    web: "check_circle",
                  }}
                  tintColor="#16845A"
                  size={15}
                  weight="bold"
                />
                <Text className="ml-2 flex-1 text-[11px] font-bold text-[#16845A]">
                  {success}
                </Text>
              </View>
            ) : null}

            {/* RECHERCHE */}
            <View
              onLayout={(event) => {
                searchTopRef.current = event.nativeEvent.layout.y;
              }}
              className="mb-3 flex-row items-center rounded-[16px] border bg-white px-3"
              style={{ borderColor: "#E5DFE8" }}
            >
              <SymbolView
                name={{
                  ios: "magnifyingglass",
                  android: "search",
                  web: "search",
                }}
                tintColor={theme.colors.foregroundSubtle}
                size={17}
              />

              <TextInput
                accessibilityLabel="Rechercher une demande de suppression"
                value={query}
                onChangeText={updateQuery}
                onFocus={() => {
                  searchFocusedRef.current = true;

                  setTimeout(() => {
                    scrollRef.current?.scrollTo({
                      y: Math.max(0, searchTopRef.current - 145),
                      animated: true,
                    });
                  }, 50);
                }}
                onBlur={() => {
                  searchFocusedRef.current = false;
                }}
                placeholder="Nom, e-mail, rôle ou identifiant..."
                placeholderTextColor={theme.colors.foregroundSubtle}
                className="ml-2 min-h-[48px] flex-1 text-[13px]"
                style={{ color: theme.colors.foreground }}
              />

              {query.trim() ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Effacer la recherche"
                  onPress={() => updateQuery("")}
                  android_ripple={{ color: "transparent" }}
                  className="h-8 w-8 items-center justify-center rounded-full"
                >
                  <SymbolView
                    name={{
                      ios: "xmark.circle.fill",
                      android: "cancel",
                      web: "cancel",
                    }}
                    tintColor={theme.colors.foregroundSubtle}
                    size={15}
                  />
                </Pressable>
              ) : null}
            </View>

            {/* FILTRE STYLE FORMATEUR */}
            <View className="mb-4">
              <View className="mb-2 flex-row items-end">
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[11px] font-black"
                    style={{ color: theme.colors.foreground }}
                  >
                    Statut
                  </Text>
                  <Text
                    className="mt-0.5 text-[8px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Filtrer les demandes de suppression
                  </Text>
                </View>

                {status !== "ALL" ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Réinitialiser le filtre"
                    disabled={filtering}
                    onPress={() => void changeFilter("ALL")}
                    android_ripple={{ color: "transparent" }}
                    className="rounded-full px-2.5 py-1.5"
                    style={{
                      backgroundColor: "#F3EEFF",
                      opacity: filtering ? 0.55 : 1,
                    }}
                  >
                    <Text
                      className="text-[8px] font-black"
                      style={{ color: theme.colors.accent }}
                    >
                      Réinitialiser
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingRight: 4 }}
              >
                {FILTERS.map((value) => {
                  const selected = status === value;

                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: filtering }}
                      accessibilityLabel={`Filtrer par ${statusLabel(value)}`}
                      disabled={filtering}
                      onPress={() => void changeFilter(value)}
                      android_ripple={{ color: "transparent" }}
                      className="h-[42px] flex-row items-center rounded-[12px] border px-2.5"
                      style={{
                        backgroundColor: selected
                          ? theme.colors.accent
                          : theme.colors.surface,
                        borderColor: selected
                          ? theme.colors.accent
                          : theme.colors.border,
                        shadowColor: "#0F172A",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: selected ? 0.06 : 0.025,
                        shadowRadius: 3,
                        elevation: selected ? 1 : 0,
                        opacity: filtering && !selected ? 0.55 : 1,
                      }}
                    >
                      <SymbolView
                        name={filterIcon(value)}
                        tintColor={
                          selected
                            ? theme.colors.accentForeground
                            : theme.colors.foregroundSubtle
                        }
                        size={12}
                        weight="bold"
                      />
                      <Text
                        className="ml-1.5 text-[10px] font-black"
                        style={{
                          color: selected
                            ? theme.colors.accentForeground
                            : theme.colors.foregroundMuted,
                        }}
                      >
                        {statusLabel(value)}
                      </Text>

                      <View
                        className="ml-2 min-w-[24px] items-center justify-center rounded-full px-1.5 py-1"
                        style={{
                          backgroundColor: selected
                            ? "rgba(255,255,255,0.18)"
                            : "#F3EEFF",
                        }}
                      >
                        <Text
                          className="text-[8px] font-black"
                          style={{
                            color: selected
                              ? theme.colors.accentForeground
                              : theme.colors.accent,
                          }}
                        >
                          {statusCounts ? statusCounts[value] : "—"}
                        </Text>
                      </View>

                      {selected && filtering ? (
                        <Text
                          className="ml-1 text-[8px] font-bold"
                          style={{
                            color: theme.colors.accentForeground,
                          }}
                        >
                          …
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* LISTE */}
            <View
              onLayout={(event) => {
                listTopRef.current = event.nativeEvent.layout.y;
              }}
            >
              <View
                className="mb-3 overflow-hidden rounded-[20px] border bg-white"
                style={{
                  borderColor: "#E5DFE8",
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.035,
                  shadowRadius: 7,
                  elevation: 1,
                }}
              >
                <View className="h-1 bg-[#B42318]" />

                <View className="flex-row items-center px-3.5 py-3.5">
                  <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-[#FFF0EE]">
                    <SymbolView
                      name={{
                        ios: "doc.text.magnifyingglass",
                        android: "fact_check",
                        web: "fact_check",
                      }}
                      tintColor="#B42318"
                      size={17}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1">
                    <Text className="text-[10px] font-black uppercase tracking-[0.65px] text-[#B42318]">
                      Traitement administratif
                    </Text>
                    <Text
                      className="mt-0.5 text-[19px] font-black tracking-[-0.3px]"
                      style={{ color: theme.colors.foreground }}
                    >
                      Demandes de suppression
                    </Text>
                    <Text
                      className="mt-1 text-[12px] leading-[16px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Vue actuelle · {statusLabel(status)}
                    </Text>
                  </View>

                  <View className="ml-2 rounded-full bg-[#FFF0EE] px-2.5 py-1">
                    <Text className="text-[11px] font-black text-[#B42318]">
                      {visible.length}
                    </Text>
                  </View>
                </View>
              </View>

              {visible.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <View className="gap-3">
                    {pageItems.map((item) => (
                      <DeletionCard key={item.id} item={item} />
                    ))}
                  </View>

                  <Pagination />
                </>
              )}
            </View>


          </View>
        </ScrollView>

        {/* MODAL DECISION */}
        <Modal
          transparent
          animationType="fade"
          visible={pendingDecision !== null}
          onRequestClose={() => {
            if (workingId === null) {
              setPendingDecision(null);
              setDialogError("");
            }
          }}
        >
          <View className="flex-1 bg-black/50">
            <KeyboardAvoidingView
              className="flex-1"
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={16}
            >
              <ScrollView
                className="flex-1"
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 24,
                }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={
                  Platform.OS === "ios" ? "interactive" : "on-drag"
                }
                showsVerticalScrollIndicator={false}
              >
                {pendingDecision ? (
                  <View
                    className="mx-auto w-full max-w-[520px] overflow-hidden rounded-[24px] border bg-white"
                    style={{
                      borderColor: "#E5DFE8",
                      shadowColor: "#0F172A",
                      shadowOffset: { width: 0, height: 5 },
                      shadowOpacity: 0.14,
                      shadowRadius: 16,
                      elevation: 8,
                    }}
                  >
                    <View
                      className="h-1.5 w-full"
                      style={{
                        backgroundColor:
                          pendingDecision.kind === "COMPLETE"
                            ? "#16845A"
                            : "#B42318",
                      }}
                    />

                    <View className="p-4">
                      <View className="flex-row items-start">
                        <View
                          className="h-11 w-11 items-center justify-center rounded-[14px]"
                          style={{
                            backgroundColor:
                              pendingDecision.kind === "COMPLETE"
                                ? "#EAFBF3"
                                : "#FFF0EE",
                          }}
                        >
                          <SymbolView
                            name={{
                              ios:
                                pendingDecision.kind === "COMPLETE"
                                  ? "checkmark.shield.fill"
                                  : "xmark.circle.fill",
                              android:
                                pendingDecision.kind === "COMPLETE"
                                  ? "verified_user"
                                  : "cancel",
                              web:
                                pendingDecision.kind === "COMPLETE"
                                  ? "verified_user"
                                  : "cancel",
                            }}
                            tintColor={
                              pendingDecision.kind === "COMPLETE"
                                ? "#16845A"
                                : "#B42318"
                            }
                            size={20}
                            weight="bold"
                          />
                        </View>

                        <View className="ml-3 min-w-0 flex-1">
                          <Text
                            className="text-[19px] font-black leading-[23px]"
                            style={{ color: theme.colors.foreground }}
                          >
                            {pendingDecision.kind === "COMPLETE"
                              ? "Confirmer la fin du traitement"
                              : "Refuser la demande"}
                          </Text>

                          <Text
                            className="mt-1 text-[12px] leading-[17px]"
                            style={{ color: theme.colors.foregroundMuted }}
                          >
                            {pendingDecision.kind === "COMPLETE"
                              ? "Cette action clôture le traitement administratif."
                              : "Le refus doit être accompagné d’une justification."}
                          </Text>
                        </View>
                      </View>

                      <View
                        className="mt-4 flex-row items-center rounded-[16px] border px-3 py-2.5"
                        style={{
                          backgroundColor: "#FCFBFD",
                          borderColor: "#EEE9F0",
                        }}
                      >
                        <View className="h-9 w-9 items-center justify-center rounded-full bg-[#F1E9FF]">
                          <Text className="text-[11px] font-black text-[#7C3AED]">
                            {initials(
                              requesterPrimaryLabel(
                                pendingDecision.request,
                              ),
                            )}
                          </Text>
                        </View>

                        <View className="ml-2.5 min-w-0 flex-1">
                          <Text
                            numberOfLines={1}
                            className="text-[12px] font-black"
                            style={{ color: theme.colors.foreground }}
                          >
                            {requesterPrimaryLabel(
                              pendingDecision.request,
                            )}
                          </Text>
                          <Text
                            numberOfLines={1}
                            className="mt-0.5 text-[10px]"
                            style={{ color: theme.colors.foregroundMuted }}
                          >
                            {pendingDecision.request.email}
                          </Text>
                        </View>
                      </View>

                      {dialogError ? (
                        <View
                          className="mt-3 rounded-[14px] border px-3 py-2.5"
                          style={{
                            backgroundColor: "#FFF0EE",
                            borderColor: "#F3C6C1",
                          }}
                        >
                          <Text className="text-[10px] font-bold leading-[15px] text-[#B42318]">
                            {dialogError}
                          </Text>
                        </View>
                      ) : null}

                      <Text
                        className="mb-2 mt-4 text-[10px] font-black uppercase tracking-[0.6px]"
                        style={{ color: theme.colors.foregroundSubtle }}
                      >
                        Commentaire administrateur · obligatoire
                      </Text>

                      <TextInput
                        value={adminComment}
                        onChangeText={(value) => {
                          setAdminComment(value);
                          setDialogError("");
                        }}
                        placeholder="Décrivez la décision ou le traitement réalisé..."
                        placeholderTextColor={theme.colors.foregroundSubtle}
                        multiline
                        maxLength={1000}
                        textAlignVertical="top"
                        className="min-h-[112px] rounded-[16px] border bg-[#FCFBFD] px-3 py-3 text-[13px] leading-[18px]"
                        style={{
                          color: theme.colors.foreground,
                          borderColor: "#E5DFE8",
                        }}
                      />

                      <Text
                        className="mt-1.5 text-right text-[10px]"
                        style={{ color: theme.colors.foregroundSubtle }}
                      >
                        {adminComment.length}/1000
                      </Text>

                      {pendingDecision.kind === "COMPLETE" ? (
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityState={{
                            checked: processingConfirmed,
                          }}
                          onPress={() => {
                            setProcessingConfirmed((current) => !current);
                            setDialogError("");
                          }}
                          android_ripple={{ color: "transparent" }}
                          className="mt-3 flex-row items-start rounded-[16px] border px-3 py-3"
                          style={{
                            backgroundColor: processingConfirmed
                              ? "#EAFBF3"
                              : "#FCFBFD",
                            borderColor: processingConfirmed
                              ? "#BFE8D3"
                              : "#E5DFE8",
                          }}
                        >
                          <View
                            className="h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border"
                            style={{
                              borderColor: processingConfirmed
                                ? "#16845A"
                                : "#C9C2CD",
                              backgroundColor: processingConfirmed
                                ? "#16845A"
                                : "#FFFFFF",
                            }}
                          >
                            {processingConfirmed ? (
                              <SymbolView
                                name={{
                                  ios: "checkmark",
                                  android: "check",
                                  web: "check",
                                }}
                                tintColor="#FFFFFF"
                                size={12}
                                weight="bold"
                              />
                            ) : null}
                          </View>

                          <Text
                            className="ml-2.5 flex-1 text-[10px] leading-[15px]"
                            style={{ color: theme.colors.foreground }}
                          >
                            Je confirme avoir appliqué la procédure réelle de
                            traitement des données et des historiques associés.
                          </Text>
                        </Pressable>
                      ) : null}

                      <View className="mt-4 flex-row gap-2">
                        <Pressable
                          accessibilityRole="button"
                          disabled={workingId !== null}
                          onPress={() => {
                            setPendingDecision(null);
                            setAdminComment("");
                            setProcessingConfirmed(false);
                            setDialogError("");
                          }}
                          android_ripple={{ color: "transparent" }}
                          className="min-h-[46px] flex-1 items-center justify-center rounded-[14px] border bg-white px-3"
                          style={{
                            borderColor: "#E5DFE8",
                            opacity: workingId !== null ? 0.55 : 1,
                          }}
                        >
                          <Text
                            className="text-[12px] font-black"
                            style={{ color: theme.colors.foreground }}
                          >
                            Annuler
                          </Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          disabled={
                            workingId !== null ||
                            !adminComment.trim() ||
                            (pendingDecision.kind === "COMPLETE" &&
                              !processingConfirmed)
                          }
                          onPress={() => void confirmDecision()}
                          android_ripple={{ color: "transparent" }}
                          className="min-h-[46px] flex-[1.25] items-center justify-center rounded-[14px] px-3"
                          style={{
                            backgroundColor:
                              pendingDecision.kind === "COMPLETE"
                                ? "#16845A"
                                : "#B42318",
                            opacity:
                              workingId !== null ||
                              !adminComment.trim() ||
                              (pendingDecision.kind === "COMPLETE" &&
                                !processingConfirmed)
                                ? 0.5
                                : 1,
                          }}
                        >
                          <Text className="text-[11px] font-black text-white">
                            {workingId !== null
                              ? "Traitement..."
                              : pendingDecision.kind === "COMPLETE"
                                ? "Confirmer le traitement"
                                : "Confirmer le refus"}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ) : null}
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );

  function DeletionCard({
    item,
  }: {
    item: AdminAccountDeletionRequest;
  }) {
    const tone = statusTone(item.status);
    const expanded = expandedId === item.id;
    const busy = workingId === item.id;

    return (
      <View
        className="overflow-hidden rounded-[21px] border bg-white"
        style={{
          borderColor: "#E5DFE8",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.035,
          shadowRadius: 7,
          elevation: 1,
        }}
      >
        <View className="h-1 w-full" style={{ backgroundColor: tone.color }} />

        <View className="p-3.5">
          <View className="flex-row items-start">
            <View className="h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F1E9FF]">
              <Text className="text-[12px] font-black text-[#7C3AED]">
                {initials(requesterPrimaryLabel(item))}
              </Text>
            </View>

            <View className="ml-2.5 min-w-0 flex-1">
              <Text
                numberOfLines={1}
                className="text-[14px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                {requesterPrimaryLabel(item)}
              </Text>

              <Text
                numberOfLines={1}
                className="mt-0.5 text-[10px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                {requesterSecondaryLabel(item)}
              </Text>

              <View className="mt-1.5 flex-row items-center">
                <View className="rounded-full bg-[#F8F5FA] px-2 py-1">
                  <Text
                    className="text-[9px] font-bold"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    {roleLabel(item.role)}
                  </Text>
                </View>
                <Text
                  className="ml-2 text-[9px]"
                  style={{ color: theme.colors.foregroundSubtle }}
                >
                  User #{item.userId}
                </Text>
              </View>
            </View>

            <View
              className="ml-2 rounded-full border px-2 py-1"
              style={{
                backgroundColor: tone.soft,
                borderColor: tone.border,
              }}
            >
              <Text
                className="text-[9px] font-black"
                style={{ color: tone.color }}
              >
                {statusLabel(item.status)}
              </Text>
            </View>
          </View>

          <View
            className="mt-3 flex-row items-center rounded-[14px] px-2.5 py-2"
            style={{ backgroundColor: "#FCFBFD" }}
          >
            <SymbolView
              name={{
                ios: "calendar",
                android: "calendar_today",
                web: "calendar_today",
              }}
              tintColor={theme.colors.foregroundSubtle}
              size={11}
            />
            <Text
              className="ml-1.5 min-w-0 flex-1 text-[9px]"
              style={{ color: theme.colors.foregroundMuted }}
            >
              Demandée le {formatDate(item.requestedAt)}
            </Text>
            <Text
              className="text-[9px] font-bold"
              style={{ color: theme.colors.foregroundSubtle }}
            >
              #{item.id}
            </Text>
          </View>

          {item.processingStartedAt || item.adminComment ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setExpandedId(expanded ? null : item.id)}
              android_ripple={{ color: "transparent" }}
              className="mt-2.5 flex-row items-center justify-between rounded-[14px] border px-3 py-2.5"
              style={{
                borderColor: "#EEE9F0",
                backgroundColor: expanded ? "#F8F5FA" : "#FFFFFF",
              }}
            >
              <View className="flex-row items-center">
                <SymbolView
                  name={{
                    ios: "doc.text.fill",
                    android: "description",
                    web: "description",
                  }}
                  tintColor="#7C3AED"
                  size={12}
                  weight="bold"
                />

                <Text
                  className="ml-2 text-[11px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  {expanded ? "Masquer le suivi" : "Voir le suivi"}
                </Text>
              </View>

              <SymbolView
                name={{
                  ios: expanded ? "chevron.up" : "chevron.down",
                  android: expanded ? "expand_less" : "expand_more",
                  web: expanded ? "expand_less" : "expand_more",
                }}
                tintColor="#7C3AED"
                size={14}
                weight="bold"
              />
            </Pressable>
          ) : null}

          {expanded ? (
            <View className="mt-2.5 gap-2">
              {item.processingStartedAt ? (
                <DetailBlock
                  icon={{
                    ios: "clock.arrow.circlepath",
                    android: "schedule",
                    web: "schedule",
                  }}
                  label="Prise en charge"
                  value={`${formatDate(item.processingStartedAt)}${
                    item.handledByEmail
                      ? ` · ${item.handledByEmail}`
                      : ""
                  }`}
                />
              ) : null}

              {item.adminComment ? (
                <DetailBlock
                  icon={{
                    ios: "text.bubble.fill",
                    android: "comment",
                    web: "comment",
                  }}
                  label="Commentaire administratif"
                  value={item.adminComment}
                />
              ) : null}

              {item.processedAt ? (
                <DetailBlock
                  icon={{
                    ios: "checkmark.seal.fill",
                    android: "verified",
                    web: "verified",
                  }}
                  label="Traitée le"
                  value={formatDate(item.processedAt)}
                />
              ) : null}
            </View>
          ) : null}

          {item.status === "PENDING" ? (
            <Pressable
              accessibilityRole="button"
              disabled={workingId !== null}
              onPress={() => void startProcessing(item.id)}
              android_ripple={{ color: "transparent" }}
              className="mt-3 min-h-[43px] flex-row items-center justify-center rounded-[14px] bg-[#7C3AED] px-3"
              style={{ opacity: workingId !== null ? 0.55 : 1 }}
            >
              <SymbolView
                name={{
                  ios: "hand.raised.fill",
                  android: "front_hand",
                  web: "front_hand",
                }}
                tintColor="#FFFFFF"
                size={12}
                weight="bold"
              />
              <Text className="ml-1.5 text-[11px] font-black text-white">
                {busy ? "Prise en charge..." : "Prendre en charge"}
              </Text>
            </Pressable>
          ) : item.status === "IN_PROGRESS" ? (
            <View className="mt-3 flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                disabled={workingId !== null}
                onPress={() => openDecision("REJECT", item)}
                android_ripple={{ color: "transparent" }}
                className="min-h-[43px] flex-1 flex-row items-center justify-center rounded-[14px] border bg-white px-2"
                style={{
                  borderColor: "#F0C7C2",
                  opacity: workingId !== null ? 0.55 : 1,
                }}
              >
                <SymbolView
                  name={{
                    ios: "xmark",
                    android: "close",
                    web: "close",
                  }}
                  tintColor="#B42318"
                  size={11}
                  weight="bold"
                />
                <Text className="ml-1.5 text-[10px] font-black text-[#B42318]">
                  Refuser
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={workingId !== null}
                onPress={() => openDecision("COMPLETE", item)}
                android_ripple={{ color: "transparent" }}
                className="min-h-[43px] flex-[1.25] flex-row items-center justify-center rounded-[14px] bg-[#16845A] px-2"
                style={{ opacity: workingId !== null ? 0.55 : 1 }}
              >
                <SymbolView
                  name={{
                    ios: "checkmark",
                    android: "check",
                    web: "check",
                  }}
                  tintColor="#FFFFFF"
                  size={11}
                  weight="bold"
                />
                <Text className="ml-1.5 text-[10px] font-black text-white">
                  Traitement terminé
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  function DetailBlock({
    icon,
    label,
    value,
  }: {
    icon: SymbolName;
    label: string;
    value: string;
  }) {
    return (
      <View
        className="rounded-[15px] border px-3 py-2.5"
        style={{
          backgroundColor: "#FCFBFD",
          borderColor: "#EEE9F0",
        }}
      >
        <View className="flex-row items-center">
          <SymbolView
            name={icon}
            tintColor="#7C3AED"
            size={11}
            weight="bold"
          />
          <Text
            className="ml-1.5 text-[9px] font-black uppercase tracking-[0.55px]"
            style={{ color: theme.colors.foregroundSubtle }}
          >
            {label}
          </Text>
        </View>

        <Text
          className="mt-1.5 text-[11px] leading-[16px]"
          style={{ color: theme.colors.foreground }}
        >
          {value}
        </Text>
      </View>
    );
  }

  function EmptyState() {
    return (
      <View
        className="items-center rounded-[22px] border bg-white px-5 py-8"
        style={{ borderColor: "#E5DFE8" }}
      >
        <View className="h-[58px] w-[58px] items-center justify-center rounded-full bg-[#FFF0EE]">
          <SymbolView
            name={{
              ios: "tray.fill",
              android: "inbox",
              web: "inbox",
            }}
            tintColor="#B42318"
            size={23}
            weight="bold"
          />
        </View>

        <Text
          className="mt-4 text-[16px] font-black"
          style={{ color: theme.colors.foreground }}
        >
          Aucune demande
        </Text>

        <Text
          className="mt-1.5 text-center text-[12px] leading-[16px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          Aucun élément ne correspond au statut et à la recherche actuels.
        </Text>
      </View>
    );
  }

  function Pagination() {
    return (
      <View
        className="mt-4 rounded-[22px] border bg-white px-3 py-3"
        style={{ borderColor: theme.colors.border }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <Text
            className="text-[13px] font-bold"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {visible.length} demande{visible.length > 1 ? "s" : ""}
          </Text>

          <View className="rounded-full bg-[#F3EEFF] px-2.5 py-1">
            <Text className="text-[12px] font-black text-[#7C3AED]">
              Page {currentPage} / {totalPages}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-center gap-1.5">
          <PaginationArrow
            direction="previous"
            disabled={currentPage === 1}
            onPress={() => changePage(currentPage - 1)}
          />

          {paginationItems.map((item, index) => {
            if (item === "ellipsis") {
              return (
                <View
                  key={`ellipsis-${index}`}
                  className="h-9 w-6 items-center justify-center"
                >
                  <Text
                    className="text-[15px] font-bold"
                    style={{ color: theme.colors.foregroundSubtle }}
                  >
                    …
                  </Text>
                </View>
              );
            }

            const active = item === currentPage;

            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={`Page ${item}`}
                accessibilityState={{ selected: active }}
                onPress={() => changePage(item)}
                android_ripple={{ color: "transparent" }}
                className="h-9 w-9 items-center justify-center rounded-xl border"
                style={{
                  backgroundColor: active
                    ? theme.colors.accent
                    : theme.colors.surface,
                  borderColor: active
                    ? theme.colors.accent
                    : theme.colors.border,
                }}
              >
                <Text
                  className="text-[13px] font-black"
                  style={{
                    color: active
                      ? theme.colors.accentForeground
                      : theme.colors.foregroundMuted,
                  }}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}

          <PaginationArrow
            direction="next"
            disabled={currentPage === totalPages}
            onPress={() => changePage(currentPage + 1)}
          />
        </View>
      </View>
    );
  }

  function PaginationArrow({
    direction,
    disabled,
    onPress,
  }: {
    direction: "previous" | "next";
    disabled: boolean;
    onPress: () => void;
  }) {
    const previous = direction === "previous";

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={previous ? "Page précédente" : "Page suivante"}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="h-9 w-9 items-center justify-center rounded-xl border"
        style={{
          backgroundColor: disabled ? "#F8F6F3" : theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <SymbolView
          name={{
            ios: previous ? "chevron.left" : "chevron.right",
            android: previous ? "chevron_left" : "chevron_right",
            web: previous ? "chevron_left" : "chevron_right",
          }}
          tintColor={
            disabled
              ? theme.colors.foregroundSubtle
              : theme.colors.accent
          }
          size={14}
          weight="bold"
        />
      </Pressable>
    );
  }
}

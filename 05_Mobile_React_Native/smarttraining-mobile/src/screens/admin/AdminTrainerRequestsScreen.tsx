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
  approveAdminTrainerRequest,
  getAdminTrainerRequests,
  rejectAdminTrainerRequest,
} from "../../features/admin/adminTrainerRequestService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type { AdminTrainerRequestSummary } from "../../types/admin";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

type PendingDecision = {
  kind: "approve" | "reject";
  request: AdminTrainerRequestSummary;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];
type PaginationItem = number | "ellipsis";

const PAGE_SIZE = 4;

function statusLabel(status: string): string {
  if (status === "PENDING") return "En attente";
  if (status === "APPROVED") return "Approuvée";
  if (status === "REJECTED") return "Rejetée";
  if (status === "CANCELLED") return "Annulée";
  return status;
}

function statusTone(status: string) {
  if (status === "PENDING") {
    return {
      color: "#B45309",
      soft: "#FFF7E8",
      border: "#F3D19A",
    };
  }

  if (status === "APPROVED") {
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

  if (value === "APPROVED") {
    return {
      ios: "checkmark.circle.fill",
      android: "check_circle",
      web: "check_circle",
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

function requesterLabel(item: AdminTrainerRequestSummary): string {
  return (
    item.requesterFullName?.trim() ||
    item.requesterEmail?.trim() ||
    "Demandeur"
  );
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "DF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function formatDate(value?: string | null): string {
  if (!value) return "Non renseignée";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
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

export default function AdminTrainerRequestsScreen() {
  const { theme } = useSmartTrainingTheme();

  const scrollRef = useRef<ScrollView | null>(null);
  const listTopRef = useRef(0);
  const searchTopRef = useRef(0);
  const searchFocusedRef = useRef(false);

  const [items, setItems] = useState<AdminTrainerRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("PENDING");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
        if (!active) return;

        setItems(data);
        setError("");
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger les demandes formateur.");
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
      }, 240);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError("Impossible d’actualiser les demandes formateur.");
    } finally {
      setRefreshing(false);
    }
  }

  const counts = useMemo(
    () => ({
      pending: items.filter((item) => item.status === "PENDING").length,
      approved: items.filter((item) => item.status === "APPROVED").length,
      rejected: items.filter((item) => item.status === "REJECTED").length,
    }),
    [items],
  );

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");

    return items.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }

      if (!normalized) return true;

      return [
        requesterLabel(item),
        item.requesterEmail || "",
        item.expertiseDomain || "",
        item.experienceSummary || "",
        item.motivation || "",
        item.adminComment || "",
        statusLabel(item.status),
      ]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(normalized);
    });
  }, [items, query, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / PAGE_SIZE),
  );

  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredItems]);

  const paginationItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages],
  );

  function updateQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  function changeFilter(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
    setExpandedId(null);
  }

  function changePage(nextPage: number) {
    const normalizedPage = Math.min(Math.max(nextPage, 1), totalPages);

    if (normalizedPage === currentPage) return;

    setPage(normalizedPage);
    setExpandedId(null);

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, listTopRef.current - 12),
        animated: true,
      });
    });
  }

  function openDecision(
    kind: PendingDecision["kind"],
    request: AdminTrainerRequestSummary,
  ) {
    if (request.status !== "PENDING") {
      setError("Seules les demandes en attente peuvent être traitées.");
      return;
    }

    Keyboard.dismiss();
    setError("");
    setNotice("");
    setAdminComment("");
    setPendingDecision({ kind, request });
  }

  async function confirmDecision() {
    if (!pendingDecision || working) return;

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
        current.map((item) => (item.id === updated.id ? updated : item)),
      );

      setNotice(
        pendingDecision.kind === "approve"
          ? `La demande de ${requesterLabel(updated)} a été approuvée.`
          : `La demande de ${requesterLabel(updated)} a été rejetée.`,
      );

      setPendingDecision(null);
      setAdminComment("");
      setExpandedId(null);
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
                : 16,
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
              <View className="h-1.5 w-full bg-[#7C3AED]" />

              <View className="relative overflow-hidden px-4 py-4">
                <View
                  pointerEvents="none"
                  className="absolute -right-8 -top-12 h-[132px] w-[132px] rounded-full bg-[#F3EEFF]"
                />

                <View
                  pointerEvents="none"
                  className="absolute right-10 top-10 h-12 w-12 rounded-[16px] bg-[#EAFBF3]"
                />

                <View className="flex-row items-start">
                  <View className="h-[52px] w-[52px] items-center justify-center rounded-[17px] bg-[#F1E9FF]">
                    <SymbolView
                      name={{
                        ios: "person.badge.plus",
                        android: "badge",
                        web: "badge",
                      }}
                      tintColor="#7C3AED"
                      size={22}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1 pr-4">
                    <View className="self-start rounded-full bg-[#F3EEFF] px-2.5 py-1">
                      <Text className="text-[10px] font-black uppercase tracking-[0.7px] text-[#7C3AED]">
                        Gestion des accès
                      </Text>
                    </View>

                    <Text
                      accessibilityRole="header"
                      className="mt-2 text-[26px] font-black leading-[30px] tracking-[-0.6px]"
                      style={{ color: theme.colors.foreground }}
                    >
                      Demandes formateur
                    </Text>

                    <Text
                      className="mt-1.5 max-w-[520px] text-[13px] leading-[18px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Examinez les candidatures et prenez une décision claire
                      pour chaque demande de rôle formateur.
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row flex-wrap gap-2">
                  <View className="flex-row items-center rounded-full bg-[#F8F5FA] px-2.5 py-1.5">
                    <View className="h-2 w-2 rounded-full bg-[#7C3AED]" />
                    <Text
                      className="ml-1.5 text-[10px] font-bold"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Validation administrateur
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
                      Décision tracée
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* NAV EXISTANTE */}
            <AdminUserManagementNav active="trainer-requests" />

            {/* KPI */}
            <View className="mb-3 flex-row gap-2">
              <SummaryCard
                icon={{
                  ios: "clock.fill",
                  android: "schedule",
                  web: "schedule",
                }}
                value={String(counts.pending)}
                label="En attente"
                color="#B45309"
                soft="#FFF4E5"
              />

              <SummaryCard
                icon={{
                  ios: "checkmark.circle.fill",
                  android: "check_circle",
                  web: "check_circle",
                }}
                value={String(counts.approved)}
                label="Approuvées"
                color="#16845A"
                soft="#EAFBF3"
              />

              <SummaryCard
                icon={{
                  ios: "xmark.circle.fill",
                  android: "cancel",
                  web: "cancel",
                }}
                value={String(counts.rejected)}
                label="Rejetées"
                color="#B42318"
                soft="#FFF0EE"
              />
            </View>

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
                accessibilityLabel="Rechercher une demande formateur"
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
                placeholder="Nom, e-mail, domaine ou motivation..."
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

            {/* FILTRE - STYLE FORMATEUR */}
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
                    Filtrer les demandes formateur
                  </Text>
                </View>

                {statusFilter !== "ALL" ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Réinitialiser le filtre"
                    onPress={() => changeFilter("ALL")}
                    android_ripple={{ color: "transparent" }}
                    className="rounded-full px-2.5 py-1.5"
                    style={{ backgroundColor: "#F3EEFF" }}
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
                contentContainerStyle={{
                  gap: 8,
                  paddingRight: 4,
                }}
              >
                {(
                  [
                    ["PENDING", "En attente", counts.pending],
                    ["APPROVED", "Approuvées", counts.approved],
                    ["REJECTED", "Rejetées", counts.rejected],
                    ["ALL", "Toutes", items.length],
                  ] as const
                ).map(([value, label, count]) => {
                  const selected = statusFilter === value;

                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Filtrer par ${label}`}
                      onPress={() => changeFilter(value)}
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
                        {label}
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
                          {count}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {error ? (
              <View className="mb-3">
                <ErrorMessage
                  message={error}
                  onRetry={() => {
                    setError("");
                    void load().catch(() =>
                      setError(
                        "Impossible de charger les demandes formateur.",
                      ),
                    );
                  }}
                />
              </View>
            ) : null}

            {notice ? (
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
                  {notice}
                </Text>
              </View>
            ) : null}

            {/* SECTION LISTE */}
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
                <View className="h-1 bg-[#7C3AED]" />

                <View className="flex-row items-center px-3.5 py-3.5">
                  <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-[#F1E9FF]">
                    <SymbolView
                      name={{
                        ios: "doc.text.magnifyingglass",
                        android: "fact_check",
                        web: "fact_check",
                      }}
                      tintColor="#7C3AED"
                      size={17}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1">
                    <Text className="text-[10px] font-black uppercase tracking-[0.65px] text-[#7C3AED]">
                      Candidatures
                    </Text>
                    <Text
                      className="mt-0.5 text-[20px] font-black tracking-[-0.3px]"
                      style={{ color: theme.colors.foreground }}
                    >
                      Demandes à examiner
                    </Text>
                    <Text
                      className="mt-1 text-[12px] leading-[16px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Consultez le profil, puis approuvez ou rejetez la demande.
                    </Text>
                  </View>

                  <View className="ml-2 rounded-full bg-[#F3EEFF] px-2.5 py-1">
                    <Text className="text-[11px] font-black text-[#7C3AED]">
                      {filteredItems.length}
                    </Text>
                  </View>
                </View>
              </View>

              {filteredItems.length === 0 ? (
                <View
                  className="items-center rounded-[22px] border bg-white px-5 py-8"
                  style={{ borderColor: "#E5DFE8" }}
                >
                  <View className="h-[58px] w-[58px] items-center justify-center rounded-full bg-[#F1E9FF]">
                    <SymbolView
                      name={{
                        ios: "tray.fill",
                        android: "inbox",
                        web: "inbox",
                      }}
                      tintColor="#7C3AED"
                      size={23}
                      weight="bold"
                    />
                  </View>

                  <Text
                    className="mt-4 text-[16px] font-black"
                    style={{ color: theme.colors.foreground }}
                  >
                    Aucune demande dans cette vue
                  </Text>

                  <Text
                    className="mt-1.5 text-center text-[12px] leading-[16px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Modifiez le filtre ou la recherche pour afficher d’autres
                    candidatures.
                  </Text>
                </View>
              ) : (
                <>
                  <View className="gap-3">
                    {paginatedItems.map((item) => (
                      <RequestCard key={item.id} item={item} />
                    ))}
                  </View>

                  <View
                    className="mb-5 mt-4 rounded-[22px] border bg-white px-3 py-3"
                    style={{ borderColor: theme.colors.border }}
                  >
                    <View className="mb-3 flex-row items-center justify-between">
                      <Text
                        className="text-[13px] font-bold"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        {filteredItems.length} demande
                        {filteredItems.length > 1 ? "s" : ""}
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
                                style={{
                                  color: theme.colors.foregroundSubtle,
                                }}
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
                </>
              )}
            </View>
          </View>
        </ScrollView>

        {/* MODAL DECISION */}
        <Modal
          visible={pendingDecision !== null}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!working) {
              setPendingDecision(null);
              setAdminComment("");
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
                          pendingDecision.kind === "approve"
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
                              pendingDecision.kind === "approve"
                                ? "#EAFBF3"
                                : "#FFF0EE",
                          }}
                        >
                          <SymbolView
                            name={{
                              ios:
                                pendingDecision.kind === "approve"
                                  ? "checkmark.circle.fill"
                                  : "xmark.circle.fill",
                              android:
                                pendingDecision.kind === "approve"
                                  ? "check_circle"
                                  : "cancel",
                              web:
                                pendingDecision.kind === "approve"
                                  ? "check_circle"
                                  : "cancel",
                            }}
                            tintColor={
                              pendingDecision.kind === "approve"
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
                            {pendingDecision.kind === "approve"
                              ? "Approuver la demande"
                              : "Rejeter la demande"}
                          </Text>

                          <Text
                            className="mt-1 text-[12px] leading-[17px]"
                            style={{ color: theme.colors.foregroundMuted }}
                          >
                            {pendingDecision.kind === "approve"
                              ? `${requesterLabel(
                                  pendingDecision.request,
                                )} obtiendra le rôle Formateur.`
                              : `La demande de ${requesterLabel(
                                  pendingDecision.request,
                                )} sera rejetée.`}
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
                            {initials(requesterLabel(pendingDecision.request))}
                          </Text>
                        </View>

                        <View className="ml-2.5 min-w-0 flex-1">
                          <Text
                            numberOfLines={1}
                            className="text-[12px] font-black"
                            style={{ color: theme.colors.foreground }}
                          >
                            {requesterLabel(pendingDecision.request)}
                          </Text>
                          <Text
                            numberOfLines={1}
                            className="mt-0.5 text-[10px]"
                            style={{ color: theme.colors.foregroundMuted }}
                          >
                            {pendingDecision.request.requesterEmail ||
                              "E-mail non renseigné"}
                          </Text>
                        </View>
                      </View>

                      <Text
                        className="mb-2 mt-4 text-[10px] font-black uppercase tracking-[0.6px]"
                        style={{ color: theme.colors.foregroundSubtle }}
                      >
                        Commentaire administrateur · facultatif
                      </Text>

                      <TextInput
                        value={adminComment}
                        onChangeText={setAdminComment}
                        placeholder="Ajouter un commentaire à la décision..."
                        placeholderTextColor={theme.colors.foregroundSubtle}
                        multiline
                        maxLength={1000}
                        textAlignVertical="top"
                        className="min-h-[104px] rounded-[16px] border bg-[#FCFBFD] px-3 py-3 text-[13px] leading-[18px]"
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

                      <View className="mt-4 flex-row gap-2">
                        <Pressable
                          accessibilityRole="button"
                          disabled={working}
                          onPress={() => {
                            setPendingDecision(null);
                            setAdminComment("");
                          }}
                          android_ripple={{ color: "transparent" }}
                          className="min-h-[46px] flex-1 items-center justify-center rounded-[14px] border bg-white px-3"
                          style={{
                            borderColor: "#E5DFE8",
                            opacity: working ? 0.55 : 1,
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
                          disabled={working}
                          onPress={() => void confirmDecision()}
                          android_ripple={{ color: "transparent" }}
                          className="min-h-[46px] flex-1 items-center justify-center rounded-[14px] px-3"
                          style={{
                            backgroundColor:
                              pendingDecision.kind === "approve"
                                ? "#16845A"
                                : "#B42318",
                            opacity: working ? 0.6 : 1,
                          }}
                        >
                          <Text className="text-[12px] font-black text-white">
                            {working
                              ? "Enregistrement..."
                              : pendingDecision.kind === "approve"
                                ? "Confirmer"
                                : "Rejeter"}
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

  function SummaryCard({
    icon,
    value,
    label,
    color,
    soft,
  }: {
    icon: SymbolName;
    value: string;
    label: string;
    color: string;
    soft: string;
  }) {
    return (
      <View
        className="relative min-w-0 flex-1 overflow-hidden rounded-[19px] border bg-white"
        style={{
          borderColor: "#E5DFE8",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.03,
          shadowRadius: 6,
          elevation: 1,
        }}
      >
        <View className="h-1 w-full" style={{ backgroundColor: color }} />

        <View className="px-2.5 py-2.5">
          <View className="flex-row items-center justify-between">
            <View
              className="h-8 w-8 items-center justify-center rounded-[11px]"
              style={{ backgroundColor: soft }}
            >
              <SymbolView
                name={icon}
                tintColor={color}
                size={13}
                weight="bold"
              />
            </View>

            <Text
              className="ml-1 text-[21px] font-black tracking-[-0.4px]"
              style={{ color: theme.colors.foreground }}
            >
              {value}
            </Text>
          </View>

          <Text
            numberOfLines={1}
            className="mt-2 text-[10px] font-black"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {label}
          </Text>
        </View>
      </View>
    );
  }


  function RequestCard({ item }: { item: AdminTrainerRequestSummary }) {
    const tone = statusTone(item.status);
    const expanded = expandedId === item.id;

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
        <View
          className="h-1 w-full"
          style={{ backgroundColor: tone.color }}
        />

        <View className="p-3.5">
          <View className="flex-row items-start">
            <View
              className="h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "#F1E9FF" }}
            >
              <Text className="text-[12px] font-black text-[#7C3AED]">
                {initials(requesterLabel(item))}
              </Text>
            </View>

            <View className="ml-2.5 min-w-0 flex-1">
              <Text
                numberOfLines={1}
                className="text-[14px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                {requesterLabel(item)}
              </Text>

              <Text
                numberOfLines={1}
                className="mt-0.5 text-[10px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                {item.requesterEmail || "E-mail non renseigné"}
              </Text>

              <Text
                numberOfLines={1}
                className="mt-1.5 text-[10px] font-bold"
                style={{ color: "#7C3AED" }}
              >
                {item.expertiseDomain || "Domaine non renseigné"}
              </Text>
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
              Envoyée le {formatDate(item.requestedAt)}
            </Text>

            <Text
              className="text-[9px] font-bold"
              style={{ color: theme.colors.foregroundSubtle }}
            >
              #{item.id}
            </Text>
          </View>

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
                {expanded ? "Masquer la candidature" : "Voir la candidature"}
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

          {expanded ? (
            <View className="mt-2.5 gap-2">
              <DetailBlock
                icon={{
                  ios: "briefcase.fill",
                  android: "work",
                  web: "work",
                }}
                label="Expérience"
                value={item.experienceSummary || "Non renseignée"}
              />

              <DetailBlock
                icon={{
                  ios: "sparkles",
                  android: "auto_awesome",
                  web: "auto_awesome",
                }}
                label="Motivation"
                value={item.motivation || "Non renseignée"}
              />

              {item.adminComment ? (
                <DetailBlock
                  icon={{
                    ios: "text.bubble.fill",
                    android: "comment",
                    web: "comment",
                  }}
                  label="Commentaire administrateur"
                  value={item.adminComment}
                />
              ) : null}

              {item.reviewedAt ? (
                <View
                  className="flex-row items-center rounded-[14px] px-2.5 py-2"
                  style={{ backgroundColor: tone.soft }}
                >
                  <SymbolView
                    name={{
                      ios: "checkmark.seal.fill",
                      android: "verified",
                      web: "verified",
                    }}
                    tintColor={tone.color}
                    size={11}
                    weight="bold"
                  />
                  <Text
                    className="ml-1.5 flex-1 text-[9px] font-bold"
                    style={{ color: tone.color }}
                  >
                    Traitée le {formatDate(item.reviewedAt)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {item.status === "PENDING" ? (
            <View className="mt-3 flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                disabled={working}
                onPress={() => openDecision("reject", item)}
                android_ripple={{ color: "transparent" }}
                className="min-h-[43px] flex-1 flex-row items-center justify-center rounded-[14px] border bg-white px-2"
                style={{
                  borderColor: "#F0C7C2",
                  opacity: working ? 0.55 : 1,
                }}
              >
                <SymbolView
                  name={{
                    ios: "xmark",
                    android: "close",
                    web: "close",
                  }}
                  tintColor="#B42318"
                  size={12}
                  weight="bold"
                />
                <Text className="ml-1.5 text-[11px] font-black text-[#B42318]">
                  Rejeter
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={working}
                onPress={() => openDecision("approve", item)}
                android_ripple={{ color: "transparent" }}
                className="min-h-[43px] flex-[1.2] flex-row items-center justify-center rounded-[14px] px-2"
                style={{
                  backgroundColor: "#16845A",
                  opacity: working ? 0.55 : 1,
                }}
              >
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
                <Text className="ml-1.5 text-[11px] font-black text-white">
                  Approuver
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

  function PaginationArrow({
    direction,
    disabled,
    onPress,
  }: {
    direction: "previous" | "next";
    disabled: boolean;
    onPress: () => void;
  }) {
    const isPrevious = direction === "previous";

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isPrevious ? "Page précédente" : "Page suivante"
        }
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
            ios: isPrevious ? "chevron.left" : "chevron.right",
            android: isPrevious ? "chevron_left" : "chevron_right",
            web: isPrevious ? "chevron_left" : "chevron_right",
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

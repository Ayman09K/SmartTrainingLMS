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

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  getAdminOpenFeedbacks,
  markAdminFeedbackInProgress,
  resolveAdminFeedback,
} from "../../features/admin/adminFeedbackAlertService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type { AdminFeedbackSummary } from "../../types/admin";

type FeedbackFilter =
  | "ALL"
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

type FeedbackAction = "IN_PROGRESS" | "RESOLVE";

type PendingFeedbackAction = {
  feedback: AdminFeedbackSummary;
  action: FeedbackAction;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];
type PaginationItem = number | "ellipsis";

const PAGE_SIZE = 4;

const FILTERS: readonly FeedbackFilter[] = [
  "ALL",
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

function statusLabel(status: string): string {
  if (status === "ALL") return "Tous";
  if (status === "OPEN") return "À traiter";
  if (status === "IN_PROGRESS") return "En cours";
  if (status === "RESOLVED") return "Résolus";
  if (status === "CLOSED") return "Clôturés";
  return status;
}

function statusTone(status: string) {
  if (status === "OPEN") {
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

  if (status === "RESOLVED") {
    return {
      color: "#16845A",
      soft: "#EAFBF3",
      border: "#BFE8D3",
    };
  }

  return {
    color: "#667085",
    soft: "#F2F4F7",
    border: "#DDE1E7",
  };
}

function filterIcon(value: FeedbackFilter): SymbolName {
  if (value === "OPEN") {
    return {
      ios: "exclamationmark.bubble.fill",
      android: "feedback",
      web: "feedback",
    };
  }

  if (value === "IN_PROGRESS") {
    return {
      ios: "clock.fill",
      android: "schedule",
      web: "schedule",
    };
  }

  if (value === "RESOLVED") {
    return {
      ios: "checkmark.circle.fill",
      android: "check_circle",
      web: "check_circle",
    };
  }

  if (value === "CLOSED") {
    return {
      ios: "archivebox.fill",
      android: "inventory_2",
      web: "inventory_2",
    };
  }

  return {
    ios: "rectangle.stack.fill",
    android: "view_agenda",
    web: "view_agenda",
  };
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

export default function AdminFeedbacksScreen() {
  const { theme } = useSmartTrainingTheme();

  const scrollRef = useRef<ScrollView | null>(null);
  const searchTopRef = useRef(0);
  const listTopRef = useRef(0);
  const searchFocusedRef = useRef(false);

  const [items, setItems] = useState<AdminFeedbackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FeedbackFilter>("ALL");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [pending, setPending] =
    useState<PendingFeedbackAction | null>(null);
  const [trainerResponse, setTrainerResponse] = useState("");

  async function load() {
    const data = await getAdminOpenFeedbacks();
    setItems(data);
  }

  useEffect(() => {
    let active = true;

    void getAdminOpenFeedbacks()
      .then((data) => {
        if (!active) return;

        setItems(data);
        setError("");
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger les feedbacks ouverts.");
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

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
      setNotice("");
    } catch {
      setError("Impossible d’actualiser les feedbacks.");
    } finally {
      setRefreshing(false);
    }
  }

  const normalizedQuery = query.trim().toLocaleLowerCase("fr");

  const counts = useMemo(() => {
    const scoped = items.filter((item) => {
      if (!normalizedQuery) return true;

      return [
        item.message || "",
        item.difficultyLevel || "",
        item.needHelp ? "besoin aide demande aide" : "",
        item.status,
        String(item.learnerId),
        String(item.trainingId),
        item.trainerResponse || "",
      ]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(normalizedQuery);
    });

    return {
      ALL: scoped.length,
      OPEN: scoped.filter((item) => item.status === "OPEN").length,
      IN_PROGRESS: scoped.filter(
        (item) => item.status === "IN_PROGRESS",
      ).length,
      RESOLVED: scoped.filter((item) => item.status === "RESOLVED").length,
      CLOSED: scoped.filter((item) => item.status === "CLOSED").length,
    } satisfies Record<FeedbackFilter, number>;
  }, [items, normalizedQuery]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const statusMatch = filter === "ALL" || item.status === filter;

      const queryMatch =
        !normalizedQuery ||
        [
          item.message || "",
          item.difficultyLevel || "",
          item.needHelp ? "besoin aide demande aide" : "",
          item.status,
          String(item.learnerId),
          String(item.trainingId),
          item.trainerResponse || "",
        ]
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(normalizedQuery);

      return statusMatch && queryMatch;
    });
  }, [filter, items, normalizedQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [currentPage, filtered]);

  const paginationItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages],
  );

  function updateQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  function selectFilter(value: FeedbackFilter) {
    setFilter(value);
    setPage(1);
    setExpandedId(null);
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

  function openAction(
    feedback: AdminFeedbackSummary,
    action: FeedbackAction,
  ) {
    if (action === "IN_PROGRESS" && feedback.status !== "OPEN") {
      return;
    }

    if (
      action === "RESOLVE" &&
      feedback.status !== "OPEN" &&
      feedback.status !== "IN_PROGRESS"
    ) {
      return;
    }

    Keyboard.dismiss();
    setError("");
    setNotice("");
    setTrainerResponse(feedback.trainerResponse || "");
    setPending({ feedback, action });
  }

  async function confirmAction() {
    if (!pending || workingId !== null) return;

    const { feedback, action } = pending;

    if (action === "IN_PROGRESS" && feedback.status !== "OPEN") {
      setPending(null);
      return;
    }

    if (
      action === "RESOLVE" &&
      feedback.status !== "OPEN" &&
      feedback.status !== "IN_PROGRESS"
    ) {
      setPending(null);
      return;
    }

    setWorkingId(feedback.id);
    setError("");

    try {
      const updated =
        action === "IN_PROGRESS"
          ? await markAdminFeedbackInProgress(feedback.id)
          : await resolveAdminFeedback(
              feedback.id,
              trainerResponse,
            );

      setItems((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );

      setNotice(
        action === "IN_PROGRESS"
          ? "Le feedback est maintenant pris en charge."
          : "Le feedback a été résolu.",
      );

      setPending(null);
      setTrainerResponse("");
      setExpandedId(null);
    } catch {
      setError("L’action sur ce feedback n’a pas pu être enregistrée.");
    } finally {
      setWorkingId(null);
    }
  }

  if (loading) {
    return <LoadingState message="Chargement des feedbacks..." />;
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
              <View className="h-1.5 w-full bg-[#7C3AED]" />

              <View className="relative overflow-hidden px-4 py-4">
                <View
                  pointerEvents="none"
                  className="absolute -right-8 -top-12 h-[132px] w-[132px] rounded-full bg-[#F3EEFF]"
                />
                <View
                  pointerEvents="none"
                  className="absolute right-8 top-12 h-12 w-12 rounded-[16px] bg-[#EAFBF3]"
                />

                <View className="flex-row items-start">
                  <View className="h-[52px] w-[52px] items-center justify-center rounded-[17px] bg-[#F1E9FF]">
                    <SymbolView
                      name={{
                        ios: "bubble.left.and.exclamationmark.bubble.right.fill",
                        android: "feedback",
                        web: "feedback",
                      }}
                      tintColor="#7C3AED"
                      size={22}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1 pr-4">
                    <View className="self-start rounded-full bg-[#F3EEFF] px-2.5 py-1">
                      <Text className="text-[10px] font-black uppercase tracking-[0.7px] text-[#7C3AED]">
                        Suivi pédagogique
                      </Text>
                    </View>

                    <Text
                      accessibilityRole="header"
                      className="mt-2 text-[26px] font-black leading-[30px] tracking-[-0.6px]"
                      style={{ color: theme.colors.foreground }}
                    >
                      Feedbacks
                    </Text>

                    <Text
                      className="mt-1.5 max-w-[520px] text-[13px] leading-[18px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Traitez les difficultés et demandes d’aide remontées par
                      les apprenants depuis la file opérationnelle.
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row flex-wrap gap-2">
                  <View className="flex-row items-center rounded-full bg-[#FFF7E8] px-2.5 py-1.5">
                    <SymbolView
                      name={{
                        ios: "tray.full.fill",
                        android: "inbox",
                        web: "inbox",
                      }}
                      tintColor="#B45309"
                      size={10}
                      weight="bold"
                    />
                    <Text className="ml-1.5 text-[10px] font-bold text-[#B45309]">
                      File backend ouverte
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
                      Traitement administrateur
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* KPI */}
            <View className="mb-3 flex-row gap-2">
              <SummaryCard
                icon={{
                  ios: "exclamationmark.bubble.fill",
                  android: "feedback",
                  web: "feedback",
                }}
                value={String(counts.OPEN)}
                label="À traiter"
                color="#B45309"
                soft="#FFF4E5"
              />
              <SummaryCard
                icon={{
                  ios: "clock.fill",
                  android: "schedule",
                  web: "schedule",
                }}
                value={String(counts.IN_PROGRESS)}
                label="En cours"
                color="#7C3AED"
                soft="#F3EEFF"
              />
              <SummaryCard
                icon={{
                  ios: "hand.raised.fill",
                  android: "support_agent",
                  web: "support_agent",
                }}
                value={String(
                  items.filter((item) => item.needHelp === true).length,
                )}
                label="Aide"
                color="#0F766E"
                soft="#EAFBF7"
              />
            </View>

            {/* INFO FILE */}
            <View
              className="mb-3 flex-row items-start rounded-[16px] border px-3 py-2.5"
              style={{
                backgroundColor: "#FCFBFD",
                borderColor: "#E5DFE8",
              }}
            >
              <SymbolView
                name={{
                  ios: "info.circle.fill",
                  android: "info",
                  web: "info",
                }}
                tintColor="#7C3AED"
                size={14}
                weight="bold"
              />
              <Text
                className="ml-2 flex-1 text-[10px] leading-[15px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Les éléments résolus restent visibles pendant cette session,
                puis quittent la file au prochain chargement.
              </Text>
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
                accessibilityLabel="Rechercher un feedback"
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
                placeholder="Message, difficulté, apprenant ou formation..."
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
                    Filtrer les feedbacks
                  </Text>
                </View>

                {filter !== "ALL" ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Réinitialiser le filtre"
                    onPress={() => selectFilter("ALL")}
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
                contentContainerStyle={{ gap: 8, paddingRight: 4 }}
              >
                {FILTERS.map((value) => {
                  const selected = filter === value;

                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Filtrer par ${statusLabel(value)}`}
                      onPress={() => selectFilter(value)}
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
                          {counts[value]}
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
                        "Impossible de charger les feedbacks ouverts.",
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
                <View className="h-1 bg-[#7C3AED]" />

                <View className="flex-row items-center px-3.5 py-3.5">
                  <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-[#F1E9FF]">
                    <SymbolView
                      name={{
                        ios: "tray.full.fill",
                        android: "inbox",
                        web: "inbox",
                      }}
                      tintColor="#7C3AED"
                      size={17}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1">
                    <Text className="text-[10px] font-black uppercase tracking-[0.65px] text-[#7C3AED]">
                      File opérationnelle
                    </Text>
                    <Text
                      className="mt-0.5 text-[20px] font-black tracking-[-0.3px]"
                      style={{ color: theme.colors.foreground }}
                    >
                      Feedbacks apprenants
                    </Text>
                    <Text
                      className="mt-1 text-[12px] leading-[16px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Consultez le signalement puis choisissez l’action adaptée.
                    </Text>
                  </View>

                  <View className="ml-2 rounded-full bg-[#F3EEFF] px-2.5 py-1">
                    <Text className="text-[11px] font-black text-[#7C3AED]">
                      {filtered.length}
                    </Text>
                  </View>
                </View>
              </View>

              {filtered.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <View className="gap-3">
                    {pageItems.map((item) => (
                      <FeedbackCard key={item.id} item={item} />
                    ))}
                  </View>

                  <Pagination />
                </>
              )}
            </View>
          </View>
        </ScrollView>

        {/* MODAL ACTION */}
        <Modal
          visible={pending !== null}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (workingId === null) {
              setPending(null);
              setTrainerResponse("");
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
                {pending ? (
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
                          pending.action === "RESOLVE"
                            ? "#16845A"
                            : "#7C3AED",
                      }}
                    />

                    <View className="p-4">
                      <View className="flex-row items-start">
                        <View
                          className="h-11 w-11 items-center justify-center rounded-[14px]"
                          style={{
                            backgroundColor:
                              pending.action === "RESOLVE"
                                ? "#EAFBF3"
                                : "#F3EEFF",
                          }}
                        >
                          <SymbolView
                            name={{
                              ios:
                                pending.action === "RESOLVE"
                                  ? "checkmark.circle.fill"
                                  : "clock.fill",
                              android:
                                pending.action === "RESOLVE"
                                  ? "check_circle"
                                  : "schedule",
                              web:
                                pending.action === "RESOLVE"
                                  ? "check_circle"
                                  : "schedule",
                            }}
                            tintColor={
                              pending.action === "RESOLVE"
                                ? "#16845A"
                                : "#7C3AED"
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
                            {pending.action === "RESOLVE"
                              ? "Résoudre le feedback"
                              : "Prendre en charge"}
                          </Text>

                          <Text
                            className="mt-1 text-[12px] leading-[17px]"
                            style={{ color: theme.colors.foregroundMuted }}
                          >
                            {pending.action === "RESOLVE"
                              ? "Confirmez la résolution. Vous pouvez ajouter une réponse pédagogique."
                              : "Le feedback passera au statut « En cours »."}
                          </Text>
                        </View>
                      </View>

                      {pending.action === "RESOLVE" ? (
                        <>
                          <Text
                            className="mb-2 mt-4 text-[10px] font-black uppercase tracking-[0.6px]"
                            style={{ color: theme.colors.foregroundSubtle }}
                          >
                            Réponse pédagogique · facultative
                          </Text>

                          <TextInput
                            value={trainerResponse}
                            onChangeText={setTrainerResponse}
                            placeholder="Ajouter une réponse pour l’apprenant..."
                            placeholderTextColor={
                              theme.colors.foregroundSubtle
                            }
                            multiline
                            maxLength={2000}
                            textAlignVertical="top"
                            className="min-h-[112px] rounded-[16px] border bg-[#FCFBFD] px-3 py-3 text-[13px] leading-[18px]"
                            style={{
                              color: theme.colors.foreground,
                              borderColor: "#E5DFE8",
                            }}
                          />

                          <Text
                            className="mt-1.5 text-right text-[10px]"
                            style={{
                              color: theme.colors.foregroundSubtle,
                            }}
                          >
                            {trainerResponse.length}/2000
                          </Text>
                        </>
                      ) : null}

                      <View className="mt-4 flex-row gap-2">
                        <Pressable
                          accessibilityRole="button"
                          disabled={workingId !== null}
                          onPress={() => {
                            setPending(null);
                            setTrainerResponse("");
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
                          disabled={workingId !== null}
                          onPress={() => void confirmAction()}
                          android_ripple={{ color: "transparent" }}
                          className="min-h-[46px] flex-1 items-center justify-center rounded-[14px] px-3"
                          style={{
                            backgroundColor:
                              pending.action === "RESOLVE"
                                ? "#16845A"
                                : "#7C3AED",
                            opacity: workingId !== null ? 0.6 : 1,
                          }}
                        >
                          <Text className="text-[12px] font-black text-white">
                            {workingId !== null
                              ? "Enregistrement..."
                              : "Confirmer"}
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

  function FeedbackCard({ item }: { item: AdminFeedbackSummary }) {
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
            <View
              className="h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
              style={{
                backgroundColor: item.needHelp ? "#FFF4E5" : "#F1E9FF",
              }}
            >
              <SymbolView
                name={{
                  ios: item.needHelp
                    ? "hand.raised.fill"
                    : "bubble.left.fill",
                  android: item.needHelp ? "support_agent" : "chat_bubble",
                  web: item.needHelp ? "support_agent" : "chat_bubble",
                }}
                tintColor={item.needHelp ? "#B45309" : "#7C3AED"}
                size={16}
                weight="bold"
              />
            </View>

            <View className="ml-2.5 min-w-0 flex-1">
              <Text
                className="text-[14px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                {item.needHelp ? "Demande d’aide" : "Feedback apprenant"}
              </Text>

              <Text
                className="mt-0.5 text-[10px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Apprenant #{item.learnerId} · Formation #{item.trainingId}
              </Text>

              {item.difficultyLevel ? (
                <View className="mt-1.5 self-start rounded-full bg-[#F8F5FA] px-2 py-1">
                  <Text
                    className="text-[9px] font-bold"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Difficulté · {item.difficultyLevel}
                  </Text>
                </View>
              ) : null}
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
            className="mt-3 rounded-[15px] border px-3 py-2.5"
            style={{
              backgroundColor: "#FCFBFD",
              borderColor: "#EEE9F0",
            }}
          >
            <Text
              numberOfLines={expanded ? undefined : 3}
              className="text-[11px] leading-[16px]"
              style={{ color: theme.colors.foreground }}
            >
              {item.message || "Aucun message."}
            </Text>
          </View>

          <View className="mt-2.5 flex-row items-center">
            <SymbolView
              name={{
                ios: "calendar",
                android: "calendar_today",
                web: "calendar_today",
              }}
              tintColor={theme.colors.foregroundSubtle}
              size={10}
            />
            <Text
              className="ml-1.5 flex-1 text-[9px]"
              style={{ color: theme.colors.foregroundMuted }}
            >
              Créé le {formatDate(item.createdAt)}
            </Text>
            <Text
              className="text-[9px] font-bold"
              style={{ color: theme.colors.foregroundSubtle }}
            >
              #{item.id}
            </Text>
          </View>

          {item.trainerResponse ? (
            <View
              className="mt-2.5 rounded-[15px] border px-3 py-2.5"
              style={{
                backgroundColor: "#EAFBF3",
                borderColor: "#C9EAD9",
              }}
            >
              <View className="flex-row items-center">
                <SymbolView
                  name={{
                    ios: "checkmark.bubble.fill",
                    android: "mark_chat_read",
                    web: "mark_chat_read",
                  }}
                  tintColor="#16845A"
                  size={11}
                  weight="bold"
                />
                <Text className="ml-1.5 text-[9px] font-black uppercase tracking-[0.5px] text-[#16845A]">
                  Réponse pédagogique
                </Text>
              </View>

              <Text
                numberOfLines={expanded ? undefined : 2}
                className="mt-1.5 text-[10px] leading-[15px]"
                style={{ color: theme.colors.foreground }}
              >
                {item.trainerResponse}
              </Text>
            </View>
          ) : null}

          {(item.message?.length || 0) > 130 ||
          (item.trainerResponse?.length || 0) > 90 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setExpandedId(expanded ? null : item.id)}
              android_ripple={{ color: "transparent" }}
              className="mt-2.5 flex-row items-center justify-center rounded-[12px] py-1.5"
            >
              <Text className="text-[9px] font-black text-[#7C3AED]">
                {expanded ? "Afficher moins" : "Afficher le détail"}
              </Text>
              <SymbolView
                name={{
                  ios: expanded ? "chevron.up" : "chevron.down",
                  android: expanded ? "expand_less" : "expand_more",
                  web: expanded ? "expand_less" : "expand_more",
                }}
                tintColor="#7C3AED"
                size={11}
                weight="bold"
              />
            </Pressable>
          ) : null}

          {item.status === "OPEN" ||
          item.status === "IN_PROGRESS" ? (
            <View className="mt-3 flex-row gap-2">
              {item.status === "OPEN" ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={workingId !== null}
                  onPress={() => openAction(item, "IN_PROGRESS")}
                  android_ripple={{ color: "transparent" }}
                  className="min-h-[43px] flex-1 flex-row items-center justify-center rounded-[14px] border bg-white px-2"
                  style={{
                    borderColor: "#D7C4FF",
                    opacity: workingId !== null ? 0.55 : 1,
                  }}
                >
                  <SymbolView
                    name={{
                      ios: "clock.fill",
                      android: "schedule",
                      web: "schedule",
                    }}
                    tintColor="#7C3AED"
                    size={11}
                    weight="bold"
                  />
                  <Text className="ml-1.5 text-[10px] font-black text-[#7C3AED]">
                    {busy ? "Traitement..." : "Prendre en charge"}
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={workingId !== null}
                onPress={() => openAction(item, "RESOLVE")}
                android_ripple={{ color: "transparent" }}
                className="min-h-[43px] flex-1 flex-row items-center justify-center rounded-[14px] px-2"
                style={{
                  backgroundColor: "#16845A",
                  opacity: workingId !== null ? 0.55 : 1,
                }}
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
                  {busy ? "Traitement..." : "Résoudre"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  function EmptyState() {
    return (
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
          Aucun feedback dans cette vue
        </Text>

        <Text
          className="mt-1.5 text-center text-[12px] leading-[16px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          Modifiez le filtre ou la recherche pour afficher d’autres éléments.
        </Text>
      </View>
    );
  }

  function Pagination() {
    return (
      <View
        className="mb-5 mt-4 rounded-[22px] border bg-white px-3 py-3"
        style={{ borderColor: theme.colors.border }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <Text
            className="text-[13px] font-bold"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {filtered.length} feedback{filtered.length > 1 ? "s" : ""}
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

import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import { getTrainerInterventions } from "../../features/trainer/trainerActionService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerInterventionListItem,
  TrainerInterventionStatus,
} from "../../types/trainerActionMobile";

type Props = {
  trainerId: number;
  onCreate: () => void;
  onOpen: (interventionId: number) => void;
};

type Filter = "ALL" | TrainerInterventionStatus;
type SymbolName = ComponentProps<typeof SymbolView>["name"];
type PaginationItem = number | "ellipsis";

const PAGE_SIZE = 4;

function buildPagination(currentPage: number, totalPages: number): PaginationItem[] {
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

function filterLabel(value: Filter): string {
  const labels: Record<Filter, string> = {
    ALL: "Toutes",
    PLANNED: "Planifiées",
    DONE: "Réalisées",
    CANCELLED: "Annulées",
  };

  return labels[value];
}

function filterIcon(value: Filter): SymbolName {
  if (value === "PLANNED") {
    return { ios: "clock.fill", android: "schedule", web: "schedule" };
  }

  if (value === "DONE") {
    return {
      ios: "checkmark.circle.fill",
      android: "check_circle",
      web: "check_circle",
    };
  }

  if (value === "CANCELLED") {
    return { ios: "xmark.circle.fill", android: "cancel", web: "cancel" };
  }

  return { ios: "square.grid.2x2.fill", android: "grid_view", web: "grid_view" };
}

function typeLabel(value: string): string {
  const labels: Record<string, string> = {
    MESSAGE: "Message",
    CALL: "Appel",
    SUPPORT_SESSION: "Séance d’accompagnement",
    MANUAL_REVIEW: "Revue manuelle",
    FOLLOW_UP: "Suivi",
  };

  return labels[value] || "Intervention";
}

function typeIcon(value: string): SymbolName {
  if (value === "MESSAGE") {
    return { ios: "message.fill", android: "chat", web: "chat" };
  }

  if (value === "CALL") {
    return { ios: "phone.fill", android: "call", web: "call" };
  }

  if (value === "SUPPORT_SESSION") {
    return { ios: "person.2.fill", android: "groups", web: "groups" };
  }

  if (value === "MANUAL_REVIEW") {
    return {
      ios: "doc.text.magnifyingglass",
      android: "fact_check",
      web: "fact_check",
    };
  }

  return {
    ios: "arrow.triangle.2.circlepath",
    android: "sync",
    web: "sync",
  };
}

function statusTone(value: string): { color: string; soft: string } {
  if (value === "PLANNED") {
    return { color: "#B45309", soft: "#FFF4E5" };
  }

  if (value === "DONE") {
    return { color: "#16845A", soft: "#EAFBF3" };
  }

  if (value === "CANCELLED") {
    return { color: "#667085", soft: "#F2F4F7" };
  }

  return { color: "#7C3AED", soft: "#F1E9FF" };
}

function learnerName(item: TrainerInterventionListItem): string {
  const learner = item.learner;

  if (!learner) {
    return "Apprenant";
  }

  return (
    learner.fullName ||
    [learner.firstName, learner.lastName].filter(Boolean).join(" ").trim() ||
    learner.email
  );
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "Date non disponible";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function TrainerInterventionsScreen({
  trainerId,
  onCreate,
  onOpen,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const scrollRef = useRef<ScrollView | null>(null);
  const listTopRef = useRef(0);

  const [items, setItems] = useState<TrainerInterventionListItem[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const loaded = await getTrainerInterventions(trainerId);
    setItems(loaded);
  }

  useEffect(() => {
    let active = true;

    void getTrainerInterventions(trainerId)
      .then((loaded) => {
        if (active) {
          setItems(loaded);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger les interventions.");
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
  }, [trainerId]);

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError("Impossible d’actualiser les interventions.");
    } finally {
      setRefreshing(false);
    }
  }

  const filters: Filter[] = ["ALL", "PLANNED", "DONE", "CANCELLED"];

  const counts = useMemo(
    () => ({
      ALL: items.length,
      PLANNED: items.filter((item) => item.intervention.status === "PLANNED").length,
      DONE: items.filter((item) => item.intervention.status === "DONE").length,
      CANCELLED: items.filter((item) => item.intervention.status === "CANCELLED").length,
    }),
    [items],
  );

  const filtered = useMemo(
    () =>
      filter === "ALL"
        ? items
        : items.filter((item) => item.intervention.status === filter),
    [filter, items],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const firstVisible =
    filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastVisible = Math.min(currentPage * PAGE_SIZE, filtered.length);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [currentPage, filtered]);

  const paginationItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages],
  );

  function selectFilter(value: Filter) {
    setFilter(value);
    setPage(1);
  }

  function changePage(nextPage: number) {
    const normalizedPage = Math.min(Math.max(nextPage, 1), totalPages);

    if (normalizedPage === currentPage) {
      return;
    }

    setPage(normalizedPage);

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, listTopRef.current - 12),
        animated: true,
      });
    });
  }

  if (loading) {
    return <LoadingState message="Chargement des interventions..." />;
  }

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{ padding: 0, backgroundColor: "#F8F6F3" }}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 10 }}
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
          <View className="pb-3 pt-4">
            <View className="flex-row items-start">
              <View className="min-w-0 flex-1">
                <View
                  className="self-start rounded-full px-2.5 py-1"
                  style={{ backgroundColor: "#F3EEFF" }}
                >
                  <Text
                    className="text-[9px] font-black uppercase tracking-[0.7px]"
                    style={{ color: theme.colors.accent }}
                  >
                    Accompagnement
                  </Text>
                </View>

                <Text
                  className="mt-2 text-[25px] font-black leading-[30px]"
                  style={{ color: theme.colors.foreground }}
                >
                  Interventions
                </Text>

                <Text
                  className="mt-1.5 text-[11px] leading-[16px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Planifiez et tracez vos actions d’accompagnement.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Créer une intervention"
                onPress={onCreate}
                android_ripple={{ color: "transparent" }}
                className="ml-3 h-12 w-12 items-center justify-center rounded-[15px]"
                style={{ backgroundColor: theme.colors.accent }}
              >
                <SymbolView
                  name={{ ios: "plus", android: "add", web: "add" }}
                  tintColor={theme.colors.accentForeground}
                  size={20}
                  weight="bold"
                />
              </Pressable>
            </View>
          </View>

          <View className="mb-4">
            <Text
              className="mb-2 text-[11px] font-black"
              style={{ color: theme.colors.foreground }}
            >
              Statut
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 4 }}
            >
              {filters.map((value) => {
                const active = filter === value;

                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Filtrer par ${filterLabel(value)}`}
                    onPress={() => selectFilter(value)}
                    android_ripple={{ color: "transparent" }}
                    className="h-[42px] flex-row items-center rounded-[12px] border px-2.5"
                    style={{
                      backgroundColor: active
                        ? theme.colors.accent
                        : theme.colors.surface,
                      borderColor: active
                        ? theme.colors.accent
                        : theme.colors.border,
                    }}
                  >
                    <SymbolView
                      name={filterIcon(value)}
                      tintColor={
                        active
                          ? theme.colors.accentForeground
                          : theme.colors.foregroundSubtle
                      }
                      size={12}
                      weight="bold"
                    />

                    <Text
                      className="ml-1.5 text-[10px] font-black"
                      style={{
                        color: active
                          ? theme.colors.accentForeground
                          : theme.colors.foregroundMuted,
                      }}
                    >
                      {filterLabel(value)}
                    </Text>

                    <View
                      className="ml-2 min-w-[24px] items-center justify-center rounded-full px-1.5 py-1"
                      style={{
                        backgroundColor: active
                          ? "rgba(255,255,255,0.18)"
                          : "#F3EEFF",
                      }}
                    >
                      <Text
                        className="text-[8px] font-black"
                        style={{
                          color: active
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
            <View className="mb-4">
              <ErrorMessage message={error} onRetry={() => void refresh()} />
            </View>
          ) : null}

          <View
            onLayout={(event) => {
              listTopRef.current = event.nativeEvent.layout.y;
            }}
          >
            <View className="mb-3">
              <Text
                className="text-[18px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                {filter === "ALL" ? "Toutes les interventions" : filterLabel(filter)}
              </Text>
              <Text
                className="mt-0.5 text-[10px] font-semibold"
                style={{ color: theme.colors.foregroundMuted }}
              >
                {filtered.length === 0
                  ? "Aucun résultat"
                  : `${firstVisible}–${lastVisible} sur ${filtered.length}`}
              </Text>
            </View>

            {filtered.length === 0 ? (
              <View
                className="items-center rounded-[22px] border bg-white px-5 py-8"
                style={{ borderColor: "#E5DFE8" }}
              >
                <View
                  className="h-[58px] w-[58px] items-center justify-center rounded-full"
                  style={{ backgroundColor: "#F1E9FF" }}
                >
                  <SymbolView
                    name={{ ios: "checklist", android: "task_alt", web: "task_alt" }}
                    tintColor="#7C3AED"
                    size={23}
                    weight="bold"
                  />
                </View>
                <Text
                  className="mt-4 text-[15px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  Aucune intervention
                </Text>
                <Text
                  className="mt-1.5 text-center text-[10px] leading-[15px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Aucune intervention ne correspond à ce statut.
                </Text>
              </View>
            ) : (
              <>
                <View className="gap-3">
                  {paginatedItems.map((item) => {
                    const status = statusTone(item.intervention.status);
                    const name = learnerName(item);

                    return (
                      <Pressable
                        key={item.intervention.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Ouvrir l’intervention de ${name}`}
                        onPress={() => onOpen(item.intervention.id)}
                        android_ripple={{ color: "transparent" }}
                        className="overflow-hidden rounded-[20px] border bg-white"
                        style={{
                          borderColor: "#E5DFE8",
                          shadowColor: "#0F172A",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.035,
                          shadowRadius: 7,
                          elevation: 1,
                        }}
                      >
                        <View className="p-3.5">
                          <View className="flex-row items-start">
                            <View
                              className="h-11 w-11 items-center justify-center rounded-[14px]"
                              style={{ backgroundColor: "#F1E9FF" }}
                            >
                              <SymbolView
                                name={typeIcon(item.intervention.interventionType)}
                                tintColor="#7C3AED"
                                size={18}
                                weight="bold"
                              />
                            </View>

                            <View className="ml-3 min-w-0 flex-1">
                              <View className="flex-row flex-wrap items-center gap-1.5">
                                <View
                                  className="rounded-full px-2 py-1"
                                  style={{ backgroundColor: "#F1E9FF" }}
                                >
                                  <Text
                                    className="text-[8px] font-black"
                                    style={{ color: "#7C3AED" }}
                                  >
                                    {typeLabel(item.intervention.interventionType)}
                                  </Text>
                                </View>

                                <View
                                  className="rounded-full px-2 py-1"
                                  style={{ backgroundColor: status.soft }}
                                >
                                  <Text
                                    className="text-[8px] font-black"
                                    style={{ color: status.color }}
                                  >
                                    {filterLabel(item.intervention.status)}
                                  </Text>
                                </View>
                              </View>

                              <Text
                                numberOfLines={1}
                                className="mt-2 text-[14px] font-black"
                                style={{ color: theme.colors.foreground }}
                              >
                                {name}
                              </Text>

                              <Text
                                numberOfLines={1}
                                className="mt-1 text-[9px]"
                                style={{ color: theme.colors.foregroundMuted }}
                              >
                                {item.training?.title || "Formation suivie"}
                              </Text>
                            </View>
                          </View>

                          <View
                            className="mt-3 rounded-[14px] px-3 py-3"
                            style={{ backgroundColor: "#F8F6F9" }}
                          >
                            <Text
                              numberOfLines={3}
                              className="text-[10px] leading-[16px]"
                              style={{ color: theme.colors.foregroundMuted }}
                            >
                              {item.intervention.note}
                            </Text>
                          </View>
                        </View>

                        <View
                          className="flex-row items-center border-t px-3.5 py-2.5"
                          style={{
                            borderTopColor: "#EEE9F0",
                            backgroundColor: "#FCFBFD",
                          }}
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
                            className="ml-1.5 flex-1 text-[8px]"
                            style={{ color: theme.colors.foregroundSubtle }}
                          >
                            {formatDate(item.intervention.createdAt)}
                          </Text>
                          <Text
                            className="mr-1 text-[9px] font-black"
                            style={{ color: theme.colors.accent }}
                          >
                            Ouvrir
                          </Text>
                          <SymbolView
                            name={{
                              ios: "chevron.right",
                              android: "chevron_right",
                              web: "chevron_right",
                            }}
                            tintColor={theme.colors.accent}
                            size={12}
                            weight="bold"
                          />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <View
                  className="mb-1 mt-4 rounded-[18px] border bg-white px-3 py-2.5"
                  style={{ borderColor: theme.colors.border }}
                >
                  <View className="mb-2.5 flex-row items-center justify-between">
                    <Text
                      className="text-[11px] font-bold"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      {firstVisible}–{lastVisible} sur {filtered.length}
                    </Text>
                    <View className="rounded-full bg-[#F3EEFF] px-2.5 py-1">
                      <Text
                        className="text-[10px] font-black"
                        style={{ color: theme.colors.accent }}
                      >
                        Page {currentPage} / {totalPages}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-center gap-1.5">
                    <PaginationArrow
                      previous
                      disabled={currentPage === 1}
                      onPress={() => changePage(currentPage - 1)}
                    />

                    {paginationItems.map((item, index) => {
                      if (item === "ellipsis") {
                        return (
                          <View
                            key={`ellipsis-${index}`}
                            className="h-8 w-5 items-center justify-center"
                          >
                            <Text
                              className="text-[14px] font-bold"
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
                          className="h-8 w-8 items-center justify-center rounded-[10px] border"
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
                            className="text-[11px] font-black"
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
                      previous={false}
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
    </ScreenContainer>
  );

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
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="h-8 w-8 items-center justify-center rounded-[10px] border"
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
            disabled ? theme.colors.foregroundSubtle : theme.colors.accent
          }
          size={14}
          weight="bold"
        />
      </Pressable>
    );
  }
}

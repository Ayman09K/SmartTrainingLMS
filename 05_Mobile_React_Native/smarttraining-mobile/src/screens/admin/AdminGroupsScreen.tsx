import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
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
import { getAdminGroups } from "../../features/admin/adminGroupService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type { TrainerLearnerGroup } from "../../types/trainerGroupMobile";

type Props = {
  onOpenGroup: (groupId: number) => void;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];
type PaginationItem = number | "ellipsis";

const PAGE_SIZE = 4;

function buildPagination(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 2) return [1, 2, 3, "ellipsis", totalPages];
  if (currentPage >= totalPages - 1) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "ellipsis", currentPage, "ellipsis", totalPages];
}

function formatDate(value?: string | null): string {
  if (!value) return "Non disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

function ownerRoleLabel(value?: string | null): string {
  if (value === "ADMIN") return "Administrateur";
  if (value === "FORMATEUR") return "Formateur";
  return "Gestionnaire";
}

function groupInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "GR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export default function AdminGroupsScreen({ onOpenGroup }: Props) {
  const { theme } = useSmartTrainingTheme();
  const scrollRef = useRef<ScrollView | null>(null);
  const listTopRef = useRef(0);

  const [groups, setGroups] = useState<TrainerLearnerGroup[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const loaded = await getAdminGroups();
    setGroups(loaded);
  }

  useEffect(() => {
    let active = true;

    void getAdminGroups()
      .then((loaded) => {
        if (!active) return;
        setGroups(loaded);
        setError("");
      })
      .catch(() => {
        if (active) setError("Impossible de charger les groupes.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
      setError("");
    } catch {
      setError("Impossible d’actualiser les groupes.");
    } finally {
      setRefreshing(false);
    }
  }

  const visibleGroups = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    if (!normalized) return groups;

    return groups.filter((group) =>
      [group.name, group.description || "", ownerRoleLabel(group.ownerRole)]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(normalized),
    );
  }, [groups, query]);

  const totalMembers = useMemo(
    () =>
      groups.reduce(
        (sum, group) =>
          sum + (Number.isFinite(group.memberCount) ? group.memberCount : 0),
        0,
      ),
    [groups],
  );

  const totalPages = Math.max(1, Math.ceil(visibleGroups.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return visibleGroups.slice(start, start + PAGE_SIZE);
  }, [currentPage, visibleGroups]);

  const paginationItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const firstVisible =
    visibleGroups.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastVisible = Math.min(currentPage * PAGE_SIZE, visibleGroups.length);

  function updateQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  function changePage(nextPage: number) {
    const normalizedPage = Math.min(Math.max(nextPage, 1), totalPages);
    if (normalizedPage === currentPage) return;

    setPage(normalizedPage);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, listTopRef.current - 12),
        animated: true,
      });
    });
  }

  if (loading) {
    return <LoadingState message="Chargement des groupes..." />;
  }

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{ padding: 0, backgroundColor: "#F8F6F3" }}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 12 }}
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
          {/* HERO PREMIUM */}
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
                className="absolute -right-8 -top-12 h-[132px] w-[132px] rounded-full"
                style={{ backgroundColor: "#F3EEFF" }}
              />
              <View
                pointerEvents="none"
                className="absolute right-10 top-9 h-12 w-12 rounded-[16px]"
                style={{ backgroundColor: "#EAFBF7" }}
              />
              <View
                pointerEvents="none"
                className="absolute -bottom-4 right-20 h-10 w-10 rotate-12 rounded-[12px]"
                style={{ backgroundColor: "#E9DCFF" }}
              />

              <View className="flex-row items-start">
                <View
                  className="h-[52px] w-[52px] items-center justify-center rounded-[17px]"
                  style={{ backgroundColor: "#F1E9FF" }}
                >
                  <SymbolView
                    name={{ ios: "person.3.fill", android: "groups", web: "groups" }}
                    tintColor="#7C3AED"
                    size={22}
                    weight="bold"
                  />
                </View>

                <View className="ml-3 min-w-0 flex-1 pr-8">
                  <View className="self-start rounded-full bg-[#F3EEFF] px-2.5 py-1">
                    <Text className="text-[10px] font-black uppercase tracking-[0.7px] text-[#7C3AED]">
                      Organisation
                    </Text>
                  </View>

                  <Text
                    accessibilityRole="header"
                    className="mt-2 text-[26px] font-black leading-[30px] tracking-[-0.6px]"
                    style={{ color: theme.colors.foreground }}
                  >
                    Groupes / cohortes
                  </Text>

                  <Text
                    className="mt-1.5 max-w-[520px] text-[13px] leading-[18px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Supervisez les cohortes, leur composition et leur activité depuis une vue unique.
                  </Text>
                </View>
              </View>

              <View className="mt-4 flex-row gap-2">
                <View className="flex-row items-center rounded-full bg-[#F8F5FA] px-2.5 py-1.5">
                  <View className="h-2 w-2 rounded-full bg-[#7C3AED]" />
                  <Text
                    className="ml-1.5 text-[10px] font-bold"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Vue administrateur
                  </Text>
                </View>

                <View className="flex-row items-center rounded-full bg-[#EFFAF7] px-2.5 py-1.5">
                  <SymbolView
                    name={{ ios: "person.2.fill", android: "group", web: "group" }}
                    tintColor="#0F766E"
                    size={10}
                    weight="bold"
                  />
                  <Text className="ml-1.5 text-[10px] font-bold text-[#0F766E]">
                    Suivi des membres
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="mb-3 flex-row gap-2">
            <SummaryCard
              icon={{ ios: "person.3.fill", android: "groups", web: "groups" }}
              value={String(groups.length)}
              label="Groupes"
              helper="Cohortes disponibles"
              color="#7C3AED"
              soft="#F3EEFF"
            />

            <SummaryCard
              icon={{ ios: "person.2.fill", android: "group", web: "group" }}
              value={String(totalMembers)}
              label="Membres"
              helper="Participants au total"
              color="#0F766E"
              soft="#EAFBF7"
            />
          </View>

          <View
            className="mb-4 flex-row items-center rounded-[16px] border bg-white px-3"
            style={{ borderColor: "#E5DFE8" }}
          >
            <SymbolView
              name={{ ios: "magnifyingglass", android: "search", web: "search" }}
              tintColor={theme.colors.foregroundSubtle}
              size={17}
            />
            <TextInput
              accessibilityLabel="Rechercher un groupe"
              value={query}
              onChangeText={updateQuery}
              placeholder="Rechercher un groupe..."
              placeholderTextColor={theme.colors.foregroundSubtle}
              className="ml-2 min-h-[48px] flex-1 text-[14px]"
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
                  name={{ ios: "xmark.circle.fill", android: "cancel", web: "cancel" }}
                  tintColor={theme.colors.foregroundSubtle}
                  size={15}
                />
              </Pressable>
            ) : null}
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
                      ios: "rectangle.grid.1x2.fill",
                      android: "view_agenda",
                      web: "view_agenda",
                    }}
                    tintColor="#7C3AED"
                    size={17}
                    weight="bold"
                  />
                </View>

                <View className="ml-3 min-w-0 flex-1">
                  <Text className="text-[10px] font-black uppercase tracking-[0.65px] text-[#7C3AED]">
                    Répertoire
                  </Text>

                  <Text
                    className="mt-0.5 text-[20px] font-black tracking-[-0.3px]"
                    style={{ color: theme.colors.foreground }}
                  >
                    Tous les groupes
                  </Text>

                  <Text
                    className="mt-1 text-[12px] leading-[16px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Consultez les cohortes disponibles et ouvrez leur fiche détaillée.
                  </Text>
                </View>
              </View>
            </View>

            {visibleGroups.length === 0 ? (
              <View
                className="items-center rounded-[22px] border bg-white px-5 py-8"
                style={{ borderColor: "#E5DFE8" }}
              >
                <View
                  className="h-[58px] w-[58px] items-center justify-center rounded-full"
                  style={{ backgroundColor: "#F1E9FF" }}
                >
                  <SymbolView
                    name={{ ios: "person.3.fill", android: "groups", web: "groups" }}
                    tintColor="#7C3AED"
                    size={23}
                    weight="bold"
                  />
                </View>
                <Text
                  className="mt-4 text-[16px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  Aucun groupe à afficher
                </Text>
                <Text
                  className="mt-1.5 text-center text-[12px] leading-[15px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Aucun groupe ne correspond à votre recherche ou n’est disponible actuellement.
                </Text>
              </View>
            ) : (
              <>
                <View className="gap-3">
                  {paginatedGroups.map((group) => (
                    <GroupCard key={group.id} group={group} />
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
                      {visibleGroups.length} groupe{visibleGroups.length > 1 ? "s" : ""}
                    </Text>
                    <View className="rounded-full bg-[#F3EEFF] px-2.5 py-1">
                      <Text
                        className="text-[12px] font-black"
                        style={{ color: theme.colors.accent }}
                      >
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
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function SummaryCard({
    icon,
    value,
    label,
    helper,
    color,
    soft,
  }: {
    icon: SymbolName;
    value: string;
    label: string;
    helper: string;
    color: string;
    soft: string;
  }) {
    return (
      <View
        className="relative min-w-0 flex-1 overflow-hidden rounded-[20px] border bg-white"
        style={{
          borderColor: "#E5DFE8",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.035,
          shadowRadius: 7,
          elevation: 1,
        }}
      >
        <View className="h-1 w-full" style={{ backgroundColor: color }} />

        <View
          pointerEvents="none"
          className="absolute -right-5 top-3 h-[74px] w-[74px] rounded-full"
          style={{
            backgroundColor: soft,
            opacity: 0.78,
          }}
        />

        <View className="px-3 py-3">
          <View className="flex-row items-start justify-between">
            <View
              className="h-9 w-9 items-center justify-center rounded-[12px]"
              style={{ backgroundColor: soft }}
            >
              <SymbolView
                name={icon}
                tintColor={color}
                size={15}
                weight="bold"
              />
            </View>

            <Text
              className="ml-2 text-[22px] font-black leading-[26px] tracking-[-0.5px]"
              style={{ color: theme.colors.foreground }}
            >
              {value}
            </Text>
          </View>

          <Text
            className="mt-2.5 text-[11px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {label}
          </Text>

          <Text
            numberOfLines={1}
            className="mt-0.5 text-[9px] font-semibold leading-[13px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {helper}
          </Text>

          <View
            className="mt-2.5 h-1 w-8 rounded-full"
            style={{ backgroundColor: color }}
          />
        </View>
      </View>
    );
  }

  function GroupCard({ group }: { group: TrainerLearnerGroup }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir le groupe ${group.name}`}
        onPress={() => onOpenGroup(group.id)}
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
              <Text className="text-[14px] font-black" style={{ color: "#7C3AED" }}>
                {groupInitials(group.name)}
              </Text>
            </View>

            <View className="ml-3 min-w-0 flex-1">
              <Text
                numberOfLines={2}
                className="text-[15px] font-black leading-[18px]"
                style={{ color: theme.colors.foreground }}
              >
                {group.name}
              </Text>
              {group.description ? (
                <Text
                  numberOfLines={2}
                  className="mt-1.5 text-[11px] leading-[14px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  {group.description}
                </Text>
              ) : null}
            </View>

            <View
              className="ml-2 min-w-[58px] items-center rounded-[13px] px-2 py-2"
              style={{ backgroundColor: "#F7F3FA" }}
            >
              <Text className="text-[16px] font-black" style={{ color: theme.colors.accent }}>
                {group.memberCount}
              </Text>
              <Text
                className="mt-0.5 text-[9px] font-bold"
                style={{ color: theme.colors.foregroundMuted }}
              >
                membres
              </Text>
            </View>
          </View>
        </View>

        <View
          className="flex-row items-center border-t px-3.5 py-2.5"
          style={{ borderTopColor: "#EEE9F0", backgroundColor: "#FCFBFD" }}
        >
          <SymbolView
            name={{ ios: "person.badge.key.fill", android: "badge", web: "badge" }}
            tintColor={theme.colors.foregroundSubtle}
            size={10}
          />
          <Text
            className="ml-1.5 text-[10px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {ownerRoleLabel(group.ownerRole)}
          </Text>
          <Text className="mx-2 text-[10px]" style={{ color: theme.colors.foregroundSubtle }}>
            •
          </Text>
          <Text
            className="min-w-0 flex-1 text-[10px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            Mis à jour : {formatDate(group.updatedAt)}
          </Text>
          <Text className="mr-1 text-[11px] font-black" style={{ color: theme.colors.accent }}>
            Ouvrir
          </Text>
          <SymbolView
            name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
            tintColor={theme.colors.accent}
            size={12}
            weight="bold"
          />
        </View>
      </Pressable>
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
        accessibilityLabel={isPrevious ? "Page précédente" : "Page suivante"}
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
          tintColor={disabled ? theme.colors.foregroundSubtle : theme.colors.accent}
          size={14}
          weight="bold"
        />
      </Pressable>
    );
  }
}

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
import {
  getAdminGroup,
  getAdminGroupMembers,
} from "../../features/admin/adminGroupService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerLearnerGroup,
  TrainerLearnerGroupMember,
} from "../../types/trainerGroupMobile";

type Props = {
  groupId: number;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];
type PaginationItem = number | "ellipsis";

const PAGE_SIZE = 5;

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

function ownerRoleLabel(value?: string | null): string {
  if (value === "ADMIN") {
    return "Administrateur";
  }

  if (value === "FORMATEUR") {
    return "Formateur";
  }

  return value || "Gestionnaire";
}

function memberName(member: TrainerLearnerGroupMember): string {
  return member.fullName || member.email || "Membre du groupe";
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "MB";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function groupInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "GR";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "Non disponible";
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

export default function AdminGroupDetailScreen({ groupId }: Props) {
  const { theme } = useSmartTrainingTheme();

  const scrollRef = useRef<ScrollView | null>(null);
  const memberListTopRef = useRef(0);

  const [group, setGroup] = useState<TrainerLearnerGroup | null>(null);
  const [members, setMembers] = useState<TrainerLearnerGroupMember[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [loadedGroup, loadedMembers] = await Promise.all([
      getAdminGroup(groupId),
      getAdminGroupMembers(groupId),
    ]);

    setGroup(loadedGroup);
    setMembers(loadedMembers);
  }

  useEffect(() => {
    let active = true;

    if (!Number.isFinite(groupId) || groupId <= 0) {
      setError("Groupe invalide.");
      setLoading(false);

      return () => {
        active = false;
      };
    }

    void Promise.all([
      getAdminGroup(groupId),
      getAdminGroupMembers(groupId),
    ])
      .then(([loadedGroup, loadedMembers]) => {
        if (!active) {
          return;
        }

        setGroup(loadedGroup);
        setMembers(loadedMembers);
        setError("");
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger ce groupe.");
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
  }, [groupId]);

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError("Impossible d’actualiser ce groupe.");
    } finally {
      setRefreshing(false);
    }
  }

  const visibleMembers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");

    if (!normalized) {
      return members;
    }

    return members.filter((member) =>
      [memberName(member), member.email || "", String(member.learnerId)]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(normalized),
    );
  }, [members, query]);

  const totalPages = Math.max(
    1,
    Math.ceil(visibleMembers.length / PAGE_SIZE),
  );

  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return visibleMembers.slice(start, start + PAGE_SIZE);
  }, [currentPage, visibleMembers]);

  const paginationItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages],
  );

  function updateQuery(value: string) {
    setQuery(value);
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
        y: Math.max(0, memberListTopRef.current - 14),
        animated: true,
      });
    });
  }

  if (loading) {
    return <LoadingState message="Chargement du groupe..." />;
  }

  if (!group) {
    return (
      <ScreenContainer
        edges={["left", "right", "bottom"]}
        style={{ padding: 0, backgroundColor: "#F8F6F3" }}
      >
        <View className="mx-auto w-full max-w-[720px] px-4 pt-6">
          <ErrorMessage
            message={error || "Groupe indisponible."}
            onRetry={() => void refresh()}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{ padding: 0, backgroundColor: "#F8F6F3" }}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 18 }}
        keyboardShouldPersistTaps="handled"
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
            className="mt-4 overflow-hidden rounded-[24px] border bg-white"
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
                className="absolute -right-10 -top-12 h-[138px] w-[138px] rounded-full"
                style={{ backgroundColor: "#F3EEFF" }}
              />

              <View
                pointerEvents="none"
                className="absolute right-10 top-10 h-12 w-12 rounded-[16px]"
                style={{ backgroundColor: "#EAFBF7" }}
              />

              <View className="flex-row items-start">
                <View
                  className="h-[54px] w-[54px] items-center justify-center rounded-[18px]"
                  style={{ backgroundColor: "#F1E9FF" }}
                >
                  <Text className="text-[17px] font-black text-[#7C3AED]">
                    {groupInitials(group.name)}
                  </Text>
                </View>

                <View className="ml-3 min-w-0 flex-1 pr-6">
                  <View className="self-start rounded-full bg-[#F3EEFF] px-2.5 py-1">
                    <Text className="text-[10px] font-black uppercase tracking-[0.7px] text-[#7C3AED]">
                      Détail du groupe
                    </Text>
                  </View>

                  <Text
                    accessibilityRole="header"
                    className="mt-2 text-[24px] font-black leading-[29px] tracking-[-0.6px]"
                    style={{ color: theme.colors.foreground }}
                  >
                    {group.name}
                  </Text>

                  <Text
                    className="mt-1.5 text-[12px] leading-[17px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Consultation administrateur de la cohorte, de ses membres et de ses informations principales.
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
                    Vue administrateur
                  </Text>
                </View>

                <View className="flex-row items-center rounded-full bg-[#EFFAF7] px-2.5 py-1.5">
                  <SymbolView
                    name={{
                      ios: "person.badge.key.fill",
                      android: "badge",
                      web: "badge",
                    }}
                    tintColor="#0F766E"
                    size={10}
                    weight="bold"
                  />
                  <Text className="ml-1.5 text-[10px] font-bold text-[#0F766E]">
                    {ownerRoleLabel(group.ownerRole)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* KPI PREMIUM */}
          <View className="mt-3 flex-row gap-2">
            <MetricCard
              icon={{ ios: "person.2.fill", android: "group", web: "group" }}
              value={String(group.memberCount)}
              label="Membres"
              helper="Participants de la cohorte"
              color="#7C3AED"
              soft="#F3EEFF"
            />

            <MetricCard
              icon={{
                ios: "person.badge.key.fill",
                android: "badge",
                web: "badge",
              }}
              value={ownerRoleLabel(group.ownerRole)}
              label="Gestionnaire"
              helper="Rôle propriétaire"
              color="#0F766E"
              soft="#EAFBF7"
              compactValue
            />
          </View>

          {error ? (
            <View className="mt-3">
              <ErrorMessage message={error} onRetry={() => void refresh()} />
            </View>
          ) : null}

          {/* DESCRIPTION */}
          <PremiumSectionTitle
            eyebrow="Présentation"
            title="À propos du groupe"
            subtitle="Description et contexte de la cohorte"
            icon={{
              ios: "text.alignleft",
              android: "notes",
              web: "notes",
            }}
            color="#7C3AED"
            soft="#F3EEFF"
          />

          <View
            className="rounded-[20px] border bg-white p-3.5"
            style={{
              borderColor: "#E5DFE8",
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.025,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <View className="flex-row items-start">
              <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-[#F7F2FF]">
                <SymbolView
                  name={{ ios: "quote.opening", android: "format_quote", web: "format_quote" }}
                  tintColor="#7C3AED"
                  size={14}
                  weight="bold"
                />
              </View>

              <Text
                className="ml-2.5 min-w-0 flex-1 text-[12px] leading-[18px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                {group.description || "Aucune description renseignée pour ce groupe."}
              </Text>
            </View>
          </View>

          {/* MEMBRES */}
          <View
            onLayout={(event) => {
              memberListTopRef.current = event.nativeEvent.layout.y;
            }}
          >
            <PremiumSectionTitle
              eyebrow="Cohorte"
              title="Membres du groupe"
              subtitle="Consultez les apprenants actuellement rattachés à ce groupe"
              icon={{ ios: "person.2.fill", android: "group", web: "group" }}
              color="#0F766E"
              soft="#EAFBF7"
              badge={String(members.length)}
            />

            <View
              className="mb-3 flex-row items-center rounded-[16px] border bg-white px-3"
              style={{ borderColor: "#E5DFE8" }}
            >
              <SymbolView
                name={{ ios: "magnifyingglass", android: "search", web: "search" }}
                tintColor={theme.colors.foregroundSubtle}
                size={16}
              />

              <TextInput
                value={query}
                onChangeText={updateQuery}
                placeholder="Rechercher un membre..."
                placeholderTextColor={theme.colors.foregroundSubtle}
                className="ml-2 min-h-[46px] min-w-0 flex-1 text-[13px]"
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

            {visibleMembers.length === 0 ? (
              <View
                className="items-center rounded-[22px] border bg-white px-5 py-8"
                style={{ borderColor: "#E5DFE8" }}
              >
                <View className="h-[56px] w-[56px] items-center justify-center rounded-full bg-[#F1E9FF]">
                  <SymbolView
                    name={{
                      ios: "person.2.slash.fill",
                      android: "group_off",
                      web: "group_off",
                    }}
                    tintColor="#7C3AED"
                    size={22}
                    weight="bold"
                  />
                </View>

                <Text
                  className="mt-3 text-[15px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  {members.length === 0 ? "Aucun membre" : "Aucun résultat"}
                </Text>

                <Text
                  className="mt-1.5 text-center text-[11px] leading-[16px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  {members.length === 0
                    ? "Ce groupe ne contient actuellement aucun membre."
                    : "Aucun membre ne correspond à votre recherche."}
                </Text>
              </View>
            ) : (
              <>
                <View className="gap-2.5">
                  {paginatedMembers.map((member) => (
                    <MemberCard key={member.learnerId} member={member} />
                  ))}
                </View>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={visibleMembers.length}
                  items={paginationItems}
                  onChange={changePage}
                />
              </>
            )}
          </View>

          {/* INFORMATIONS */}
          <PremiumSectionTitle
            eyebrow="Détails"
            title="Informations du groupe"
            subtitle="Données de gestion et historique"
            icon={{ ios: "info.circle.fill", android: "info", web: "info" }}
            color="#B45309"
            soft="#FFF4E5"
          />

          <View
            className="mb-2 overflow-hidden rounded-[20px] border bg-white"
            style={{ borderColor: "#E5DFE8" }}
          >
            <InfoLine
              icon={{
                ios: "person.badge.key.fill",
                android: "badge",
                web: "badge",
              }}
              label="Rôle propriétaire"
              value={ownerRoleLabel(group.ownerRole)}
              color="#7C3AED"
              soft="#F3EEFF"
            />

            <Divider />

            <InfoLine
              icon={{
                ios: "calendar.badge.plus",
                android: "event_available",
                web: "event_available",
              }}
              label="Création"
              value={formatDateTime(group.createdAt)}
              color="#0F766E"
              soft="#EAFBF7"
            />

            <Divider />

            <InfoLine
              icon={{
                ios: "clock.arrow.circlepath",
                android: "update",
                web: "update",
              }}
              label="Dernière mise à jour"
              value={formatDateTime(group.updatedAt)}
              color="#B45309"
              soft="#FFF4E5"
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function MetricCard({
    icon,
    value,
    label,
    helper,
    color,
    soft,
    compactValue = false,
  }: {
    icon: SymbolName;
    value: string;
    label: string;
    helper: string;
    color: string;
    soft: string;
    compactValue?: boolean;
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
          className="absolute -right-5 top-3 h-[70px] w-[70px] rounded-full"
          style={{ backgroundColor: soft, opacity: 0.8 }}
        />

        <View className="px-3 py-3">
          <View className="flex-row items-start justify-between">
            <View
              className="h-9 w-9 items-center justify-center rounded-[12px]"
              style={{ backgroundColor: soft }}
            >
              <SymbolView name={icon} tintColor={color} size={15} weight="bold" />
            </View>

            <Text
              numberOfLines={1}
              className={
                compactValue
                  ? "ml-2 max-w-[110px] text-right text-[14px] font-black leading-[18px]"
                  : "ml-2 text-[22px] font-black leading-[26px] tracking-[-0.5px]"
              }
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
        </View>
      </View>
    );
  }

  function PremiumSectionTitle({
    eyebrow,
    title,
    subtitle,
    icon,
    color,
    soft,
    badge,
  }: {
    eyebrow: string;
    title: string;
    subtitle: string;
    icon: SymbolName;
    color: string;
    soft: string;
    badge?: string;
  }) {
    return (
      <View className="mb-2.5 mt-5 flex-row items-center">
        <View
          className="h-10 w-10 items-center justify-center rounded-[13px]"
          style={{ backgroundColor: soft }}
        >
          <SymbolView name={icon} tintColor={color} size={16} weight="bold" />
        </View>

        <View className="ml-2.5 min-w-0 flex-1">
          <Text
            className="text-[10px] font-black uppercase tracking-[0.65px]"
            style={{ color }}
          >
            {eyebrow}
          </Text>

          <Text
            className="mt-0.5 text-[19px] font-black tracking-[-0.25px]"
            style={{ color: theme.colors.foreground }}
          >
            {title}
          </Text>

          <Text
            className="mt-0.5 text-[11px] leading-[15px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {subtitle}
          </Text>
        </View>

        {badge ? (
          <View
            className="ml-2 min-w-[34px] items-center justify-center rounded-full px-2.5 py-1.5"
            style={{ backgroundColor: soft }}
          >
            <Text className="text-[11px] font-black" style={{ color }}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  function MemberCard({ member }: { member: TrainerLearnerGroupMember }) {
    const name = memberName(member);

    return (
      <View
        className="overflow-hidden rounded-[19px] border bg-white"
        style={{
          borderColor: "#E5DFE8",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.025,
          shadowRadius: 5,
          elevation: 1,
        }}
      >
        <View className="flex-row items-center p-3">
          <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-[#F1E9FF]">
            <Text className="text-[12px] font-black text-[#7C3AED]">
              {initials(name)}
            </Text>
          </View>

          <View className="ml-2.5 min-w-0 flex-1">
            <Text
              numberOfLines={1}
              className="text-[13px] font-black"
              style={{ color: theme.colors.foreground }}
            >
              {name}
            </Text>

            {member.email ? (
              <Text
                numberOfLines={1}
                className="mt-0.5 text-[10px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                {member.email}
              </Text>
            ) : null}
          </View>

          <View className="ml-2 rounded-full bg-[#EFFAF7] px-2.5 py-1.5">
            <Text className="text-[9px] font-black text-[#0F766E]">Membre</Text>
          </View>
        </View>

        <View
          className="flex-row items-center border-t px-3 py-2.5"
          style={{ borderTopColor: "#EEE9F0", backgroundColor: "#FCFBFD" }}
        >
          <SymbolView
            name={{ ios: "calendar", android: "calendar_today", web: "calendar_today" }}
            tintColor={theme.colors.foregroundSubtle}
            size={10}
          />

          <Text
            className="ml-1.5 min-w-0 flex-1 text-[9px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {member.addedAt
              ? `Ajouté le ${formatDateTime(member.addedAt)}`
              : "Date d’ajout non disponible"}
          </Text>

          <Text
            className="text-[9px] font-bold"
            style={{ color: theme.colors.foregroundSubtle }}
          >
            #{member.learnerId}
          </Text>
        </View>
      </View>
    );
  }

  function Pagination({
    currentPage: activePage,
    totalPages: pageCount,
    totalItems,
    items,
    onChange,
  }: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    items: PaginationItem[];
    onChange: (pageNumber: number) => void;
  }) {
    return (
      <View
        className="mb-1 mt-4 rounded-[20px] border bg-white px-3 py-3"
        style={{ borderColor: "#E5DFE8" }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <Text
            className="text-[11px] font-bold"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {totalItems} membre{totalItems > 1 ? "s" : ""}
          </Text>

          <View className="rounded-full bg-[#F3EEFF] px-2.5 py-1">
            <Text className="text-[10px] font-black text-[#7C3AED]">
              Page {activePage} / {pageCount}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-center gap-1.5">
          <PaginationArrow
            direction="previous"
            disabled={activePage === 1}
            onPress={() => onChange(activePage - 1)}
          />

          {items.map((item, index) => {
            if (item === "ellipsis") {
              return (
                <View
                  key={`ellipsis-${index}`}
                  className="h-9 w-6 items-center justify-center"
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

            const active = item === activePage;

            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={`Page ${item}`}
                accessibilityState={{ selected: active }}
                onPress={() => onChange(item)}
                android_ripple={{ color: "transparent" }}
                className="h-9 w-9 items-center justify-center rounded-xl border"
                style={{
                  backgroundColor: active ? theme.colors.accent : theme.colors.surface,
                  borderColor: active ? theme.colors.accent : theme.colors.border,
                }}
              >
                <Text
                  className="text-[12px] font-black"
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
            disabled={activePage === pageCount}
            onPress={() => onChange(activePage + 1)}
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
          opacity: disabled ? 0.42 : 1,
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

  function InfoLine({
    icon,
    label,
    value,
    color,
    soft,
  }: {
    icon: SymbolName;
    label: string;
    value: string;
    color: string;
    soft: string;
  }) {
    return (
      <View className="flex-row items-center px-3.5 py-3">
        <View
          className="h-9 w-9 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: soft }}
        >
          <SymbolView name={icon} tintColor={color} size={14} weight="bold" />
        </View>

        <View className="ml-2.5 min-w-0 flex-1">
          <Text
            className="text-[9px] font-black uppercase tracking-[0.5px]"
            style={{ color: theme.colors.foregroundSubtle }}
          >
            {label}
          </Text>

          <Text
            numberOfLines={2}
            className="mt-1 text-[12px] font-bold leading-[16px]"
            style={{ color: theme.colors.foreground }}
          >
            {value}
          </Text>
        </View>
      </View>
    );
  }

  function Divider() {
    return <View className="mx-3.5 h-px bg-[#EEE9F0]" />;
  }
}

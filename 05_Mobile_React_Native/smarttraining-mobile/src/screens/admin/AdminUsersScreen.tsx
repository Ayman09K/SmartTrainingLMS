import { SymbolView } from "expo-symbols";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import AdminUserManagementNav from "../../components/admin/AdminUserManagementNav";
import AdminCreateUserCard from "./AdminCreateUserCard";
import {
  ADMIN_ACCOUNT_STATUSES,
  ADMIN_USER_ROLES,
  getAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
} from "../../features/admin/adminUserService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import {
  AdminAccountStatus,
  AdminUserRole,
  AdminUserSummary,
} from "../../types/admin";

type Props = {
  currentUserId: number;
};

type PendingChange =
  | {
      kind: "role";
      user: AdminUserSummary;
      value: AdminUserRole;
    }
  | {
      kind: "status";
      user: AdminUserSummary;
      value: AdminAccountStatus;
    };

type FilterValue = "ALL" | string;
type PaginationItem = number | "ellipsis";

const PAGE_SIZE = 6;

function fullName(user: AdminUserSummary): string {
  const explicit = user.fullName?.trim();
  if (explicit) return explicit;

  const computed = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return computed || user.email;
}

function initials(user: AdminUserSummary): string {
  const first = (user.firstName || "").trim().charAt(0);
  const last = (user.lastName || "").trim().charAt(0);
  const fromNames = `${first}${last}`.toUpperCase();

  if (fromNames) return fromNames;

  const name = fullName(user).trim();
  return name.charAt(0).toUpperCase() || "?";
}

function roleLabel(role: string): string {
  if (role === "ADMIN") return "Administrateur";
  if (role === "FORMATEUR") return "Formateur";
  if (role === "APPRENANT") return "Apprenant";
  return role;
}

function statusLabel(status?: string | null): string {
  if (status === "ACTIVE") return "Actif";
  if (status === "DISABLED") return "Désactivé";
  if (status === "SUSPENDED") return "Suspendu";
  return status || "Non renseigné";
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

function statusTone(status?: string | null) {
  if (status === "ACTIVE") {
    return {
      background: "#EAFBF3",
      foreground: "#16845A",
      dot: "#10B981",
    };
  }

  if (status === "SUSPENDED") {
    return {
      background: "#FFF4E5",
      foreground: "#B45309",
      dot: "#F59E0B",
    };
  }

  return {
    background: "#F2F4F7",
    foreground: "#667085",
    dot: "#98A2B3",
  };
}

export default function AdminUsersScreen({ currentUserId }: Props) {
  const { theme } = useSmartTrainingTheme();
  const scrollRef = useRef<ScrollView>(null);

  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<FilterValue>("ALL");
  const [statusFilter, setStatusFilter] = useState<FilterValue>("ALL");
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [managedUserId, setManagedUserId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  async function load() {
    const data = await getAdminUsers();
    setUsers(data);
  }

  useEffect(() => {
    let active = true;

    void getAdminUsers()
      .then((data) => {
        if (active) setUsers(data);
      })
      .catch(() => {
        if (active) setError("Impossible de charger les utilisateurs.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(
    () => ({
      accounts: users.length,
      active: users.filter((user) => user.accountStatus === "ACTIVE").length,
      trainers: users.filter((user) => user.role === "FORMATEUR").length,
      learners: users.filter((user) => user.role === "APPRENANT").length,
    }),
    [users],
  );

  const normalizedQuery = query.trim().toLowerCase();

  function matchesQuery(user: AdminUserSummary): boolean {
    if (!normalizedQuery) return true;

    return [
      fullName(user),
      user.email,
      roleLabel(user.role),
      statusLabel(user.accountStatus),
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  }

  const roleCountBase = useMemo(
    () =>
      users.filter((user) => {
        if (!matchesQuery(user)) return false;

        return (
          statusFilter === "ALL" ||
          user.accountStatus === statusFilter
        );
      }),
    [normalizedQuery, statusFilter, users],
  );

  const statusCountBase = useMemo(
    () =>
      users.filter((user) => {
        if (!matchesQuery(user)) return false;

        return roleFilter === "ALL" || user.role === roleFilter;
      }),
    [normalizedQuery, roleFilter, users],
  );

  const roleCounts = useMemo(
    () => ({
      ALL: roleCountBase.length,
      ADMIN: roleCountBase.filter((user) => user.role === "ADMIN").length,
      FORMATEUR: roleCountBase.filter((user) => user.role === "FORMATEUR").length,
      APPRENANT: roleCountBase.filter((user) => user.role === "APPRENANT").length,
    }),
    [roleCountBase],
  );

  const statusCounts = useMemo(
    () => ({
      ALL: statusCountBase.length,
      ACTIVE: statusCountBase.filter(
        (user) => user.accountStatus === "ACTIVE",
      ).length,
      DISABLED: statusCountBase.filter(
        (user) => user.accountStatus === "DISABLED",
      ).length,
      SUSPENDED: statusCountBase.filter(
        (user) => user.accountStatus === "SUSPENDED",
      ).length,
    }),
    [statusCountBase],
  );

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        if (!matchesQuery(user)) return false;

        if (roleFilter !== "ALL" && user.role !== roleFilter) {
          return false;
        }

        if (
          statusFilter !== "ALL" &&
          user.accountStatus !== statusFilter
        ) {
          return false;
        }

        return true;
      }),
    [normalizedQuery, roleFilter, statusFilter, users],
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  const paginatedUsers = useMemo(
    () =>
      filteredUsers.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [currentPage, filteredUsers],
  );

  const paginationItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages],
  );

  useEffect(() => {
    setCurrentPage(1);
    setManagedUserId(null);
  }, [query, roleFilter, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  async function confirmChange() {
    if (!pending || working) return;

    if (pending.user.id === currentUserId) {
      setError(
        "Par sécurité, vous ne pouvez pas modifier votre propre rôle ou votre propre statut depuis l’application mobile.",
      );
      setPending(null);
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");

    try {
      const updated =
        pending.kind === "role"
          ? await updateAdminUserRole(pending.user.id, pending.value)
          : await updateAdminUserStatus(pending.user.id, pending.value);

      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );

      setNotice(
        pending.kind === "role"
          ? `Le rôle de ${fullName(updated)} a été mis à jour.`
          : `Le statut de ${fullName(updated)} a été mis à jour.`,
      );

      setPending(null);
    } catch {
      setError("La modification n’a pas pu être enregistrée.");
    } finally {
      setWorking(false);
    }
  }

  function resetFilters() {
    setQuery("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
  }

  function changePage(page: number) {
    const next = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(next);
    setManagedUserId(null);
    scrollRef.current?.scrollTo({ y: 560, animated: true });
  }

  if (loading) {
    return <LoadingState message="Chargement des utilisateurs..." />;
  }

  return (
    <ScreenContainer edges={["left", "right"]} style={{ paddingBottom: 0 }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="pb-0"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View className="w-full max-w-[980px] self-center">
            <View
              className="mb-4 overflow-hidden rounded-[22px] border bg-white"
              style={{ borderColor: "#E5DFE8" }}
            >
              <View className="h-1 bg-[#7C3AED]" />

              <View className="p-4">
                <View className="flex-row items-start">
                  <View className="h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#F1E9FF]">
                    <SymbolView
                      name={{
                        ios: "person.2.fill",
                        android: "group",
                        web: "group",
                      }}
                      tintColor="#7C3AED"
                      size={18}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1">
                    <Text className="text-[10px] font-black uppercase tracking-[0.85px] text-[#7C3AED]">
                      Gestion des accès
                    </Text>
                    <Text
                      className="mt-0.5 text-[23px] font-black leading-[28px]"
                      style={{ color: theme.colors.foreground }}
                    >
                      Utilisateurs
                    </Text>
                    <Text
                      className="mt-1.5 text-[11px] leading-[17px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Gérez les comptes, rôles et statuts depuis un espace unique.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <AdminUserManagementNav active="users" />

            <View className="mb-4 gap-2.5">
              <View className="flex-row gap-2.5">
                <MetricCard
                  label="Comptes"
                  value={stats.accounts}
                  icon={{
                    ios: "person.2.fill",
                    android: "group",
                    web: "group",
                  }}
                  background="#F3EEFF"
                  foreground="#7C3AED"
                  accent="#7C3AED"
                />
                <MetricCard
                  label="Actifs"
                  value={stats.active}
                  icon={{
                    ios: "checkmark.circle.fill",
                    android: "check_circle",
                    web: "check_circle",
                  }}
                  background="#EAFBF3"
                  foreground="#16845A"
                  accent="#10B981"
                />
              </View>

              <View className="flex-row gap-2.5">
                <MetricCard
                  label="Formateurs"
                  value={stats.trainers}
                  icon={{
                    ios: "person.crop.rectangle.stack.fill",
                    android: "badge",
                    web: "badge",
                  }}
                  background="#EEF4FF"
                  foreground="#2563EB"
                  accent="#3B82F6"
                />
                <MetricCard
                  label="Apprenants"
                  value={stats.learners}
                  icon={{
                    ios: "graduationcap.fill",
                    android: "school",
                    web: "school",
                  }}
                  background="#FFF4E8"
                  foreground="#B45309"
                  accent="#F59E0B"
                />
              </View>
            </View>

            <AdminCreateUserCard
              onCreated={(created) => {
                setUsers((current) => [created, ...current]);
                setCurrentPage(1);
                setNotice(
                  `Le compte de ${fullName(created)} a été créé. Un lien de définition du mot de passe a été envoyé par e-mail.`,
                );
              }}
            />

            <View
              className="mb-4 rounded-[22px] border bg-white p-4"
              style={{ borderColor: "#E5DFE8" }}
            >
              <View className="mb-2.5 flex-row items-end justify-between">
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[17px] font-black"
                    style={{ color: theme.colors.foreground }}
                  >
                    Rechercher et filtrer
                  </Text>
                  <Text
                    className="mt-1 text-[10px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Nom, e-mail, rôle ou statut
                  </Text>
                </View>

                {roleFilter !== "ALL" ||
                statusFilter !== "ALL" ||
                query.trim() ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Réinitialiser les filtres"
                    onPress={resetFilters}
                    className="rounded-full bg-[#F3EEFF] px-2.5 py-1.5"
                  >
                    <Text className="text-[8px] font-black text-[#7C3AED]">
                      Réinitialiser
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <View
                className="flex-row items-center rounded-[14px] border bg-[#FCFBFD] px-3"
                style={{ borderColor: "#E5DFE8" }}
              >
                <SymbolView
                  name={{
                    ios: "magnifyingglass",
                    android: "search",
                    web: "search",
                  }}
                  tintColor={theme.colors.foregroundSubtle}
                  size={15}
                />
                <TextInput
                  accessibilityLabel="Rechercher un utilisateur"
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Rechercher un compte"
                  placeholderTextColor={theme.colors.foregroundSubtle}
                  className="ml-2 h-[50px] min-w-0 flex-1 text-[13px]"
                  style={{ color: theme.colors.foreground }}
                />
              </View>

              <FilterBlock
                label="Rôle"
                helper="Filtrer par type de compte"
              >
                <FilterChip
                  label="Tous"
                  count={roleCounts.ALL}
                  selected={roleFilter === "ALL"}
                  onPress={() => setRoleFilter("ALL")}
                />
                {ADMIN_USER_ROLES.map((role) => (
                  <FilterChip
                    key={role}
                    label={roleLabel(role)}
                    count={roleCounts[role as keyof typeof roleCounts] ?? 0}
                    selected={roleFilter === role}
                    onPress={() => setRoleFilter(role)}
                  />
                ))}
              </FilterBlock>

              <FilterBlock
                label="Statut"
                helper="Filtrer par disponibilité"
                last
              >
                <FilterChip
                  label="Tous"
                  count={statusCounts.ALL}
                  selected={statusFilter === "ALL"}
                  onPress={() => setStatusFilter("ALL")}
                />
                {ADMIN_ACCOUNT_STATUSES.map((status) => (
                  <FilterChip
                    key={status}
                    label={statusLabel(status)}
                    count={
                      statusCounts[status as keyof typeof statusCounts] ?? 0
                    }
                    selected={statusFilter === status}
                    onPress={() => setStatusFilter(status)}
                  />
                ))}
              </FilterBlock>
            </View>

            {error ? (
              <AlertCard
                kind="error"
                title="Une action nécessite votre attention"
                message={error}
                actionLabel="Réessayer"
                onAction={() => {
                  setError("");
                  void load().catch(() =>
                    setError("Impossible de charger les utilisateurs."),
                  );
                }}
              />
            ) : null}

            {notice ? (
              <AlertCard
                kind="success"
                title="Modification enregistrée"
                message={notice}
              />
            ) : null}

            <View className="mb-2.5 flex-row items-end justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text
                  className="text-[20px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  Liste des comptes
                </Text>
                <Text
                  className="mt-0.5 text-[9px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Gérez les comptes autres que le vôtre.
                </Text>
              </View>

              <View className="rounded-full bg-[#F3EEFF] px-3 py-1.5">
                <Text className="text-[9px] font-black text-[#7C3AED]">
                  {filteredUsers.length} résultat
                  {filteredUsers.length > 1 ? "s" : ""}
                </Text>
              </View>
            </View>

            <View className="gap-2.5">
              {paginatedUsers.map((user) => {
                const isSelf = user.id === currentUserId;
                const expanded = managedUserId === user.id;
                const tone = statusTone(user.accountStatus);

                return (
                  <View
                    key={user.id}
                    className="overflow-hidden rounded-[20px] border bg-white"
                    style={{ borderColor: "#E5DFE8" }}
                  >
                    <View className="p-3.5">
                      <View className="flex-row items-start">
                        {user.avatarDataUrl ? (
                          <Image
                            source={{ uri: user.avatarDataUrl }}
                            className="h-12 w-12 shrink-0 rounded-[15px]"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#F1E9FF]">
                            <Text
                              className="text-[15px] font-black"
                              style={{ color: theme.colors.foreground }}
                            >
                              {initials(user)}
                            </Text>
                          </View>
                        )}

                        <View className="ml-3 min-w-0 flex-1">
                          <View className="flex-row items-start">
                            <View className="min-w-0 flex-1">
                              <Text
                                numberOfLines={1}
                                className="text-[14px] font-black"
                                style={{ color: theme.colors.foreground }}
                              >
                                {fullName(user)}
                              </Text>
                              <Text
                                numberOfLines={1}
                                className="mt-0.5 text-[9px]"
                                style={{ color: theme.colors.foregroundMuted }}
                              >
                                {user.email}
                              </Text>
                            </View>

                            {isSelf ? (
                              <View className="ml-2 rounded-full bg-[#F3EEFF] px-2 py-1">
                                <Text className="text-[7px] font-black uppercase text-[#7C3AED]">
                                  Votre compte
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          <View className="mt-2 flex-row flex-wrap gap-1.5">
                            <View
                              className="flex-row items-center rounded-full px-2.5 py-1.5"
                              style={{ backgroundColor: tone.background }}
                            >
                              <View
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: tone.dot }}
                              />
                              <Text
                                className="ml-1.5 text-[10px] font-black"
                                style={{ color: tone.foreground }}
                              >
                                {statusLabel(user.accountStatus)}
                              </Text>
                            </View>

                            <View className="rounded-full bg-[#F7F3FA] px-2.5 py-1.5">
                              <Text
                                className="text-[12px] font-black"
                                style={{ color: theme.colors.foregroundMuted }}
                              >
                                {roleLabel(user.role)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {isSelf ? (
                        <View className="mt-2.5 flex-row items-start rounded-[13px] bg-[#F7F3FC] px-2.5 py-2.5">
                          <SymbolView
                            name={{
                              ios: "lock.fill",
                              android: "lock",
                              web: "lock",
                            }}
                            tintColor="#7C3AED"
                            size={10}
                          />
                          <Text
                            className="ml-2 min-w-0 flex-1 text-[8px] leading-[13px]"
                            style={{ color: theme.colors.foregroundMuted }}
                          >
                            Votre rôle et votre statut sont protégés sur mobile.
                          </Text>
                        </View>
                      ) : (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Gérer ${fullName(user)}`}
                          accessibilityState={{ expanded }}
                          onPress={() =>
                            setManagedUserId((current) =>
                              current === user.id ? null : user.id,
                            )
                          }
                          className="mt-3 flex-row items-center justify-between rounded-[14px] bg-[#F7F3FC] px-3 py-3"
                        >
                          <View className="flex-row items-center">
                            <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-white">
                              <SymbolView
                                name={{
                                  ios: "slider.horizontal.3",
                                  android: "tune",
                                  web: "tune",
                                }}
                                tintColor="#7C3AED"
                                size={10}
                                weight="bold"
                              />
                            </View>
                            <Text className="ml-2.5 text-[10px] font-black text-[#7C3AED]">
                              {expanded ? "Masquer la gestion" : "Gérer ce compte"}
                            </Text>
                          </View>

                          <SymbolView
                            name={{
                              ios: expanded ? "chevron.up" : "chevron.right",
                              android: expanded
                                ? "keyboard_arrow_up"
                                : "chevron_right",
                              web: expanded
                                ? "keyboard_arrow_up"
                                : "chevron_right",
                            }}
                            tintColor="#7C3AED"
                            size={11}
                            weight="bold"
                          />
                        </Pressable>
                      )}
                    </View>

                    {!isSelf && expanded ? (
                      <View className="border-t border-[#EEE9F0] bg-[#FCFBFD] px-3.5 pb-3.5 pt-3.5">
                        <ActionGroup
                          label="Rôle"
                          helper="Choisissez le niveau d’accès"
                        >
                          {ADMIN_USER_ROLES.map((role) => (
                            <ActionChip
                              key={role}
                              label={roleLabel(role)}
                              selected={user.role === role}
                              disabled={working}
                              onPress={() =>
                                setPending({
                                  kind: "role",
                                  user,
                                  value: role,
                                })
                              }
                            />
                          ))}
                        </ActionGroup>

                        <ActionGroup
                          label="Statut"
                          helper="Contrôlez l’accès au compte"
                          last
                        >
                          {ADMIN_ACCOUNT_STATUSES.map((status) => (
                            <ActionChip
                              key={status}
                              label={statusLabel(status)}
                              selected={user.accountStatus === status}
                              disabled={working}
                              onPress={() =>
                                setPending({
                                  kind: "status",
                                  user,
                                  value: status,
                                })
                              }
                            />
                          ))}
                        </ActionGroup>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>

            {filteredUsers.length === 0 ? (
              <View
                className="mt-3 items-center rounded-[18px] border bg-white px-5 py-7"
                style={{ borderColor: "#E5DFE8" }}
              >
                <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-[#F1E9FF]">
                  <SymbolView
                    name={{
                      ios: "person.2",
                      android: "group",
                      web: "group",
                    }}
                    tintColor="#7C3AED"
                    size={17}
                  />
                </View>
                <Text
                  className="mt-2.5 text-[13px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  Aucun utilisateur trouvé
                </Text>
                <Text
                  className="mt-1 text-center text-[9px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Modifiez la recherche ou les filtres.
                </Text>
              </View>
            ) : (
              <View
                className="mb-1 mt-4 rounded-[22px] border bg-white px-3 py-3"
                style={{ borderColor: theme.colors.border }}
              >
                <View className="mb-3 flex-row items-center justify-between">
                  <Text
                    className="text-[13px] font-bold"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    {filteredUsers.length} compte
                    {filteredUsers.length > 1 ? "s" : ""}
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
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={Boolean(pending)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (!working) setPending(null);
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/55 px-5 py-8">
          {pending ? (() => {
            const isRoleChange = pending.kind === "role";
            const isSuspend =
              pending.kind === "status" && pending.value === "SUSPENDED";
            const isDisable =
              pending.kind === "status" && pending.value === "DISABLED";
            const isActivate =
              pending.kind === "status" && pending.value === "ACTIVE";

            const accent = isDisable
              ? "#C2413D"
              : isSuspend
                ? "#B45309"
                : isActivate
                  ? "#16845A"
                  : "#7C3AED";

            const accentSoft = isDisable
              ? "#FFF0EE"
              : isSuspend
                ? "#FFF5E8"
                : isActivate
                  ? "#EAFBF3"
                  : "#F3EEFF";

            const accentBorder = isDisable
              ? "#F2C6C3"
              : isSuspend
                ? "#F1D7B5"
                : isActivate
                  ? "#BFECD7"
                  : "#DDD1F5";

            const eyebrow = isRoleChange
              ? "MODIFICATION DU RÔLE"
              : isSuspend
                ? "SUSPENSION DU COMPTE"
                : isDisable
                  ? "DÉSACTIVATION DU COMPTE"
                  : "RÉACTIVATION DU COMPTE";

            const modalTitle = isRoleChange
              ? "Confirmer le nouveau rôle"
              : isSuspend
                ? "Suspendre ce compte ?"
                : isDisable
                  ? "Désactiver ce compte ?"
                  : "Réactiver ce compte ?";

            const actionLabel = isRoleChange
              ? "Confirmer le rôle"
              : isSuspend
                ? "Suspendre"
                : isDisable
                  ? "Désactiver"
                  : "Réactiver";

            const impactText = isRoleChange
              ? "Les permissions de ce compte seront mises à jour immédiatement."
              : isSuspend
                ? "L’accès sera temporairement suspendu. Vous pourrez réactiver le compte ultérieurement."
                : isDisable
                  ? "Le compte ne pourra plus accéder à SmartTraining tant qu’il ne sera pas réactivé."
                  : "L’utilisateur retrouvera immédiatement l’accès à son compte.";

            const currentValue = isRoleChange
              ? roleLabel(pending.user.role)
              : statusLabel(pending.user.accountStatus);

            const nextValue = isRoleChange
              ? roleLabel(pending.value)
              : statusLabel(pending.value);

            return (
              <View
                className="w-full max-w-[500px] overflow-hidden rounded-[26px] border bg-white"
                style={{ borderColor: accentBorder }}
              >
                <View className="h-1.5" style={{ backgroundColor: accent }} />

                <View className="p-4">
                  <View className="flex-row items-start justify-between">
                    <View
                      className="h-12 w-12 items-center justify-center rounded-[15px]"
                      style={{ backgroundColor: accentSoft }}
                    >
                      <SymbolView
                        name={{
                          ios: isRoleChange
                            ? "person.crop.circle.badge.checkmark"
                            : isSuspend
                              ? "pause.circle.fill"
                              : isDisable
                                ? "nosign"
                                : "checkmark.circle.fill",
                          android: isRoleChange
                            ? "manage_accounts"
                            : isSuspend
                              ? "pause_circle"
                              : isDisable
                                ? "block"
                                : "check_circle",
                          web: isRoleChange
                            ? "manage_accounts"
                            : isSuspend
                              ? "pause_circle"
                              : isDisable
                                ? "block"
                                : "check_circle",
                        }}
                        tintColor={accent}
                        size={20}
                        weight="bold"
                      />
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Fermer"
                      disabled={working}
                      onPress={() => setPending(null)}
                      className="h-9 w-9 items-center justify-center rounded-[11px] bg-[#F7F5F8]"
                      style={{ opacity: working ? 0.45 : 1 }}
                    >
                      <SymbolView
                        name={{
                          ios: "xmark",
                          android: "close",
                          web: "close",
                        }}
                        tintColor={theme.colors.foregroundMuted}
                        size={12}
                        weight="bold"
                      />
                    </Pressable>
                  </View>

                  <Text
                    className="mt-3 text-[9px] font-black tracking-[0.7px]"
                    style={{ color: accent }}
                  >
                    {eyebrow}
                  </Text>

                  <Text
                    className="mt-1 text-[20px] font-black leading-[25px]"
                    style={{ color: theme.colors.foreground }}
                  >
                    {modalTitle}
                  </Text>

                  <Text
                    className="mt-1.5 text-[10px] leading-[16px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Vérifiez les informations avant de confirmer cette action.
                  </Text>

                  <View
                    className="mt-4 flex-row items-center rounded-[16px] border bg-[#FCFBFD] p-3"
                    style={{ borderColor: "#E9E3EC" }}
                  >
                    {pending.user.avatarDataUrl ? (
                      <Image
                        source={{ uri: pending.user.avatarDataUrl }}
                        className="h-11 w-11 shrink-0 rounded-[14px]"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#F1E9FF]">
                        <Text
                          className="text-[14px] font-black"
                          style={{ color: theme.colors.foreground }}
                        >
                          {initials(pending.user)}
                        </Text>
                      </View>
                    )}

                    <View className="ml-3 min-w-0 flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-[12px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        {fullName(pending.user)}
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="mt-0.5 text-[9px]"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        {pending.user.email}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3 flex-row items-center gap-2">
                    <View
                      className="min-w-0 flex-1 rounded-[14px] border px-3 py-2.5"
                      style={{
                        backgroundColor: "#FAF9FB",
                        borderColor: "#E9E3EC",
                      }}
                    >
                      <Text
                        className="text-[8px] font-black uppercase tracking-[0.5px]"
                        style={{ color: theme.colors.foregroundSubtle }}
                      >
                        Actuellement
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="mt-1 text-[11px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        {currentValue}
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
                        size={11}
                        weight="bold"
                      />
                    </View>

                    <View
                      className="min-w-0 flex-1 rounded-[14px] border px-3 py-2.5"
                      style={{
                        backgroundColor: accentSoft,
                        borderColor: accentBorder,
                      }}
                    >
                      <Text
                        className="text-[8px] font-black uppercase tracking-[0.5px]"
                        style={{ color: accent }}
                      >
                        Après confirmation
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="mt-1 text-[11px] font-black"
                        style={{ color: accent }}
                      >
                        {nextValue}
                      </Text>
                    </View>
                  </View>

                  <View
                    className="mt-3 flex-row items-start rounded-[14px] px-3 py-3"
                    style={{ backgroundColor: accentSoft }}
                  >
                    <SymbolView
                      name={{
                        ios: "info.circle.fill",
                        android: "info",
                        web: "info",
                      }}
                      tintColor={accent}
                      size={13}
                    />
                    <View className="ml-2.5 min-w-0 flex-1">
                      <Text
                        className="text-[9px] font-black"
                        style={{ color: accent }}
                      >
                        Ce qui va changer
                      </Text>
                      <Text
                        className="mt-0.5 text-[9px] leading-[14px]"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        {impactText}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-4 flex-row gap-2">
                    <Pressable
                      accessibilityRole="button"
                      disabled={working}
                      onPress={() => setPending(null)}
                      className="h-[46px] flex-1 items-center justify-center rounded-[13px] border bg-white"
                      style={{
                        borderColor: "#E5DFE8",
                        opacity: working ? 0.5 : 1,
                      }}
                    >
                      <Text
                        className="text-[11px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        Annuler
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      disabled={working}
                      onPress={() => void confirmChange()}
                      className="h-[46px] flex-1 flex-row items-center justify-center rounded-[13px]"
                      style={{
                        backgroundColor: accent,
                        opacity: working ? 0.65 : 1,
                      }}
                    >
                      <SymbolView
                        name={{
                          ios: working
                            ? "clock.fill"
                            : isDisable
                              ? "nosign"
                              : isSuspend
                                ? "pause.fill"
                                : "checkmark",
                          android: working
                            ? "schedule"
                            : isDisable
                              ? "block"
                              : isSuspend
                                ? "pause"
                                : "check",
                          web: working
                            ? "schedule"
                            : isDisable
                              ? "block"
                              : isSuspend
                                ? "pause"
                                : "check",
                        }}
                        tintColor="#FFFFFF"
                        size={11}
                        weight="bold"
                      />
                      <Text className="ml-2 text-[11px] font-black text-white">
                        {working ? "Enregistrement..." : actionLabel}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })() : null}
        </View>
      </Modal>
    </ScreenContainer>
  );

  function MetricCard({
    label,
    value,
    icon,
    background,
    foreground,
    accent,
  }: {
    label: string;
    value: number;
    icon: React.ComponentProps<typeof SymbolView>["name"];
    background: string;
    foreground: string;
    accent: string;
  }) {
    return (
      <View
        className="min-h-[104px] flex-1 overflow-hidden rounded-[20px] border bg-white"
        style={{ borderColor: "#E5DFE8" }}
      >
        <View className="h-[3px]" style={{ backgroundColor: accent }} />

        <View className="px-4 py-3.5">
          <View className="flex-row items-center justify-between">
            <View
              className="h-11 w-11 items-center justify-center rounded-[13px]"
              style={{ backgroundColor: background }}
            >
              <SymbolView
                name={icon}
                tintColor={foreground}
                size={17}
                weight="bold"
              />
            </View>

            <Text
              className="text-[26px] font-black"
              style={{ color: theme.colors.foreground }}
            >
              {value}
            </Text>
          </View>

          <Text
            className="mt-2.5 text-[11px] font-black"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {label}
          </Text>
        </View>
      </View>
    );
  }

  function FilterBlock({
    label,
    helper,
    children,
    last = false,
  }: {
    label: string;
    helper: string;
    children: ReactNode;
    last?: boolean;
  }) {
    return (
      <View className={last ? "mt-3" : "mt-3 border-b border-[#EEE9F0] pb-3"}>
        <View className="mb-2">
          <Text
            className="text-[11px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {label}
          </Text>
          <Text
            className="mt-1 text-[9px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {helper}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, paddingRight: 4 }}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  function FilterChip({
    label,
    count,
    selected,
    onPress,
  }: {
    label: string;
    count: number;
    selected: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        onPress={onPress}
        className="h-[46px] flex-row items-center rounded-[13px] border px-3.5"
        style={{
          backgroundColor: selected ? "#7C3AED" : "#FFFFFF",
          borderColor: selected ? "#7C3AED" : "#E5DFE8",
        }}
      >
        <Text
          className="text-[11px] font-black"
          style={{
            color: selected ? "#FFFFFF" : theme.colors.foregroundMuted,
          }}
        >
          {label}
        </Text>
        <View
          className="ml-2 min-w-[22px] items-center rounded-full px-1.5 py-1"
          style={{
            backgroundColor: selected
              ? "rgba(255,255,255,0.18)"
              : "#F3EEFF",
          }}
        >
          <Text
            className="text-[8px] font-black"
            style={{ color: selected ? "#FFFFFF" : "#7C3AED" }}
          >
            {count}
          </Text>
        </View>
      </Pressable>
    );
  }

  function ActionGroup({
    label,
    helper,
    children,
    last = false,
  }: {
    label: string;
    helper: string;
    children: ReactNode;
    last?: boolean;
  }) {
    return (
      <View className={last ? "mt-3" : "border-b border-[#EEE9F0] pb-3"}>
        <Text
          className="text-[11px] font-black"
          style={{ color: theme.colors.foreground }}
        >
          {label}
        </Text>
        <Text
          className="mt-1 text-[9px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {helper}
        </Text>

        <View className="mt-2 flex-row flex-wrap gap-1.5">{children}</View>
      </View>
    );
  }

  function ActionChip({
    label,
    selected,
    disabled,
    onPress,
  }: {
    label: string;
    selected: boolean;
    disabled: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{
          selected,
          disabled: disabled || selected,
        }}
        disabled={disabled || selected}
        onPress={onPress}
        className="h-[42px] justify-center rounded-[12px] border px-3.5"
        style={{
          backgroundColor: selected ? "#F3EEFF" : "#FFFFFF",
          borderColor: selected ? "#7C3AED" : "#E5DFE8",
          opacity: disabled && !selected ? 0.45 : 1,
        }}
      >
        <Text
          className="text-[11px] font-black"
          style={{
            color: selected ? "#7C3AED" : theme.colors.foregroundMuted,
          }}
        >
          {label}
        </Text>
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
              : theme.colors.foregroundMuted
          }
          size={13}
          weight="bold"
        />
      </Pressable>
    );
  }

  function AlertCard({
    kind,
    title,
    message,
    actionLabel,
    onAction,
  }: {
    kind: "error" | "success";
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  }) {
    const isError = kind === "error";

    return (
      <View
        className="mb-3 flex-row items-start rounded-[15px] border px-3 py-3"
        style={{
          backgroundColor: isError ? "#FFF4F2" : "#EAFBF3",
          borderColor: isError ? "#F2C6C3" : "#BFECD7",
        }}
      >
        <SymbolView
          name={{
            ios: isError
              ? "exclamationmark.triangle.fill"
              : "checkmark.circle.fill",
            android: isError ? "error" : "check_circle",
            web: isError ? "error" : "check_circle",
          }}
          tintColor={isError ? "#C2413D" : "#16845A"}
          size={13}
          weight="bold"
        />

        <View className="ml-2.5 min-w-0 flex-1">
          <Text
            className="text-[11px] font-black"
            style={{ color: isError ? "#C2413D" : "#16845A" }}
          >
            {title}
          </Text>
          <Text
            className="mt-0.5 text-[8px] leading-[13px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {message}
          </Text>
        </View>

        {actionLabel && onAction ? (
          <Pressable onPress={onAction} className="ml-2 rounded-full bg-white px-2 py-1">
            <Text
              className="text-[8px] font-black"
              style={{ color: isError ? "#C2413D" : "#16845A" }}
            >
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
}

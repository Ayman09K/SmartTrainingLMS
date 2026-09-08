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
import { LearnerListItem } from "../../components/ux/RichPrimitives";
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

function fullName(user: AdminUserSummary): string {
  const explicit = user.fullName?.trim();
  if (explicit) {
    return explicit;
  }

  const computed = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return computed || user.email;
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

export default function AdminUsersScreen({ currentUserId }: Props) {
  const { theme } = useSmartTrainingTheme();
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

  async function load() {
    const data = await getAdminUsers();
    setUsers(data);
  }

  useEffect(() => {
    let active = true;

    void getAdminUsers()
      .then((data) => {
        if (active) {
          setUsers(data);
        }
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger les utilisateurs.");
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

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return users.filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) {
        return false;
      }

      if (
        statusFilter !== "ALL" &&
        user.accountStatus !== statusFilter
      ) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [
        fullName(user),
        user.email,
        roleLabel(user.role),
        statusLabel(user.accountStatus),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [query, roleFilter, statusFilter, users]);

  async function confirmChange() {
    if (!pending || working) {
      return;
    }

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
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
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

  if (loading) {
    return <LoadingState message="Chargement des utilisateurs..." />;
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
            title="Utilisateurs"
            subtitle="Recherchez un compte et gérez son rôle ou son statut avec confirmation."
          />

          <AdminUserManagementNav active="users" />

          <AdminCreateUserCard
            onCreated={(created) => {
              setUsers((current) => [created, ...current]);
              setNotice(
                `Le compte de ${fullName(created)} a été créé. Un lien de définition du mot de passe a été envoyé par e-mail.`,
              );
            }}
          />

          <TextInput
            accessibilityLabel="Rechercher un utilisateur"
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher par nom, e-mail, rôle ou statut"
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

          <Text
            style={[
              styles.filterTitle,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            RÔLE
          </Text>
          <View style={styles.chips}>
            <FilterChip
              label="Tous"
              selected={roleFilter === "ALL"}
              onPress={() => setRoleFilter("ALL")}
            />
            {ADMIN_USER_ROLES.map((role) => (
              <FilterChip
                key={role}
                label={roleLabel(role)}
                selected={roleFilter === role}
                onPress={() => setRoleFilter(role)}
              />
            ))}
          </View>

          <Text
            style={[
              styles.filterTitle,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            STATUT
          </Text>
          <View style={styles.chips}>
            <FilterChip
              label="Tous"
              selected={statusFilter === "ALL"}
              onPress={() => setStatusFilter("ALL")}
            />
            {ADMIN_ACCOUNT_STATUSES.map((status) => (
              <FilterChip
                key={status}
                label={statusLabel(status)}
                selected={statusFilter === status}
                onPress={() => setStatusFilter(status)}
              />
            ))}
          </View>

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => {
                setError("");
                void load().catch(() =>
                  setError("Impossible de charger les utilisateurs."),
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
            {filteredUsers.length} compte
            {filteredUsers.length > 1 ? "s" : ""}
          </Text>

          <View style={styles.list}>
            {filteredUsers.map((user) => {
              const isSelf = user.id === currentUserId;

              return (
                <View
                  key={user.id}
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
                      <LearnerListItem
                        name={fullName(user)}
                        email={user.email}
                        subtitle={`${roleLabel(user.role)} · ${statusLabel(user.accountStatus)}`}
                        avatarUrl={user.avatarDataUrl}
                      />
                    </View>

                    {isSelf ? (
                      <View
                        style={[
                          styles.selfBadge,
                          {
                            backgroundColor: theme.colors.surfaceSoft,
                            borderColor: theme.colors.accent,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.selfBadgeText,
                            { color: theme.colors.accent },
                          ]}
                        >
                          VOTRE COMPTE
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {isSelf ? (
                    <Text
                      style={[
                        styles.selfHelp,
                        { color: theme.colors.foregroundMuted },
                      ]}
                    >
                      Votre rôle et votre statut sont protégés sur mobile.
                    </Text>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Gérer ${fullName(user)}`}
                      accessibilityState={{ expanded: managedUserId === user.id }}
                      onPress={() =>
                        setManagedUserId((current) =>
                          current === user.id ? null : user.id,
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
                          { color: theme.colors.accent },
                        ]}
                      >
                        {managedUserId === user.id ? "Masquer" : "Gérer ›"}
                      </Text>
                    </Pressable>
                  )}

                  {!isSelf && managedUserId === user.id ? (
                    <View style={styles.managePanel}>
                      <Text
                        style={[
                          styles.sectionLabel,
                          { color: theme.colors.foregroundSubtle },
                        ]}
                      >
                        RÔLE
                      </Text>
                      <View style={styles.chips}>
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
                      </View>

                      <Text
                        style={[
                          styles.sectionLabel,
                          { color: theme.colors.foregroundSubtle },
                        ]}
                      >
                        STATUT
                      </Text>
                      <View style={styles.chips}>
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
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          {filteredUsers.length === 0 ? (
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
                Aucun utilisateur trouvé
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Modifiez la recherche ou les filtres.
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
              Confirmer la modification
            </Text>

            <Text
              style={[
                styles.confirmText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {pending.kind === "role"
                ? `Attribuer le rôle « ${roleLabel(pending.value)} » à ${fullName(pending.user)} ?`
                : `Passer le statut de ${fullName(pending.user)} à « ${statusLabel(pending.value)} » ?`}
            </Text>

            <View style={styles.confirmActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Annuler la modification"
                accessibilityState={{ disabled: working }}
                disabled={working}
                onPress={() => setPending(null)}
                style={[
                  styles.confirmButton,
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
                accessibilityRole="button"
                accessibilityLabel="Confirmer la modification"
                accessibilityState={{ disabled: working, busy: working }}
                disabled={working}
                onPress={() => void confirmChange()}
                style={[
                  styles.confirmButton,
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
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={[
          styles.chip,
          {
            backgroundColor: selected
              ? theme.colors.surfaceSoft
              : theme.colors.surface,
            borderColor: selected
              ? theme.colors.accent
              : theme.colors.border,
          },
        ]}
      >
        <Text
          style={{
            color: selected
              ? theme.colors.accent
              : theme.colors.foregroundMuted,
            fontWeight: selected ? "800" : "600",
          }}
        >
          {label}
        </Text>
      </Pressable>
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
        style={[
          styles.chip,
          {
            backgroundColor: selected
              ? theme.colors.surfaceSoft
              : theme.colors.surface,
            borderColor: selected
              ? theme.colors.accent
              : theme.colors.border,
            opacity: disabled && !selected ? 0.45 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: selected
              ? theme.colors.accent
              : theme.colors.foregroundMuted,
            fontWeight: selected ? "800" : "600",
          }}
        >
          {label}
        </Text>
      </Pressable>
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
    marginBottom: 18,
  },
  filterTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 8,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
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
    marginBottom: 8,
  },
  identity: { flexGrow: 1, flexShrink: 1 },
  name: { fontSize: 17, fontWeight: "900" },
  email: { fontSize: 12, marginTop: 3 },
  selfBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  selfBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  selfHelp: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  manageButton: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 4,
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  managePanel: {
    marginTop: 12,
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
  confirmCard: {
    width: "100%",
    maxWidth: 520,
    padding: 20,
  },
  confirmTitle: { fontSize: 19, fontWeight: "900" },
  confirmText: { fontSize: 14, lineHeight: 21, marginTop: 9 },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
  },
  confirmButton: {
    minWidth: 120,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
});

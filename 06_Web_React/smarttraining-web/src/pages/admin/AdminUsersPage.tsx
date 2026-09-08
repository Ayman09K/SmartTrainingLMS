import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import { Activity, ShieldCheck, UserCheck, UserPlus, Users } from "lucide-react";
import {
  createAdminUser,
  getAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
} from "../../api/adminApi";
import { getApiErrorMessage } from "../../api/apiClient";
import {
  SmartMetricCard,
  SmartPageHeader,
  SmartSectionCard,
} from "../../components/ui";
import { LearnerRow } from "../../components/ux/RichPrimitives";
import { smartConfirm } from "../../components/ux/smartConfirmService";
import { AdminUserManagementNav } from "../../components/admin/AdminUserManagementNav";
import type {
  AccountStatus,
  AdminCreateUserRequest,
  AuthUser,
  UserRole,
} from "../../types/admin";

const roles: UserRole[] = ["APPRENANT", "FORMATEUR", "ADMIN"];
const statuses: AccountStatus[] = ["ACTIVE", "DISABLED", "SUSPENDED", "PENDING"];

const roleLabels: Record<UserRole, string> = {
  APPRENANT: "Apprenant",
  FORMATEUR: "Formateur",
  ADMIN: "Administrateur",
};

const statusLabels: Record<AccountStatus, string> = {
  ACTIVE: "Actif",
  DISABLED: "Désactivé",
  SUSPENDED: "Suspendu",
  PENDING: "En attente",
};

const initialForm: AdminCreateUserRequest = {
  firstName: "",
  lastName: "",
  email: "",
  role: "APPRENANT",
  accountStatus: "ACTIVE",
};

function displayName(user: AuthUser): string {
  return (
    user.fullName ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    "Nom non renseigné"
  );
}

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [form, setForm] = useState<AdminCreateUserRequest>(initialForm);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      setUsers(await getAdminUsers());
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await createAdminUser(form);
      setForm(initialForm);
      setSuccess("Utilisateur créé. Un lien sécurisé lui permet de définir son mot de passe par e-mail.");
      await loadUsers();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRoleChange(userId: number, role: UserRole) {
    // PATCH15BIS_H_CONFIRM_ROLE_CHANGE
    const target = users.find((item) => item.id === userId);
    const targetLabel =
      target?.fullName?.trim() ||
      [target?.firstName, target?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      target?.email ||
      "cet utilisateur";
    const nextRoleLabel =
      role === "ADMIN"
        ? "Administrateur"
        : role === "FORMATEUR"
          ? "Formateur"
          : "Apprenant";

    if (
      !(await smartConfirm({
        title: "Changer le rôle utilisateur",
        description: `Confirmer le changement de rôle de ${targetLabel} vers ${nextRoleLabel} ?`,
        confirmLabel: "Changer le rôle",
      }))
    ) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await updateAdminUserRole(userId, role);
      setSuccess("Rôle mis à jour.");
      await loadUsers();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleStatusChange(
    userId: number,
    accountStatus: AccountStatus,
  ) {
    // PATCH15BIS_H_CONFIRM_STATUS_CHANGE
    const target = users.find((item) => item.id === userId);
    const targetLabel =
      target?.fullName?.trim() ||
      [target?.firstName, target?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      target?.email ||
      "cet utilisateur";
    const nextStatusLabel =
      accountStatus === "ACTIVE"
        ? "Actif"
        : accountStatus === "DISABLED"
          ? "Désactivé"
          : accountStatus === "SUSPENDED"
            ? "Suspendu"
            : accountStatus;

    if (
      !(await smartConfirm({
        title: "Changer le statut du compte",
        description: `Confirmer le changement de statut de ${targetLabel} vers ${nextStatusLabel} ?`,
        confirmLabel: "Changer le statut",
        destructive: accountStatus !== "ACTIVE",
      }))
    ) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await updateAdminUserStatus(userId, accountStatus);
      setSuccess("Statut du compte mis à jour.");
      await loadUsers();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }


  // WEB_VISUAL_3_ADMIN_DIRECTORY_SAFE_V1
  const activeUsersCount = useMemo(
    () =>
      users.filter(
        (user) => (user.accountStatus || "ACTIVE") === "ACTIVE",
      ).length,
    [users],
  );

  const learnerCount = useMemo(
    () => users.filter((user) => user.role === "APPRENANT").length,
    [users],
  );

  const staffCount = users.length - learnerCount;

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");

    return users.filter((user) => {
      const roleMatches =
        roleFilter === "ALL" || user.role === roleFilter;
      const statusMatches =
        statusFilter === "ALL" ||
        (user.accountStatus || "ACTIVE") === statusFilter;

      if (!roleMatches || !statusMatches) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [
        displayName(user),
        user.email,
        roleLabels[user.role],
        statusLabels[user.accountStatus || "ACTIVE"],
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(normalized);
    });
  }, [query, roleFilter, statusFilter, users]);

  const columns: GridColDef<AuthUser>[] = [
    {
      field: "fullName",
      headerName: "Utilisateur",
      minWidth: 220,
      flex: 1.2,
      sortable: true,
      renderCell: (params) => {
        const user = params.row;

        return (
          <LearnerRow
            name={displayName(user)}
            avatarUrl={user.avatarDataUrl}
          />
        );
      },
    },
    {
      field: "email",
      headerName: "Adresse e-mail",
      minWidth: 240,
      flex: 1.35,
    },
    {
      field: "role",
      headerName: "Rôle",
      minWidth: 180,
      flex: 0.9,
      sortable: true,
      renderCell: (params) => {
        const user = params.row;

        return (
          <FormControl size="small" fullWidth>
            <Select
              value={user.role}
              aria-label={`Rôle de ${displayName(user)}`}
              onChange={(event) =>
                void handleRoleChange(
                  user.id,
                  event.target.value as UserRole,
                )
              }
            >
              {roles.map((role) => (
                <MenuItem key={role} value={role}>
                  {roleLabels[role]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      },
    },
    {
      field: "accountStatus",
      headerName: "Statut",
      minWidth: 190,
      flex: 0.95,
      sortable: true,
      renderCell: (params) => {
        const user = params.row;

        return (
          <FormControl size="small" fullWidth>
            <Select
              value={user.accountStatus || "ACTIVE"}
              aria-label={`Statut de ${displayName(user)}`}
              onChange={(event) =>
                void handleStatusChange(
                  user.id,
                  event.target.value as AccountStatus,
                )
              }
            >
              {statuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {statusLabels[status]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      },
    },
    {
      field: "enabled",
      headerName: "Accès",
      minWidth: 125,
      flex: 0.65,
      sortable: true,
      renderCell: (params) => {
        const user = params.row;

        return (
          <Chip
            size="small"
            label={user.enabled === false ? "Bloqué" : "Autorisé"}
            color={user.enabled === false ? "default" : "success"}
            variant={user.enabled === false ? "outlined" : "filled"}
            sx={{ fontWeight: 800 }}
          />
        );
      },
    },
    {
      field: "activity",
      headerName: "Activité",
      minWidth: 160,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const row = params.row;

        if (row.role !== "APPRENANT") {
          return (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          );
        }

        return (
          <Button
            size="small"
            variant="outlined"
            startIcon={<Activity size={15} />}
            onClick={() => navigate(`/admin/users/${row.id}/activity`)}
          >
            Voir activité
          </Button>
        );
      },
    },  ];
  if (loading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} sx={{ alignItems: "center", color: "text.secondary" }}>
          <CircularProgress size={32} />
          <Typography variant="body2">Chargement des utilisateurs...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow="Gestion des utilisateurs"
        title="Utilisateurs"
        description="Créez les comptes et administrez les rôles ainsi que l'état d'accès des utilisateurs."
      />

      <AdminUserManagementNav active="users" />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        <SmartMetricCard
          label="Comptes"
          value={users.length}
          helper="Utilisateurs enregistrés"
          icon={<Users />}
        />
        <SmartMetricCard
          label="Actifs"
          value={activeUsersCount}
          helper="Accès opérationnel"
          icon={<UserCheck />}
        />
        <SmartMetricCard
          label="Apprenants"
          value={learnerCount}
          helper="Comptes apprenants"
          icon={<Users />}
        />
        <SmartMetricCard
          label="Équipe"
          value={staffCount}
          helper="Formateurs et administrateurs"
          icon={<ShieldCheck />}
        />
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <SmartSectionCard
        title="Créer un utilisateur"
        description="Renseignez l'identité et les droits. SmartTraining envoie ensuite un lien sécurisé pour définir le mot de passe."
      >
        <Box
          component="form"
          onSubmit={handleCreate}
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          <TextField
            label="Prénom"
            value={form.firstName}
            onChange={(event) =>
              setForm({ ...form, firstName: event.target.value })
            }
            required
            fullWidth
            autoComplete="given-name"
          />

          <TextField
            label="Nom"
            value={form.lastName}
            onChange={(event) =>
              setForm({ ...form, lastName: event.target.value })
            }
            required
            fullWidth
            autoComplete="family-name"
          />

          <TextField
            type="email"
            label="Adresse e-mail"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
            required
            fullWidth
            autoComplete="email"
          />


          <FormControl fullWidth>
            <InputLabel id="create-user-role-label">Rôle</InputLabel>
            <Select
              labelId="create-user-role-label"
              label="Rôle"
              value={form.role}
              onChange={(event) =>
                setForm({
                  ...form,
                  role: event.target.value as UserRole,
                })
              }
            >
              {roles.map((role) => (
                <MenuItem key={role} value={role}>
                  {roleLabels[role]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="create-user-status-label">
              Statut du compte
            </InputLabel>
            <Select
              labelId="create-user-status-label"
              label="Statut du compte"
              value={form.accountStatus || "ACTIVE"}
              onChange={(event) =>
                setForm({
                  ...form,
                  accountStatus: event.target.value as AccountStatus,
                })
              }
            >
              {statuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {statusLabels[status]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box
            sx={{
              gridColumn: { xs: "auto", md: "1 / -1" },
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Button
              type="submit"
              variant="contained"
              startIcon={<UserPlus size={18} />}
              disabled={actionLoading}
            >
              {actionLoading ? "Création..." : "Créer le compte"}
            </Button>
          </Box>
        </Box>
      </SmartSectionCard>


      <SmartSectionCard
        title="Annuaire et filtres"
        description={`${filteredUsers.length} résultat(s) sur ${users.length}. Recherchez par identité, e-mail, rôle ou statut.`}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(0, 2fr) minmax(180px, 0.8fr) minmax(180px, 0.8fr)",
            },
            gap: 2,
          }}
        >
          <TextField
            type="search"
            label="Rechercher"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nom, e-mail, rôle ou statut"
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel id="users-role-filter-label">Rôle</InputLabel>
            <Select
              labelId="users-role-filter-label"
              label="Rôle"
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value as UserRole | "ALL")
              }
            >
              <MenuItem value="ALL">Tous les rôles</MenuItem>
              {roles.map((role) => (
                <MenuItem key={role} value={role}>
                  {roleLabels[role]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="users-status-filter-label">Statut</InputLabel>
            <Select
              labelId="users-status-filter-label"
              label="Statut"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as AccountStatus | "ALL")
              }
            >
              <MenuItem value="ALL">Tous les statuts</MenuItem>
              {statuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {statusLabels[status]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </SmartSectionCard>

      <SmartSectionCard
        title="Comptes existants"
        description={`${filteredUsers.length} compte(s) affiché(s) sur ${users.length}.`}
      >
        {!filteredUsers.length ? (
          <Alert severity="info">
            {users.length
              ? "Aucun utilisateur ne correspond aux filtres."
              : "Aucun utilisateur disponible."}
          </Alert>
        ) : (
          <Box
            sx={{
              width: "100%",
              height: Math.min(720, Math.max(360, users.length * 54 + 118)),
            }}
          >
            <DataGrid<AuthUser>
              rows={filteredUsers}
              columns={columns}
              disableRowSelectionOnClick
              rowHeight={64}
              columnHeaderHeight={48}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: {
                  paginationModel: {
                    page: 0,
                    pageSize: 10,
                  },
                },
              }}
              sx={{
                border: 0,
                "& .MuiDataGrid-columnHeaders": {
                  bgcolor: "action.hover",
                  borderRadius: 2,
                },
                "& .MuiDataGrid-cell": {
                  alignItems: "center",
                  borderColor: "divider",
                },
                "& .MuiDataGrid-row:hover": {
                  bgcolor: "action.hover",
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: 900,
                  color: "text.secondary",
                },
                "& .MuiDataGrid-footerContainer": {
                  borderTopColor: "divider",
                },
              }}
            />
          </Box>
        )}
      </SmartSectionCard>
    </Stack>
  );
}
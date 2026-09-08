import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import {
  createLearnerGroup,
  deleteLearnerGroup,
  getLearnerGroups,
} from "../../api/learnerGroupApi";
import {
  resolveTrainerLearners,
} from "../../api/trainerLearnerOverviewApi";
import { getApiErrorMessage } from "../../api/apiClient";
import {
  SmartMetricCard,
  SmartPageHeader,
  SmartSectionCard,
} from "../../components/ui";
import { useAuth } from "../../features/auth/AuthContext";
import type { AuthUser } from "../../types/auth";
import type { LearnerGroup } from "../../types/learnerGroup";

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function displayName(user?: AuthUser): string {
  if (!user) {
    return "Propriétaire";
  }

  const name =
    user.fullName ||
    user.name ||
    [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

  return name || user.email || "Propriétaire";
}

function roleLabel(role?: string): string {
  if (role === "ADMIN") {
    return "Administrateur";
  }

  if (role === "FORMATEUR") {
    return "Formateur";
  }

  return "Propriétaire";
}

export function LearnerGroupsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const basePath = isAdmin
    ? "/admin/groups"
    : "/trainer/groups";

  const [groups, setGroups] = useState<LearnerGroup[]>([]);
  const [owners, setOwners] = useState<Map<number, AuthUser>>(
    new Map(),
  );

  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<LearnerGroup | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const loadedGroups = await getLearnerGroups();
      setGroups(loadedGroups);

      const ownerIds = Array.from(
        new Set(
          loadedGroups
            .map((group) => group.ownerId)
            .filter((id) => id > 0),
        ),
      );

      const identities = ownerIds.length
        ? await resolveTrainerLearners(ownerIds)
        : [];

      setOwners(
        new Map(
          identities.map((identity) => [
            identity.id,
            identity,
          ]),
        ),
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visibleGroups = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return groups;
    }

    return groups.filter((group) => {
      const owner = owners.get(group.ownerId);

      return [
        group.name,
        group.description ?? "",
        displayName(owner),
        owner?.email ?? "",
        roleLabel(group.ownerRole),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [groups, owners, search]);

  // WEB_VISUAL_3_GROUPS_SAFE_V1
  const totalMembers = useMemo(
    () => groups.reduce((total, group) => total + group.memberCount, 0),
    [groups],
  );

  const populatedGroups = useMemo(
    () => groups.filter((group) => group.memberCount > 0).length,
    [groups],
  );

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedName = name.trim();

    if (!normalizedName) {
      setError("Le nom du groupe est obligatoire.");
      return;
    }

    setSaving(true);

    try {
      await createLearnerGroup({
        name: normalizedName,
        description: description.trim() || null,
      });

      setName("");
      setDescription("");
      setSuccess("Groupe créé.");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeletingId(deleteTarget.id);
    setError("");
    setSuccess("");

    try {
      await deleteLearnerGroup(deleteTarget.id);
      setDeleteTarget(null);
      setSuccess("Groupe supprimé.");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 320,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={34} />
          <Typography color="text.secondary">
            Chargement des groupes...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow="Organisation des apprenants"
        title="Groupes & cohortes"
        description={
          isAdmin
            ? "Créez et supervisez les groupes de la plateforme. Les propriétaires et membres sont affichés avec leur identité réelle."
            : "Créez vos groupes et organisez vos apprenants sans manipuler d'identifiants techniques."
        }
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        <SmartMetricCard
          label="Groupes"
          value={groups.length}
          helper="Cohortes disponibles"
          icon={<Users />}
        />
        <SmartMetricCard
          label="Membres"
          value={totalMembers}
          helper="Appartenances cumulées"
          icon={<Users />}
        />
        <SmartMetricCard
          label="Groupes actifs"
          value={populatedGroups}
          helper="Avec au moins un membre"
          icon={<Users />}
        />
      </Box>

      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : null}

      {success ? (
        <Alert
          severity="success"
          onClose={() => setSuccess("")}
        >
          {success}
        </Alert>
      ) : null}

      <SmartSectionCard
        title="Créer un groupe"
        description="Le propriétaire est automatiquement déterminé à partir de votre session."
      >
        <Box component="form" onSubmit={handleCreate}>
          <Stack spacing={2}>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "minmax(220px, 0.7fr) minmax(280px, 1.3fr) auto",
              },
              gap: 2,
              alignItems: "center",
            }}
          >
            <TextField
              label="Nom du groupe"
              value={name}
              onChange={(event) => setName(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 150 } }}
              required
              fullWidth
            />

            <TextField
              label="Description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              slotProps={{ htmlInput: { maxLength: 500 } }}
              fullWidth
            />

            <Button
              type="submit"
              variant="contained"
              startIcon={<Plus size={17} />}
              disabled={saving}
              sx={{
                minHeight: 40,
                px: 2.5,
                whiteSpace: "nowrap",
                width: { xs: "100%", md: "auto" },
              }}
            >
              {saving ? "Création..." : "Créer le groupe"}
            </Button>
          </Box>
          </Stack>
        </Box>
      </SmartSectionCard>

      <SmartSectionCard
        title="Groupes disponibles"
        description={`${visibleGroups.length} résultat(s) sur ${groups.length}.`}
      >
        <Stack spacing={2}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <TextField
              size="small"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Rechercher un groupe, propriétaire ou e-mail"
              slotProps={{
                htmlInput: {
                  "aria-label": "Rechercher un groupe",
                },
                input: {
                  startAdornment: (
                    <Search
                      size={17}
                      style={{ marginRight: 8 }}
                    />
                  ),
                },
              }}
              sx={{ minWidth: { md: 360 } }}
            />
          </Box>

          <Divider />

          {!visibleGroups.length ? (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <Users
                size={34}
                style={{ opacity: 0.45 }}
              />
              <Typography
                variant="h6"
                sx={{ mt: 1, fontWeight: 800 }}
              >
                Aucun groupe
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
              >
                {search.trim()
                  ? "Aucun groupe ne correspond à votre recherche."
                  : "Créez votre premier groupe pour commencer."}
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(3, minmax(0, 1fr))",
                },
                gap: 2,
                alignItems: "stretch",
              }}
            >
              {visibleGroups.map((group) => {
                const owner = owners.get(group.ownerId);

                return (
                  <Paper
                    key={group.id}
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                      transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: 3,
                        borderColor: "primary.light",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 900 }}
                        >
                          {group.name}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                        >
                          {group.description ||
                            "Aucune description."}
                        </Typography>
                      </Box>

                      <Chip
                        size="small"
                        color={group.memberCount > 0 ? "primary" : "default"}
                        variant={group.memberCount > 0 ? "filled" : "outlined"}
                        icon={<Users size={15} />}
                        label={`${group.memberCount} membre${
                          group.memberCount > 1 ? "s" : ""
                        }`}
                      />
                    </Box>

                    <Divider />

                    <Stack spacing={0.5}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 800 }}
                      >
                        PROPRIÉTAIRE
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 800 }}
                      >
                        {displayName(owner)}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {owner?.email || "E-mail indisponible"} ·{" "}
                        {roleLabel(group.ownerRole)}
                      </Typography>
                    </Stack>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      Dernière mise à jour :{" "}
                      {formatDate(
                        group.updatedAt || group.createdAt,
                      )}
                    </Typography>

                    <Box
                      sx={{
                        mt: "auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        flexWrap: "nowrap",
                      }}
                    >
                      <Button
                        component={Link}
                        to={`${basePath}/${group.id}`}
                        variant="contained"
                        size="small"
                      >
                        Ouvrir
                      </Button>

                      <Button
                        type="button"
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<Trash2 size={16} />}
                        sx={{ ml: { sm: "auto" } }}
                        onClick={() => setDeleteTarget(group)}
                      >
                        Supprimer
                      </Button>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Stack>
      </SmartSectionCard>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (deletingId == null) {
            setDeleteTarget(null);
          }
        }}
        aria-labelledby="group-delete-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="group-delete-title">Supprimer ce groupe ?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Typography>
              Le groupe{" "}
              <strong>{deleteTarget?.name}</strong>{" "}
              et sa liste de membres seront supprimés.
            </Typography>
            <Alert severity="info">
              Cette opération ne désinscrit aucun utilisateur
              de ses formations existantes.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deletingId != null}
          >
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleDelete()}
            disabled={deletingId != null}
          >
            {deletingId != null
              ? "Suppression..."
              : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

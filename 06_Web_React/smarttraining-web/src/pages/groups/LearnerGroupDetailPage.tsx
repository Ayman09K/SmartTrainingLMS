import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { FormEvent } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowLeft,
  CalendarClock,
  GraduationCap,
  Search,
  UserPlus,
  UserRoundX,
  Users,
} from "lucide-react";
import {
  addLearnerGroupMembers,
  assignTrainingToLearnerGroup,
  getLearnerGroup,
  getLearnerGroupMembers,
  getLearnerGroupTrainingAssignments,
  removeLearnerGroupMember,
  updateLearnerGroup,
  type LearnerGroupTrainingAssignmentRecord,
  type LearnerGroupTrainingAssignmentResponse,
} from "../../api/learnerGroupApi";
import {
  getAdminTrainings,
  getTrainingsByTrainer,
} from "../../api/trainingApi";
import {
  resolveTrainerLearners,
  searchTrainerLearners,
} from "../../api/trainerLearnerOverviewApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { SmartPageHeader } from "../../components/ui";
import { smartConfirm } from "../../components/ux/smartConfirmService";
import { useAuth } from "../../features/auth/AuthContext";
import type { AuthUser } from "../../types/auth";
import type {
  LearnerGroup,
  LearnerGroupMember,
} from "../../types/learnerGroup";
import type { TrainingResponse } from "../../types/training";

function displayName(user?: AuthUser): string {
  if (!user) {
    return "Utilisateur";
  }

  const name =
    user.fullName ||
    user.name ||
    [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

  return name || user.email || "Utilisateur";
}

function localDateTimeInputMin(): string {
  const date = new Date(Date.now() + 60_000);
  const pad = (value: number) =>
    String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function toApiDueAt(value: string): string | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.length === 16
    ? `${trimmed}:00`
    : trimmed;
}

function trainingStatusLabel(status?: string): string {
  if (status === "PUBLISHED") {
    return "Publi\u00e9e";
  }

  if (status === "DRAFT") {
    return "Brouillon";
  }

  if (status === "ARCHIVED") {
    return "Archiv\u00e9e";
  }

  return status || "Statut non renseign\u00e9";
}
function roleLabel(role?: string): string {
  if (role === "ADMIN") {
    return "Administrateur";
  }

  if (role === "FORMATEUR") {
    return "Formateur";
  }

  if (role === "APPRENANT") {
    return "Apprenant";
  }

  return "Utilisateur";
}

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

export function LearnerGroupDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { groupId } = useParams();

  const isAdmin = user?.role === "ADMIN";
  const basePath = isAdmin
    ? "/admin/groups"
    : "/trainer/groups";

  const parsedGroupId = Number(groupId);

  const [group, setGroup] =
    useState<LearnerGroup | null>(null);
  const [members, setMembers] =
    useState<LearnerGroupMember[]>([]);
  const [identities, setIdentities] =
    useState<Map<number, AuthUser>>(new Map());

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");

  const [directorySearch, setDirectorySearch] =
    useState("");
  const [directoryResults, setDirectoryResults] =
    useState<AuthUser[]>([]);
  const [trainings, setTrainings] =
    useState<TrainingResponse[]>([]);
  const [selectedTrainingId, setSelectedTrainingId] =
    useState("");
  const [assignmentDueAt, setAssignmentDueAt] =
    useState("");
  const [assignmentResult, setAssignmentResult] =
    useState<LearnerGroupTrainingAssignmentResponse | null>(
      null,
    );
  const [
    groupTrainingAssignments,
    setGroupTrainingAssignments,
  ] = useState<LearnerGroupTrainingAssignmentRecord[]>([]);
  const [syncingTrainingId, setSyncingTrainingId] =
    useState<number | null>(null);
  const [loadingTrainings, setLoadingTrainings] =
    useState(false);
  const [assigningTraining, setAssigningTraining] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [savingGroup, setSavingGroup] =
    useState(false);
  const [searchingDirectory, setSearchingDirectory] =
    useState(false);

  // GROUP_MULTISELECT_UX_V1
  const [directorySearchExecuted, setDirectorySearchExecuted] =
    useState(false);
  const [selectedDirectoryIds, setSelectedDirectoryIds] =
    useState<number[]>([]);
  const [addingMembers, setAddingMembers] =
    useState(false);

  const [removingId, setRemovingId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    if (
      !Number.isInteger(parsedGroupId) ||
      parsedGroupId <= 0
    ) {
      setError("Identifiant de groupe invalide.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [
        loadedGroup,
        loadedMembers,
        loadedTrainingAssignments,
      ] = await Promise.all([
        getLearnerGroup(parsedGroupId),
        getLearnerGroupMembers(parsedGroupId),
        getLearnerGroupTrainingAssignments(parsedGroupId),
      ]);

      setGroup(loadedGroup);
      setMembers(loadedMembers);
      setGroupTrainingAssignments(
        loadedTrainingAssignments,
      );
      setName(loadedGroup.name);
      setDescription(loadedGroup.description || "");

      const ids = Array.from(
        new Set([
          loadedGroup.ownerId,
          ...loadedMembers.map(
            (member) => member.learnerId,
          ),
        ]),
      ).filter((id) => id > 0);

      const resolved = ids.length
        ? await resolveTrainerLearners(ids)
        : [];

      setIdentities(
        new Map(
          resolved.map((identity) => [
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
  }, [parsedGroupId]);


  useEffect(() => {
    const actorId = Number(user?.id);

    if (
      !Number.isInteger(actorId) ||
      actorId <= 0
    ) {
      setTrainings([]);
      return;
    }

    let active = true;

    async function loadTrainings() {
      setLoadingTrainings(true);

      try {
        const loaded = isAdmin
          ? await getAdminTrainings()
          : await getTrainingsByTrainer(actorId);

        if (!active) {
          return;
        }

        setTrainings(
          [...loaded].sort((a, b) =>
            a.title.localeCompare(b.title, "fr"),
          ),
        );
      } catch (err) {
        if (active) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (active) {
          setLoadingTrainings(false);
        }
      }
    }

    void loadTrainings();

    return () => {
      active = false;
    };
  }, [isAdmin, user?.id]);
  const memberIds = useMemo(
    () =>
      new Set(
        members.map((member) => member.learnerId),
      ),
    [members],
  );

  const availableDirectoryResults = useMemo(
    () =>
      directoryResults.filter(
        (candidate) => !memberIds.has(candidate.id),
      ),
    [directoryResults, memberIds],
  );

  async function handleUpdateGroup(event: FormEvent) {
    event.preventDefault();

    if (!group) {
      return;
    }

    const normalizedName = name.trim();

    if (!normalizedName) {
      setError("Le nom du groupe est obligatoire.");
      return;
    }

    setSavingGroup(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateLearnerGroup(
        group.id,
        {
          name: normalizedName,
          description: description.trim() || null,
        },
      );

      setGroup(updated);
      setName(updated.name);
      setDescription(updated.description || "");
      setSuccess("Informations du groupe mises à jour.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSavingGroup(false);
    }
  }

  async function handleDirectorySearch(
    event: FormEvent,
  ) {
    event.preventDefault();

    const query = directorySearch.trim();

    if (!query) {
      setDirectoryResults([]);
      setSelectedDirectoryIds([]);
      setDirectorySearchExecuted(false);
      setError(
        "Saisissez un nom ou une adresse e-mail.",
      );
      return;
    }

    setSearchingDirectory(true);
    setSelectedDirectoryIds([]);
    setDirectorySearchExecuted(false);
    setError("");
    setSuccess("");

    try {
      const results = await searchTrainerLearners(
        query,
        50,
      );

      setDirectoryResults(results);
      setDirectorySearchExecuted(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSearchingDirectory(false);
    }
  }

  async function handleAddSelectedMembers() {
    if (!group) {
      return;
    }

    const selectedCandidates =
      availableDirectoryResults.filter((candidate) =>
        selectedDirectoryIds.includes(candidate.id),
      );

    const learnerIds = Array.from(
      new Set(
        selectedCandidates
          .map((candidate) => candidate.id)
          .filter(
            (id) =>
              Number.isInteger(id) &&
              id > 0,
          ),
      ),
    );

    if (!learnerIds.length) {
      setError(
        "Sélectionnez au moins une personne à ajouter.",
      );
      return;
    }

    setAddingMembers(true);
    setError("");
    setSuccess("");

    try {
      const updatedMembers =
        await addLearnerGroupMembers(
          group.id,
          { learnerIds },
        );

      setMembers(updatedMembers);

      const refreshedAssignments =
        await getLearnerGroupTrainingAssignments(
          group.id,
        );
      setGroupTrainingAssignments(
        refreshedAssignments,
      );

      const resolved = await resolveTrainerLearners(
        updatedMembers.map(
          (member) => member.learnerId,
        ),
      );

      setIdentities((current) => {
        const next = new Map(current);

        selectedCandidates.forEach((candidate) => {
          next.set(candidate.id, candidate);
        });

        resolved.forEach((identity) => {
          next.set(identity.id, identity);
        });

        return next;
      });

      const addedIds = new Set(learnerIds);

      setDirectoryResults((current) =>
        current.filter(
          (item) =>
            !addedIds.has(item.id),
        ),
      );

      setSelectedDirectoryIds([]);
      setDirectorySearchExecuted(true);

      setSuccess(
        learnerIds.length === 1
          ? `${displayName(selectedCandidates[0])} a été ajouté au groupe.`
          : `${learnerIds.length} membres ont été ajoutés au groupe.`,
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAddingMembers(false);
    }
  }

  async function handleRemoveMember(
    member: LearnerGroupMember,
  ) {
    if (!group) {
      return;
    }

    const identity = identities.get(member.learnerId);
    const confirmed = await smartConfirm({
      title: "Retirer le membre du groupe",
      description: `Retirer ${displayName(identity)} du groupe ?`,
      confirmLabel: "Retirer",
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    setRemovingId(member.learnerId);
    setError("");
    setSuccess("");

    try {
      await removeLearnerGroupMember(
        group.id,
        member.learnerId,
      );

      setMembers((current) =>
        current.filter(
          (item) =>
            item.learnerId !== member.learnerId,
        ),
      );

      const refreshedAssignments =
        await getLearnerGroupTrainingAssignments(
          group.id,
        );
      setGroupTrainingAssignments(
        refreshedAssignments,
      );

      setSuccess("Membre retiré du groupe.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setRemovingId(null);
    }
  }


  async function handleAssignTraining(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!group) {
      return;
    }

    const trainingId = Number(selectedTrainingId);

    if (
      !Number.isInteger(trainingId) ||
      trainingId <= 0
    ) {
      setError("S\u00e9lectionnez une formation.");
      return;
    }

    const dueAt = toApiDueAt(assignmentDueAt);

    if (
      dueAt &&
      new Date(dueAt).getTime() <= Date.now()
    ) {
      setError(
        "L'\u00e9ch\u00e9ance doit \u00eatre dans le futur.",
      );
      return;
    }

    setAssigningTraining(true);
    setAssignmentResult(null);
    setError("");
    setSuccess("");

    try {
      const result =
        await assignTrainingToLearnerGroup(
          group.id,
          {
            trainingId,
            dueAt,
          },
        );

      setAssignmentResult(result);

      const refreshedAssignments =
        await getLearnerGroupTrainingAssignments(
          group.id,
        );
      setGroupTrainingAssignments(
        refreshedAssignments,
      );
      setSuccess(
        "Formation enregistrée dans ce groupe.",
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAssigningTraining(false);
    }
  }
  async function handleSyncTraining(
    assignment: LearnerGroupTrainingAssignmentRecord,
  ) {
    if (!group || assignment.missingMembers <= 0) {
      return;
    }

    setSyncingTrainingId(assignment.trainingId);
    setError("");
    setSuccess("");

    try {
      const result = await assignTrainingToLearnerGroup(
        group.id,
        {
          trainingId: assignment.trainingId,
          dueAt: assignment.dueAt || undefined,
        },
      );

      setAssignmentResult(result);

      const refreshedAssignments =
        await getLearnerGroupTrainingAssignments(
          group.id,
        );
      setGroupTrainingAssignments(
        refreshedAssignments,
      );

      setSuccess(
        result.assigned > 0
          ? `${result.assigned} nouveau(x) membre(s) synchronisé(s).`
          : "Tous les membres sont déjà synchronisés.",
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSyncingTrainingId(null);
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
            Chargement du groupe...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!group) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">
          {error || "Groupe introuvable."}
        </Alert>

        <Box>
          <Button
            component={Link}
            to={basePath}
            startIcon={<ArrowLeft size={17} />}
          >
            Retour aux groupes
          </Button>
        </Box>
      </Stack>
    );
  }

  const owner = identities.get(group.ownerId);

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow="Groupe d'apprenants"
        title={group.name}
        description={
          group.description ||
          "Gérez les informations et les membres de ce groupe."
        }
        actions={
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Chip
              icon={<Users size={15} />}
              label={`${members.length} membre${members.length > 1 ? "s" : ""}`}
              variant="outlined"
            />

            <Button
              onClick={() => navigate(basePath)}
              variant="outlined"
              startIcon={<ArrowLeft size={17} />}
            >
              Retour
            </Button>
          </Stack>
        }
      />

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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(280px, 0.72fr) minmax(0, 1.28fr)",
          },
          gap: 2.5,
          alignItems: "start",
        }}
      >
        <Stack spacing={3}>
          <Paper
            variant="outlined"
            sx={{ p: 3, borderRadius: 3 }}
          >
            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Informations
              </Typography>

              <Divider />

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 800 }}
              >
                PROPRIÉTAIRE
              </Typography>

              <Typography sx={{ fontWeight: 800 }}>
                {displayName(owner)}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                {owner?.email || "E-mail indisponible"}
              </Typography>

              <Chip
                size="small"
                label={roleLabel(group.ownerRole)}
                sx={{ alignSelf: "flex-start" }}
              />

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ pt: 1 }}
              >
                Créé : {formatDate(group.createdAt)}
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
              >
                Mis à jour :{" "}
                {formatDate(
                  group.updatedAt || group.createdAt,
                )}
              </Typography>
            </Stack>
          </Paper>

          <Paper
            component="form"
            onSubmit={handleUpdateGroup}
            variant="outlined"
            sx={{ p: 3, borderRadius: 3 }}
          >
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Modifier le groupe
              </Typography>

              <TextField
                label="Nom du groupe"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
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
                multiline
                minRows={3}
                fullWidth
              />

              <Box>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={savingGroup}
                >
                  {savingGroup
                    ? "Enregistrement..."
                    : "Enregistrer"}
                </Button>
              </Box>
            </Stack>
          </Paper>
        </Stack>

        <Stack spacing={3}>
          <Paper
            variant="outlined"
            sx={{ p: 3, borderRadius: 3 }}
          >
            <Stack spacing={2}>
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 900 }}
                  >
                    Membres
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {members.length} membre
                    {members.length > 1 ? "s" : ""}
                  </Typography>
                </Box>

                <Users size={22} />
              </Box>

              <Divider />

              {!members.length ? (
                <Alert severity="info">
                  Ce groupe est vide. Recherchez un
                  utilisateur ci-dessous pour l'ajouter.
                </Alert>
              ) : (
                <Stack spacing={1.5}>
                  {members.map((member) => {
                    const identity = identities.get(
                      member.learnerId,
                    );

                    return (
                      <Paper
                        key={member.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2.5,
                          display: "flex",
                          gap: 2,
                          alignItems: {
                            xs: "flex-start",
                            sm: "center",
                          },
                          flexDirection: {
                            xs: "column",
                            sm: "row",
                          },
                          justifyContent:
                            "space-between",
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 900 }}>
                            {member.fullName ||
                              displayName(identity)}
                          </Typography>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            {member.email ||
                              identity?.email ||
                              "E-mail indisponible"}
                          </Typography>

                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{
                              mt: 1,
                              alignItems: "center",
                            }}
                          >
                            <Chip
                              size="small"
                              label={roleLabel(
                                identity?.role,
                              )}
                            />

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Ajouté :{" "}
                              {formatDate(member.addedAt)}
                            </Typography>
                          </Stack>
                        </Box>

                        <Button
                          type="button"
                          color="error"
                          variant="outlined"
                          size="small"
                          startIcon={
                            <UserRoundX size={16} />
                          }
                          disabled={
                            removingId ===
                            member.learnerId
                          }
                          onClick={() =>
                            void handleRemoveMember(
                              member,
                            )
                          }
                        >
                          Retirer
                        </Button>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </Paper>

          <Paper
            component="form"
            onSubmit={handleDirectorySearch}
            variant="outlined"
            sx={{
              p: { xs: 2.25, md: 2.75 },
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <Stack spacing={2}>
              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  alignItems: { sm: "center" },
                  justifyContent: "space-between",
                  flexDirection: {
                    xs: "column",
                    sm: "row",
                  },
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 900 }}
                  >
                    Ajouter des membres
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Recherchez par nom ou e-mail, sélectionnez plusieurs personnes puis ajoutez-les en une seule fois.
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label={`${availableDirectoryResults.length} disponible${availableDirectoryResults.length > 1 ? "s" : ""}`}
                  variant="outlined"
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: 1.25,
                  flexDirection: {
                    xs: "column",
                    sm: "row",
                  },
                }}
              >
                <TextField
                  fullWidth
                  size="small"
                  label="Nom ou e-mail"
                  value={directorySearch}
                  onChange={(event) =>
                    setDirectorySearch(
                      event.target.value,
                    )
                  }
                  placeholder="Ex. Salma ou salma@..."
                />

                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Search size={17} />}
                  disabled={searchingDirectory}
                  sx={{
                    whiteSpace: "nowrap",
                    minWidth: 130,
                  }}
                >
                  {searchingDirectory
                    ? "Recherche..."
                    : "Rechercher"}
                </Button>
              </Box>

              {directorySearchExecuted &&
              !searchingDirectory &&
              directoryResults.length === 0 ? (
                <Alert severity="info">
                  Aucun utilisateur ne correspond à cette recherche.
                </Alert>
              ) : null}

              {directoryResults.length > 0 &&
              availableDirectoryResults.length === 0 ? (
                <Alert severity="info">
                  Tous les résultats trouvés sont déjà membres de ce groupe.
                </Alert>
              ) : null}

              {availableDirectoryResults.length > 0 ? (
                <Stack spacing={1.5}>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1.25,
                      alignItems: {
                        xs: "stretch",
                        sm: "center",
                      },
                      justifyContent: "space-between",
                      flexDirection: {
                        xs: "column",
                        sm: "row",
                      },
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: "action.hover",
                    }}
                  >
                    <FormControlLabel
                      sx={{ m: 0 }}
                      control={
                        <Checkbox
                          size="small"
                          checked={
                            selectedDirectoryIds.length > 0 &&
                            selectedDirectoryIds.length ===
                              availableDirectoryResults.length
                          }
                          indeterminate={
                            selectedDirectoryIds.length > 0 &&
                            selectedDirectoryIds.length <
                              availableDirectoryResults.length
                          }
                          onChange={(event) =>
                            setSelectedDirectoryIds(
                              event.target.checked
                                ? availableDirectoryResults.map(
                                    (candidate) =>
                                      candidate.id,
                                  )
                                : [],
                            )
                          }
                        />
                      }
                      label={`Tout sélectionner (${availableDirectoryResults.length})`}
                    />

                    <Button
                      type="button"
                      variant="contained"
                      startIcon={<UserPlus size={17} />}
                      disabled={
                        addingMembers ||
                        selectedDirectoryIds.length === 0
                      }
                      onClick={() =>
                        void handleAddSelectedMembers()
                      }
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      {addingMembers
                        ? "Ajout..."
                        : selectedDirectoryIds.length > 0
                          ? `Ajouter ${selectedDirectoryIds.length} membre${selectedDirectoryIds.length > 1 ? "s" : ""}`
                          : "Sélectionner des membres"}
                    </Button>
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        xl: "repeat(2, minmax(0, 1fr))",
                      },
                      gap: 1.25,
                    }}
                  >
                    {availableDirectoryResults.map(
                      (candidate) => {
                        const selected =
                          selectedDirectoryIds.includes(
                            candidate.id,
                          );

                        return (
                          <Paper
                            key={candidate.id}
                            variant="outlined"
                            sx={{
                              p: 1.5,
                              borderRadius: 2.5,
                              display: "flex",
                              gap: 1.25,
                              alignItems: "flex-start",
                              borderColor: selected
                                ? "primary.main"
                                : "divider",
                              bgcolor: selected
                                ? "action.selected"
                                : "background.paper",
                            }}
                          >
                            <Checkbox
                              size="small"
                              checked={selected}
                              disabled={addingMembers}
                              onChange={(event) =>
                                setSelectedDirectoryIds(
                                  (current) =>
                                    event.target.checked
                                      ? Array.from(
                                          new Set([
                                            ...current,
                                            candidate.id,
                                          ]),
                                        )
                                      : current.filter(
                                          (id) =>
                                            id !==
                                            candidate.id,
                                        ),
                                )
                              }
                              sx={{
                                mt: -0.5,
                                ml: -0.5,
                              }}
                            />

                            <Box
                              sx={{
                                minWidth: 0,
                                flex: 1,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontWeight: 900,
                                  lineHeight: 1.2,
                                }}
                              >
                                {displayName(candidate)}
                              </Typography>

                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  mt: 0.35,
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {candidate.email}
                              </Typography>

                              <Chip
                                size="small"
                                label={roleLabel(
                                  candidate.role,
                                )}
                                sx={{ mt: 0.8 }}
                              />
                            </Box>
                          </Paper>
                        );
                      },
                    )}
                  </Box>
                </Stack>
              ) : null}

              {!directorySearchExecuted &&
              !directoryResults.length ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Lancez une recherche pour sélectionner les personnes à ajouter.
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Stack>
      </Box>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.25, md: 3 },
          borderRadius: 3,
        }}
      >
        <Stack spacing={2}>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 900 }}
              >
                Formations du groupe
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Les formations enregistrées pour ce groupe restent visibles ici. Si de nouveaux membres sont ajoutés, vous pouvez les synchroniser sans créer de doublons.
              </Typography>
            </Box>

            <GraduationCap size={22} />
          </Box>

          <Divider />

          {!groupTrainingAssignments.length ? (
            <Alert severity="info">
              Aucune formation enregistrée pour ce groupe.
            </Alert>
          ) : (
            <Stack spacing={1.5}>
              {groupTrainingAssignments.map(
                (assignment) => (
                  <Paper
                    key={assignment.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      display: "flex",
                      gap: 2,
                      alignItems: {
                        xs: "stretch",
                        md: "center",
                      },
                      flexDirection: {
                        xs: "column",
                        md: "row",
                      },
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontWeight: 900 }}>
                        {assignment.trainingTitle}
                      </Typography>

                      <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        sx={{
                          mt: 1,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <Chip
                          size="small"
                          color={
                            assignment.missingMembers > 0
                              ? "warning"
                              : "success"
                          }
                          label={`${assignment.enrolledMembers}/${assignment.totalMembers} membres inscrits`}
                        />

                        {assignment.missingMembers > 0 ? (
                          <Chip
                            size="small"
                            color="warning"
                            variant="outlined"
                            label={`${assignment.missingMembers} à synchroniser`}
                          />
                        ) : (
                          <Chip
                            size="small"
                            color="success"
                            variant="outlined"
                            label="À jour"
                          />
                        )}
                      </Stack>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "block",
                          mt: 1,
                        }}
                      >
                        Affectée : {formatDate(assignment.assignedAt)}
                        {assignment.dueAt
                          ? ` • Échéance : ${formatDate(assignment.dueAt)}`
                          : " • Sans échéance"}
                      </Typography>
                    </Box>

                    {assignment.missingMembers > 0 ? (
                      <Button
                        type="button"
                        variant="contained"
                        size="small"
                        disabled={
                          syncingTrainingId ===
                          assignment.trainingId
                        }
                        onClick={() =>
                          void handleSyncTraining(
                            assignment,
                          )
                        }
                      >
                        {syncingTrainingId ===
                        assignment.trainingId
                          ? "Synchronisation..."
                          : `Synchroniser ${assignment.missingMembers}`}
                      </Button>
                    ) : null}
                  </Paper>
                ),
              )}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Paper
        component="form"
        onSubmit={handleAssignTraining}
        variant="outlined"
        sx={{
          p: { xs: 2.25, md: 3 },
          borderRadius: 3,
        }}
      >
        <Stack spacing={2.5}>
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
                Affecter une formation
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, maxWidth: 760 }}
              >
                {
                  "Inscrivez les membres actuels du groupe avec une \u00e9ch\u00e9ance optionnelle."
                }
              </Typography>
            </Box>

            <GraduationCap size={22} />
          </Box>

          <Divider />

          {!members.length ? (
            <Alert severity="info">
              {
                "Ce groupe est vide. Aucun utilisateur ne sera affect\u00e9 tant qu'un membre n'est pas ajout\u00e9."
              }
            </Alert>
          ) : null}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "minmax(0, 1.35fr) minmax(240px, 0.75fr)",
                lg: "minmax(0, 1.45fr) minmax(260px, 0.8fr) auto",
              },
              gap: 2,
              alignItems: "start",
            }}
          >
            <TextField
              select
              fullWidth
              label="Formation"
              value={selectedTrainingId}
              onChange={(event) => {
                setSelectedTrainingId(
                  event.target.value,
                );
                setAssignmentResult(null);
              }}
              disabled={loadingTrainings}
              helperText={
                loadingTrainings
                  ? "Chargement des formations..."
                  : trainings.length
                    ? "S\u00e9lectionnez une formation par son titre."
                    : "Aucune formation g\u00e9rable disponible."
              }
            >
              <MenuItem value="">
                {"S\u00e9lectionnez une formation"}
              </MenuItem>

              {trainings.map((training) => (
                <MenuItem
                  key={training.id}
                  value={String(training.id)}
                >
                  {training.title}
                  {" - "}
                  {trainingStatusLabel(
                    training.status,
                  )}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              type="datetime-local"
              label={"\u00c9ch\u00e9ance optionnelle"}
              value={assignmentDueAt}
              onChange={(event) => {
                setAssignmentDueAt(
                  event.target.value,
                );
                setAssignmentResult(null);
              }}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: {
                  min: localDateTimeInputMin(),
                },
              }}
              helperText={
                "Laissez vide si aucune \u00e9ch\u00e9ance n'est requise."
              }
            />

            <Button
              type="submit"
              variant="contained"
              startIcon={
                assigningTraining ? (
                  <CircularProgress
                    size={16}
                    color="inherit"
                  />
                ) : (
                  <CalendarClock size={17} />
                )
              }
              disabled={
                assigningTraining ||
                loadingTrainings ||
                !selectedTrainingId
              }
              sx={{
                minHeight: 56,
                px: 2.5,
                whiteSpace: "nowrap",
                gridColumn: {
                  xs: "1",
                  md: "1 / -1",
                  lg: "auto",
                },
                justifySelf: {
                  xs: "stretch",
                  md: "start",
                  lg: "stretch",
                },
              }}
            >
              {assigningTraining
                ? "Affectation..."
                : "Affecter la formation"}
            </Button>
          </Box>

          {assignmentResult ? (
            <Alert
              severity={
                assignmentResult.failed > 0
                  ? "warning"
                  : "success"
              }
              sx={{
                "& .MuiAlert-message": {
                  width: "100%",
                },
              }}
            >
              <Stack spacing={1.25}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 800 }}
                >
                  {"R\u00e9sultat de l'affectation"}
                </Typography>

                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: "wrap" }}
                >
                  <Chip
                    color="success"
                    size="small"
                    label={`${assignmentResult.assigned} affect\u00e9(s)`}
                  />

                  <Chip
                    color="info"
                    size="small"
                    label={`${assignmentResult.alreadyEnrolled} d\u00e9j\u00e0 inscrit(s)`}
                  />

                  <Chip
                    color={
                      assignmentResult.failed > 0
                        ? "error"
                        : "default"
                    }
                    size="small"
                    label={`${assignmentResult.failed} \u00e9chec(s)`}
                  />
                </Stack>

                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {`${assignmentResult.totalMembers} membre(s) trait\u00e9(s) au total.`}
                </Typography>
              </Stack>
            </Alert>
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  );
}

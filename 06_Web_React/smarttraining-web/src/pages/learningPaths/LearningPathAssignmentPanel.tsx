import {
  useEffect,
  useState,
} from "react";
import type { FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  CalendarClock,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import {
  assignLearningPathToGroup,
  assignLearningPathToLearners,
  getLearningPathGroupAssignments,
  getLearningPathLearnerAssignments,
} from "../../api/learningPathApi";
import { getLearnerGroups } from "../../api/learnerGroupApi";
import { searchTrainerLearners } from "../../api/trainerLearnerOverviewApi";
import { getApiErrorMessage } from "../../api/apiClient";
import type { AuthUser } from "../../types/auth";
import type { LearnerGroup } from "../../types/learnerGroup";
import type {
  LearningPathAssignmentResult,
  LearningPathStatus,
} from "../../types/learningPath";

interface LearningPathAssignmentPanelProps {
  pathId: number;
  enabled: boolean;
  status?: LearningPathStatus;
}

function displayName(user: AuthUser): string {
  const name =
    user.fullName ||
    user.name ||
    [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

  return name || user.email || "Apprenant";
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

function assignmentSummary(
  result: LearningPathAssignmentResult,
): string {
  return [
    `${result.totalLearners} apprenant(s) traité(s)`,
    `${result.pathAssignmentsCreated} affectation(s) Parcours créée(s)`,
    `${result.newEnrollments} nouvelle(s) inscription(s) Formation`,
    `${result.alreadyEnrolled} déjà inscrit(s)`,
  ].join(" · ");
}

export function LearningPathAssignmentPanel({
  pathId,
  enabled,
  status,
}: LearningPathAssignmentPanelProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AuthUser[]>([]);
  const [selectedLearners, setSelectedLearners] = useState<AuthUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTouched, setSearchTouched] = useState(false);
  const [assigningLearners, setAssigningLearners] = useState(false);
  const [learnerDueAt, setLearnerDueAt] = useState("");
  const [learnerResult, setLearnerResult] =
    useState<LearningPathAssignmentResult | null>(null);

  const [groups, setGroups] = useState<LearnerGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groupDueAt, setGroupDueAt] = useState("");
  const [assigningGroup, setAssigningGroup] = useState(false);
  const [groupResult, setGroupResult] =
    useState<LearningPathAssignmentResult | null>(null);

  const [error, setError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [existingLearnerAssignments, setExistingLearnerAssignments] =
    useState<unknown[]>([]);
  const [existingGroupAssignments, setExistingGroupAssignments] =
    useState<unknown[]>([]);

  useEffect(() => {
    if (status !== "ARCHIVED") {
      setHistoryLoading(false);
      setHistoryError("");
      setExistingLearnerAssignments([]);
      setExistingGroupAssignments([]);
      return;
    }

    let active = true;

    async function loadAssignmentHistory() {
      setHistoryLoading(true);
      setHistoryError("");

      try {
        const [learnerAssignments, groupAssignments] =
          await Promise.all([
            getLearningPathLearnerAssignments(pathId),
            getLearningPathGroupAssignments(pathId),
          ]);

        if (active) {
          setExistingLearnerAssignments(learnerAssignments);
          setExistingGroupAssignments(groupAssignments);
        }
      } catch (err) {
        if (active) {
          setHistoryError(getApiErrorMessage(err));
        }
      } finally {
        if (active) {
          setHistoryLoading(false);
        }
      }
    }

    void loadAssignmentHistory();

    return () => {
      active = false;
    };
  }, [pathId, status]);


  useEffect(() => {
    if (!enabled) {
      setGroups([]);
      return;
    }

    let active = true;

    async function loadGroups() {
      setLoadingGroups(true);

      try {
        const loaded = await getLearnerGroups();

        if (active) {
          setGroups(loaded);
        }
      } catch (err) {
        if (active) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (active) {
          setLoadingGroups(false);
        }
      }
    }

    void loadGroups();

    return () => {
      active = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setSearchResults([]);
      setSearchTouched(false);
      return;
    }

    let active = true;

    const timer = window.setTimeout(async () => {
      setSearching(true);

      try {
        const loaded = await searchTrainerLearners(
          query.trim(),
          20,
        );

        if (active) {
          setSearchResults(loaded);
          setSearchTouched(true);
        }
      } catch (err) {
        if (active) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (active) {
          setSearching(false);
        }
      }
    }, query.trim() ? 250 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [enabled, query]);

  function toggleLearner(candidate: AuthUser) {
    setLearnerResult(null);

    setSelectedLearners((current) => {
      if (current.some((item) => item.id === candidate.id)) {
        return current.filter((item) => item.id !== candidate.id);
      }

      return [...current, candidate];
    });
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();

    const trimmed = query.trim();

    if (!trimmed) {
      setSearchResults([]);
      setError("Saisissez un nom ou une adresse e-mail.");
      return;
    }

    setSearching(true);
    setError("");

    try {
      setSearchResults(
        await searchTrainerLearners(trimmed, 20),
      );
      setSearchTouched(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  async function handleAssignLearners(event: FormEvent) {
    event.preventDefault();

    if (!selectedLearners.length) {
      setError("Sélectionnez au moins un apprenant.");
      return;
    }

    const dueAt = toApiDueAt(learnerDueAt);

    if (
      dueAt &&
      new Date(dueAt).getTime() <= Date.now()
    ) {
      setError("L'échéance doit être dans le futur.");
      return;
    }

    setAssigningLearners(true);
    setLearnerResult(null);
    setError("");

    try {
      const result = await assignLearningPathToLearners(
        pathId,
        {
          learnerIds: selectedLearners.map(
            (learner) => learner.id,
          ),
          dueAt,
        },
      );

      setLearnerResult(result);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAssigningLearners(false);
    }
  }

  async function handleAssignGroup(event: FormEvent) {
    event.preventDefault();

    const groupId = Number(selectedGroupId);

    if (!Number.isInteger(groupId) || groupId <= 0) {
      setError("Sélectionnez un groupe.");
      return;
    }

    const dueAt = toApiDueAt(groupDueAt);

    if (
      dueAt &&
      new Date(dueAt).getTime() <= Date.now()
    ) {
      setError("L'échéance doit être dans le futur.");
      return;
    }

    setAssigningGroup(true);
    setGroupResult(null);
    setError("");

    try {
      const result = await assignLearningPathToGroup(
        pathId,
        groupId,
        { dueAt },
      );

      setGroupResult(result);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAssigningGroup(false);
    }
  }

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Affectations
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              {status === "ARCHIVED"
                ? "Consultez les affectations conservées de ce parcours archivé."
                : "Affectez ce parcours à des apprenants trouvés par nom/e-mail ou à un groupe existant."}
            </Typography>
          </Box>

          {status === "ARCHIVED" ? (
            <Chip
              label={
                historyLoading
                  ? "Chargement des affectations..."
                  : `${existingLearnerAssignments.length} apprenant${
                      existingLearnerAssignments.length > 1 ? "s" : ""
                    } · ${existingGroupAssignments.length} groupe${
                      existingGroupAssignments.length > 1 ? "s" : ""
                    }`
              }
              variant="outlined"
            />
          ) : (
            <Chip
              icon={<CalendarClock size={15} />}
              label="Échéance optionnelle"
              variant="outlined"
            />
          )}
        </Stack>

        {!enabled ? (
          status === "ARCHIVED" ? (
            <Alert
              severity={historyError ? "warning" : "info"}
              sx={{ mt: 2 }}
            >
              {historyError
                ? `Parcours archivé. Impossible de charger l'historique des affectations : ${historyError}`
                : historyLoading
                  ? "Chargement de l'historique des affectations..."
                  : `Parcours archivé : aucune nouvelle affectation possible. Historique conservé : ${existingLearnerAssignments.length} apprenant${existingLearnerAssignments.length > 1 ? "s" : ""} et ${existingGroupAssignments.length} groupe${existingGroupAssignments.length > 1 ? "s" : ""}. La suppression du parcours reste bloquée tant que ces affectations existent.`}
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              Publiez le parcours avant de l'affecter.
            </Alert>
          )
        ) : (
          <>
            {error ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            ) : null}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  xl: "repeat(2, minmax(0, 1fr))",
                },
                gap: 2,
                mt: 2,
              }}
            >
              <Card variant="outlined">
                <CardContent>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <UserPlus size={20} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      Apprenants
                    </Typography>
                  </Stack>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.75 }}
                  >
                    La liste charge les premiers apprenants et se filtre automatiquement par nom ou e-mail. Aucun identifiant manuel
                    n'est demandé.
                  </Typography>

                  <Box
                    component="form"
                    onSubmit={handleSearch}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "1fr auto",
                      },
                      gap: 1,
                      mt: 2,
                    }}
                  >
                    <TextField
                      fullWidth
                      label="Nom ou e-mail"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setLearnerResult(null);
                      }}
                      placeholder="Rechercher un apprenant"
                    />

                    <Button
                      type="submit"
                      variant="outlined"
                      disabled={searching}
                      startIcon={
                        searching ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <Search size={17} />
                        )
                      }
                    >
                      Rechercher
                    </Button>
                  </Box>

                  {searchResults.length > 0 ? (
                    <Stack spacing={1} sx={{ mt: 2 }}>
                      {searchResults.map((candidate) => {
                        const selected = selectedLearners.some(
                          (item) => item.id === candidate.id,
                        );

                        return (
                          <Box
                            key={candidate.id}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.25,
                              border: 1,
                              borderColor: selected
                                ? "primary.main"
                                : "divider",
                              borderRadius: 1.5,
                              p: 1.25,
                            }}
                          >
                            <Checkbox
                              checked={selected}
                              onChange={() =>
                                toggleLearner(candidate)
                              }
                            />

                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography sx={{ fontWeight: 700 }}>
                                {displayName(candidate)}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {candidate.email}
                              </Typography>
                            </Box>

                            <Chip
                              size="small"
                              label={candidate.role}
                              variant="outlined"
                            />
                          </Box>
                        );
                      })}
                    </Stack>
                  ) : searchTouched && !searching ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 2 }}
                    >
                      Aucun apprenant ne correspond à cette recherche.
                    </Typography>
                  ) : null}

                  {selectedLearners.length > 0 ? (
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      sx={{ flexWrap: "wrap", mt: 2 }}
                    >
                      {selectedLearners.map((learner) => (
                        <Chip
                          key={learner.id}
                          label={displayName(learner)}
                          onDelete={() => toggleLearner(learner)}
                        />
                      ))}
                    </Stack>
                  ) : null}

                  <Divider sx={{ my: 2 }} />

                  <Box
                    component="form"
                    onSubmit={handleAssignLearners}
                  >
                    <Stack spacing={1.5}>
                      <TextField
                        fullWidth
                        type="datetime-local"
                        label="Échéance optionnelle"
                        value={learnerDueAt}
                        onChange={(event) => {
                          setLearnerDueAt(event.target.value);
                          setLearnerResult(null);
                        }}
                        slotProps={{
                          inputLabel: { shrink: true },
                          htmlInput: {
                            min: localDateTimeInputMin(),
                          },
                        }}
                      />

                      <Button
                        type="submit"
                        variant="contained"
                        disabled={
                          assigningLearners ||
                          selectedLearners.length === 0
                        }
                        startIcon={
                          assigningLearners ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <UserPlus size={17} />
                          )
                        }
                      >
                        {assigningLearners
                          ? "Affectation..."
                          : `Affecter ${selectedLearners.length || ""} apprenant(s)`}
                      </Button>
                    </Stack>
                  </Box>

                  {learnerResult ? (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Affectation terminée
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {assignmentSummary(learnerResult)}
                      </Typography>
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <Users size={20} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      Groupe / cohorte
                    </Typography>
                  </Stack>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.75 }}
                  >
                    Réutilise les groupes existants : aucune cohorte parallèle
                    n'est créée.
                  </Typography>

                  <Box
                    component="form"
                    onSubmit={handleAssignGroup}
                    sx={{ mt: 2 }}
                  >
                    <Stack spacing={1.5}>
                      <TextField
                        select
                        fullWidth
                        label="Groupe"
                        value={selectedGroupId}
                        disabled={loadingGroups}
                        onChange={(event) => {
                          setSelectedGroupId(event.target.value);
                          setGroupResult(null);
                        }}
                        helperText={
                          loadingGroups
                            ? "Chargement des groupes..."
                            : groups.length
                              ? "Sélectionnez un groupe existant."
                              : "Aucun groupe disponible."
                        }
                      >
                        <MenuItem value="">
                          Sélectionnez un groupe
                        </MenuItem>

                        {groups.map((group) => (
                          <MenuItem
                            key={group.id}
                            value={String(group.id)}
                          >
                            {group.name} · {group.memberCount} membre(s)
                          </MenuItem>
                        ))}
                      </TextField>

                      <TextField
                        fullWidth
                        type="datetime-local"
                        label="Échéance optionnelle"
                        value={groupDueAt}
                        onChange={(event) => {
                          setGroupDueAt(event.target.value);
                          setGroupResult(null);
                        }}
                        slotProps={{
                          inputLabel: { shrink: true },
                          htmlInput: {
                            min: localDateTimeInputMin(),
                          },
                        }}
                      />

                      <Button
                        type="submit"
                        variant="contained"
                        disabled={
                          assigningGroup ||
                          loadingGroups ||
                          !selectedGroupId
                        }
                        startIcon={
                          assigningGroup ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <Users size={17} />
                          )
                        }
                      >
                        {assigningGroup
                          ? "Affectation..."
                          : "Affecter au groupe"}
                      </Button>
                    </Stack>
                  </Box>

                  {groupResult ? (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Affectation du groupe terminée
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {assignmentSummary(groupResult)}
                      </Typography>
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
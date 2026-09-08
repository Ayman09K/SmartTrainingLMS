import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
} from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import {
  Archive,
  BookOpenCheck,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import {
  archiveLearningPath,
  deleteLearningPath,
  getLearningPathGroupAssignments,
  getLearningPathLearnerAssignments,
  getLearningPaths,
  publishLearningPath,
  unarchiveLearningPath,
} from "../../api/learningPathApi";
import { buildMediaUrl } from "../../api/apiConfig";
import { getApiErrorMessage } from "../../api/apiClient";
import { smartConfirm } from "../../components/ux/smartConfirmService";
import type {
  LearningPathResponse,
} from "../../types/learningPath";
import { SmartMetricCard, SmartPageHeader } from "../../components/ui";

// WEB_VISUAL_4_LEARNING_PATHS_SAFE_V1
// WEB_VISUAL_FINAL_ADMIN_LEARNING_PATHS_SAFE_V1
// WEB_VISUAL_FINAL_A1_LEARNING_PATH_SINGLE_CARD_FIX_SAFE_V1

function visibilityLabel(value?: string): string {
  if (value === "PUBLIC") {
    return "Public";
  }

  if (value === "ASSIGNED_ONLY") {
    return "Affectés uniquement";
  }

  return "Privé";
}

type DeleteAvailability =
  | "checking"
  | "allowed"
  | "blocked"
  | "unavailable";

export function LearningPathsPage() {
  const location = useLocation();

  const basePath = location.pathname.startsWith("/admin")
    ? "/admin/learning-paths"
    : "/trainer/learning-paths";

  const [paths, setPaths] = useState<LearningPathResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteAvailabilityByPathId, setDeleteAvailabilityByPathId] =
    useState<Record<number, DeleteAvailability>>({});

  async function reload() {
    setLoading(true);
    setError("");

    try {
      setPaths(await getLearningPaths());
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getLearningPaths();

        if (active) {
          setPaths(result);
        }
      } catch (err) {
        if (active) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const candidates = paths.filter(
      (item) => item.status !== "PUBLISHED",
    );

    if (!candidates.length) {
      setDeleteAvailabilityByPathId({});
      return () => {
        active = false;
      };
    }

    const checking: Record<number, DeleteAvailability> = {};
    for (const item of candidates) {
      checking[item.id] = "checking";
    }
    setDeleteAvailabilityByPathId(checking);

    async function checkDeleteAvailability() {
      const results = await Promise.all(
        candidates.map(async (item) => {
          try {
            const [learnerAssignments, groupAssignments] =
              await Promise.all([
                getLearningPathLearnerAssignments(item.id),
                getLearningPathGroupAssignments(item.id),
              ]);

            const state: DeleteAvailability =
              learnerAssignments.length + groupAssignments.length > 0
                ? "blocked"
                : "allowed";

            return [item.id, state] as const;
          } catch {
            return [item.id, "unavailable"] as const;
          }
        }),
      );

      if (!active) {
        return;
      }

      const next: Record<number, DeleteAvailability> = {};
      for (const [pathId, state] of results) {
        next[pathId] = state;
      }
      setDeleteAvailabilityByPathId(next);
    }

    void checkDeleteAvailability();

    return () => {
      active = false;
    };
  }, [paths]);

  const families = useMemo(() => {
    const grouped = new Map<number, LearningPathResponse[]>();

    for (const path of paths) {
      const rootId = path.versionRootId || path.id;
      const family = grouped.get(rootId) || [];
      family.push(path);
      grouped.set(rootId, family);
    }

    return Array.from(grouped.entries()).map(
      ([rootId, versions]) => {
        const sorted = [...versions].sort(
          (left, right) =>
            (right.versionNumber || 1) -
              (left.versionNumber || 1) ||
            right.id - left.id,
        );

        const draft = sorted.find(
          (item) => item.status === "DRAFT",
        );
        const published = sorted.find(
          (item) => item.status === "PUBLISHED",
        );
        const archived = sorted.find(
          (item) => item.status === "ARCHIVED",
        );

        return {
          rootId,
          versions: sorted,
          draft,
          published,
          archived,
          display: draft || published || archived || sorted[0],
        };
      },
    );
  }, [paths]);

  const counts = useMemo(
    () => ({
      draft: families.filter((family) => family.draft).length,
      published: families.filter((family) => family.published).length,
      archived: families.filter(
        (family) =>
          !family.draft &&
          !family.published &&
          family.archived,
      ).length,
    }),
    [families],
  );

  async function runAction(
    path: LearningPathResponse,
    action: "publish" | "archive" | "unarchive" | "delete",
  ) {
    if (
      action === "delete" &&
      !(await smartConfirm({
        title: "Supprimer définitivement le parcours",
        description: `Supprimer définitivement le parcours « ${path.title} » ?`,
        confirmLabel: "Supprimer",
        destructive: true,
      }))
    ) {
      return;
    }

    setBusyId(path.id);
    setError("");
    setSuccess("");

    try {
      if (action === "publish") {
        await publishLearningPath(path.id);
        setSuccess("Parcours publié.");
      } else if (action === "archive") {
        await archiveLearningPath(path.id);
        setSuccess("Parcours archivé.");
      } else if (action === "unarchive") {
        await unarchiveLearningPath(path.id);
        setSuccess("Parcours désarchivé.");
      } else {
        await deleteLearningPath(path.id);
        setSuccess("Parcours supprimé.");
      }

      await reload();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1440, mx: "auto" }}>
      <SmartPageHeader
        eyebrow="Pilotage pédagogique"
        title="Parcours de formation"
        description="Assemblez vos formations dans des parcours ordonnés, suivez leur cycle de vie et gérez leurs versions sans perturber les apprenants déjà affectés."
        actions={
          <Button
            component={Link}
            to={`${basePath}/new`}
            variant="contained"
            startIcon={<Plus size={18} />}
          >
            Créer un parcours
          </Button>
        }
      />

      <Box
        aria-label="Statistiques parcours"
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <SmartMetricCard
          label="Parcours"
          value={families.length}
          helper="Familles de parcours"
          icon={<BookOpenCheck />}
        />
        <SmartMetricCard
          label="Publiés"
          value={counts.published}
          helper="Prêts à être affectés"
          icon={<Send />}
        />
        <SmartMetricCard
          label="Brouillons"
          value={counts.draft}
          helper="Versions en préparation"
          icon={<Pencil />}
        />
        <SmartMetricCard
          label="Archivés"
          value={counts.archived}
          helper="Hors catalogue actif"
          icon={<Archive />}
        />
      </Box>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : families.length === 0 ? (
        <Card
          variant="outlined"
          sx={{ borderRadius: 4, borderStyle: "dashed" }}
        >
          <CardContent sx={{ py: 7, textAlign: "center" }}>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                bgcolor: "action.hover",
                mx: "auto",
              }}
            >
              <BookOpenCheck size={34} />
            </Box>
            <Typography variant="h6" sx={{ mt: 2, fontWeight: 900 }}>
              Aucun parcours pour le moment
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ mt: 1, maxWidth: 520, mx: "auto" }}
            >
              Créez un parcours, ajoutez-y des formations existantes et
              publiez-le lorsque sa séquence est prête.
            </Typography>
            <Button
              component={Link}
              to={`${basePath}/new`}
              variant="contained"
              startIcon={<Plus size={18} />}
              sx={{ mt: 2.5 }}
            >
              Créer mon premier parcours
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns:
              families.length === 1
                ? "1fr"
                : {
                    xs: "1fr",
                    xl: "repeat(2, minmax(0, 1fr))",
                  },
            gap: 2.5,
            maxWidth: families.length === 1 ? 1180 : "none",
            width: "100%",
            mx: families.length === 1 ? "auto" : 0,
          }}
        >
          {families.map((family) => {
            const path = family.display;
            const draft = family.draft;
            const published = family.published;
            const archived = family.archived;
            const busy =
              busyId === path.id ||
              busyId === draft?.id ||
              busyId === published?.id;

            const viewTarget =
              published || draft || archived || path;

            const editTarget =
              draft || published || undefined;

            const coverSource = draft || published || path;

            return (
              <Card
                key={family.rootId}
                variant="outlined"
                sx={{
                  overflow: "hidden",
                  borderRadius: 3.5,
                  display: "flex",
                  flexDirection:
                    families.length === 1
                      ? { xs: "column", lg: "row" }
                      : "column",
                  minWidth: 0,
                  transition:
                    "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: 4,
                    borderColor: "primary.light",
                  },
                }}
              >
                <Box
                  sx={{
                    position: "relative",
                    width:
                      families.length === 1
                        ? { xs: "100%", lg: 380 }
                        : "100%",
                    minHeight:
                      families.length === 1
                        ? { xs: 180, lg: 280 }
                        : 180,
                    height:
                      families.length === 1
                        ? { xs: 180, lg: 280 }
                        : 180,
                    flexShrink: 0,
                    bgcolor: "action.hover",
                    overflow: "hidden",
                  }}
                >
                  {buildMediaUrl(
                    coverSource.coverImageUrl ||
                      coverSource.coverImagePath,
                  ) ? (
                    <CardMedia
                      component="img"
                      height="180"
                      image={
                        buildMediaUrl(
                          coverSource.coverImageUrl ||
                            coverSource.coverImagePath,
                        ) || undefined
                      }
                      alt={coverSource.title}
                      sx={{
                        objectFit: "contain",
                        width: "100%",
                        height:
                          families.length === 1
                            ? { xs: 180, lg: 280 }
                            : 180,
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        height:
                          families.length === 1
                            ? { xs: 180, lg: 280 }
                            : 180,
                        display: "grid",
                        placeItems: "center",
                        color: "text.secondary",
                      }}
                    >
                      <BookOpenCheck size={42} />
                    </Box>
                  )}

                  <Stack
                    direction="row"
                    spacing={0.75}
                    useFlexGap
                    sx={{
                      position: "absolute",
                      left: 14,
                      right: 14,
                      top: 14,
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <Chip
                      size="small"
                      label={visibilityLabel(path.visibility)}
                      sx={{
                        bgcolor: "background.paper",
                        fontWeight: 800,
                        boxShadow: 1,
                      }}
                    />

                    <Stack
                      direction="row"
                      spacing={0.75}
                      useFlexGap
                      sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}
                    >
                      {draft ? (
                        <Chip
                          size="small"
                          label={`V${draft.versionNumber || 1} · Brouillon`}
                          color="warning"
                          sx={{ fontWeight: 800, boxShadow: 1 }}
                        />
                      ) : published ? (
                        <Chip
                          size="small"
                          label={`V${published.versionNumber || 1} · Publié`}
                          color="success"
                          sx={{ fontWeight: 800, boxShadow: 1 }}
                        />
                      ) : archived ? (
                        <Chip
                          size="small"
                          label={`V${archived.versionNumber || 1} · Archivé`}
                          sx={{
                            bgcolor: "background.paper",
                            fontWeight: 800,
                            boxShadow: 1,
                          }}
                        />
                      ) : null}
                    </Stack>
                  </Stack>
                </Box>

                <CardContent
                  sx={{
                    p: 2.5,
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 900,
                          lineHeight: 1.2,
                        }}
                      >
                        {path.title}
                      </Typography>

                      <Typography
                        color="text.secondary"
                        sx={{
                          mt: 0.75,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {path.shortDescription ||
                          "Aucune description courte."}
                      </Typography>
                    </Box>

                  </Stack>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={0.75}
                    useFlexGap
                    sx={{
                      mt: 2.25,
                      pt: 2,
                      borderTop: 1,
                      borderColor: "divider",
                      color: "text.secondary",
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>
                      {family.versions.length} version{family.versions.length > 1 ? "s" : ""}
                    </Typography>
                    {published ? (
                      <Typography variant="caption">
                        · Version publiée V{published.versionNumber || 1}
                      </Typography>
                    ) : null}
                    {draft ? (
                      <Typography variant="caption" color="warning.main" sx={{ fontWeight: 800 }}>
                        · Révision V{draft.versionNumber || 1} en cours
                      </Typography>
                    ) : null}
                  </Stack>

                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    sx={{
                      flexWrap: "wrap",
                      mt: 2.5,
                      pt: 0.25,
                      alignItems: "center",
                    }}
                  >
                    <Button
                      component={Link}
                      to={`${basePath}/${viewTarget.id}`}
                      size="small"
                      variant="contained"
                      startIcon={<Eye size={16} />}
                    >
                      Ouvrir
                    </Button>

                    {editTarget ? (
                      <Button
                        component={Link}
                        to={`${basePath}/${editTarget.id}/edit`}
                        size="small"
                        variant="outlined"
                        startIcon={<Pencil size={16} />}
                      >
                        {draft
                          ? `Modifier V${draft.versionNumber || 1}`
                          : "Modifier"}
                      </Button>
                    ) : null}

                    {draft ? (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={busy}
                        startIcon={<Send size={16} />}
                        onClick={() =>
                          void runAction(draft, "publish")
                        }
                      >
                        Publier V{draft.versionNumber || 1}
                      </Button>
                    ) : null}

                    {!draft && published ? (
                      <Button
                        size="small"
                        variant="text"
                        disabled={busy}
                        startIcon={<Archive size={16} />}
                        onClick={() =>
                          void runAction(published, "archive")
                        }
                      >
                        Archiver
                      </Button>
                    ) : null}

                    {!published && archived ? (
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={busy}
                        startIcon={<RotateCcw size={16} />}
                        onClick={() =>
                          void runAction(
                            archived,
                            "unarchive",
                          )
                        }
                      >
                        Désarchiver
                      </Button>
                    ) : null}

                    {draft ? (
                      <Button
                        size="small"
                        color="error"
                        variant="text"
                        disabled={busy}
                        startIcon={<Trash2 size={16} />}
                        onClick={() =>
                          void runAction(draft, "delete")
                        }
                      >
                        Supprimer le brouillon
                      </Button>
                    ) : !published && archived ? (
                      <Button
                        title={deleteAvailabilityByPathId[archived.id] === "blocked"
                          ? "Ce parcours a déjà été affecté. Archive et historique conservés."
                          : deleteAvailabilityByPathId[archived.id] === "unavailable"
                            ? "Impossible de vérifier l’historique des affectations."
                            : undefined
                        }
                        size="small"
                        color="error"
                        variant="text"
                        disabled={busy || deleteAvailabilityByPathId[archived.id] !== "allowed"}
                        startIcon={<Trash2 size={16} />}
                        onClick={() =>
                          void runAction(archived, "delete")
                        }
                      >
                        {deleteAvailabilityByPathId[archived.id] === "checking"
                          ? "Vérification..."
                          : deleteAvailabilityByPathId[archived.id] === "allowed"
                            ? "Supprimer"
                            : "Suppression indisponible"}
                      </Button>
                    ) : null}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

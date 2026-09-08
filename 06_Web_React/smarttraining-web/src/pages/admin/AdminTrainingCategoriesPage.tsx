import { useEffect, useMemo, useState } from "react";
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
  FormControlLabel,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  createTrainingCategory,
  getAdminTrainingCategories,
  updateTrainingCategory,
} from "../../api/trainingCategoryApi";
import { getApiErrorMessage } from "../../api/apiClient";
import {
  SmartMetricCard,
  SmartPageHeader,
  SmartSectionCard,
} from "../../components/ui";
import { smartConfirm } from "../../components/ux/smartConfirmService";
import type {
  TrainingCategoryRequest,
  TrainingCategoryResponse,
} from "../../types/trainingCategory";

type CategoryFormState = {
  name: string;
  active: boolean;
  sortOrder: number;
};

const emptyForm: CategoryFormState = {
  name: "",
  active: true,
  sortOrder: 0,
};

export function AdminTrainingCategoriesPage() {
  const [items, setItems] = useState<TrainingCategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] =
    useState<TrainingCategoryResponse | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const result = await getAdminTrainingCategories();
      setItems(result);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const activeCount = useMemo(
    () => items.filter((item) => item.active).length,
    [items],
  );

  const inactiveCount = items.length - activeCount;

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      sortOrder:
        items.length > 0
          ? Math.max(...items.map((item) => item.sortOrder ?? 0)) + 10
          : 10,
    });
    setError("");
    setSuccess("");
    setDialogOpen(true);
  }

  function openEdit(item: TrainingCategoryResponse) {
    setEditing(item);
    setForm({
      name: item.name,
      active: item.active,
      sortOrder: item.sortOrder ?? 0,
    });
    setError("");
    setSuccess("");
    setDialogOpen(true);
  }

  function closeDialog() {
    if (saving) {
      return;
    }

    setDialogOpen(false);
  }

  async function save() {
    const normalizedName = form.name.trim();

    if (!normalizedName) {
      setError("Le nom de la categorie est obligatoire.");
      return;
    }

    const request: TrainingCategoryRequest = {
      name: normalizedName,
      active: form.active,
      sortOrder: Math.max(0, Number(form.sortOrder) || 0),
    };

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editing) {
        await updateTrainingCategory(editing.id, request);
        setSuccess("Categorie mise a jour.");
      } else {
        await createTrainingCategory(request);
        setSuccess("Categorie creee.");
      }

      setDialogOpen(false);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: TrainingCategoryResponse) {
    // UXD14_B1_CATEGORY_ACTIVE_DIALOG
    const confirmed = await smartConfirm({
      title: item.active ? "Désactiver la catégorie" : "Réactiver la catégorie",
      description: item.active
        ? `Confirmer la désactivation de la catégorie « ${item.name} » ?`
        : `Confirmer la réactivation de la catégorie « ${item.name} » ?`,
      confirmLabel: item.active ? "Désactiver" : "Réactiver",
      destructive: item.active,
    });

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await updateTrainingCategory(item.id, {
        name: item.name,
        active: !item.active,
        sortOrder: item.sortOrder,
      });

      setSuccess(
        item.active
          ? "Categorie desactivee."
          : "Categorie reactivee.",
      );

      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={3}>
      {/* WEB_VISUAL_3_ADMIN_CATEGORIES_SAFE_V1 */}
      <SmartPageHeader
        eyebrow="Référentiel pédagogique"
        title="Catégories de formation"
        description="Gérez le référentiel partagé par les formations Web et Mobile, sans perdre l'historique des catégories déjà utilisées."
        actions={
          <Button
            variant="contained"
            onClick={openCreate}
            disabled={loading || saving}
          >
            Nouvelle catégorie
          </Button>
        }
      />

      {error ? (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      ) : null}

      {success ? (
        <Alert severity="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        <SmartMetricCard
          label="Référentiel"
          value={items.length}
          helper="Catégories enregistrées"
        />
        <SmartMetricCard
          label="Actives"
          value={activeCount}
          helper="Proposées aux nouvelles formations"
        />
        <SmartMetricCard
          label="Historique"
          value={inactiveCount}
          helper="Catégories conservées mais inactives"
        />
      </Box>

      <SmartSectionCard
        title="Référentiel"
        description="Les catégories actives sont disponibles lors de la création ou modification d'une formation."
      >
        {loading ? (
          <Stack
            spacing={1.5}
            sx={{
              minHeight: 220,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress size={28} />
            <Typography color="text.secondary">
              {"Chargement des categories..."}
            </Typography>
          </Stack>
        ) : items.length === 0 ? (
          <Stack
            spacing={1.5}
            sx={{
              minHeight: 220,
              p: 3,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography sx={{ fontWeight: 800 }}>
              {"Aucune categorie"}
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ textAlign: "center" }}
            >
              {
                "Creez la premiere categorie du referentiel pour commencer."
              }
            </Typography>
            <Button variant="contained" onClick={openCreate}>
              {"Creer une categorie"}
            </Button>
          </Stack>
        ) : (
          <TableContainer>
            <Table
              size="small"
              sx={{
                "& thead th": {
                  bgcolor: "action.hover",
                  color: "text.secondary",
                  fontWeight: 900,
                },
                "& tbody tr:last-of-type td": { borderBottom: 0 },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>{"Categorie"}</TableCell>
                  <TableCell>{"Statut"}</TableCell>
                  <TableCell align="right">{"Ordre"}</TableCell>
                  <TableCell align="right">{"Actions"}</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800 }}>
                        {item.name}
                      </Typography>

                      {!item.active ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          {
                            "Historique : non proposee pour de nouvelles affectations."
                          }
                        </Typography>
                      ) : null}
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={item.active ? "Active" : "Inactive"}
                        color={item.active ? "success" : "default"}
                        variant={item.active ? "filled" : "outlined"}
                      />
                    </TableCell>

                    <TableCell align="right">
                      {item.sortOrder}
                    </TableCell>

                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                          justifyContent: "flex-end",
                          flexWrap: "wrap",
                          rowGap: 0.5,
                        }}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openEdit(item)}
                          disabled={saving}
                        >
                          {"Modifier"}
                        </Button>

                        <Button
                          size="small"
                          color={item.active ? "warning" : "success"}
                          onClick={() => void toggleActive(item)}
                          disabled={saving}
                        >
                          {item.active ? "Desactiver" : "Reactiver"}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SmartSectionCard>

      <Alert severity="info">
        {
          "Une categorie deja utilisee ne doit pas etre renommee : desactivez-la puis creez une nouvelle categorie. Les anciennes formations conservent leur libelle historique."
        }
      </Alert>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editing ? "Modifier la categorie" : "Nouvelle categorie"}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2.25} sx={{ pt: 1 }}>
            <TextField
              label="Nom"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              required
              fullWidth
              autoFocus
            />

            <TextField
              label="Ordre d'affichage"
              type="number"
              value={form.sortOrder}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  sortOrder: Math.max(
                    0,
                    Number(event.target.value) || 0,
                  ),
                }))
              }
              fullWidth
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.active}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                />
              }
              label={
                form.active
                  ? "Categorie active"
                  : "Categorie inactive"
              }
            />

            {editing ? (
              <Typography variant="body2" color="text.secondary">
                {
                  "Si cette categorie est deja utilisee par une formation, le backend refusera son renommage afin de proteger l'historique."
                }
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            {"Annuler"}
          </Button>
          <Button
            variant="contained"
            onClick={() => void save()}
            disabled={saving || !form.name.trim()}
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
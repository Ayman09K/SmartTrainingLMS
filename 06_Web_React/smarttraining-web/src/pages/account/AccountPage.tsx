/* WEB_VISUAL_7_ACCOUNT_SAFE_V1 */
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  LockKeyhole,
  Palette,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import {
  changeMyPassword,
  getMyTrainerAccessRequests,
  requestTrainerAccess,
  updateMyProfile,
} from "../../api/authApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { AccountDeletionPanel } from "../../components/account/AccountDeletionPanel";
import {
  SmartConfirmDialog,
  SmartEmptyState,
  SmartErrorState,
} from "../../components/ux";
import { useAuth } from "../../features/auth/AuthContext";
import {
  type SmartTrainingAccent,
  type SmartTrainingAppearance,
  type SmartTrainingThemeMode,
} from "../../theme/appearance";
import { smartTrainingAccents } from "../../theme/tokens";
import { useSmartTrainingAppearance } from "../../theme/useSmartTrainingAppearance";
import type {
  Civilite,
  TrainerAccessRequestResponse,
  TrainerRequestStatus,
  UserRole,
} from "../../types/auth";

const MAX_AVATAR_BYTES = 900 * 1024;

type AccountSection =
  | "profile"
  | "security"
  | "appearance"
  | "privacy"
  | "evolution";

function displayRole(role?: UserRole, civilite?: Civilite): string {
  if (role === "APPRENANT") {
    if (civilite === "MADAME") return "Apprenante";
    if (civilite === "MONSIEUR") return "Apprenant";
    return "Apprenant / Apprenante";
  }

  if (role === "FORMATEUR") {
    if (civilite === "MADAME") return "Formatrice";
    if (civilite === "MONSIEUR") return "Formateur";
    return "Formateur / Formatrice";
  }

  if (role === "ADMIN") {
    if (civilite === "MADAME") return "Administratrice";
    if (civilite === "MONSIEUR") return "Administrateur";
    return "Administrateur / Administratrice";
  }

  return "Utilisateur";
}

function initials(firstName?: string, lastName?: string): string {
  const value = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.trim();
  return value ? value.toUpperCase() : "ST";
}

function trainerRequestStatusLabel(status: TrainerRequestStatus): string {
  if (status === "PENDING") return "En attente";
  if (status === "APPROVED") return "Acceptée";
  if (status === "REJECTED") return "Refusée";
  return "Annulée";
}

function trainerRequestDate(value?: string | null): string {
  if (!value) return "Date indisponible";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function sameAppearance(
  left: SmartTrainingAppearance,
  right: SmartTrainingAppearance,
): boolean {
  return left.themeMode === right.themeMode && left.accent === right.accent;
}

const THEME_OPTIONS: Array<{
  value: SmartTrainingThemeMode;
  label: string;
  description: string;
}> = [
  {
    value: "MODERN",
    label: "Modern",
    description: "Interface équilibrée, claire et contemporaine.",
  },
  {
    value: "CORPORATE",
    label: "Corporate",
    description: "Présentation structurée pour un usage professionnel.",
  },
  {
    value: "DARK",
    label: "Dark",
    description: "Interface sombre pour réduire la luminosité.",
  },
  {
    value: "ACCESSIBLE",
    label: "Accessible",
    description: "Contrastes et lisibilité renforcés.",
  },
];

const ACCENT_OPTIONS: Array<{
  value: SmartTrainingAccent;
  label: string;
}> = [
  { value: "BLUE", label: "Bleu" },
  { value: "VIOLET", label: "Violet" },
  { value: "GREEN", label: "Vert" },
  { value: "ORANGE", label: "Orange" },
];

export function AccountPage() {
  const { user, refreshUser, updateSessionToken } = useAuth();
  const {
    appearance,
    preferenceStatus,
    preferenceError,
    setThemeMode,
    setAccent,
    savePreferencesToServer,
  } = useSmartTrainingAppearance();

  const [activeSection, setActiveSection] =
    useState<AccountSection>("profile");
  const [pendingSection, setPendingSection] =
    useState<AccountSection | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  const [appearanceBaseline, setAppearanceBaseline] =
    useState<SmartTrainingAppearance>(appearance);
  const [appearanceTouched, setAppearanceTouched] = useState(false);
  const [appearanceSuccess, setAppearanceSuccess] =
    useState<string | null>(null);
  const [appearanceError, setAppearanceError] =
    useState<string | null>(null);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [civilite, setCivilite] = useState<Civilite>(
    user?.civilite ?? "NON_RENSEIGNEE",
  );
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(
    user?.avatarDataUrl ?? null,
  );
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [trainerRequests, setTrainerRequests] = useState<
    TrainerAccessRequestResponse[]
  >([]);
  const [trainerRequestLoading, setTrainerRequestLoading] = useState(false);
  const [trainerRequestBusy, setTrainerRequestBusy] = useState(false);
  const [trainerRequestError, setTrainerRequestError] =
    useState<string | null>(null);
  const [trainerRequestSuccess, setTrainerRequestSuccess] =
    useState<string | null>(null);
  const [expertiseDomain, setExpertiseDomain] = useState("");
  const [experienceSummary, setExperienceSummary] = useState("");
  const [motivation, setMotivation] = useState("");

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setEmail(user?.email ?? "");
    setCivilite(user?.civilite ?? "NON_RENSEIGNEE");
    setAvatarDataUrl(user?.avatarDataUrl ?? null);
  }, [user]);

  useEffect(() => {
    if (preferenceStatus === "SYNCED" && !appearanceTouched) {
      setAppearanceBaseline(appearance);
    }
  }, [appearance, appearanceTouched, preferenceStatus]);

  useEffect(() => {
    if (user?.role !== "APPRENANT") {
      setTrainerRequests([]);
      return;
    }

    let active = true;

    async function loadTrainerRequests() {
      setTrainerRequestLoading(true);
      setTrainerRequestError(null);

      try {
        const requests = await getMyTrainerAccessRequests();
        if (active) setTrainerRequests(requests);
      } catch (error) {
        if (active) {
          setTrainerRequestError(getApiErrorMessage(error));
        }
      } finally {
        if (active) setTrainerRequestLoading(false);
      }
    }

    void loadTrainerRequests();

    return () => {
      active = false;
    };
  }, [user?.role]);

  const emailChanged =
    email.trim().toLowerCase() !==
    (user?.email ?? "").trim().toLowerCase();

  const roleLabel = useMemo(
    () => displayRole(user?.role, civilite),
    [user?.role, civilite],
  );

  const profileDirty =
    firstName !== (user?.firstName ?? "") ||
    lastName !== (user?.lastName ?? "") ||
    email !== (user?.email ?? "") ||
    civilite !== (user?.civilite ?? "NON_RENSEIGNEE") ||
    avatarDataUrl !== (user?.avatarDataUrl ?? null) ||
    Boolean(currentPasswordForEmail);

  const securityDirty =
    Boolean(newPassword) || Boolean(confirmPassword);

  const passwordSubmitReady =
    Boolean(currentPassword) &&
    Boolean(newPassword) &&
    Boolean(confirmPassword);

  const appearanceDirty =
    appearanceTouched && !sameAppearance(appearance, appearanceBaseline);

  const evolutionDirty =
    Boolean(expertiseDomain.trim()) ||
    Boolean(experienceSummary.trim()) ||
    Boolean(motivation.trim());

  const anyDirty =
    profileDirty || securityDirty || appearanceDirty || evolutionDirty;

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!anyDirty) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [anyDirty]);

  const pendingTrainerRequest =
    trainerRequests.find((request) => request.status === "PENDING") ?? null;

  const approvedTrainerRequest =
    trainerRequests.find((request) => request.status === "APPROVED") ?? null;

  const canSubmitTrainerRequest =
    user?.role === "APPRENANT" &&
    !pendingTrainerRequest &&
    !approvedTrainerRequest;

  function sectionDirty(section: AccountSection): boolean {
    if (section === "profile") return profileDirty;
    if (section === "security") return securityDirty;
    if (section === "appearance") return appearanceDirty;
    if (section === "evolution") return evolutionDirty;
    return false;
  }

  function resetSection(section: AccountSection) {
    if (section === "profile") {
      setFirstName(user?.firstName ?? "");
      setLastName(user?.lastName ?? "");
      setEmail(user?.email ?? "");
      setCivilite(user?.civilite ?? "NON_RENSEIGNEE");
      setAvatarDataUrl(user?.avatarDataUrl ?? null);
      setCurrentPasswordForEmail("");
      setProfileError(null);
      setProfileSuccess(null);
      return;
    }

    if (section === "security") {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError(null);
      setPasswordSuccess(null);
      return;
    }

    if (section === "appearance") {
      setThemeMode(appearanceBaseline.themeMode);
      setAccent(appearanceBaseline.accent);
      setAppearanceTouched(false);
      setAppearanceError(null);
      setAppearanceSuccess(null);
      return;
    }

    if (section === "evolution") {
      setExpertiseDomain("");
      setExperienceSummary("");
      setMotivation("");
      setTrainerRequestError(null);
      setTrainerRequestSuccess(null);
    }
  }

  function requestSectionChange(next: AccountSection) {
    if (next === activeSection) return;

    if (sectionDirty(activeSection)) {
      setPendingSection(next);
      setDiscardOpen(true);
      return;
    }

    setActiveSection(next);
  }

  function confirmDiscard() {
    resetSection(activeSection);
    if (pendingSection) setActiveSection(pendingSection);
    setPendingSection(null);
    setDiscardOpen(false);
  }

  async function handleAvatar(file?: File) {
    setProfileError(null);
    setProfileSuccess(null);

    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setProfileError("Choisis une image PNG, JPEG ou WebP.");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setProfileError(
        "La photo dépasse 900 Ko. Choisis une image plus légère.",
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setAvatarDataUrl(
        typeof reader.result === "string" ? reader.result : null,
      );
    };

    reader.onerror = () => {
      setProfileError("Impossible de lire cette image.");
    };

    reader.readAsDataURL(file);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setProfileError(
        "Le prénom, le nom et l'adresse e-mail sont obligatoires.",
      );
      return;
    }

    if (emailChanged && !currentPasswordForEmail) {
      setProfileError(
        "Saisis ton mot de passe actuel pour modifier l'adresse e-mail.",
      );
      return;
    }

    try {
      setProfileBusy(true);

      const response = await updateMyProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        civilite,
        avatarDataUrl: avatarDataUrl ?? "",
        currentPassword: emailChanged
          ? currentPasswordForEmail
          : undefined,
      });

      if (response.token) {
        await updateSessionToken(response.token);
      } else {
        await refreshUser();
      }

      setCurrentPasswordForEmail("");
      setProfileSuccess("Tes informations ont été enregistrées.");
    } catch (error) {
      setProfileError(getApiErrorMessage(error));
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Complète les trois champs de mot de passe.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(
        "Le nouveau mot de passe doit contenir au moins 6 caractères.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "La confirmation ne correspond pas au nouveau mot de passe.",
      );
      return;
    }

    try {
      setPasswordBusy(true);
      await changeMyPassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Ton mot de passe a été modifié.");
    } catch (error) {
      setPasswordError(getApiErrorMessage(error));
    } finally {
      setPasswordBusy(false);
    }
  }

  async function saveAppearancePreferences() {
    setAppearanceSuccess(null);
    setAppearanceError(null);

    try {
      const saved = await savePreferencesToServer(appearance);
      setAppearanceBaseline(saved);
      setAppearanceTouched(false);
      setAppearanceSuccess(
        "Préférences d'apparence enregistrées sur ton compte.",
      );
    } catch (error) {
      setAppearanceError(getApiErrorMessage(error));
    }
  }

  async function submitTrainerRequest(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setTrainerRequestError(null);
    setTrainerRequestSuccess(null);

    if (!expertiseDomain.trim()) {
      setTrainerRequestError("Indique ton domaine d’expertise.");
      return;
    }

    if (!motivation.trim()) {
      setTrainerRequestError(
        "Explique ta motivation pour devenir formateur.",
      );
      return;
    }

    if (!canSubmitTrainerRequest) {
      setTrainerRequestError(
        pendingTrainerRequest
          ? "Une demande est déjà en attente de traitement."
          : "Une demande a déjà été acceptée. Reconnecte-toi pour actualiser ton rôle.",
      );
      return;
    }

    try {
      setTrainerRequestBusy(true);

      const created = await requestTrainerAccess({
        expertiseDomain: expertiseDomain.trim(),
        experienceSummary: experienceSummary.trim() || undefined,
        motivation: motivation.trim(),
      });

      setTrainerRequests((current) => [
        created,
        ...current.filter((request) => request.id !== created.id),
      ]);
      setExpertiseDomain("");
      setExperienceSummary("");
      setMotivation("");
      setTrainerRequestSuccess(
        "Ta demande a été envoyée. Tu peux suivre son statut ici.",
      );
    } catch (error) {
      setTrainerRequestError(getApiErrorMessage(error));
    } finally {
      setTrainerRequestBusy(false);
    }
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 1180, mx: "auto" }}>
      <Stack spacing={3}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.25, md: 3 },
            border: 1,
            borderColor: "divider",
            borderRadius: 3.5,
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--mui-palette-primary-main) 8%, transparent), transparent 58%)",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2.25}
            sx={{
              alignItems: { sm: "center" },
              justifyContent: "space-between",
            }}
          >
            <Stack
              direction="row"
              spacing={2}
              sx={{ alignItems: "center", minWidth: 0 }}
            >
              <Avatar
                src={avatarDataUrl || undefined}
                alt="Photo de profil"
                sx={{
                  width: 64,
                  height: 64,
                  fontSize: 21,
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  fontWeight: 900,
                  boxShadow: 2,
                }}
              >
                {initials(firstName, lastName)}
              </Avatar>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="overline"
                  sx={{
                    color: "primary.main",
                    fontWeight: 900,
                    letterSpacing: 0.9,
                  }}
                >
                  ESPACE PERSONNEL
                </Typography>
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{ fontWeight: 900, lineHeight: 1.1 }}
                >
                  Mon compte
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{
                    mt: 0.75,
                    maxWidth: 720,
                    overflowWrap: "anywhere",
                  }}
                >
                  {firstName || lastName
                    ? `${firstName} ${lastName}`.trim()
                    : "Votre profil SmartTraining"}
                  {email ? ` · ${email}` : ""}
                </Typography>
              </Box>
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              <Chip
                size="small"
                label={roleLabel}
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 800 }}
              />
              <Chip
                size="small"
                label={anyDirty ? "Modifications à enregistrer" : "Compte à jour"}
                color={anyDirty ? "warning" : "success"}
                variant={anyDirty ? "filled" : "outlined"}
                sx={{ fontWeight: 800 }}
              />
            </Stack>
          </Stack>
        </Paper>

        {anyDirty ? (
          <Alert severity="warning" role="status">
            Des modifications ne sont pas encore enregistrées.
          </Alert>
        ) : null}

        <Paper
          elevation={0}
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 3.5,
            overflow: "hidden",
            boxShadow: "0 10px 32px rgba(15, 23, 42, 0.06)",
          }}
        >
          <Tabs
            value={activeSection}
            onChange={(_, value) =>
              requestSectionChange(value as AccountSection)
            }
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Sections du compte"
            sx={{
              px: 1,
              pt: 0.75,
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: "action.hover",
              "& .MuiTab-root": {
                minHeight: 52,
                borderRadius: "12px 12px 0 0",
                fontWeight: 800,
                textTransform: "none",
              },
              "& .Mui-selected": {
                bgcolor: "background.paper",
              },
            }}
          >
            <Tab
              value="profile"
              icon={<UserRound size={18} />}
              iconPosition="start"
              label="Profil"
            />
            <Tab
              value="security"
              icon={<LockKeyhole size={18} />}
              iconPosition="start"
              label="Sécurité"
            />
            <Tab
              value="appearance"
              icon={<Palette size={18} />}
              iconPosition="start"
              label="Apparence"
            />
            <Tab
              value="privacy"
              icon={<ShieldCheck size={18} />}
              iconPosition="start"
              label="Confidentialité"
            />
            {user?.role === "APPRENANT" ? (
              <Tab
                value="evolution"
                icon={<BriefcaseBusiness size={18} />}
                iconPosition="start"
                label="Devenir formateur"
              />
            ) : null}
          </Tabs>

          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {activeSection === "profile" ? (
              <Box component="form" onSubmit={saveProfile}>
                <Stack spacing={3}>
                  <Box>
                    <Typography
                      variant="h5"
                      component="h2"
                      sx={{ fontWeight: 800 }}
                    >
                      Profil
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Mets à jour les informations utilisées dans SmartTraining.
                    </Typography>
                  </Box>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{ alignItems: { sm: "center" } }}
                  >
                    <Avatar
                      src={avatarDataUrl || undefined}
                      alt="Photo de profil"
                      sx={{
                        width: 88,
                        height: 88,
                        fontSize: 28,
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        fontWeight: 800,
                      }}
                    >
                      {initials(firstName, lastName)}
                    </Avatar>

                    <Stack spacing={1}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                      >
                        <Button
                          component="label"
                          variant="outlined"
                          startIcon={<Camera size={17} />}
                        >
                          Choisir une photo
                          <input
                            hidden
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) => {
                              void handleAvatar(event.target.files?.[0]);
                              event.currentTarget.value = "";
                            }}
                          />
                        </Button>

                        {avatarDataUrl ? (
                          <Button
                            type="button"
                            color="error"
                            variant="text"
                            startIcon={<Trash2 size={16} />}
                            onClick={() => setAvatarDataUrl(null)}
                          >
                            Retirer
                          </Button>
                        ) : null}
                      </Stack>

                      <Typography variant="caption" color="text.secondary">
                        PNG, JPEG ou WebP · 900 Ko maximum.
                      </Typography>
                    </Stack>
                  </Stack>

                  <Divider />

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: "repeat(2, minmax(0, 1fr))",
                      },
                      gap: 2,
                    }}
                  >
                    <FormControl fullWidth>
                      <InputLabel id="account-civilite-label">
                        Civilité
                      </InputLabel>
                      <Select
                        labelId="account-civilite-label"
                        value={civilite}
                        label="Civilité"
                        onChange={(event) =>
                          setCivilite(event.target.value as Civilite)
                        }
                      >
                        <MenuItem value="NON_RENSEIGNEE">
                          Non renseignée
                        </MenuItem>
                        <MenuItem value="MADAME">Madame</MenuItem>
                        <MenuItem value="MONSIEUR">Monsieur</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      label="Rôle"
                      value={roleLabel}
                      disabled
                      helperText="Le rôle est géré par SmartTraining AI."
                      fullWidth
                    />

                    <TextField
                      label="Prénom"
                      value={firstName}
                      slotProps={{ htmlInput: { maxLength: 80 } }}
                      autoComplete="given-name"
                      onChange={(event) => setFirstName(event.target.value)}
                      fullWidth
                    />

                    <TextField
                      label="Nom"
                      value={lastName}
                      slotProps={{ htmlInput: { maxLength: 80 } }}
                      autoComplete="family-name"
                      onChange={(event) => setLastName(event.target.value)}
                      fullWidth
                    />

                    <TextField
                      label="Adresse e-mail"
                      type="email"
                      value={email}
                      slotProps={{ htmlInput: { maxLength: 150 } }}
                      autoComplete="email"
                      onChange={(event) => setEmail(event.target.value)}
                      fullWidth
                      sx={{ gridColumn: { md: "1 / -1" } }}
                    />

                    {emailChanged ? (
                      <TextField
                        label="Mot de passe actuel"
                        type="password"
                        value={currentPasswordForEmail}
                        autoComplete="current-password"
                        onChange={(event) =>
                          setCurrentPasswordForEmail(event.target.value)
                        }
                        helperText="Demandé uniquement pour sécuriser le changement d'adresse e-mail."
                        fullWidth
                        sx={{ gridColumn: { md: "1 / -1" } }}
                      />
                    ) : null}
                  </Box>

                  {profileError ? (
                    <SmartErrorState
                      title="Profil non enregistré"
                      description={profileError}
                    />
                  ) : null}

                  {profileSuccess ? (
                    <Alert
                      severity="success"
                      icon={<CheckCircle2 size={18} />}
                    >
                      {profileSuccess}
                    </Alert>
                  ) : null}

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{ alignItems: { sm: "center" } }}
                  >
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={profileBusy || !profileDirty}
                      startIcon={
                        profileBusy ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <Save size={17} />
                        )
                      }
                    >
                      {profileBusy
                        ? "Enregistrement..."
                        : "Enregistrer le profil"}
                    </Button>

                    <Button
                      type="button"
                      variant="text"
                      disabled={profileBusy || !profileDirty}
                      onClick={() => resetSection("profile")}
                    >
                      Annuler les modifications
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ) : null}

            {activeSection === "security" ? (
              <Box component="form" onSubmit={savePassword}>
                <Stack spacing={3}>
                  <Box>
                    <Typography
                      variant="h5"
                      component="h2"
                      sx={{ fontWeight: 800 }}
                    >
                      Sécurité
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Le mot de passe actuel est toujours demandé avant
                      modification.
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: "repeat(2, minmax(0, 1fr))",
                      },
                      gap: 2,
                    }}
                  >
                    <TextField
                      label="Mot de passe actuel"
                      type="password"
                      value={currentPassword}
                      autoComplete="current-password"
                      onChange={(event) =>
                        setCurrentPassword(event.target.value)
                      }
                      fullWidth
                      sx={{ gridColumn: { md: "1 / -1" } }}
                    />

                    <TextField
                      label="Nouveau mot de passe"
                      type="password"
                      value={newPassword}
                      autoComplete="new-password"
                      slotProps={{ htmlInput: { minLength: 6, maxLength: 100 } }}
                      onChange={(event) =>
                        setNewPassword(event.target.value)
                      }
                      fullWidth
                    />

                    <TextField
                      label="Confirmer le nouveau mot de passe"
                      type="password"
                      value={confirmPassword}
                      autoComplete="new-password"
                      slotProps={{ htmlInput: { minLength: 6, maxLength: 100 } }}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      fullWidth
                    />
                  </Box>

                  {passwordError ? (
                    <SmartErrorState
                      title="Mot de passe non modifié"
                      description={passwordError}
                    />
                  ) : null}

                  {passwordSuccess ? (
                    <Alert
                      severity="success"
                      icon={<CheckCircle2 size={18} />}
                    >
                      {passwordSuccess}
                    </Alert>
                  ) : null}

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                  >
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={passwordBusy || !passwordSubmitReady}
                      startIcon={
                        passwordBusy ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <LockKeyhole size={17} />
                        )
                      }
                    >
                      {passwordBusy
                        ? "Modification..."
                        : "Modifier le mot de passe"}
                    </Button>

                    <Button
                      type="button"
                      variant="text"
                      disabled={passwordBusy || !securityDirty}
                      onClick={() => resetSection("security")}
                    >
                      Effacer
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ) : null}

            {activeSection === "appearance" ? (
              <Stack spacing={3}>
                <Box>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{ fontWeight: 800 }}
                  >
                    Apparence
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Le thème et l'accent sont partagés entre le Web et le
                    Mobile.
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 1, fontWeight: 800 }}
                  >
                    Thème
                  </Typography>

                  <ToggleButtonGroup
                    exclusive
                    value={appearance.themeMode}
                    onChange={(
                      _,
                      value: SmartTrainingThemeMode | null,
                    ) => {
                      if (!value) return;
                      setAppearanceSuccess(null);
                      setAppearanceError(null);
                      setAppearanceTouched(true);
                      setThemeMode(value);
                    }}
                    aria-label="Choisir le thème SmartTraining"
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                        lg: "repeat(4, minmax(0, 1fr))",
                      },
                      gap: 1.25,
                      "& .MuiToggleButtonGroup-grouped": {
                        m: 0,
                        border: 1,
                        borderColor: "divider",
                        borderRadius: "14px !important",
                      },
                    }}
                  >
                    {THEME_OPTIONS.map((option) => (
                      <ToggleButton
                        key={option.value}
                        value={option.value}
                        aria-label={option.label}
                        sx={{
                          minHeight: 104,
                          alignItems: "flex-start",
                          justifyContent: "flex-start",
                          textAlign: "left",
                          textTransform: "none",
                          p: 2,
                        }}
                      >
                        <Stack spacing={0.5}>
                          <Typography sx={{ fontWeight: 800 }}>
                            {option.label}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ textTransform: "none" }}
                          >
                            {option.description}
                          </Typography>
                        </Stack>
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 1, fontWeight: 800 }}
                  >
                    Couleur d'accent
                  </Typography>

                  <ToggleButtonGroup
                    exclusive
                    value={appearance.accent}
                    onChange={(_, value: SmartTrainingAccent | null) => {
                      if (!value) return;
                      setAppearanceSuccess(null);
                      setAppearanceError(null);
                      setAppearanceTouched(true);
                      setAccent(value);
                    }}
                    aria-label="Choisir la couleur d'accent SmartTraining"
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "repeat(2, minmax(0, 1fr))",
                        sm: "repeat(4, minmax(0, 1fr))",
                      },
                      gap: 1.25,
                      "& .MuiToggleButtonGroup-grouped": {
                        m: 0,
                        border: 1,
                        borderColor: "divider",
                        borderRadius: "14px !important",
                      },
                    }}
                  >
                    {ACCENT_OPTIONS.map((option) => (
                      <ToggleButton
                        key={option.value}
                        value={option.value}
                        aria-label={option.label}
                        sx={{
                          minHeight: 58,
                          justifyContent: "flex-start",
                          gap: 1,
                          textTransform: "none",
                          px: 2,
                        }}
                      >
                        <Box
                          aria-hidden="true"
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            bgcolor:
                              smartTrainingAccents[option.value].main,
                            border: "2px solid",
                            borderColor: "background.paper",
                            boxShadow: (theme) =>
                              `0 0 0 1px ${theme.palette.divider}`,
                          }}
                        />
                        <Typography sx={{ fontWeight: 800 }}>
                          {option.label}
                        </Typography>
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>

                {preferenceError && preferenceStatus === "ERROR" ? (
                  <Alert severity="warning">{preferenceError}</Alert>
                ) : null}

                {appearanceError ? (
                  <SmartErrorState
                    title="Apparence non enregistrée"
                    description={appearanceError}
                  />
                ) : null}

                {appearanceSuccess ? (
                  <Alert severity="success">{appearanceSuccess}</Alert>
                ) : null}

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  sx={{ alignItems: { sm: "center" } }}
                >
                  <Button
                    variant="contained"
                    disabled={
                      preferenceStatus === "LOADING" || !appearanceDirty
                    }
                    onClick={() => void saveAppearancePreferences()}
                    startIcon={
                      preferenceStatus === "LOADING" ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <Save size={18} />
                      )
                    }
                  >
                    {preferenceStatus === "LOADING"
                      ? "Enregistrement..."
                      : "Enregistrer l'apparence"}
                  </Button>

                  <Button
                    variant="text"
                    disabled={
                      preferenceStatus === "LOADING" || !appearanceDirty
                    }
                    onClick={() => resetSection("appearance")}
                  >
                    Annuler les modifications
                  </Button>
                </Stack>
              </Stack>
            ) : null}

            {activeSection === "privacy" ? (
              <Stack spacing={3}>
                <Box>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{ fontWeight: 800 }}
                  >
                    Confidentialité
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Consulte les règles de confidentialité et gère les demandes
                    liées à ton compte.
                  </Typography>
                </Box>

                <Paper
                  variant="outlined"
                  sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2.5 }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{
                      justifyContent: "space-between",
                      alignItems: { sm: "center" },
                    }}
                  >
                    <Box>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 800 }}
                      >
                        Politique de confidentialité
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5, maxWidth: 700 }}
                      >
                        Retrouve les données utilisées, leurs finalités et les
                        modalités relatives à tes droits.
                      </Typography>
                    </Box>

                    <Button
                      component="a"
                      href="/privacy"
                      variant="outlined"
                      sx={{ flexShrink: 0 }}
                    >
                      Voir la politique
                    </Button>
                  </Stack>
                </Paper>

                <Divider />

                <Box>
                  <Typography
                    variant="overline"
                    sx={{ color: "error.main", fontWeight: 800 }}
                  >
                    Zone sensible
                  </Typography>
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{ fontWeight: 800 }}
                  >
                    Suppression du compte
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5, mb: 2 }}
                  >
                    La demande est tracée et traitée selon le processus prévu
                    par SmartTraining.
                  </Typography>
                  <AccountDeletionPanel />
                </Box>
              </Stack>
            ) : null}

            {activeSection === "evolution" &&
            user?.role === "APPRENANT" ? (
              <Stack spacing={3}>
                <Box>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{ fontWeight: 800 }}
                  >
                    Devenir formateur
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Présente ton expertise et ta motivation. Un administrateur
                    examinera la demande avant tout changement de rôle.
                  </Typography>
                </Box>

                {trainerRequestLoading ? (
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <CircularProgress size={20} />
                    <Typography color="text.secondary">
                      Chargement de tes demandes...
                    </Typography>
                  </Stack>
                ) : null}

                {pendingTrainerRequest ? (
                  <Alert severity="warning">
                    <Typography sx={{ fontWeight: 800 }}>
                      Demande en attente
                    </Typography>
                    Envoyée le{" "}
                    {trainerRequestDate(
                      pendingTrainerRequest.requestedAt,
                    )}
                    . Une nouvelle demande est bloquée tant que celle-ci n'a
                    pas été traitée.
                  </Alert>
                ) : null}

                {approvedTrainerRequest ? (
                  <Alert severity="success">
                    <Typography sx={{ fontWeight: 800 }}>
                      Demande acceptée
                    </Typography>
                    Traitée le{" "}
                    {trainerRequestDate(
                      approvedTrainerRequest.reviewedAt ||
                        approvedTrainerRequest.requestedAt,
                    )}
                    . Reconnecte-toi pour obtenir une session formateur à jour.
                    {approvedTrainerRequest.adminComment ? (
                      <Typography variant="body2" sx={{ mt: 0.75 }}>
                        Commentaire administrateur :{" "}
                        {approvedTrainerRequest.adminComment}
                      </Typography>
                    ) : null}
                  </Alert>
                ) : null}

                {canSubmitTrainerRequest ? (
                  <Box
                    component="form"
                    onSubmit={submitTrainerRequest}
                  >
                    <Stack spacing={2}>
                      <TextField
                        label="Domaine d’expertise"
                        value={expertiseDomain}
                        slotProps={{ htmlInput: { maxLength: 120 } }}
                        placeholder="Ex. développement web, data, management..."
                        onChange={(event) =>
                          setExpertiseDomain(event.target.value)
                        }
                        fullWidth
                      />

                      <TextField
                        label="Expérience"
                        value={experienceSummary}
                        slotProps={{ htmlInput: { maxLength: 1000 } }}
                        placeholder="Résume ton expérience, tes projets ou tes compétences."
                        onChange={(event) =>
                          setExperienceSummary(event.target.value)
                        }
                        multiline
                        minRows={4}
                        helperText="Facultatif"
                        fullWidth
                      />

                      <TextField
                        label="Motivation"
                        value={motivation}
                        slotProps={{ htmlInput: { maxLength: 1500 } }}
                        placeholder="Pourquoi souhaites-tu devenir formateur ?"
                        onChange={(event) =>
                          setMotivation(event.target.value)
                        }
                        multiline
                        minRows={5}
                        fullWidth
                      />

                      <Button
                        type="submit"
                        variant="contained"
                        disabled={trainerRequestBusy}
                        startIcon={
                          trainerRequestBusy ? (
                            <CircularProgress
                              size={18}
                              color="inherit"
                            />
                          ) : (
                            <Send size={17} />
                          )
                        }
                        sx={{ alignSelf: "flex-start" }}
                      >
                        {trainerRequestBusy
                          ? "Envoi..."
                          : "Envoyer ma demande"}
                      </Button>
                    </Stack>
                  </Box>
                ) : null}

                {trainerRequestError ? (
                  <SmartErrorState
                    title="Demande non envoyée"
                    description={trainerRequestError}
                  />
                ) : null}

                {trainerRequestSuccess ? (
                  <Alert severity="success">
                    {trainerRequestSuccess}
                  </Alert>
                ) : null}

                <Divider />

                <Box>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{
                      justifyContent: "space-between",
                      alignItems: { sm: "center" },
                      mb: 1.5,
                    }}
                  >
                    <Typography
                      variant="h6"
                      component="h3"
                      sx={{ fontWeight: 800 }}
                    >
                      Historique des demandes
                    </Typography>
                    <Chip
                      label={`${trainerRequests.length} demande(s)`}
                      size="small"
                    />
                  </Stack>

                  {!trainerRequestLoading &&
                  trainerRequests.length === 0 ? (
                    <SmartEmptyState
                      title="Aucune demande"
                      description="Tu n'as encore envoyé aucune demande pour devenir formateur."
                    />
                  ) : (
                    <Stack spacing={1.25}>
                      {trainerRequests.map((request) => (
                        <Paper
                          key={request.id}
                          variant="outlined"
                          sx={{ p: 2, borderRadius: 2 }}
                        >
                          <Stack spacing={1}>
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={1}
                              sx={{
                                justifyContent: "space-between",
                                alignItems: { sm: "center" },
                              }}
                            >
                              <Box>
                                <Typography sx={{ fontWeight: 800 }}>
                                  {request.expertiseDomain}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {trainerRequestDate(
                                    request.requestedAt,
                                  )}
                                </Typography>
                              </Box>

                              <Chip
                                size="small"
                                label={trainerRequestStatusLabel(
                                  request.status,
                                )}
                                color={
                                  request.status === "PENDING"
                                    ? "warning"
                                    : request.status === "APPROVED"
                                      ? "success"
                                      : request.status === "REJECTED"
                                        ? "error"
                                        : "default"
                                }
                              />
                            </Stack>

                            {request.adminComment ? (
                              <Typography variant="body2">
                                <Box
                                  component="span"
                                  sx={{ fontWeight: 800 }}
                                >
                                  Commentaire administrateur :
                                </Box>{" "}
                                {request.adminComment}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Stack>
            ) : null}
          </Box>
        </Paper>

      </Stack>

      <SmartConfirmDialog
        open={discardOpen}
        title="Abandonner les modifications ?"
        description="Les changements non enregistrés de cette section seront perdus."
        confirmLabel="Abandonner"
        cancelLabel="Rester ici"
        destructive
        onConfirm={confirmDiscard}
        onCancel={() => {
          setPendingSection(null);
          setDiscardOpen(false);
        }}
      />
    </Box>
  );
}

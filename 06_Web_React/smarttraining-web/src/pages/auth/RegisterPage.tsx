import { useState } from "react";
import type { FormEvent } from "react";
import {
  Link as RouterLink,
  Navigate,
  useNavigate,
} from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { UserRoundPlus } from "lucide-react";
import { register } from "../../api/authApi";
import { AuthPageShell } from "../../components/auth/AuthPageShell";
import { useAuth } from "../../features/auth/AuthContext";

function registrationErrorMessage(error: unknown): string {
  const candidate = error as {
    response?: {
      data?: unknown;
    };
  };

  const data = candidate.response?.data;

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const backendMessage =
      typeof record.message === "string" ? record.message : "";

    if (
      backendMessage.toLocaleLowerCase("fr").includes("existe déjà") ||
      backendMessage.toLocaleLowerCase("fr").includes("already")
    ) {
      return "Cette adresse e-mail est déjà utilisée.";
    }

    const fieldMessage = Object.values(record).find(
      (value): value is string => typeof value === "string" && value.length > 0,
    );

    if (fieldMessage) {
      return fieldMessage;
    }
  }

  if (!candidate.response) {
    return "Impossible de joindre SmartTraining. Vérifiez votre connexion puis réessayez.";
  }

  return "Impossible de créer le compte pour le moment.";
}

export function RegisterPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      !normalizedEmail ||
      !password ||
      !confirmPassword
    ) {
      setError("Tous les champs sont obligatoires.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Saisissez une adresse e-mail valide.");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await register({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        password,
      });

      navigate("/login", {
        replace: true,
        state: {
          registrationSuccess: true,
          registeredEmail: normalizedEmail,
        },
      });
    } catch (registrationError) {
      setError(registrationErrorMessage(registrationError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="Inscription"
      title="Créez votre espace apprenant"
      description="Commencez votre parcours SmartTraining avec un compte apprenant personnel."
      wide
      footer={
        <Typography variant="body2" color="text.secondary" align="center">
          Déjà un compte ?{" "}
          <Box
            component={RouterLink}
            to="/login"
            sx={{
              color: "primary.main",
              fontWeight: 800,
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Se connecter
          </Box>
        </Typography>
      }
    >
      <Alert severity="info" sx={{ mb: 2.5 }}>
        Votre compte sera créé avec le rôle <strong>Apprenant</strong>. Les
        accès Formateur suivent un parcours de validation séparé.
      </Alert>

      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{ display: "grid", gap: 2 }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          <TextField
            label="Prénom"
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            autoComplete="given-name"
            slotProps={{ htmlInput: { maxLength: 80 } }}
            required
            fullWidth
            disabled={submitting}
          />

          <TextField
            label="Nom"
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            autoComplete="family-name"
            slotProps={{ htmlInput: { maxLength: 80 } }}
            required
            fullWidth
            disabled={submitting}
          />
        </Box>

        <TextField
          label="Adresse e-mail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="votre@email.com"
          slotProps={{ htmlInput: { maxLength: 150 } }}
          required
          fullWidth
          disabled={submitting}
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          <TextField
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            slotProps={{ htmlInput: { minLength: 6 } }}
            helperText="6 caractères minimum"
            required
            fullWidth
            disabled={submitting}
          />

          <TextField
            label="Confirmer le mot de passe"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            slotProps={{ htmlInput: { minLength: 6 } }}
            required
            fullWidth
            disabled={submitting}
          />
        </Box>

        {error ? (
          <Alert severity="error" role="alert">
            {error}
          </Alert>
        ) : null}

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting}
          startIcon={
            submitting ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <UserRoundPlus size={19} />
            )
          }
          sx={{ mt: 0.5, minHeight: 46 }}
        >
          {submitting ? "Création du compte..." : "Créer mon compte"}
        </Button>
        <Typography
          variant="caption"
          color="text.secondary"
          align="center"
          sx={{ mt: 0.5 }}
        >
          En créant votre compte, vous pouvez consulter notre{" "}
          <Box
            component={RouterLink}
            to="/privacy"
            sx={{
              color: "primary.main",
              fontWeight: 800,
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            politique de confidentialité
          </Box>
          .
        </Typography>
      </Box>
    </AuthPageShell>
  );
}
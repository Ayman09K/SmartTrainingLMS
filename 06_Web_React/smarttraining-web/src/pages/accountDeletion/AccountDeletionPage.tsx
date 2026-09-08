import {
  Alert,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { AuthPageShell } from "../../components/auth/AuthPageShell";

export function AccountDeletionPage() {
  return (
    <AuthPageShell
      eyebrow="Gestion du compte"
      title="Demander la suppression d’un compte"
      description="Ressource Web publique SmartTraining pour comprendre et initier une demande de suppression de compte."
      wide
      footer={
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "center" }}>
          <Button component={RouterLink} to="/login" variant="contained">
            Se connecter pour demander
          </Button>
          <Button component={RouterLink} to="/privacy" variant="text">
            Politique de confidentialité
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2.5}>
        <Alert severity="info">
          Cette ressource est accessible sans l’application mobile. La demande
          elle-même est initiée dans l’espace Web authentifié afin de vérifier
          que la personne contrôle le compte concerné.
        </Alert>

        <Paper variant="outlined" sx={{ p: { xs: 2.25, md: 3 }, borderRadius: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 900 }}>
              Comment envoyer la demande
            </Typography>
            <Typography>
              1. Connectez-vous sur le Web avec le compte concerné. Si besoin,
              utilisez « Mot de passe oublié ».
            </Typography>
            <Typography>
              2. Ouvrez « Mon compte », puis « Suppression du compte » et
              confirmez « Demander la suppression de mon compte ».
            </Typography>
            <Typography>
              3. La demande est enregistrée avec un statut traçable et les
              doublons actifs sont évités.
            </Typography>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2.25, md: 3 }, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 900 }}>
              Suppression, désactivation et historiques
            </Typography>
            <Typography color="text.secondary">
              SmartTraining distingue explicitement une demande de suppression
              d’une désactivation ou d’une suspension. Le workflow de demande
              n’exécute pas un DELETE aveugle sur la table users.
            </Typography>
            <Divider />
            <Typography color="text.secondary">
              Les données directement liées au compte doivent être supprimées
              ou anonymisées lorsque cela est possible. Certains historiques
              pédagogiques peuvent nécessiter une conservation ou une
              anonymisation afin de préserver la cohérence des formations,
              évaluations, certificats et statistiques.
            </Typography>
            <Divider />
            <Typography color="text.secondary">
              La conformité de la procédure réellement utilisée lors de la
              distribution Google Play reste contrôlée au Patch19.
            </Typography>
          </Stack>
        </Paper>
      </Stack>
    </AuthPageShell>
  );
}

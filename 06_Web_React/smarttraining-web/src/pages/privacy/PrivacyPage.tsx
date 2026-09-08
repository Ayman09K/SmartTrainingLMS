import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import {
  BarChart3,
  BookOpenCheck,
  Database,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { AuthPageShell } from "../../components/auth/AuthPageShell";

const dataGroups = [
  {
    icon: UserRound,
    title: "Compte, identité et préférences",
    text:
      "Prénom, nom, adresse e-mail, civilité, photo de profil, rôle, état du compte et préférences d’apparence lorsque ces informations sont renseignées.",
  },
  {
    icon: BookOpenCheck,
    title: "Parcours de formation",
    text:
      "Formations, inscriptions, invitations, groupes ou cohortes, accès aux contenus, progression, complétions, activité sur les modules, leçons et ressources.",
  },
  {
    icon: Database,
    title: "Quiz et évaluations",
    text:
      "Quiz proposés, tentatives, réponses, scores et résultats nécessaires au suivi pédagogique et à l’évaluation du parcours.",
  },
  {
    icon: MessageSquareText,
    title: "Accompagnement et échanges",
    text:
      "Feedbacks, avis, demandes d’aide, réponses, alertes pédagogiques, interventions et séances d’accompagnement lorsque ces fonctions sont utilisées.",
  },
  {
    icon: BarChart3,
    title: "Analytics et aide au suivi",
    text:
      "Indicateurs de progression, d’activité et de risque, statistiques et recommandations produites à partir des données disponibles. Ces indicateurs assistent le suivi pédagogique et ne constituent pas, à eux seuls, une décision humaine.",
  },
];

const purposes = [
  "Créer, sécuriser et administrer les comptes SmartTraining.",
  "Donner accès aux formations et assurer le fonctionnement du LMS.",
  "Enregistrer la progression, les complétions, les quiz et les résultats.",
  "Permettre l’accompagnement pédagogique, les feedbacks et le support.",
  "Produire des statistiques, indicateurs et recommandations utiles au suivi.",
  "Prévenir les abus, protéger l’authentification et assurer la sécurité opérationnelle.",
];

export function PrivacyPage() {
  return (
    <AuthPageShell
      eyebrow="Confidentialité"
      title="Politique de confidentialité"
      description="Comprendre quelles données SmartTraining utilise, pourquoi elles sont nécessaires et comment elles sont protégées."
      wide
      footer={
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ justifyContent: "center" }}
        >
          <Button component={RouterLink} to="/login" variant="outlined">
            Se connecter
          </Button>
          <Button component={RouterLink} to="/register" variant="text">
            Créer un compte
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2.5}>
        <Alert severity="info">
          Dernière mise à jour : 20 août 2026. Cette page décrit le
          fonctionnement actuel de SmartTraining AI. Les paramètres du
          déploiement réel et les services effectivement activés doivent rester
          cohérents avec cette politique.
        </Alert>

        <Paper variant="outlined" sx={{ p: { xs: 2.25, md: 3 }, borderRadius: 3 }}>
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
            >
              <Box>
                <Typography variant="overline" color="primary.main" sx={{ fontWeight: 900 }}>
                  SMARTTRAINING AI
                </Typography>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 900 }}>
                  Champ d’application
                </Typography>
              </Box>
              <Chip label="Web & Mobile" variant="outlined" />
            </Stack>

            <Typography color="text.secondary">
              Cette politique concerne les espaces Apprenant, Formateur et
              Administrateur de SmartTraining ainsi que les fonctions de
              formation, d’évaluation, de suivi et d’accompagnement utilisées
              dans la solution.
            </Typography>
          </Stack>
        </Paper>

        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 900, mb: 1.5 }}>
            Données traitées
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              gap: 1.5,
            }}
          >
            {dataGroups.map(({ icon: Icon, title, text }) => (
              <Paper key={title} variant="outlined" sx={{ p: 2.25, borderRadius: 3 }}>
                <Stack spacing={1}>
                  <Icon size={22} aria-hidden="true" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                    {title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {text}
                  </Typography>
                </Stack>
              </Paper>
            ))}
          </Box>
        </Box>

        <Paper variant="outlined" sx={{ p: { xs: 2.25, md: 3 }, borderRadius: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 900 }}>
              Pourquoi ces données sont utilisées
            </Typography>

            {purposes.map((purpose) => (
              <Stack key={purpose} direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
                <ShieldCheck size={18} aria-hidden="true" />
                <Typography variant="body2">{purpose}</Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2.25, md: 3 }, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 900 }}>
                Accès aux données
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                L’accès dépend du rôle et du besoin métier : un apprenant
                consulte principalement ses propres données ; un formateur
                accède aux données pédagogiques des apprenants qu’il est
                autorisé à suivre ; un administrateur dispose des accès
                nécessaires à l’administration de l’instance. Les échanges
                entre services sont limités aux besoins fonctionnels de la
                plateforme.
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 900 }}>
                Sécurité
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                SmartTraining utilise notamment une authentification par jeton,
                des contrôles de rôle et d’autorisation, des mots de passe
                stockés sous forme protégée, des liens de réinitialisation à
                durée limitée et à usage unique ainsi que des protections
                contre les tentatives répétées d’authentification. La sécurité
                du transport et de l’hébergement dépend également de la
                configuration du déploiement utilisé.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2.25, md: 3 }, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 900 }}>
                Conservation
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                Les données sont conservées aussi longtemps qu’elles sont
                nécessaires au fonctionnement du compte, au parcours de
                formation, au suivi pédagogique, à l’administration de
                l’instance et aux obligations applicables au déploiement
                concerné. SmartTraining n’affiche pas ici une durée générique
                qui ne serait pas démontrée par la configuration réelle.
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 900 }}>
                Demandes relatives à vos données et suppression
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                Vous pouvez demander des informations sur vos données ou la
                suppression de votre compte auprès de l’administrateur de
                votre instance SmartTraining. Selon le contexte, certaines
                données pédagogiques peuvent devoir être conservées ou
                anonymisées lorsqu’une exigence technique, pédagogique ou
                réglementaire l’impose. Le parcours de demande de suppression
                proposé dans l’application est traité séparément par la
                fonctionnalité dédiée.
              </Typography>
              <Button
                component={RouterLink}
                to="/account-deletion"
                variant="outlined"
                sx={{ mt: 2 }}
              >
                Procédure de suppression du compte
              </Button>
            </Box>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2.25, md: 3 }, borderRadius: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
            <LockKeyhole size={26} aria-hidden="true" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Contact
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pour une demande liée à la confidentialité, contactez
                l’administrateur de votre instance SmartTraining. Pour une
                application distribuée, les coordonnées développeur publiées
                avec l’application constituent également un point de contact.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Typography variant="caption" color="text.secondary">
          Cette politique décrit les fonctions de la solution ; elle ne
          constitue pas, à elle seule, une déclaration de conformité juridique
          globale. Le déploiement, les prestataires réellement activés et les
          pratiques de l’organisation exploitante doivent être cohérents avec
          les informations communiquées aux utilisateurs.
        </Typography>
      </Stack>
    </AuthPageShell>
  );
}
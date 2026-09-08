import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import {
  Award,
  BookOpen,
  Download,
  ShieldCheck,
} from "lucide-react";

import {
  getMyCertificatePdf,
  getMyCertificates,
  issueMyCertificate,
} from "../../api/certificateApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { getMyTrainings } from "../../api/trainingApi";
import { SmartPageHeader } from "../../components/ui";
import type { TrainingCertificate } from "../../types/certificate";
import type { LearnerMyTrainingResponse } from "../../types/training";

function formatDate(value?: string | null): string {
  if (!value) return "Date non disponible";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(date);
}

function isCompleted(training: LearnerMyTrainingResponse): boolean {
  return (
    training.enrollmentStatus === "COMPLETED" ||
    (training.progressPercentage ?? 0) >= 100
  );
}

export function LearnerCertificatesPage() {
  const [certificates, setCertificates] =
    useState<TrainingCertificate[]>([]);
  const [trainings, setTrainings] =
    useState<LearnerMyTrainingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTrainingId, setBusyTrainingId] =
    useState<number | null>(null);
  const [busyCertificateId, setBusyCertificateId] =
    useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [certificateItems, trainingItems] = await Promise.all([
      getMyCertificates(),
      getMyTrainings(),
    ]);

    setCertificates(certificateItems);
    setTrainings(trainingItems);
  }

  useEffect(() => {
    let active = true;

    void Promise.all([
      getMyCertificates(),
      getMyTrainings(),
    ])
      .then(([certificateItems, trainingItems]) => {
        if (!active) return;

        setCertificates(certificateItems);
        setTrainings(trainingItems);
        setError("");
      })
      .catch((cause) => {
        if (active) {
          setError(getApiErrorMessage(cause));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const certificateByTraining = useMemo(
    () =>
      new Map(
        certificates.map((certificate) => [
          certificate.trainingId,
          certificate,
        ]),
      ),
    [certificates],
  );

  const completedTrainings = useMemo(
    () => trainings.filter(isCompleted),
    [trainings],
  );

  async function handleIssue(trainingId: number) {
    setBusyTrainingId(trainingId);
    setError("");
    setSuccess("");

    try {
      await issueMyCertificate(trainingId);
      await load();
      setSuccess(
        "Ton certificat est disponible. Tu peux maintenant le télécharger.",
      );
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusyTrainingId(null);
    }
  }

  async function handleDownload(certificate: TrainingCertificate) {
    setBusyCertificateId(certificate.id);
    setError("");

    try {
      const blob = await getMyCertificatePdf(certificate.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download =
        `certificat-smarttraining-${certificate.publicCode}.pdf`;
      anchor.click();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusyCertificateId(null);
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: 320, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={30} />
          <Typography color="text.secondary">
            Chargement de tes certificats...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow="Réussites"
        title="Mes certificats"
        description="Retrouve les certificats délivrés après la réussite complète de tes formations."
        actions={
          <Button
            component={Link}
            to="/learner/trainings"
            variant="outlined"
            startIcon={<BookOpen size={17} />}
          >
            Mes formations
          </Button>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Alert
        severity="info"
        icon={<ShieldCheck size={20} />}
      >
        Les certificats sont délivrés par le serveur uniquement lorsque la
        formation est réellement terminée. Le code public permet d’en
        vérifier l’authenticité sans exposer ton e-mail ni ton compte.
      </Alert>

      <Stack spacing={2}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Certificats obtenus
        </Typography>

        {!certificates.length ? (
          <Card variant="outlined">
            <CardContent>
              <Typography sx={{ fontWeight: 850 }}>
                Aucun certificat délivré pour le moment
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75 }}
              >
                Termine une formation éligible pour pouvoir générer ton
                certificat.
              </Typography>
            </CardContent>
          </Card>
        ) : (
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
            {certificates.map((certificate) => (
              <Card key={certificate.id} variant="outlined">
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center" }}
                    >
                      <Award size={22} />
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>
                        {certificate.trainingTitle}
                      </Typography>
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      Délivré à {certificate.learnerDisplayName}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      {formatDate(certificate.issuedAt)}
                    </Typography>

                    <Chip
                      size="small"
                      color={
                        certificate.status === "ACTIVE"
                          ? "success"
                          : "default"
                      }
                      label={
                        certificate.status === "ACTIVE"
                          ? "Certificat valide"
                          : certificate.status
                      }
                      sx={{ alignSelf: "flex-start" }}
                    />

                    <Box
                      sx={{
                        px: 1.5,
                        py: 1.25,
                        borderRadius: 2,
                        bgcolor: "action.hover",
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Code public de vérification
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 0.5,
                          fontFamily: "monospace",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {certificate.publicCode}
                      </Typography>
                    </Box>

                    <Button
                      variant="contained"
                      startIcon={<Download size={17} />}
                      disabled={busyCertificateId === certificate.id}
                      onClick={() => void handleDownload(certificate)}
                    >
                      {busyCertificateId === certificate.id
                        ? "Préparation..."
                        : "Télécharger le PDF"}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Stack>

      <Stack spacing={2}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Formations terminées
        </Typography>

        {!completedTrainings.length ? (
          <Alert severity="info">
            Aucune formation n’est encore terminée dans ton parcours.
          </Alert>
        ) : (
          <Stack spacing={1.5}>
            {completedTrainings.map((training) => {
              const certificate =
                certificateByTraining.get(training.id);

              return (
                <Card key={training.id} variant="outlined">
                  <CardContent>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={2}
                      sx={{
                        justifyContent: "space-between",
                        alignItems: { sm: "center" },
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 900 }}>
                          {training.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                        >
                          Formation terminée
                          {training.completedAt
                            ? ` le ${formatDate(training.completedAt)}`
                            : ""}
                        </Typography>
                      </Box>

                      {certificate ? (
                        <Chip
                          color="success"
                          label="Certificat disponible"
                        />
                      ) : (
                        <Button
                          variant="contained"
                          startIcon={<Award size={17} />}
                          disabled={busyTrainingId === training.id}
                          onClick={() => void handleIssue(training.id)}
                        >
                          {busyTrainingId === training.id
                            ? "Génération..."
                            : "Générer mon certificat"}
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
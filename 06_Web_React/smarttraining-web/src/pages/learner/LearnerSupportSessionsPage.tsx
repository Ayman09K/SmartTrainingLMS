import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { CalendarClock, ExternalLink, History } from "lucide-react";
import { getApiErrorMessage } from "../../api/apiClient";
import { getMySupportSessions } from "../../api/trainerApi";
import { getMyTrainings } from "../../api/trainingApi";
import { SmartPageHeader, SmartSectionCard } from "../../components/ui";
import { useAuth } from "../../features/auth/AuthContext";
import type { SupportSessionResponse } from "../../types/trainer";
import type { LearnerMyTrainingResponse } from "../../types/training";

// LEARNER_WEB_VISUAL_1_SESSIONS_DENSITY_SAFE_V1
function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "full",
        timeStyle: "short",
      }).format(date);
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    SCHEDULED: "Planifi\u00e9e",
    COMPLETED: "Termin\u00e9e",
    CANCELLED: "Annul\u00e9e",
  };

  return labels[status] || status;
}

function isUpcoming(session: SupportSessionResponse): boolean {
  if (session.status !== "SCHEDULED") {
    return false;
  }

  const date = new Date(session.scheduledAt);

  return !Number.isNaN(date.getTime()) && date.getTime() >= Date.now();
}

interface SessionCardProps {
  session: SupportSessionResponse;
  trainingTitle: string;
}

function SessionCard({ session, trainingTitle }: SessionCardProps) {
  const canOpenMeeting =
    session.status === "SCHEDULED" &&
    /^https?:\/\//i.test(session.meetingLink || "");

  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
      <CardContent sx={{ height: "100%", p: 2 }}>
        <Stack spacing={1.25} sx={{ height: "100%" }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{
              justifyContent: "space-between",
              alignItems: { sm: "flex-start" },
            }}
          >
            <Box>
              <Typography
                variant="caption"
                color="primary.main"
                sx={{ fontWeight: 850 }}
              >
                {trainingTitle}
              </Typography>
              <Typography variant="h6" sx={{ mt: 0.25, fontWeight: 850 }}>
                {session.title}
              </Typography>
            </Box>

            <Chip
              size="small"
              label={statusLabel(session.status)}
              color={
                session.status === "COMPLETED"
                  ? "success"
                  : session.status === "CANCELLED"
                    ? "default"
                    : "primary"
              }
              variant={session.status === "SCHEDULED" ? "filled" : "outlined"}
            />
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <CalendarClock size={18} />
            <Typography variant="body2" sx={{ fontWeight: 750 }}>
              {formatDate(session.scheduledAt)}
            </Typography>
          </Stack>

          <Box
            sx={{
              p: 1.25,
              borderRadius: 2.25,
              bgcolor: "action.hover",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 800 }}
            >
              {"Objectif p\u00e9dagogique"}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.35 }}>
              {session.objective}
            </Typography>
          </Box>

          {canOpenMeeting ? (
            <Button
              component="a"
              href={session.meetingLink ?? ""}
              target="_blank"
              rel="noreferrer"
              variant="contained"
              startIcon={<ExternalLink size={17} />}
              sx={{ alignSelf: "flex-start", mt: "auto" }}
            >
              {"Ouvrir le rendez-vous"}
            </Button>
          ) : null}

          {session.status === "CANCELLED" ? (
            <Alert severity="warning">
              {"Cette s\u00e9ance a \u00e9t\u00e9 annul\u00e9e par le formateur."}
            </Alert>
          ) : null}

          {session.status === "COMPLETED" ? (
            <Alert severity="success">
              {
                "Cette s\u00e9ance est termin\u00e9e et reste disponible dans votre historique."
              }
            </Alert>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
export function LearnerSupportSessionsPage() {
  const { user } = useAuth();

  const [sessions, setSessions] = useState<SupportSessionResponse[]>([]);
  const [trainings, setTrainings] = useState<LearnerMyTrainingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user?.id) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [loadedSessions, loadedTrainings] = await Promise.all([
          getMySupportSessions(),
          getMyTrainings(),
        ]);

        if (active) {
          setSessions(loadedSessions);
          setTrainings(loadedTrainings);
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
  }, [user?.id]);

  const trainingById = useMemo(
    () => new Map(trainings.map((training) => [training.id, training.title])),
    [trainings],
  );

  const upcoming = useMemo(
    () =>
      sessions
        .filter(isUpcoming)
        .sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() -
            new Date(b.scheduledAt).getTime(),
        ),
    [sessions],
  );

  const history = useMemo(
    () =>
      sessions
        .filter((session) => !isUpcoming(session))
        .sort(
          (a, b) =>
            new Date(b.scheduledAt).getTime() -
            new Date(a.scheduledAt).getTime(),
        ),
    [sessions],
  );

  if (loading) {
    return (
      <Stack spacing={2.5}>
        <Box>
          <Skeleton variant="text" width={120} height={18} />
          <Skeleton variant="text" width={190} height={38} />
          <Skeleton variant="text" width="58%" height={22} />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              lg: "repeat(2, minmax(0, 1fr))",
            },
            gap: 1.5,
          }}
        >
          {[0, 1, 2, 3].map((item) => (
            <Card key={item} variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack spacing={1.1}>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Skeleton variant="text" width="54%" />
                    <Skeleton variant="rounded" width={76} height={24} />
                  </Stack>
                  <Skeleton variant="text" width="78%" height={28} />
                  <Skeleton variant="text" width="52%" />
                  <Skeleton variant="rounded" height={58} />
                  <Skeleton variant="rounded" width={150} height={34} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow={"Mon accompagnement"}
        title={"Mes s\u00e9ances"}
        description={
          "Retrouvez les rendez-vous p\u00e9dagogiques planifi\u00e9s par vos formateurs et l'historique de votre accompagnement."
        }
        actions={
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Chip
              icon={<CalendarClock size={15} />}
              label={`${upcoming.length} \u00e0 venir`}
              variant="outlined"
            />
            <Chip
              icon={<History size={15} />}
              label={`${history.length} dans l'historique`}
              variant="outlined"
            />
          </Stack>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      {!error && sessions.length === 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.25} sx={{ alignItems: "flex-start" }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "action.hover",
                  color: "primary.main",
                }}
              >
                <CalendarClock size={21} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 850 }}>
                {"Aucune s\u00e9ance planifi\u00e9e"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {
                  "Lorsqu'un formateur planifiera une s\u00e9ance d'accompagnement, elle appara\u00eetra ici avec sa date, son objectif et le lien du rendez-vous."
                }
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {upcoming.length ? (
        <SmartSectionCard
          title={"S\u00e9ances \u00e0 venir"}
          description={
            "Les prochains rendez-vous p\u00e9dagogiques sont class\u00e9s par date."
          }
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "repeat(2, minmax(0, 1fr))",
              },
              gap: 1.5,
            }}
          >
            {upcoming.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                trainingTitle={
                  trainingById.get(session.trainingId) || "Formation associ\u00e9e"
                }
              />
            ))}
          </Box>
        </SmartSectionCard>
      ) : null}

      {history.length ? (
        <SmartSectionCard
          title={"Historique d'accompagnement"}
          description={
            "Consultez les s\u00e9ances termin\u00e9es, annul\u00e9es ou les rendez-vous d\u00e9j\u00e0 pass\u00e9s."
          }
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "repeat(2, minmax(0, 1fr))",
              },
              gap: 1.5,
            }}
          >
            {history.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                trainingTitle={
                  trainingById.get(session.trainingId) || "Formation associ\u00e9e"
                }
              />
            ))}
          </Box>
        </SmartSectionCard>
      ) : null}
    </Stack>
  );
}
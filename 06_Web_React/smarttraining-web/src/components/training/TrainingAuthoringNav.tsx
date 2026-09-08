import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import {
  BookOpen,
  ClipboardCheck,
  Eye,
  Settings2,
} from "lucide-react";
import { Link } from "react-router-dom";

export type TrainingAuthoringStep =
  | "overview"
  | "content"
  | "quiz"
  | "preview";

type TrainingAuthoringNavProps = {
  context: "trainer" | "admin";
  trainingId: number;
  activeStep: TrainingAuthoringStep;
  status?: string | null;
};

const stepMeta: Array<{
  key: TrainingAuthoringStep;
  label: string;
  icon: typeof Settings2;
}> = [
  { key: "overview", label: "Vue d’ensemble", icon: Settings2 },
  { key: "content", label: "Contenu", icon: BookOpen },
  { key: "quiz", label: "Quiz", icon: ClipboardCheck },
  { key: "preview", label: "Aperçu", icon: Eye },
];

function statusLabel(status?: string | null): string {
  if (status === "PUBLISHED") return "Publiée";
  if (status === "ARCHIVED") return "Archivée";
  return "Brouillon";
}

function statusColor(
  status?: string | null,
): "success" | "warning" | "default" {
  if (status === "PUBLISHED") return "success";
  if (status === "DRAFT") return "warning";
  return "default";
}

export function TrainingAuthoringNav({
  context,
  trainingId,
  activeStep,
  status,
}: TrainingAuthoringNavProps) {
  const base = context === "admin" ? "/admin" : "/trainer";
  const editPath = `${base}/trainings/${trainingId}/edit`;
  const contentPath = `${base}/trainings/${trainingId}/content`;

  const hrefByStep: Record<TrainingAuthoringStep, string> = {
    overview: editPath,
    content: contentPath,
    quiz: `${contentPath}?section=quiz`,
    preview: `${contentPath}?preview=1`,
  };

  return (
    <Box
      component="nav"
      aria-label="Construction de la formation"
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
        p: { xs: 1.25, md: 1.5 },
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{
            alignItems: { sm: "center" },
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Construction de la formation
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Informations, contenu, quiz puis aperçu.
            </Typography>
          </Box>
          <Chip
            size="small"
            label={statusLabel(status)}
            color={statusColor(status)}
            variant={status === "PUBLISHED" ? "filled" : "outlined"}
          />
        </Stack>

        <Stack
          direction="row"
          spacing={0.75}
          useFlexGap
          sx={{
            flexWrap: "wrap",
          }}
        >
          {stepMeta.map(({ key, label, icon: Icon }, index) => {
            const active = activeStep === key;

            return (
              <Button
                key={key}
                component={Link}
                to={hrefByStep[key]}
                size="small"
                variant={active ? "contained" : "text"}
                aria-current={active ? "step" : undefined}
                startIcon={<Icon size={16} />}
                sx={{
                  minHeight: 38,
                  px: 1.25,
                }}
              >
                {index + 1}. {label}
              </Button>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
}

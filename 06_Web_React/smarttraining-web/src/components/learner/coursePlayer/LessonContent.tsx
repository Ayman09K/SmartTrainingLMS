import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { CheckCircle2 } from "lucide-react";

import type { LearnerTrainingLessonContent } from "../../../types/training";

interface LessonContentProps {
  lesson: LearnerTrainingLessonContent;
  busy: boolean;
  onComplete: () => void;
}

function canManuallyCompleteLesson(
  rule?: string | null,
): boolean {
  return !rule;
}

function pedagogicalGuidance(rule?: string | null): string {
  if (rule === "OPENED") {
    return "Consultez cette leçon, puis poursuivez avec Suivant.";
  }

  if (rule === "ALL_REQUIRED_BLOCKS") {
    return "Terminez les activités demandées dans cette leçon pour poursuivre.";
  }

  if (rule === "ASSESSMENT_PASSED") {
    return "Réussissez le quiz associé à cette leçon pour terminer cette étape.";
  }

  if (rule === "SCORM_COMPLETED") {
    return "Terminez le module interactif pour mettre à jour votre progression.";
  }

  return "Votre progression sera mise à jour au fil de vos activités.";
}

export function LessonContent({
  lesson,
  busy,
  onComplete,
}: LessonContentProps) {
  const manualCompletion = canManuallyCompleteLesson(
    lesson.completionRule,
  );

  return (
    <Stack spacing={2.25}>
      {lesson.objective ? (
        <Alert severity="info">
          <strong>{"Votre objectif : "}</strong>
          {lesson.objective}
        </Alert>
      ) : null}

      {lesson.description ? (
        <Typography color="text.secondary">
          {lesson.description}
        </Typography>
      ) : null}

      {lesson.content ? (
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: "action.hover",
          }}
        >
          <Typography
            variant="body1"
            sx={{ whiteSpace: "pre-line", lineHeight: 1.75 }}
          >
            {lesson.content}
          </Typography>
        </Box>
      ) : null}

      {manualCompletion ? (
        <Button
          type="button"
          variant="contained"
          startIcon={
            busy ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <CheckCircle2 size={17} />
            )
          }
          disabled={busy}
          onClick={onComplete}
          sx={{ alignSelf: "flex-start" }}
        >
          {busy
            ? "Enregistrement..."
            : "Terminer la leçon"}
        </Button>
      ) : lesson.completionRule === "MANUAL" ? null : (
        <Alert severity="info">
          {pedagogicalGuidance(lesson.completionRule)}
        </Alert>
      )}
    </Stack>
  );
}

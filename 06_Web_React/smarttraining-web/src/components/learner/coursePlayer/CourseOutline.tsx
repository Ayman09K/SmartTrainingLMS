import {
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { BookOpen, FileText, ListChecks } from "lucide-react";

import type { LearnerTrainingContentResponse } from "../../../types/training";
import type { CoursePlayerStep } from "./coursePlayerModel";

interface CourseOutlineProps {
  training: LearnerTrainingContentResponse;
  steps: CoursePlayerStep[];
  activeStepKey: string;
  onSelect: (stepKey: string) => void;
}

function stepIcon(kind: CoursePlayerStep["kind"]) {
  if (kind === "QUIZ") return <ListChecks size={16} />;
  if (kind === "RESOURCE") return <FileText size={16} />;
  return <BookOpen size={16} />;
}

export function CourseOutline({
  training,
  steps,
  activeStepKey,
  onSelect,
}: CourseOutlineProps) {
  if (!training.modules.length && !steps.length) {
    return (
      <Box sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {"Parcours vide"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          {"Aucun module, contenu ou quiz n'est encore disponible."}
        </Typography>
      </Box>
    );
  }

  const generalQuizzes = steps.filter(
    (step) => step.kind === "QUIZ" && step.moduleId == null,
  );

  return (
    <Box component="nav" aria-label="Sommaire du parcours">
      <Stack spacing={2}>
        {[...training.modules]
          .sort(
            (a, b) =>
              (a.orderIndex ?? Number.MAX_SAFE_INTEGER) -
                (b.orderIndex ?? Number.MAX_SAFE_INTEGER) ||
              a.id - b.id,
          )
          .map((module, moduleIndex) => {
            const moduleSteps = steps.filter(
              (step) => step.moduleId === module.id,
            );

            return (
              <Box key={module.id}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center", mb: 1 }}
                >
                  <Chip
                    size="small"
                    label={`Module ${moduleIndex + 1}`}
                    variant="outlined"
                  />
                  <Typography
                    variant="subtitle2"
                    sx={{ minWidth: 0, fontWeight: 850 }}
                  >
                    {module.title}
                  </Typography>
                </Stack>

                {moduleSteps.length ? (
                  <Stack spacing={0.75}>
                    {moduleSteps.map((step) => (
                      <Button
                        key={step.key}
                        type="button"
                        variant={
                          step.key === activeStepKey
                            ? "contained"
                            : "text"
                        }
                        color="primary"
                        startIcon={stepIcon(step.kind)}
                        onClick={() => onSelect(step.key)}
                        aria-current={
                          step.key === activeStepKey ? "step" : undefined
                        }
                        sx={{
                          justifyContent: "flex-start",
                          textAlign: "left",
                          py: 1,
                          px: 1.25,
                          minWidth: 0,
                          textTransform: "none",
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {step.title}
                        </Box>
                      </Button>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    {"Aucun contenu publié dans ce module."}
                  </Typography>
                )}

                <Divider sx={{ mt: 2 }} />
              </Box>
            );
          })}

        {generalQuizzes.length ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 850 }}>
              {"Évaluations générales"}
            </Typography>
            <Stack spacing={0.75}>
              {generalQuizzes.map((step) => (
                <Button
                  key={step.key}
                  type="button"
                  variant={
                    step.key === activeStepKey ? "contained" : "text"
                  }
                  startIcon={<ListChecks size={16} />}
                  onClick={() => onSelect(step.key)}
                  sx={{
                    justifyContent: "flex-start",
                    textAlign: "left",
                    textTransform: "none",
                  }}
                >
                  {step.title}
                </Button>
              ))}
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}

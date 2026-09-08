import {
  Alert,
  Box,
  Button,
  Chip,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { ExternalLink, ListChecks } from "lucide-react";

import ScormPlayer from "../../scorm/ScormPlayer";
import { AuthenticatedMediaRenderer } from "./AuthenticatedMediaRenderer";
import type { LearnerQuizResponse } from "../../../types/evaluation";
import type { LearnerTrainingResourceContent } from "../../../types/training";

type ResourceRendererProps =
  | {
      trainingId: number;
      resource: LearnerTrainingResourceContent;
      quiz?: never;
      onScormTerminal?: () => void;
      onVideoEnded?: () => void;
    }
  | {
      trainingId: number;
      resource?: never;
      quiz: LearnerQuizResponse;
      onScormTerminal?: never;
      onVideoEnded?: never;
    };

function mediaUrl(
  resource: LearnerTrainingResourceContent,
): string | undefined {
  return resource.publicUrl || resource.url || undefined;
}

function ExternalResourceLink({
  href,
  label = "Ouvrir la ressource",
}: {
  href?: string;
  label?: string;
}) {
  if (!href) {
    return (
      <Alert severity="warning">
        {"Cette ressource ne possède pas encore de lien exploitable."}
      </Alert>
    );
  }

  return (
    <Button
      component={MuiLink}
      href={href}
      target="_blank"
      rel="noreferrer"
      variant="contained"
      endIcon={<ExternalLink size={17} />}
      sx={{ alignSelf: "flex-start" }}
    >
      {label}
    </Button>
  );
}

export function ResourceRenderer(
  props: ResourceRendererProps,
) {
  if (props.quiz) {
    const quiz = props.quiz;

    return (
      <Stack spacing={2}>
        <Alert severity="info">
          {"QUIZ · Le score, la réussite et les politiques de correction sont calculés par le service Evaluation."}
        </Alert>
        {quiz.description ? (
          <Typography color="text.secondary">
            {quiz.description}
          </Typography>
        ) : null}
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: "wrap" }}
        >
          <Chip
            size="small"
            variant="outlined"
            label={`Seuil ${quiz.passingScore ?? 0} %`}
          />
          <Chip
            size="small"
            variant="outlined"
            label={
              quiz.maxAttempts
                ? `${quiz.maxAttempts} tentative(s) max`
                : "Tentatives selon la politique du quiz"
            }
          />
        </Stack>
        <Button
          component={RouterLink}
          to={`/learner/quizzes?trainingId=${props.trainingId}&quizId=${quiz.id}`}
          variant="contained"
          startIcon={<ListChecks size={17} />}
          sx={{ alignSelf: "flex-start" }}
        >
          {"Ouvrir le quiz"}
        </Button>
      </Stack>
    );
  }

  const resource = props.resource;
  const type = String(resource.type || "").toUpperCase();
  const url = mediaUrl(resource);

  if (type === "TEXT") {
    return (
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          bgcolor: "action.hover",
          whiteSpace: "pre-wrap",
        }}
      >
        <Typography sx={{ lineHeight: 1.75 }}>
          {resource.textContent ||
            resource.description ||
            "Aucun contenu texte n'est disponible."}
        </Typography>
      </Box>
    );
  }

  if (
    type === "IMAGE" ||
    type === "VIDEO" ||
    type === "VIDEO_URL" ||
    type === "PDF" ||
    type === "PDF_URL"
  ) {
    const kind =
      type === "IMAGE"
        ? "IMAGE"
        : type === "VIDEO" || type === "VIDEO_URL"
          ? "VIDEO"
          : "PDF";

    return (
      <AuthenticatedMediaRenderer
        sourceUrl={url}
        title={resource.title}
        kind={kind}
        onVideoEnded={
          kind === "VIDEO" ? props.onVideoEnded : undefined
        }
      />
    );
  }

  if (type === "SCORM") {
    return (
      <Box
        sx={{
          minHeight: { xs: 560, md: 720 },
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "background.default",
        }}
      >
        <ScormPlayer
          resourceId={resource.id}
          title={resource.title}
          onTerminal={props.onScormTerminal}
        />
      </Box>
    );
  }

  if (type === "DOCUMENT") {
    return (
      <ExternalResourceLink
        href={url}
        label="Ouvrir le document"
      />
    );
  }

  if (type === "EXTERNAL_LINK") {
    return (
      <ExternalResourceLink
        href={url}
        label="Ouvrir le lien externe"
      />
    );
  }

  return (
    <Stack spacing={1.5}>
      <Alert severity="info">
        {`Type de ressource ${type || "non renseigné"}.`}
      </Alert>
      <ExternalResourceLink href={url} />
    </Stack>
  );
}

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import { ExternalLink } from "lucide-react";

import {
  loadLearnerMediaObjectUrl,
  type LearnerMediaObjectUrl,
} from "../../../api/learnerMediaApi";

export type AuthenticatedMediaKind = "IMAGE" | "VIDEO" | "PDF";

interface Props {
  sourceUrl?: string;
  title: string;
  kind: AuthenticatedMediaKind;
  onVideoEnded?: () => void;
}

export function AuthenticatedMediaRenderer({
  sourceUrl,
  title,
  kind,
  onVideoEnded,
}: Props) {
  const [resolved, setResolved] =
    useState<LearnerMediaObjectUrl | null>(null);
  const [loading, setLoading] = useState(Boolean(sourceUrl));
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    setResolved(null);
    setError("");
    setLoading(Boolean(sourceUrl));

    if (!sourceUrl) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    void loadLearnerMediaObjectUrl(sourceUrl)
      .then((value) => {
        if (!active) {
          if (value?.revoke) {
            URL.revokeObjectURL(value.url);
          }
          return;
        }

        objectUrl = value?.revoke ? value.url : null;
        setResolved(value);
      })
      .catch(() => {
        if (active) {
          setError(
            "La ressource protégée n’a pas pu être chargée. Réessayez dans quelques instants.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [sourceUrl]);

  if (!sourceUrl) {
    return (
      <Alert severity="warning">
        {"Cette ressource ne possède pas encore de média exploitable."}
      </Alert>
    );
  }

  if (loading) {
    return (
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ minHeight: 96, alignItems: "center" }}
      >
        <CircularProgress size={22} />
        <Typography color="text.secondary">
          {"Chargement du média sécurisé..."}
        </Typography>
      </Stack>
    );
  }

  if (error || !resolved?.url) {
    return <Alert severity="error">{error || "Média indisponible."}</Alert>;
  }

  const url = resolved.url;

  return (
    <Stack spacing={1.25}>
      {kind === "IMAGE" ? (
        <Box
          component="img"
          src={url}
          alt={title}
          sx={{
            display: "block",
            width: "100%",
            maxHeight: 640,
            objectFit: "contain",
            borderRadius: 2,
            bgcolor: "action.hover",
          }}
        />
      ) : null}

      {kind === "VIDEO" ? (
        <Box
          component="video"
          src={url}
          controls
          preload="metadata"
          onEnded={onVideoEnded}
          sx={{
            width: "100%",
            maxHeight: 640,
            borderRadius: 2,
            bgcolor: "common.black",
          }}
        />
      ) : null}

      {kind === "PDF" ? (
        <Box
          component="iframe"
          src={url}
          title={title}
          sx={{
            width: "100%",
            height: "82vh",
            minHeight: { xs: 640, md: 720 },
            maxHeight: 1000,
            border: 0,
            borderRadius: 2,
            bgcolor: "background.default",
          }}
        />
      ) : null}

      <Button
        component={MuiLink}
        href={url}
        target="_blank"
        rel="noreferrer"
        variant="text"
        endIcon={<ExternalLink size={16} />}
        sx={{ alignSelf: "flex-start" }}
      >
        {"Ouvrir séparément"}
      </Button>
    </Stack>
  );
}

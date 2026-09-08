import {
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ListChecks,
} from "lucide-react";
import { Link } from "react-router-dom";

interface PlayerNavigationProps {
  currentIndex: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  finishHref: string;
  finishLabel: string;
  finishReady: boolean;
  onFinish?: () => void;
  finishBusy?: boolean;
  navigationBusy?: boolean;
  lastStepHref?: string;
  lastStepLabel?: string;
  desktopRightOffset?: number;
}

export function PlayerNavigation({
  currentIndex,
  totalSteps,
  onPrevious,
  onNext,
  finishHref,
  finishLabel,
  finishReady,
  onFinish,
  finishBusy = false,
  navigationBusy = false,
  lastStepHref,
  lastStepLabel,
  desktopRightOffset = 0,
}: PlayerNavigationProps) {
  const hasPrevious = currentIndex > 0;
  const hasNext =
    currentIndex >= 0 && currentIndex < totalSteps - 1;
  const isLast =
    totalSteps > 0 && currentIndex === totalSteps - 1;

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        left: { xs: 8, sm: 16, lg: 24 },
        right: {
          xs: 8,
          sm: 16,
          md:
            desktopRightOffset > 0
              ? desktopRightOffset + 16
              : 16,
          lg:
            desktopRightOffset > 0
              ? desktopRightOffset + 24
              : 24,
        },
        transition: (theme) =>
          theme.transitions.create("right", {
            duration: theme.transitions.duration.shorter,
          }),
        bottom: { xs: 8, sm: 16 },
        zIndex: (theme) => theme.zIndex.appBar + 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        bgcolor: "background.paper",
        backgroundImage: "none",
        px: { xs: 1, sm: 1.5 },
        py: 1.1,
      }}
    >
      <Stack
        direction="row"
        spacing={{ xs: 0.75, sm: 1.25 }}
        sx={{
          alignItems: "center",
          width: "100%",
          maxWidth: 1180,
          mx: "auto",
        }}
      >
        <Button
          type="button"
          variant="outlined"
          size="small"
          startIcon={<ArrowLeft size={17} />}
          disabled={!hasPrevious || navigationBusy}
          onClick={onPrevious}
          sx={{
            flexShrink: 0,
            minWidth: { xs: 0, sm: 118 },
            px: { xs: 1, sm: 1.5 },
          }}
        >
          {"Précédent"}
        </Button>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            flex: 1,
            minWidth: 0,
            textAlign: "center",
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {totalSteps > 0
            ? `Étape ${currentIndex + 1}/${totalSteps}`
            : "Aucune étape"}
        </Typography>

        {isLast ? (
          finishReady ? (
            <Button
              component={Link}
              to={finishHref}
              variant="contained"
              size="small"
              endIcon={<CheckCircle2 size={17} />}
              sx={{
                flexShrink: 0,
                minWidth: { xs: 0, sm: 138 },
                px: { xs: 1, sm: 1.5 },
              }}
            >
              {finishLabel}
            </Button>
          ) : onFinish ? (
            <Button
              type="button"
              variant="contained"
              size="small"
              endIcon={<CheckCircle2 size={17} />}
              disabled={finishBusy}
              onClick={onFinish}
              sx={{
                flexShrink: 0,
                minWidth: { xs: 0, sm: 170 },
                px: { xs: 1, sm: 1.5 },
              }}
            >
              {finishBusy
                ? "Enregistrement..."
                : "Terminer la formation"}
            </Button>
          ) : lastStepHref ? (
            <Button
              component={Link}
              to={lastStepHref}
              variant="contained"
              size="small"
              endIcon={<ListChecks size={17} />}
              sx={{
                flexShrink: 0,
                minWidth: { xs: 0, sm: 170 },
                px: { xs: 1, sm: 1.5 },
              }}
            >
              {lastStepLabel || "Continuer"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outlined"
              size="small"
              disabled
              sx={{
                flexShrink: 0,
                minWidth: { xs: 0, sm: 150 },
                px: { xs: 1, sm: 1.5 },
              }}
            >
              {"Étape à terminer"}
            </Button>
          )
        ) : (
          <Button
            type="button"
            variant="contained"
            size="small"
            endIcon={
              navigationBusy ? (
                <CircularProgress size={15} color="inherit" />
              ) : (
                <ArrowRight size={17} />
              )
            }
            disabled={!hasNext || navigationBusy}
            onClick={onNext}
            sx={{
              flexShrink: 0,
              minWidth: { xs: 0, sm: 118 },
              px: { xs: 1, sm: 1.5 },
            }}
          >
            {navigationBusy ? "Enregistrement..." : "Suivant"}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

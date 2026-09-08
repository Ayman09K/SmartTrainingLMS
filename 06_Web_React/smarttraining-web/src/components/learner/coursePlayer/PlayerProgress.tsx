import { LinearProgress, Stack, Typography } from "@mui/material";

interface PlayerProgressProps {
  progressPercentage?: number | null;
}

export function PlayerProgress({
  progressPercentage,
}: PlayerProgressProps) {
  const progress =
    typeof progressPercentage === "number"
      ? progressPercentage
      : 0;
  const displayValue = Math.max(0, Math.min(100, progress));

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography variant="body2" sx={{ fontWeight: 800 }}>
          {"Progression validée"}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontVariantNumeric: "tabular-nums" }}
        >
          {`${Math.round(displayValue)} %`}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={displayValue}
        aria-label={`Progression validée : ${Math.round(displayValue)} pour cent`}
        sx={{ height: 8, borderRadius: 999 }}
      />
    </Stack>
  );
}

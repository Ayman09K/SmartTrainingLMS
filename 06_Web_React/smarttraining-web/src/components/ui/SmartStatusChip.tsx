import { Chip } from "@mui/material";

export type SmartStatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

type SmartStatusChipProps = {
  label: string;
  tone?: SmartStatusTone;
};

const toneToColor: Record<
  SmartStatusTone,
  "default" | "info" | "success" | "warning" | "error"
> = {
  neutral: "default",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "error",
};

export function SmartStatusChip({
  label,
  tone = "neutral",
}: SmartStatusChipProps) {
  return (
    <Chip
      label={label}
      color={toneToColor[tone]}
      size="small"
      variant="outlined"
      sx={{ borderRadius: 2 }}
    />
  );
}
import { Box } from "@mui/material";

type SmartTrainingBrandSize = "sm" | "md" | "lg";
type SmartTrainingBrandSurface = "none" | "light";

type SmartTrainingBrandProps = {
  size?: SmartTrainingBrandSize;
  surface?: SmartTrainingBrandSurface;
};

const sizeConfig = {
  sm: {
    mark: 34,
    wordmarkWidth: 112,
    wordmarkHeight: 21,
    gap: 0.65,
  },
  md: {
    mark: 44,
    wordmarkWidth: 148,
    wordmarkHeight: 28,
    gap: 0.75,
  },
  lg: {
    mark: 58,
    wordmarkWidth: 190,
    wordmarkHeight: 36,
    gap: 0.85,
  },
} as const;

export function SmartTrainingBrand({
  size = "md",
  surface = "none",
}: SmartTrainingBrandProps) {
  const config = sizeConfig[size];
  const hasLightSurface = surface === "light";

  return (
    <Box
      role="img"
      aria-label="SmartTraining"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: config.gap,
        width: "fit-content",
        maxWidth: "100%",
        minWidth: 0,
        px: hasLightSurface ? 0.9 : 0,
        py: hasLightSurface ? 0.55 : 0,
        borderRadius: hasLightSurface ? 2 : 0,
        bgcolor: hasLightSurface
          ? "rgba(255,255,255,0.97)"
          : "transparent",
        border: hasLightSurface
          ? "1px solid rgba(15,23,42,0.10)"
          : "none",
        boxShadow: hasLightSurface
          ? "0 5px 18px rgba(15,23,42,0.10)"
          : "none",
        overflow: "hidden",
      }}
    >
      <Box
        component="img"
        src="/branding/SmartTraining_brand_mark.png"
        alt=""
        aria-hidden="true"
        sx={{
          display: "block",
          width: config.mark,
          height: config.mark,
          flexShrink: 0,
          objectFit: "contain",
        }}
      />

      <Box
        component="img"
        src="/branding/SmartTraining_wordmark.png"
        alt=""
        aria-hidden="true"
        sx={{
          display: "block",
          width: config.wordmarkWidth,
          height: config.wordmarkHeight,
          maxWidth: "calc(100% - 42px)",
          objectFit: "contain",
          objectPosition: "left center",
        }}
      />
    </Box>
  );
}
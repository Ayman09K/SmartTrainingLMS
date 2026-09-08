import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";

type SmartPageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
};

export function SmartPageHeader({
  title,
  description,
  eyebrow,
  actions,
}: SmartPageHeaderProps) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={2}
      sx={{
        alignItems: { xs: "stretch", md: "flex-start" },
        justifyContent: "space-between",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        {eyebrow ? (
          <Typography
            variant="overline"
            color="primary.main"
            sx={{ display: "block", fontWeight: 800, letterSpacing: "0.08em" }}
          >
            {eyebrow}
          </Typography>
        ) : null}

        <Typography
          component="h1"
          variant="h2"
          sx={{ overflowWrap: "anywhere" }}
        >
          {title}
        </Typography>

        {description ? (
          <Typography
            color="text.secondary"
            sx={{ mt: 0.75, maxWidth: 760 }}
          >
            {description}
          </Typography>
        ) : null}
      </Box>

      {actions ? (
        <Box sx={{ flexShrink: 0 }}>
          {actions}
        </Box>
      ) : null}
    </Stack>
  );
}
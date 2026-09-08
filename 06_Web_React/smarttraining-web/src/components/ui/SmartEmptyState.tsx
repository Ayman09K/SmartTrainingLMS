import type { ReactNode } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";

type SmartEmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function SmartEmptyState({
  title,
  description,
  icon,
  action,
}: SmartEmptyStateProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: { xs: 2, sm: 4 },
        py: { xs: 4, sm: 5 },
        textAlign: "center",
        borderStyle: "dashed",
      }}
    >
      <Stack
        spacing={1.25}
        sx={{
          alignItems: "center",
        }}
      >
        {icon ? (
          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              width: 48,
              height: 48,
              borderRadius: "50%",
              bgcolor: "action.hover",
              color: "text.secondary",
              "& svg": {
                width: 24,
                height: 24,
              },
            }}
          >
            {icon}
          </Box>
        ) : null}

        <Typography component="h2" variant="h5">
          {title}
        </Typography>

        {description ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 560 }}
          >
            {description}
          </Typography>
        ) : null}

        {action ? <Box sx={{ pt: 1 }}>{action}</Box> : null}
      </Stack>
    </Paper>
  );
}
import type { ReactNode } from "react";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";

type SmartMetricCardProps = {
  label: string;
  value: ReactNode;
  helper?: string;
  icon?: ReactNode;
};

export function SmartMetricCard({
  label,
  value,
  helper,
  icon,
}: SmartMetricCardProps) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>

            <Typography
              component="p"
              variant="h3"
              sx={{ mt: 0.5, overflowWrap: "anywhere" }}
            >
              {value}
            </Typography>

            {helper ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75 }}
              >
                {helper}
              </Typography>
            ) : null}
          </Box>

          {icon ? (
            <Box
              data-smart-metric-icon="true"
              sx={{
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                width: 44,
                height: 44,
                borderRadius: 3,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "& svg": {
                  width: 22,
                  height: 22,
                },
              }}
            >
              {icon}
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
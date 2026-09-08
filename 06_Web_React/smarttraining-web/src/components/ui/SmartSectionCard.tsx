import type { ReactNode } from "react";
import {
  Box,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

type SmartSectionCardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function SmartSectionCard({
  title,
  description,
  actions,
  children,
}: SmartSectionCardProps) {
  const hasHeader = Boolean(title || description || actions);

  return (
    <Card>
      {hasHeader ? (
        <>
          <Box sx={{ px: 2.5, py: 2 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{
                justifyContent: "space-between",
                alignItems: { xs: "stretch", sm: "center" },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                {title ? (
                  <Typography component="h2" variant="h5">
                    {title}
                  </Typography>
                ) : null}

                {description ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: title ? 0.5 : 0 }}
                  >
                    {description}
                  </Typography>
                ) : null}
              </Box>

              {actions ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
            </Stack>
          </Box>

          <Divider />
        </>
      ) : null}

      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        {children}
      </CardContent>
    </Card>
  );
}
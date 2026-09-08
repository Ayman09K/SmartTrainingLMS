import type { ReactNode } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { SmartTrainingBrand } from "../brand/SmartTrainingBrand";
import {
  BookOpenCheck,
  BrainCircuit,
  TrendingUp,
} from "lucide-react";

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
};

const authShellCopy = {
  brandTagline: "LMS intelligent et multiplateforme",
  heroTitle:
    "Un espace de formation con\u00e7u pour apprendre, accompagner et progresser.",
  heroDescription:
    "Une exp\u00e9rience coh\u00e9rente pour les apprenants, les formateurs et les administrateurs.",
};

const benefits = [
  {
    icon: BookOpenCheck,
    title: "Formations structur\u00e9es",
    text: "Retrouvez vos parcours, contenus et activit\u00e9s au m\u00eame endroit.",
  },
  {
    icon: TrendingUp,
    title: "Progression lisible",
    text: "Suivez votre avancement et reprenez rapidement l\u00e0 o\u00f9 vous vous \u00eates arr\u00eat\u00e9.",
  },
  {
    icon: BrainCircuit,
    title: "Accompagnement intelligent",
    text: "B\u00e9n\u00e9ficiez d'un suivi p\u00e9dagogique adapt\u00e9 \u00e0 votre activit\u00e9.",
  },
];

export function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  wide = false,
}: AuthPageShellProps) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          lg: "minmax(420px, 0.96fr) minmax(560px, 1.04fr)",
        },
        bgcolor: "background.default",
      }}
    >
      <Box
        sx={{
          display: { xs: "none", lg: "flex" },
          alignItems: "center",
          justifyContent: "center",
          px: { lg: 4, xl: 6 },
          py: { lg: 3, xl: 4 },
          "@media (min-width: 1200px) and (max-height: 720px)": {
            py: 2,
          },
          color: "primary.contrastText",
          background: (theme) =>
            `linear-gradient(145deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 58%, ${theme.palette.secondary.main} 130%)`,
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            width: 240,
            height: 240,
            top: -90,
            left: -80,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.08)",
          },
          "&::after": {
            content: '""',
            position: "absolute",
            width: 320,
            height: 320,
            right: -120,
            bottom: -120,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.10)",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            maxWidth: 560,
            display: "grid",
            gap: { lg: 3, xl: 4 },
            "@media (min-width: 1200px) and (max-height: 720px)": {
              gap: 2,
            },
          }}
        >
          <Stack spacing={1.1} sx={{ alignItems: "flex-start" }}>
            <SmartTrainingBrand size="lg" surface="light" />
            <Typography
              variant="body2"
              sx={{ color: "rgba(255,255,255,0.82)" }}
            >
              {authShellCopy.brandTagline}
            </Typography>
          </Stack>

          <Box sx={{ maxWidth: 520 }}>
            <Typography
              variant="h2"
              sx={{
                color: "inherit",
                fontSize: { lg: "2.4rem", xl: "2.75rem" },
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                "@media (min-width: 1200px) and (max-height: 720px)": {
                  fontSize: "2.15rem",
                  lineHeight: 1.06,
                },
              }}
            >
              {authShellCopy.heroTitle}
            </Typography>

            <Typography
              sx={{
                mt: 1.5,
                maxWidth: 500,
                color: "rgba(255,255,255,0.84)",
                fontSize: "1rem",
                lineHeight: 1.65,
                "@media (min-width: 1200px) and (max-height: 720px)": {
                  mt: 1,
                  fontSize: "0.92rem",
                  lineHeight: 1.45,
                },
              }}
            >
              {authShellCopy.heroDescription}
            </Typography>
          </Box>

          <Stack
            spacing={1.25}
            sx={{
              "@media (min-width: 1200px) and (max-height: 720px)": {
                gap: 0.9,
              },
            }}
          >
            {benefits.map(({ icon: Icon, title: itemTitle, text }) => (
              <Paper
                key={itemTitle}
                elevation={0}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "48px minmax(0, 1fr)",
                  gap: 1.75,
                  alignItems: "start",
                  p: 1.6,
                  borderRadius: 3,
                  "@media (min-width: 1200px) and (max-height: 720px)": {
                    p: 1.25,
                    gridTemplateColumns: "40px minmax(0, 1fr)",
                  },
                  bgcolor: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "inherit",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 44,
                    height: 44,
                    "@media (min-width: 1200px) and (max-height: 720px)": {
                      width: 40,
                      height: 40,
                    },
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 2.5,
                    bgcolor: "rgba(255,255,255,0.14)",
                  }}
                >
                  <Icon size={22} />
                </Box>

                <Box>
                  <Typography
                    variant="body1"
                    sx={{ color: "inherit", fontWeight: 800 }}
                  >
                    {itemTitle}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 0.25,
                      color: "rgba(255,255,255,0.82)",
                      lineHeight: 1.5,
                      "@media (min-width: 1200px) and (max-height: 720px)": {
                        fontSize: "0.79rem",
                        lineHeight: 1.35,
                      },
                    }}
                  >
                    {text}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          minWidth: 0,
          display: "grid",
          placeItems: "center",
          px: { xs: 2, sm: 3, md: 5 },
          py: { xs: 4, md: 5 },
          "@media (min-width: 1200px) and (max-height: 720px)": {
            py: 2,
          },
          background: (theme) =>
            `radial-gradient(circle at top right, ${theme.palette.primary.main}16, transparent 32%), ${theme.palette.background.default}`,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: wide ? 680 : 540 }}>
          <Box
            sx={{
              display: { xs: "block", lg: "none" },
              mb: 3,
              px: 0.5,
            }}
          >
            <SmartTrainingBrand size="md" />
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              "@media (min-width: 1200px) and (max-height: 720px)": {
                p: 3,
              },
              border: 1,
              borderColor: "divider",
              boxShadow: (theme) =>
                theme.palette.mode === "dark"
                  ? "0 24px 64px rgba(0,0,0,0.34)"
                  : "0 24px 64px rgba(15,23,42,0.10)",
            }}
          >
            <Typography
              variant="overline"
              color="primary.main"
              sx={{ fontWeight: 900, letterSpacing: "0.09em" }}
            >
              {eyebrow}
            </Typography>

            <Typography
              component="h1"
              variant="h3"
              sx={{ mt: 0.5 }}
            >
              {title}
            </Typography>

            <Typography
              color="text.secondary"
              sx={{ mt: 1, mb: 3 }}
            >
              {description}
            </Typography>

            {children}

            {footer ? (
              <Box
                sx={{
                  mt: 3,
                  pt: 2.5,
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                {footer}
              </Box>
            ) : null}
          </Paper>

        </Box>
      </Box>
    </Box>
  );
}

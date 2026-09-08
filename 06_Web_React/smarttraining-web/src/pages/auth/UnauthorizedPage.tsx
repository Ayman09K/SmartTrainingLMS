import { Box, Button, Paper, Typography } from "@mui/material";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        px: 2,
        py: 5,
        bgcolor: "background.default",
        background: (theme) =>
          `radial-gradient(circle at top, ${theme.palette.error.main}12, transparent 32%), ${theme.palette.background.default}`,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 560,
          p: { xs: 3, sm: 5 },
          textAlign: "center",
          border: 1,
          borderColor: "divider",
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            width: 64,
            height: 64,
            mx: "auto",
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            bgcolor: "error.main",
            color: "error.contrastText",
          }}
        >
          <ShieldAlert size={30} />
        </Box>

        <Typography component="h1" variant="h3" sx={{ mt: 2.5 }}>
          Accès non autorisé
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1.25 }}>
          Votre rôle ne permet pas d’accéder à cette page. Vous pouvez revenir
          vers votre espace principal.
        </Typography>

        <Button
          variant="contained"
          onClick={() => navigate("/", { replace: true })}
          startIcon={<ArrowLeft size={18} />}
          sx={{ mt: 3 }}
        >
          Retour à mon espace
        </Button>
      </Paper>
    </Box>
  );
}
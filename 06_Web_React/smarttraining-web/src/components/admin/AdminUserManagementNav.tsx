import { Box, Button, Stack, Typography } from "@mui/material";
import type { LucideIcon } from "lucide-react";
import { Shield, UserCheck, Users } from "lucide-react";
import { NavLink } from "react-router-dom";

export type AdminUserManagementSection =
  | "users"
  | "trainer-requests"
  | "account-deletion";

type NavEntry = {
  key: AdminUserManagementSection;
  to: string;
  label: string;
  icon: LucideIcon;
};

const entries: NavEntry[] = [
  {
    key: "users",
    to: "/admin/users",
    label: "Utilisateurs",
    icon: Users,
  },
  {
    key: "trainer-requests",
    to: "/admin/trainer-requests",
    label: "Rôle formateur",
    icon: UserCheck,
  },
  {
    key: "account-deletion",
    to: "/admin/account-deletion-requests",
    label: "Suppressions de compte",
    icon: Shield,
  },
];

export function AdminUserManagementNav({
  active,
}: {
  active: AdminUserManagementSection;
}) {
  return (
    <Box
      component="nav"
      aria-label="Gestion des utilisateurs"
      sx={{
        p: 1.25,
        border: 1,
        borderColor: "divider",
        borderRadius: 3,
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={1.25}
        sx={{ alignItems: { lg: "center" } }}
      >
        <Box sx={{ minWidth: { lg: 190 } }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontWeight: 900, letterSpacing: "0.08em" }}
          >
            Gestion des utilisateurs
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: "wrap" }}
        >
          {entries.map(({ key, to, label, icon: Icon }) => (
            <NavLink
              key={key}
              to={to}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              <Button
                size="small"
                variant={active === key ? "contained" : "outlined"}
                startIcon={<Icon size={16} />}
                aria-current={active === key ? "page" : undefined}
                sx={{ whiteSpace: "nowrap", fontWeight: 800 }}
              >
                {label}
              </Button>
            </NavLink>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}

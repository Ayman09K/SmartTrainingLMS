import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  CalendarClock,
  ChevronDown,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  MailCheck,
  Menu as MenuIcon,
  MessageSquare,
  Shield,
  Sparkles,
  Star,
  UserCheck,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { getUnreadNotificationCount } from "../../api/notificationApi";
import { useAuth } from "../../features/auth/AuthContext";
import { SmartTrainingBrand } from "../brand/SmartTrainingBrand";
import { WebAssistantDrawerPanel } from "../assistant/WebAssistant";
import "./AppLayout.css";
import { SmartConfirmHost } from "../ux/SmartConfirmHost";

// WEB_VISUAL_1_ADMIN_FOUNDATION_SAFE_V1
const drawerWidth = 272;
const topbarHeight = 68;
const assistantPanelWidth = 408;
const assistantPanelSideStorageKey = "smarttraining_web_assistant_side";
type AssistantPanelSide = "left" | "right";

type ShellNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  notificationBadge?: boolean;
};

type ShellNavGroup = {
  label: string;
  icon: LucideIcon;
  children: ShellNavItem[];
};

type ShellNavEntry = ShellNavItem | ShellNavGroup;

type WorkspaceKey = "learner" | "trainer" | "admin";

type WorkspaceItem = ShellNavItem & {
  workspace: WorkspaceKey;
};

type NavItemProps = ShellNavItem & {
  badgeCount?: number;
  onNavigate?: () => void;
};

const copy = {
  learnerSection: "Apprenant",
  trainerSection: "Formateur",
  adminSection: "Administration",
  workspaceSection: "Espace de travail",
  personalSection: "Personnel",
  connectedSpace: "Espace actif",
  account: "Mon compte",
  logout: "D\u00e9connexion",
  learnerRoleNeutral: "Apprenant / Apprenante",
  trainerRoleNeutral: "Formateur / Formatrice",
  adminRoleNeutral: "Administrateur / Administratrice",
};

const learnerItems: ShellNavItem[] = [
  {
    to: "/learner",
    label: "Dashboard",
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: "/learner/catalog",
    label: "Catalogue",
    icon: LibraryBig,
  },
  {
    to: "/learner/invitations",
    label: "Mes invitations",
    icon: MailCheck,
  },
  {
    to: "/learner/trainings",
    label: "Mes formations",
    icon: BookOpen,
  },
  {
    to: "/learner/progress",
    label: "Progression & IA",
    icon: BarChart3,
  },
  {
    to: "/learner/assistant",
    label: "Assistant SmartTraining",
    icon: Brain,
  },
  {
    to: "/learner/quizzes",
    label: "Mes quiz",
    icon: ClipboardCheck,
  },
  {
    to: "/learner/feedbacks",
    label: "Mes avis & aide",
    icon: MessageSquare,
  },
  {
    to: "/learner/support-sessions",
    label: "Mes s\u00e9ances",
    icon: CalendarClock,
  },
  {
    to: "/learner/notifications",
    label: "Notifications",
    icon: Bell,
    notificationBadge: true,
  },
];

const trainerItems: ShellNavItem[] = [
  {
    to: "/trainer",
    label: "Dashboard",
    icon: GraduationCap,
    end: true,
  },
  {
    to: "/trainer/assistant",
    label: "Assistant SmartTraining",
    icon: Brain,
  },
  {
    to: "/trainer/trainings",
    label: "Formations",
    icon: BookOpen,
  },
  {
    to: "/trainer/learning-paths",
    label: "Parcours",
    icon: LibraryBig,
  },
  {
    to: "/trainer/content",
    label: "Contenus",
    icon: LayoutDashboard,
  },
  {
    to: "/trainer/uploads",
    label: "Uploads",
    icon: Shield,
  },
  {
    to: "/trainer/learners",
    label: "Apprenants",
    icon: Users,
  },  {
    to: "/trainer/groups",
    label: "Groupes",
    icon: Users,
  },
  {
    to: "/trainer/feedbacks",
    label: "Feedbacks",
    icon: MessageSquare,
  },
  {
    to: "/trainer/alerts",
    label: "Alertes & risques",
    icon: Bell,
  },
  {
    to: "/trainer/interventions",
    label: "Interventions",
    icon: UserCheck,
  },
  {
    to: "/trainer/support-sessions",
    label: "S\u00e9ances",
    icon: CalendarClock,
  },
  {
    to: "/trainer/results",
    label: "Résultats & rapports",
    icon: ClipboardCheck,
  },
  {
    to: "/trainer/statistics",
    label: "Statistiques / BI",
    icon: BarChart3,
  },

  {
    to: "/trainer/notifications",
    label: "Notifications",
    icon: Bell,
    notificationBadge: true,
  },
];

const adminItems: ShellNavEntry[] = [
  {
    to: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: "/admin/assistant",
    label: "Assistant SmartTraining",
    icon: Brain,
  },
  {
    label: "Gestion des utilisateurs",
    icon: Users,
    children: [
      {
        to: "/admin/users",
        label: "Liste des utilisateurs",
        icon: Users,
      },
      {
        to: "/admin/trainer-requests",
        label: "Rôle formateur",
        icon: UserCheck,
      },
      {
        to: "/admin/account-deletion-requests",
        label: "Suppressions de compte",
        icon: Shield,
      },
    ],
  },
  {
    to: "/admin/trainings",
    label: "Formations",
    icon: BookOpen,
  },
  {
    to: "/admin/learning-paths",
    label: "Parcours",
    icon: LibraryBig,
  },
  {
    to: "/admin/categories",
    label: "Categories",
    icon: BookOpen,
  },
  {
    to: "/admin/assignments",
    label: "Affectations",
    icon: Shield,
  },  {
    to: "/admin/groups",
    label: "Groupes",
    icon: Users,
  },
  {
    to: "/admin/reviews",
    label: "Avis",
    icon: Star,
  },
  {
    to: "/admin/feedbacks",
    label: "Feedbacks",
    icon: MessageSquare,
  },
  {
    to: "/admin/alerts",
    label: "Alertes & risques",
    icon: Bell,
  },
  {
    to: "/admin/results",
    label: "Résultats & rapports",
    icon: ClipboardCheck,
  },
  {
    to: "/admin/statistics",
    label: "Statistiques / BI",
    icon: BarChart3,
  },

  {
    to: "/admin/notifications",
    label: "Notifications",
    icon: Bell,
    notificationBadge: true,
  },
];

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  notificationBadge,
  badgeCount = 0,
  onNavigate,
}: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      style={{
        color: "inherit",
        textDecoration: "none",
      }}
    >
      {({ isActive }) => (
        <ListItemButton
          selected={isActive}
          aria-current={isActive ? "page" : undefined}
          sx={{
            minHeight: 42,
            px: 1.5,
            mb: 0.35,
            borderRadius: 2.25,
            position: "relative",
            color: "text.secondary",
            "& .MuiListItemIcon-root": {
              color: "inherit",
            },
            "&:hover": {
              color: "text.primary",
              bgcolor: "action.hover",
            },
            "&.Mui-selected": {
              color: "primary.main",
              bgcolor: "action.selected",
              "&::before": {
                content: '""',
                position: "absolute",
                left: 0,
                top: 9,
                bottom: 9,
                width: 3,
                borderRadius: 999,
                bgcolor: "primary.main",
              },
              "&:hover": {
                color: "primary.main",
                bgcolor: "action.hover",
              },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 38 }}>
            {notificationBadge ? (
              <Badge
                color="error"
                badgeContent={badgeCount}
                max={99}
                invisible={badgeCount <= 0}
              >
                <Icon size={19} />
              </Badge>
            ) : (
              <Icon size={19} />
            )}
          </ListItemIcon>

          <ListItemText
            primary={label}
            slotProps={{
              primary: {
                sx: {
                  fontSize: "0.9rem",
                  fontWeight: isActive ? 800 : 700,
                },
              },
            }}
          />
        </ListItemButton>
      )}
    </NavLink>
  );
}

function NavGroup({
  group,
  onNavigate,
}: {
  group: ShellNavGroup;
  onNavigate?: () => void;
}) {
  const Icon = group.icon;
  const location = useLocation();

  const childActive = group.children.some((item) =>
    item.end
      ? location.pathname === item.to
      : location.pathname === item.to ||
        location.pathname.startsWith(`${item.to}/`),
  );

  const [expanded, setExpanded] = useState(childActive);

  useEffect(() => {
    if (childActive) {
      setExpanded(true);
    }
  }, [childActive, location.pathname]);

  return (
    <Box sx={{ mb: 0.75 }}>
      <ListItemButton
        onClick={() => setExpanded((value) => !value)}
        selected={childActive}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Replier" : "Déplier"} ${group.label}`}
        sx={{
          minHeight: 44,
          px: 1.5,
          mb: 0.5,
          borderRadius: 2.5,
          color: childActive ? "primary.main" : "text.secondary",
          bgcolor: childActive ? "action.selected" : "transparent",
          "&:hover": {
            color: "text.primary",
            bgcolor: "action.hover",
          },
          "&.Mui-selected": {
            color: "primary.main",
            bgcolor: "action.selected",
            "&:hover": {
              bgcolor: "action.hover",
            },
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 38, color: "inherit" }}>
          <Icon size={19} />
        </ListItemIcon>

        <ListItemText
          primary={group.label}
          slotProps={{
            primary: {
              sx: {
                fontSize: "0.9rem",
                fontWeight: 800,
              },
            },
          }}
        />

        <ChevronDown
          size={17}
          aria-hidden="true"
          style={{
            transition: "transform 160ms ease",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            opacity: 0.72,
          }}
        />
      </ListItemButton>

      {expanded ? (
        <Box
          sx={{
            ml: 2.1,
            pl: 1,
            borderLeft: 1,
            borderColor: "divider",
          }}
        >
          {group.children.map((item) => (
            <NavItem
              key={item.to}
              {...item}
              onNavigate={onNavigate}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

function NavSection({
  title,
  items,
  unreadNotifications,
  onNavigate,
}: {
  title: string;
  items: ShellNavEntry[];
  unreadNotifications: number;
  onNavigate?: () => void;
}) {
  return (
    <Box
      component="nav"
      aria-label={`Navigation ${title.toLowerCase()}`}
      sx={{ mb: 2 }}
    >
      <Typography
        variant="overline"
        sx={{
          display: "block",
          px: 1.5,
          mb: 0.5,
          color: "text.secondary",
          fontSize: "0.66rem",
          lineHeight: 1.8,
          fontWeight: 900,
          letterSpacing: "0.1em",
        }}
      >
        {title}
      </Typography>

      <List disablePadding>
        {items.map((item) =>
          "children" in item ? (
            <NavGroup
              key={`group-${item.label}`}
              group={item}
              onNavigate={onNavigate}
            />
          ) : (
            <NavItem
              key={item.to}
              {...item}
              badgeCount={
                item.notificationBadge ? unreadNotifications : undefined
              }
              onNavigate={onNavigate}
            />
          ),
        )}
      </List>
    </Box>
  );
}

function WorkspaceSwitcher({
  items,
  activeWorkspace,
  onNavigate,
}: {
  items: WorkspaceItem[];
  activeWorkspace: WorkspaceKey;
  onNavigate?: () => void;
}) {
  if (items.length <= 1) {
    return null;
  }

  return (
    <Box
      component="nav"
      aria-label="Changer d'espace de travail"
      sx={{ mb: 2 }}
    >
      <Typography
        variant="overline"
        sx={{
          display: "block",
          px: 1.5,
          mb: 0.75,
          color: "text.secondary",
          fontSize: "0.66rem",
          lineHeight: 1.8,
          fontWeight: 900,
          letterSpacing: "0.1em",
        }}
      >
        {copy.workspaceSection}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 0.75,
          p: 0.75,
          border: 1,
          borderColor: "divider",
          borderRadius: 2.5,
          bgcolor: "background.default",
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const selected = activeWorkspace === item.workspace;

          return (
            <NavLink
              key={item.workspace}
              to={item.to}
              onClick={onNavigate}
              style={{
                color: "inherit",
                textDecoration: "none",
              }}
            >
              <ListItemButton
                selected={selected}
                aria-current={selected ? "page" : undefined}
                aria-label={`${item.label}${selected ? ", espace actif" : ""}`}
                sx={{
                  minHeight: 44,
                  px: 1.5,
                  borderRadius: 2,
                  border: 1,
                  borderColor: selected ? "primary.main" : "transparent",
                  color: selected ? "primary.main" : "text.secondary",
                  bgcolor: selected ? "background.paper" : "transparent",
                  "& .MuiListItemIcon-root": {
                    color: "inherit",
                  },
                  "&:hover": {
                    color: selected ? "primary.main" : "text.primary",
                    bgcolor: "action.hover",
                  },
                  "&.Mui-selected": {
                    color: "primary.main",
                    bgcolor: "background.paper",
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 38 }}>
                  <Icon size={19} />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: {
                      sx: {
                        fontSize: "0.9rem",
                        fontWeight: selected ? 900 : 800,
                      },
                    },
                  }}
                />
              </ListItemButton>
            </NavLink>
          );
        })}
      </Box>

      <SmartConfirmHost />
    </Box>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantSide, setAssistantSide] = useState<AssistantPanelSide>(() => {
    if (typeof window === "undefined") {
      return "right";
    }

    try {
      return window.localStorage.getItem(assistantPanelSideStorageKey) === "left"
        ? "left"
        : "right";
    } catch {
      return "right";
    }
  });
  const [assistantSuppressed, setAssistantSuppressed] = useState(false);
  const assistantPageActive =
    location.pathname.endsWith("/assistant");

  const learner =
    user?.role === "APPRENANT" ||
    user?.role === "FORMATEUR" ||
    user?.role === "ADMIN";
  const trainer = user?.role === "FORMATEUR" || user?.role === "ADMIN";
  const admin = user?.role === "ADMIN";

  const activeWorkspace: WorkspaceKey =
    location.pathname.startsWith("/learner")
      ? "learner"
      : location.pathname.startsWith("/trainer")
        ? "trainer"
        : location.pathname.startsWith("/admin")
          ? "admin"
          : user?.role === "ADMIN"
            ? "admin"
            : user?.role === "FORMATEUR"
              ? "trainer"
              : "learner";

  const workspaceItems: WorkspaceItem[] =
    user?.role === "FORMATEUR"
      ? [
          {
            workspace: "trainer",
            to: "/trainer",
            label: "Espace formateur",
            icon: GraduationCap,
          },
          {
            workspace: "learner",
            to: "/learner",
            label: "Mon apprentissage",
            icon: BookOpen,
          },
        ]
      : user?.role === "ADMIN"
        ? [
            {
              workspace: "admin",
              to: "/admin",
              label: "Administration",
              icon: Shield,
            },
            {
              workspace: "trainer",
              to: "/trainer",
              label: "Espace formateur",
              icon: GraduationCap,
            },
            {
              workspace: "learner",
              to: "/learner",
              label: "Mon apprentissage",
              icon: BookOpen,
            },
          ]
        : [];

  const activeWorkspaceLabel =
    activeWorkspace === "admin"
      ? "Administration"
      : activeWorkspace === "trainer"
        ? "Espace formateur"
        : "Mon apprentissage";

  const workspaceHomePath =
    activeWorkspace === "admin"
      ? "/admin"
      : activeWorkspace === "trainer"
        ? "/trainer"
        : "/learner";

  const accountPath =
    activeWorkspace === "learner"
      ? "/learner/account"
      : activeWorkspace === "trainer"
        ? "/trainer/account"
        : "/admin/account";

  const roleLabel =
    user?.role === "APPRENANT"
      ? user?.civilite === "MADAME"
        ? "Apprenante"
        : user?.civilite === "MONSIEUR"
          ? "Apprenant"
          : copy.learnerRoleNeutral
      : user?.role === "FORMATEUR"
        ? user?.civilite === "MADAME"
          ? "Formatrice"
          : user?.civilite === "MONSIEUR"
            ? "Formateur"
            : copy.trainerRoleNeutral
        : user?.role === "ADMIN"
          ? user?.civilite === "MADAME"
            ? "Administratrice"
            : user?.civilite === "MONSIEUR"
              ? "Administrateur"
              : copy.adminRoleNeutral
          : "Utilisateur";

  const displayName =
    user?.fullName || user?.name || user?.email || "Utilisateur";

  const avatarInitials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`
      .trim()
      .toUpperCase() ||
    displayName.slice(0, 2).toUpperCase();

  useEffect(() => {
    setMobileOpen(false);

    if (location.pathname.endsWith("/assistant")) {
      setAssistantOpen(false);
    }

    if (!location.pathname.endsWith("/quizzes")) {
      setAssistantSuppressed(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (assistantSuppressed) {
      setAssistantOpen(false);
    }
  }, [assistantSuppressed]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        assistantPanelSideStorageKey,
        assistantSide,
      );
    } catch {
      // Storage can be unavailable in a restricted browser context.
    }
  }, [assistantSide]);

  useEffect(() => {
    let active = true;

    if (!user?.role) {
      setUnreadNotifications(0);
      return () => {
        active = false;
      };
    }

    async function loadUnreadCount() {
      try {
        const result = await getUnreadNotificationCount();

        if (active) {
          setUnreadNotifications(result.unreadCount);
        }
      } catch {
        if (active) {
          setUnreadNotifications(0);
        }
      }
    }

    void loadUnreadCount();

    const handleNotificationsUpdated = () => {
      void loadUnreadCount();
    };

    window.addEventListener(
      "smarttraining:notifications-updated",
      handleNotificationsUpdated,
    );

    const timer = window.setInterval(() => {
      void loadUnreadCount();
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(
        "smarttraining:notifications-updated",
        handleNotificationsUpdated,
      );
    };
  }, [user?.role, location.pathname]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function drawerContent(onNavigate?: () => void) {
    return (
      <Box
        sx={{
          height: "100%",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          color: "text.primary",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            minHeight: topbarHeight,
            px: 2.25,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flex: "0 0 auto",
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box
              component={NavLink}
              to={workspaceHomePath}
              onClick={onNavigate}
              aria-label={`Retour à l’accueil — ${activeWorkspaceLabel}`}
              title={`Retour à l’accueil — ${activeWorkspaceLabel}`}
              sx={{
                display: "inline-flex",
                maxWidth: "100%",
                color: "inherit",
                textDecoration: "none",
                borderRadius: 2,
                cursor: "pointer",
                transition: "opacity 120ms ease",
                "&:hover": {
                  opacity: 0.9,
                },
                "&:focus-visible": {
                  outline: "2px solid",
                  outlineColor: "primary.main",
                  outlineOffset: 3,
                },
              }}
            >
              <SmartTrainingBrand size="md" surface="light" />
            </Box>
          </Box>

          <IconButton
            aria-label="Fermer le menu"
            onClick={onNavigate}
            sx={{
              display: { xs: "inline-flex", md: "none" },
              color: "text.secondary",
            }}
          >
            <X size={20} />
          </IconButton>
        </Box>

        <Divider />

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            px: 1.25,
            py: 1.5,
            scrollbarWidth: "thin",
          }}
        >
          <WorkspaceSwitcher
            items={workspaceItems}
            activeWorkspace={activeWorkspace}
            onNavigate={onNavigate}
          />

          {workspaceItems.length > 1 ? <Divider sx={{ mb: 2 }} /> : null}

          {activeWorkspace === "learner" && learner ? (
            <NavSection
              title="Mon apprentissage"
              items={learnerItems}
              unreadNotifications={unreadNotifications}
              onNavigate={onNavigate}
            />
          ) : null}

          {activeWorkspace === "trainer" && trainer ? (
            <NavSection
              title={copy.trainerSection}
              items={trainerItems}
              unreadNotifications={unreadNotifications}
              onNavigate={onNavigate}
            />
          ) : null}

          {activeWorkspace === "admin" && admin ? (
            <NavSection
              title={copy.adminSection}
              items={adminItems}
              unreadNotifications={unreadNotifications}
              onNavigate={onNavigate}
            />
          ) : null}
        </Box>

        <Box
          sx={{
            flex: "0 0 auto",
            p: 1.25,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "background.default",
          }}
        >
          <Typography
            variant="overline"
            sx={{
              display: "block",
              px: 1.5,
              mb: 0.25,
              color: "text.secondary",
              fontSize: "0.64rem",
              fontWeight: 900,
              letterSpacing: "0.1em",
            }}
          >
            {copy.personalSection}
          </Typography>

          <NavLink
            to={accountPath}
            onClick={onNavigate}
            style={{
              color: "inherit",
              textDecoration: "none",
            }}
          >
            {({ isActive }) => (
              <ListItemButton
                selected={isActive}
                aria-current={isActive ? "page" : undefined}
                sx={{
                  minHeight: 46,
                  px: 1.5,
                  borderRadius: 2.5,
                  color: "text.secondary",
                  "&:hover": {
                    color: "text.primary",
                    bgcolor: "action.hover",
                  },
                  "&.Mui-selected": {
                    color: "primary.main",
                    bgcolor: "action.selected",
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 38, color: "inherit" }}>
                  {user?.avatarDataUrl ? (
                    <Avatar
                      src={user.avatarDataUrl}
                      alt=""
                      aria-hidden="true"
                      sx={{
                        width: 24,
                        height: 24,
                        border: 1,
                        borderColor: "divider",
                      }}
                    />
                  ) : (
                    <UserCircle size={19} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={copy.account}
                  slotProps={{
                    primary: {
                      sx: {
                        fontSize: "0.9rem",
                        fontWeight: 800,
                      },
                    },
                  }}
                />
              </ListItemButton>
            )}
          </NavLink>

          <ListItemButton
            onClick={handleLogout}
            sx={{
              minHeight: 44,
              px: 1.5,
              mt: 0.5,
              borderRadius: 2.5,
              color: "text.secondary",
              "&:hover": {
                color: "error.main",
                bgcolor: "action.hover",
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 38, color: "inherit" }}>
              <LogOut size={19} />
            </ListItemIcon>
            <ListItemText
              primary={copy.logout}
              slotProps={{
                primary: {
                  sx: {
                    fontSize: "0.9rem",
                    fontWeight: 800,
                  },
                },
              }}
            />
          </ListItemButton>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100dvh",
        bgcolor: "background.default",
      }}
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: drawerWidth,
              maxWidth: "86vw",
              border: 0,
              boxShadow: 24,
            },
          },
        }}
        sx={{
          display: { xs: "block", md: "none" },
        }}
      >
        {drawerContent(() => setMobileOpen(false))}
      </Drawer>

      <Drawer
        variant="permanent"
        open
        slotProps={{
          paper: {
            sx: {
              width: drawerWidth,
              border: 0,
              borderRight: 1,
              borderColor: "divider",
              overflow: "hidden",
              boxSizing: "border-box",
              bgcolor: "background.paper",
            },
          },
        }}
        sx={{
          display: { xs: "none", md: "block" },
          width: drawerWidth,
          flexShrink: 0,
        }}
      >
        {drawerContent()}
      </Drawer>

      <AppBar
        position="fixed"
        elevation={0}
        color="inherit"
        sx={{
          width: { xs: "100%", md: `calc(100% - ${drawerWidth}px)` },
          ml: { xs: 0, md: `${drawerWidth}px` },
          bgcolor: "background.paper",
          backgroundImage: "none",
          borderBottom: 1,
          borderColor: "divider",
          boxShadow: "0 1px 0 rgba(15, 23, 42, 0.02)",
          zIndex: (theme) => theme.zIndex.drawer - 1,
        }}
      >
        <Toolbar
          sx={{
            minHeight: `${topbarHeight}px !important`,
            px: { xs: 2, sm: 2.5, lg: 3 },
            gap: 1.5,
          }}
        >
          <IconButton
            edge="start"
            aria-label="Ouvrir le menu"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: "none" }, mr: 0.25 }}
          >
            <MenuIcon size={22} />
          </IconButton>

          <Box
            sx={{
              minWidth: 0,
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 1.4,
            }}
          >
            <Avatar
              component={NavLink}
              to={accountPath}
              aria-label={`Ouvrir ${copy.account}`}
              title={copy.account}
              src={user?.avatarDataUrl || undefined}
              alt={
                user?.avatarDataUrl
                  ? `Photo de profil de ${displayName}`
                  : ""
              }
              sx={{
                width: 38,
                height: 38,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                fontWeight: 900,
                border: 1,
                borderColor: "divider",
              }}
            >
              {avatarInitials}
            </Avatar>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: { xs: "none", sm: "block" },
                  lineHeight: 1.2,
                }}
              >
                {`${copy.connectedSpace} · ${activeWorkspaceLabel}`}
              </Typography>
              <Typography
                noWrap
                sx={{
                  mt: { xs: 0, sm: 0.2 },
                  fontSize: { xs: "0.96rem", sm: "1.05rem" },
                  fontWeight: 900,
                  letterSpacing: "-0.015em",
                }}
              >
                {displayName}
              </Typography>
            </Box>
          </Box>

          {!assistantPageActive && !assistantSuppressed ? (
            <Tooltip title="Assistant SmartTraining">
              <IconButton
                aria-label={
                  assistantOpen
                    ? "Fermer l’Assistant SmartTraining"
                    : "Ouvrir l’Assistant SmartTraining"
                }
                color={assistantOpen ? "primary" : "default"}
                onClick={() =>
                  setAssistantOpen((current) => !current)
                }
                sx={{
                  border: 1,
                  borderColor: assistantOpen
                    ? "primary.main"
                    : "divider",
                  bgcolor: assistantOpen
                    ? "action.selected"
                    : "background.paper",
                }}
              >
                <Sparkles size={19} />
              </IconButton>
            </Tooltip>
          ) : null}

          <Tooltip title={roleLabel}>
            <Chip
              label={roleLabel}
              size="small"
              variant="outlined"
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                maxWidth: 230,
                fontWeight: 800,
                bgcolor: "background.paper",
              }}
            />
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: "100dvh",
          bgcolor: "background.default",
          // ASSISTANT_FINAL_VISUAL_POLISH_V2
          // Keep normal laptop page layouts intact; the Assistant overlays on the right.
          // On very wide screens only, reserve the persistent panel width.
          ml: {
            xs: 0,
            md: 0,
            xl:
              assistantOpen &&
              !assistantPageActive &&
              !assistantSuppressed &&
              assistantSide === "left"
                ? `${assistantPanelWidth}px`
                : 0,
          },
          mr: {
            xs: 0,
            md: 0,
            xl:
              assistantOpen &&
              !assistantPageActive &&
              !assistantSuppressed &&
              assistantSide === "right"
                ? `${assistantPanelWidth}px`
                : 0,
          },
          transition: (theme) =>
            theme.transitions.create(
              ["margin-left", "margin-right"],
              {
                duration: theme.transitions.duration.shorter,
              },
            ),
        }}
      >
        <Toolbar sx={{ minHeight: `${topbarHeight}px !important` }} />

        <Box
          component="section"
          sx={{
            width: "100%",
            maxWidth: 1600,
            mx: "auto",
            p: {
              xs: 2,
              sm: 2.5,
              lg: 3,
            },
          }}
        >
          <Outlet
            context={{
              setAssistantSuppressed,
            }}
          />
          <WebAssistantDrawerPanel
            open={
              assistantOpen &&
              !assistantPageActive &&
              !assistantSuppressed
            }
            onClose={() => setAssistantOpen(false)}
            topOffset={topbarHeight}
            side={assistantSide}
            onSideChange={setAssistantSide}
            desktopLeftOffset={drawerWidth}
          />
        </Box>
      </Box>
    </Box>
  );
}

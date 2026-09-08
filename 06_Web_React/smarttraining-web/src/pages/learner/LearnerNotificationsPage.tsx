/* WEB_VISUAL_7_NOTIFICATIONS_SAFE_V1 */
/* WEB_VISUAL_FINAL_ADMIN_NOTIFICATIONS_EMPTY_SAFE_V1 */
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../api/apiClient";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notificationApi";
import { SmartPageHeader } from "../../components/ui";
import type { LearnerNotificationResponse } from "../../types/notification";
// LEARNER_WEB_VISUAL_1_NOTIFICATIONS_DENSITY_SAFE_V1
function formatDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function typeLabel(notification: LearnerNotificationResponse): string {
  const labels: Record<LearnerNotificationResponse["notificationType"], string> = {
    SUPPORT_SESSION_CREATED: "S\u00e9ance planifi\u00e9e",
    SUPPORT_SESSION_UPDATED: "S\u00e9ance modifi\u00e9e",
    SUPPORT_SESSION_CANCELLED: "S\u00e9ance annul\u00e9e",
    SUPPORT_SESSION_SCHEDULED: "S\u00e9ance planifi\u00e9e",
    TRAINING_INVITATION: "Invitation \u00e0 une formation",
    TRAINING_ASSIGNED: "Formation affect\u00e9e",
    DEADLINE_ASSIGNED: "\u00c9ch\u00e9ance attribu\u00e9e",
    ACCESS_REQUEST_DECISION: "D\u00e9cision d'acc\u00e8s",
    FEEDBACK_RESPONSE: "R\u00e9ponse \u00e0 votre feedback",
    ACCOUNT_DELETION_REQUESTED: "Demande de suppression",
    ACCOUNT_DELETION_STATUS_UPDATED: "Suppression du compte",
  };

  return labels[notification.notificationType];
}
function actionLabel(notification: LearnerNotificationResponse): string {
  const labels: Record<LearnerNotificationResponse["notificationType"], string> = {
    SUPPORT_SESSION_CREATED: "Voir mes s\u00e9ances",
    SUPPORT_SESSION_UPDATED: "Voir mes s\u00e9ances",
    SUPPORT_SESSION_CANCELLED: "Voir mes s\u00e9ances",
    SUPPORT_SESSION_SCHEDULED: "Voir mes s\u00e9ances",
    TRAINING_INVITATION: "Voir mes invitations",
    TRAINING_ASSIGNED: "Voir la formation",
    DEADLINE_ASSIGNED: "Voir la formation",
    ACCESS_REQUEST_DECISION: "Voir le catalogue",
    FEEDBACK_RESPONSE: "Voir mes avis & aide",
    ACCOUNT_DELETION_REQUESTED: "Voir les demandes",
    ACCOUNT_DELETION_STATUS_UPDATED: "Voir mon compte",
  };

  return labels[notification.notificationType];
}

export function LearnerNotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<LearnerNotificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      setNotifications(await getMyNotifications());
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const readCount = notifications.length - unreadCount;

  async function openNotification(notification: LearnerNotificationResponse) {
    setError("");

    try {
      if (!notification.read) {
        const updated = await markNotificationRead(notification.id);

        setNotifications((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );

        window.dispatchEvent(
          new Event("smarttraining:notifications-updated"),
        );
      }

      const directTrainingTarget =
        (notification.notificationType === "TRAINING_ASSIGNED" ||
          notification.notificationType === "DEADLINE_ASSIGNED") &&
        notification.trainingId
          ? `/learner/trainings/${notification.trainingId}`
          : notification.actionUrl || "/";

      navigate(directTrainingTarget);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function markAllRead() {
    setWorking(true);
    setError("");

    try {
      await markAllNotificationsRead();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: true,
          readAt: notification.readAt || new Date().toISOString(),
        })),
      );

      window.dispatchEvent(
        new Event("smarttraining:notifications-updated"),
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <Stack spacing={2.5}>
        <Box>
          <Skeleton variant="text" width={92} height={18} />
          <Skeleton variant="text" width={210} height={38} />
          <Skeleton variant="text" width="56%" height={22} />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(3, minmax(0, 1fr))",
            },
            gap: 1.25,
          }}
        >
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} variant="rounded" height={82} />
          ))}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              xl: "repeat(2, minmax(0, 1fr))",
            },
            gap: 1.25,
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} variant="rounded" height={116} />
          ))}
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow={"Mon activit\u00e9"}
        title={"Notifications"}
        description={
          "Retrouvez vos notifications et acc\u00e9dez directement aux \u00e9l\u00e9ments concern\u00e9s."
        }
        actions={
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ alignItems: { sm: "center" } }}
          >
            <Chip
              icon={unreadCount > 0 ? <BellRing size={15} /> : <Bell size={15} />}
              label={
                unreadCount > 0
                  ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                  : "Tout est lu"
              }
              variant={unreadCount > 0 ? "filled" : "outlined"}
            />
            <Button
              type="button"
              variant="outlined"
              disabled={working || unreadCount === 0}
              startIcon={
                working ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <CheckCheck size={17} />
                )
              }
              onClick={() => void markAllRead()}
            >
              {working ? "Traitement..." : "Tout marquer comme lu"}
            </Button>
          </Stack>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, minmax(0, 1fr))",
          },
          gap: 1.5,
        }}
      >
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ "&:last-child": { pb: 2 } }}>
            <Typography variant="caption" color="text.secondary">
              Total
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.25, fontWeight: 900 }}>
              {notifications.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              notification{notifications.length > 1 ? "s" : ""}
            </Typography>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            borderRadius: 3,
            borderColor: unreadCount > 0 ? "primary.main" : "divider",
            bgcolor: unreadCount > 0 ? "action.hover" : "background.paper",
          }}
        >
          <CardContent sx={{ "&:last-child": { pb: 2 } }}>
            <Typography variant="caption" color="text.secondary">
              À consulter
            </Typography>
            <Typography
              variant="h4"
              sx={{ mt: 0.25, fontWeight: 900, color: "primary.main" }}
            >
              {unreadCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              non lue{unreadCount > 1 ? "s" : ""}
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ "&:last-child": { pb: 2 } }}>
            <Typography variant="caption" color="text.secondary">
              Traitées
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.25, fontWeight: 900 }}>
              {readCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              déjà lue{readCount > 1 ? "s" : ""}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {!notifications.length ? (
        <Card
          variant="outlined"
          sx={{
            width: "100%",
            maxWidth: 680,
            mx: "auto",
            borderRadius: 3,
            borderStyle: "dashed",
          }}
        >
          <CardContent sx={{ py: { xs: 4, sm: 5 } }}>
            <Stack
              spacing={1.25}
              sx={{ alignItems: "center", textAlign: "center" }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "action.hover",
                  color: "primary.main",
                }}
              >
                <Bell size={24} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 850 }}>
                {"Aucune notification"}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ maxWidth: 520 }}
              >
                {
                  "Vos notifications appara\u00eetront ici d\u00e8s qu'une action ou une information vous concernera."
                }
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              xl: "repeat(2, minmax(0, 1fr))",
            },
            gap: 1.25,
            alignItems: "stretch",
          }}
        >
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              variant="outlined"
              sx={{
                height: "100%",
                borderRadius: 3,
                borderColor: "divider",
                borderLeftWidth: notification.read ? 1 : 3,
                borderLeftColor: notification.read ? "divider" : "primary.main",
                bgcolor: "background.paper",
                boxShadow: notification.read
                  ? "none"
                  : "0 6px 18px rgba(15, 23, 42, 0.05)",
                transition:
                  "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
                "&:hover": {
                  borderColor: "primary.main",
                  boxShadow: "0 8px 22px rgba(15, 23, 42, 0.07)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <CardContent sx={{ p: 2, height: "100%" }}>
                <Stack spacing={1.1} sx={{ height: "100%" }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{
                      justifyContent: "space-between",
                      alignItems: { sm: "flex-start" },
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      sx={{ flexWrap: "wrap", alignItems: "center" }}
                    >
                      <Chip
                        size="small"
                        icon={
                          notification.read ? (
                            <Bell size={14} />
                          ) : (
                            <BellRing size={14} />
                          )
                        }
                        label={notification.read ? "Lue" : "Non lue"}
                        variant={notification.read ? "outlined" : "filled"}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={typeLabel(notification)}
                      />
                    </Stack>

                    <Typography variant="caption" color="text.secondary">
                      {formatDate(notification.createdAt)}
                    </Typography>
                  </Stack>

                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
                      {notification.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {notification.message}
                    </Typography>
                  </Box>

                  <Button
                    type="button"
                    size="small"
                    variant={notification.read ? "text" : "contained"}
                    onClick={() => void openNotification(notification)}
                    sx={{ alignSelf: "flex-start", mt: "auto" }}
                  >
                    {actionLabel(notification)}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Stack>
  );
}

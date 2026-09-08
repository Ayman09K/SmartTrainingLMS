import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  History,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useLocation } from "react-router-dom";

import {
  askAssistant,
  deleteAssistantConversation,
  getAssistantConversationMessages,
  getAssistantErrorMessage,
  listAssistantConversations,
  type AssistantConversationSummary,
  type AssistantHistoryMessage,
  type AssistantPersistedMessage,
} from "../../api/assistantApi";
import { useAuth } from "../../features/auth/AuthContext";

type UiMessage = AssistantHistoryMessage & {
  id: string;
  intro?: boolean;
};

type RouteContext = {
  trainingId?: number;
  lessonId?: number;
  label: string;
};

type AssistantPanelProps = {
  onClose?: () => void;
  standalone?: boolean;
  contextOverride?: RouteContext;
  panelSide?: "left" | "right";
  onToggleSide?: () => void;
};

function normalizeAssistantText(value: string): string {
  return value
    .replace(/```[a-zA-Z0-9_-]*\n?/g, "")
    .replace(/```/g, "")
    .replace(/\*\*(.*?)\*\*/gs, "$1")
    .replace(/__(.*?)__/gs, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`([^`\n]+)`/g, "$1")
    .trim();
}

function introMessage(): UiMessage {
  return {
    id: "intro",
    role: "assistant",
    intro: true,
    content:
      "Bonjour ! Je suis l’Assistant SmartTraining. Je peux vous aider sur SmartTraining, vos apprentissages ou répondre à vos questions générales.",
  };
}

function routeContext(
  pathname: string,
  search: string,
): RouteContext {
  const trainingMatch = pathname.match(
    /\/trainings\/(\d+)(?:\/|$)/,
  );
  const trainingId = trainingMatch
    ? Number(trainingMatch[1])
    : undefined;

  const params = new URLSearchParams(search);
  const lessonRaw = Number(params.get("lessonId"));
  const lessonId =
    Number.isInteger(lessonRaw) && lessonRaw > 0
      ? lessonRaw
      : undefined;

  if (trainingId && lessonId) {
    return {
      trainingId,
      lessonId,
      label: "Contexte : leçon affichée",
    };
  }

  if (trainingId) {
    return {
      trainingId,
      label: "Contexte : formation affichée",
    };
  }

  return {
    label: "Contexte général SmartTraining",
  };
}

function roleStarters(role?: string): string[] {
  if (role === "FORMATEUR") {
    return [
      "Comment créer une formation ?",
      "Comment importer un SCORM ?",
      "Propose-moi un objectif pédagogique.",
    ];
  }

  if (role === "ADMIN") {
    return [
      "Comment gérer les utilisateurs ?",
      "Où gérer les catégories de formation ?",
      "Comment affecter une formation ?",
    ];
  }

  return [
    "Que puis-je faire dans SmartTraining ?",
    "Que dois-je poursuivre dans mon apprentissage ?",
    "Où retrouver mes certificats ?",
  ];
}

function persistedToUi(
  messages: AssistantPersistedMessage[],
): UiMessage[] {
  if (messages.length === 0) {
    return [introMessage()];
  }

  return messages.map((message) => ({
    id: `persisted-${message.id}`,
    role: message.role,
    content:
      message.role === "assistant"
        ? normalizeAssistantText(message.content)
        : message.content,
  }));
}

function formatConversationDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date indisponible";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function AssistantPanel({
  onClose,
  standalone = false,
  contextOverride,
  panelSide = "right",
  onToggleSide,
}: AssistantPanelProps) {
  const { user } = useAuth();
  const location = useLocation();

  const routeDerivedContext = useMemo(
    () => routeContext(location.pathname, location.search),
    [location.pathname, location.search],
  );
  const context = contextOverride ?? routeDerivedContext;

  const starters = useMemo(
    () => roleStarters(user?.role),
    [user?.role],
  );

  const [messages, setMessages] = useState<UiMessage[]>([
    introMessage(),
  ]);
  const [conversationId, setConversationId] =
    useState<number | null>(null);
  const [conversations, setConversations] = useState<
    AssistantConversationSummary[]
  >([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [historyMode, setHistoryMode] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] =
    useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const localIdRef = useRef(0);

  function nextId(prefix: "user" | "assistant"): string {
    localIdRef.current += 1;
    return `${prefix}-${localIdRef.current}`;
  }

  async function refreshConversations(
    showLoading = false,
  ): Promise<AssistantConversationSummary[]> {
    if (showLoading) {
      setHistoryLoading(true);
    }

    setHistoryError("");

    try {
      const recent = await listAssistantConversations(30);
      setConversations(recent);
      return recent;
    } catch (cause) {
      setHistoryError(getAssistantErrorMessage(cause));
      return [];
    } finally {
      if (showLoading) {
        setHistoryLoading(false);
      }
    }
  }

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const recent = await listAssistantConversations(30);

        if (!active) {
          return;
        }

        setConversations(recent);

        const latest = recent[0];
        if (!latest) {
          return;
        }

        const persisted =
          await getAssistantConversationMessages(latest.id, 100);

        if (!active) {
          return;
        }

        setConversationId(latest.id);
        setMessages(persistedToUi(persisted));
      } catch (cause) {
        if (active) {
          setError(getAssistantErrorMessage(cause));
        }
      } finally {
        if (active) {
          setInitialLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, sending, error, historyMode]);

  function resetConversation() {
    setConversationId(null);
    setMessages([introMessage()]);
    setInput("");
    setError("");
    setHistoryMode(false);
    setPendingDeleteId(null);
  }

  async function openHistory() {
    setHistoryMode(true);
    setPendingDeleteId(null);
    await refreshConversations(true);
  }

  async function openConversation(
    selectedId: number,
  ): Promise<void> {
    if (openingId !== null || sending) {
      return;
    }

    setOpeningId(selectedId);
    setHistoryError("");

    try {
      const persisted =
        await getAssistantConversationMessages(selectedId, 100);

      setConversationId(selectedId);
      setMessages(persistedToUi(persisted));
      setHistoryMode(false);
      setPendingDeleteId(null);
      setError("");
    } catch (cause) {
      setHistoryError(getAssistantErrorMessage(cause));
    } finally {
      setOpeningId(null);
    }
  }

  async function confirmDelete(): Promise<void> {
    if (pendingDeleteId === null || deletingId !== null) {
      return;
    }

    const targetId = pendingDeleteId;
    setDeletingId(targetId);
    setHistoryError("");

    try {
      await deleteAssistantConversation(targetId);

      setConversations((current) =>
        current.filter((item) => item.id !== targetId),
      );

      if (conversationId === targetId) {
        resetConversation();
        setHistoryMode(true);
      }

      setPendingDeleteId(null);
    } catch (cause) {
      setHistoryError(getAssistantErrorMessage(cause));
    } finally {
      setDeletingId(null);
    }
  }

  async function sendMessage(explicitText?: string) {
    const text = (explicitText ?? input).trim();

    if (!text || sending) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: nextId("user"),
        role: "user",
        content: text,
      },
    ]);
    setInput("");
    setError("");
    setSending(true);

    try {
      const response = await askAssistant({
        message: text,
        trainingId: context.trainingId,
        lessonId: context.lessonId,
        conversationId: conversationId ?? undefined,
        surface: "WEB",
      });

      setConversationId(response.conversationId);

      setMessages((current) => [
        ...current,
        {
          id: nextId("assistant"),
          role: "assistant",
          content: normalizeAssistantText(response.answer),
        },
      ]);

      void refreshConversations(false);
    } catch (cause) {
      setError(getAssistantErrorMessage(cause));
    } finally {
      setSending(false);
    }
  }

  const shellHeight = standalone
    ? "min(78vh, 790px)"
    : "100%";

  return (
    <Paper
      elevation={standalone ? 0 : 8}
      variant={standalone ? "outlined" : "elevation"}
      sx={{
        height: shellHeight,
        minHeight: standalone ? 620 : 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: standalone ? 3 : 0,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.4,
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          flex: "0 0 auto",
        }}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: "primary.main",
            color: "primary.contrastText",
          }}
        >
          <Sparkles size={19} />
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 900, lineHeight: 1.15 }}>
            Assistant SmartTraining
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
          >
            {context.label}
          </Typography>
        </Box>

        <Tooltip title="Historique">
          <IconButton
            aria-label="Historique des conversations"
            onClick={() => void openHistory()}
            color={historyMode ? "primary" : "default"}
          >
            <History size={19} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Nouvelle conversation">
          <IconButton
            aria-label="Nouvelle conversation"
            onClick={resetConversation}
          >
            <Plus size={20} />
          </IconButton>
        </Tooltip>

        {onToggleSide ? (
          <Tooltip
            title={
              panelSide === "left"
                ? "Déplacer à droite"
                : "Déplacer à gauche"
            }
          >
            <IconButton
              aria-label={
                panelSide === "left"
                  ? "Déplacer l’Assistant à droite"
                  : "Déplacer l’Assistant à gauche"
              }
              onClick={onToggleSide}
            >
              {panelSide === "left" ? (
                <ArrowRight size={19} />
              ) : (
                <ArrowLeft size={19} />
              )}
            </IconButton>
          </Tooltip>
        ) : null}

        {onClose ? (
          <Tooltip title="Fermer">
            <IconButton
              aria-label="Fermer l’Assistant SmartTraining"
              onClick={onClose}
            >
              <X size={20} />
            </IconButton>
          </Tooltip>
        ) : null}
      </Box>

      {historyMode ? (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            p: 1.5,
            bgcolor: "background.default",
          }}
        >
          <Stack spacing={1.25}>
            <Box>
              <Typography sx={{ fontWeight: 900 }}>
                Historique
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Les mêmes conversations sont disponibles sur Web et Mobile.
              </Typography>
            </Box>

            {historyLoading ? (
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  py: 3,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">
                  Chargement…
                </Typography>
              </Stack>
            ) : conversations.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                <Typography sx={{ fontWeight: 800 }}>
                  Aucun historique
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Votre première conversation apparaîtra ici.
                </Typography>
              </Paper>
            ) : (
              conversations.map((conversation) => {
                const confirming =
                  pendingDeleteId === conversation.id;
                const opening = openingId === conversation.id;
                const deleting = deletingId === conversation.id;

                return (
                  <Paper
                    key={conversation.id}
                    variant="outlined"
                    sx={{ p: 1.25, borderRadius: 2.5 }}
                  >
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center" }}
                      >
                        <Button
                          onClick={() =>
                            void openConversation(conversation.id)
                          }
                          disabled={opening || deleting}
                          sx={{
                            minWidth: 0,
                            flex: 1,
                            justifyContent: "flex-start",
                            textAlign: "left",
                            textTransform: "none",
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 800,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {conversation.title}
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={0.5}
                              sx={{
                                mt: 0.3,
                                alignItems: "center",
                                color: "text.secondary",
                              }}
                            >
                              <Clock3 size={13} />
                              <Typography variant="caption">
                                {formatConversationDate(
                                  conversation.updatedAt,
                                )}
                              </Typography>
                            </Stack>
                          </Box>
                        </Button>

                        {opening ? (
                          <CircularProgress size={18} />
                        ) : (
                          <Tooltip title="Supprimer">
                            <IconButton
                              size="small"
                              aria-label={`Supprimer ${conversation.title}`}
                              disabled={deleting}
                              onClick={() =>
                                setPendingDeleteId(conversation.id)
                              }
                            >
                              {deleting ? (
                                <CircularProgress size={16} />
                              ) : (
                                <Trash2 size={17} />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>

                      {confirming ? (
                        <>
                          <Divider />
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 700 }}
                          >
                            Supprimer définitivement cette conversation ?
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ justifyContent: "flex-end" }}
                          >
                            <Button
                              size="small"
                              onClick={() => setPendingDeleteId(null)}
                            >
                              Annuler
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => void confirmDelete()}
                            >
                              Supprimer
                            </Button>
                          </Stack>
                        </>
                      ) : null}
                    </Stack>
                  </Paper>
                );
              })
            )}

            {historyError ? (
              <Alert severity="error">{historyError}</Alert>
            ) : null}
          </Stack>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              px: 1.5,
              py: 1.5,
              bgcolor: "background.default",
            }}
          >
            {initialLoading ? (
              <Stack
                spacing={1}
                sx={{
                  minHeight: 160,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CircularProgress size={22} />
                <Typography variant="body2" color="text.secondary">
                  Chargement de votre conversation…
                </Typography>
              </Stack>
            ) : (
              <Stack spacing={1.25}>
                {messages.map((message) => {
                  const mine = message.role === "user";

                  return (
                    <Box
                      key={message.id}
                      sx={{
                        display: "flex",
                        justifyContent: mine ? "flex-end" : "flex-start",
                      }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          maxWidth: "88%",
                          px: 1.5,
                          py: 1.15,
                          borderRadius: mine
                            ? "16px 16px 4px 16px"
                            : "16px 16px 16px 4px",
                          bgcolor: mine
                            ? "primary.main"
                            : "background.paper",
                          color: mine
                            ? "primary.contrastText"
                            : "text.primary",
                          border: mine ? 0 : 1,
                          borderColor: "divider",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                            lineHeight: 1.6,
                          }}
                        >
                          {message.content}
                        </Typography>
                      </Paper>
                    </Box>
                  );
                })}

                {messages.length === 1 ? (
                  <Stack spacing={0.75}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 800 }}
                    >
                      Suggestions
                    </Typography>
                    {starters.map((starter) => (
                      <Button
                        key={starter}
                        size="small"
                        variant="outlined"
                        disabled={sending}
                        onClick={() => void sendMessage(starter)}
                        sx={{
                          justifyContent: "flex-start",
                          textAlign: "left",
                          textTransform: "none",
                        }}
                      >
                        {starter}
                      </Button>
                    ))}
                  </Stack>
                ) : null}

                {sending ? (
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <CircularProgress size={17} />
                    <Typography variant="body2" color="text.secondary">
                      Je prépare la réponse…
                    </Typography>
                  </Stack>
                ) : null}

                {error ? (
                  <Alert severity="error" onClose={() => setError("")}>
                    {error}
                  </Alert>
                ) : null}

                <div ref={endRef} />
              </Stack>
            )}
          </Box>

          <Box
            sx={{
              p: 1.5,
              borderTop: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
              flex: "0 0 auto",
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "flex-end" }}
            >
              <TextField
                fullWidth
                multiline
                minRows={1}
                maxRows={5}
                value={input}
                disabled={sending || initialLoading}
                placeholder="Posez votre question…"
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();

                    if (!sending && input.trim()) {
                      void sendMessage();
                    }
                  }
                }}
                slotProps={{
                  htmlInput: {
                    maxLength: 2000,
                  },
                }}
              />

              <Tooltip title="Envoyer">
                <span>
                  <IconButton
                    color="primary"
                    aria-label="Envoyer le message"
                    disabled={sending || !input.trim()}
                    onClick={() => void sendMessage()}
                    sx={{
                      width: 48,
                      height: 48,
                      border: 1,
                      borderColor: "primary.main",
                    }}
                  >
                    {sending ? (
                      <CircularProgress size={19} color="inherit" />
                    ) : (
                      <Send size={19} />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>

          </Box>
        </>
      )}
    </Paper>
  );
}

export function WebAssistantStandalone() {
  return <AssistantPanel standalone />;
}

type WebAssistantDrawerPanelProps = {
  open: boolean;
  onClose: () => void;
  topOffset: number;
  side?: "left" | "right";
  onSideChange?: (side: "left" | "right") => void;
  desktopLeftOffset?: number;
  trainingId?: number;
  lessonId?: number | null;
  contextLabel?: string;
};

export function WebAssistantDrawerPanel({
  open,
  onClose,
  topOffset,
  side = "right",
  onSideChange,
  desktopLeftOffset = 0,
  trainingId,
  lessonId,
  contextLabel,
}: WebAssistantDrawerPanelProps) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <Drawer
      anchor={compact ? "right" : side}
      variant={compact ? "temporary" : "persistent"}
      open={open}
      onClose={onClose}
      ModalProps={
        compact
          ? {
              keepMounted: true,
            }
          : undefined
      }
      sx={{
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          boxSizing: "border-box",
        },
      }}
      slotProps={{
        paper: {
          sx: {
            width: compact ? "100vw" : 408,
            maxWidth: "100vw",
            top: compact ? 0 : `${topOffset}px`,
            height: compact
              ? "100dvh"
              : `calc(100dvh - ${topOffset}px)`,
            left:
              !compact && side === "left"
                ? `${desktopLeftOffset}px`
                : undefined,
            right:
              !compact && side === "right"
                ? 0
                : undefined,
            overflow: "hidden",
            borderLeft: compact ? 0 : side === "right" ? 1 : 0,
            borderRight: compact ? 0 : side === "left" ? 1 : 0,
            borderColor: "divider",
          },
        },
      }}
    >
      <AssistantPanel
        onClose={onClose}
        panelSide={side}
        onToggleSide={
          !compact && onSideChange
            ? () => onSideChange(side === "left" ? "right" : "left")
            : undefined
        }
        contextOverride={
          trainingId
            ? {
                trainingId,
                lessonId: lessonId ?? undefined,
                label:
                  contextLabel ??
                  (lessonId
                    ? "Contexte : leçon en cours"
                    : "Contexte : formation en cours"),
              }
            : undefined
        }
      />
    </Drawer>
  );
}

import { useLocalSearchParams } from "expo-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import AssistantHistoryModal from "../../components/assistant/AssistantHistoryModal";
import ScreenContainer from "../../components/ScreenContainer";
import {
  askAssistant,
  deleteAssistantConversation,
  getAssistantConversationMessages,
  getAssistantErrorMessage,
  listAssistantConversations,
  type AssistantConversationSummary,
  type AssistantHistoryMessage,
  type AssistantPersistedMessage,
} from "../../features/assistant/assistantService";
import { getConnectedUser } from "../../storage/tokenStorage";
import {
  uxSpacing,
  uxTypography,
} from "../../theme/design-system/uxSemanticTokens";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";

type AssistantRole = "APPRENANT" | "FORMATEUR" | "ADMIN";

type UiMessage = AssistantHistoryMessage & {
  id: string;
  contextUsed?: boolean;
  intro?: boolean;
};

function positiveId(
  value: string | string[] | undefined,
): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

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

function makeIntroMessage(): UiMessage {
  return {
    id: "intro",
    role: "assistant",
    intro: true,
    content:
      "Bonjour ! Je suis l’Assistant SmartTraining. Je peux vous aider sur SmartTraining, vos apprentissages ou répondre à vos questions générales.",
  };
}

function persistedMessagesToUi(
  persisted: AssistantPersistedMessage[],
): UiMessage[] {
  if (persisted.length === 0) {
    return [makeIntroMessage()];
  }

  return persisted.map((message) => ({
    id: `persisted-${message.id}`,
    role: message.role,
    content:
      message.role === "assistant"
        ? normalizeAssistantText(message.content)
        : message.content,
    contextUsed: message.contextUsed,
  }));
}

function starterPrompts(
  role: AssistantRole | null,
  contextual: boolean,
): string[] {
  if (role === "FORMATEUR") {
    return contextual
      ? [
          "Aide-moi à améliorer ce contenu.",
          "Propose 5 questions de révision.",
          "Comment ajouter une ressource ici ?",
        ]
      : [
          "Comment créer une formation ?",
          "Comment importer un SCORM ?",
          "Propose-moi un objectif pédagogique.",
        ];
  }

  if (role === "ADMIN") {
    return contextual
      ? [
          "Quelles actions sont disponibles ici ?",
          "Aide-moi à vérifier cette formation.",
          "Comment gérer les quiz de cette formation ?",
        ]
      : [
          "Comment gérer les utilisateurs ?",
          "Où gérer les catégories de formation ?",
          "Comment affecter une formation ?",
        ];
  }

  if (role === "APPRENANT") {
    return contextual
      ? [
          "Explique-moi cette formation simplement.",
          "Résume les points clés.",
          "Fais-moi réviser avec 5 questions.",
        ]
      : [
          "Que puis-je faire dans SmartTraining ?",
          "Que dois-je poursuivre dans mon apprentissage ?",
          "Où retrouver mes certificats ?",
        ];
  }

  return [
    "Que puis-je faire dans SmartTraining ?",
    "Comment utiliser l’assistant ?",
    "Aide-moi à trouver la bonne rubrique.",
  ];
}

export default function AssistantScreen() {
  const { theme } = useSmartTrainingTheme();
  const {
    width: viewportWidth,
    height: viewportHeight,
  } = useWindowDimensions();
  const compactLandscape =
    viewportWidth > viewportHeight && viewportHeight <= 500;
  const compactComposer =
    compactLandscape || viewportWidth <= 420;

  const params = useLocalSearchParams<{
    trainingId?: string | string[];
    lessonId?: string | string[];
  }>();

  const initialTrainingId = positiveId(params.trainingId);
  const initialLessonId = initialTrainingId
    ? positiveId(params.lessonId)
    : null;

  const [role, setRole] = useState<AssistantRole | null>(null);
  const trainingId = initialTrainingId;
  const lessonId = initialLessonId;
  const [messages, setMessages] = useState<UiMessage[]>([
    makeIntroMessage(),
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] =
    useState<number | null>(null);
  const [conversations, setConversations] = useState<
    AssistantConversationSummary[]
  >([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [openingConversationId, setOpeningConversationId] =
    useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] =
    useState<number | null>(null);
  const [deletingConversationId, setDeletingConversationId] =
    useState<number | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);
  const messageIdRef = useRef(0);
  const contextual = trainingId !== null;


  function nextMessageId(prefix: "user" | "assistant"): string {
    messageIdRef.current += 1;
    return `${prefix}-${messageIdRef.current}`;
  }

  useEffect(() => {
    let active = true;

    void getConnectedUser()
      .then((user) => {
        if (!active || !user) {
          return;
        }

        if (
          user.role === "APPRENANT" ||
          user.role === "FORMATEUR" ||
          user.role === "ADMIN"
        ) {
          setRole(user.role);
        }
      })
      .catch(() => {
        if (active) {
          setRole(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

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
        setMessages(persistedMessagesToUi(persisted));

      } catch {
        if (active) {
          setError(
            "Impossible de restaurer l’historique pour le moment.",
          );
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [initialTrainingId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 60);

    return () => clearTimeout(timer);
  }, [
    messages,
    sending,
    error,
    viewportWidth,
    viewportHeight,
  ]);

  const starters = useMemo(
    () => starterPrompts(role, contextual),
    [contextual, role],
  );

  // ASSISTANT_FINAL_VISUAL_POLISH_V2
  // Context is automatic; keep the informational chip short on narrow phones.
  const contextLabel = lessonId ? "Contexte leçon" : trainingId ? "Contexte formation" : "Contexte général";

  function resetConversation() {
    setConversationId(null);
    setMessages([makeIntroMessage()]);
    setInput("");
    setError("");
    setPendingDeleteId(null);
  }

async function refreshConversations(
    showLoading = true,
  ): Promise<void> {
    if (showLoading) {
      setHistoryLoading(true);
    }
    setHistoryError("");

    try {
      const recent = await listAssistantConversations(30);
      setConversations(recent);
    } catch (cause) {
      setHistoryError(getAssistantErrorMessage(cause));
    } finally {
      if (showLoading) {
        setHistoryLoading(false);
      }
    }
  }

  function openHistory() {
    setHistoryOpen(true);
    setPendingDeleteId(null);
    void refreshConversations();
  }

  async function openConversation(
    selectedConversationId: number,
  ): Promise<void> {
    if (openingConversationId !== null || sending) {
      return;
    }

    setOpeningConversationId(selectedConversationId);
    setHistoryError("");

    try {
      const persisted =
        await getAssistantConversationMessages(
          selectedConversationId,
          100,
        );

      setConversationId(selectedConversationId);
      setMessages(persistedMessagesToUi(persisted));
      setInput("");
      setError("");
      setPendingDeleteId(null);


      setHistoryOpen(false);
    } catch (cause) {
      setHistoryError(getAssistantErrorMessage(cause));
    } finally {
      setOpeningConversationId(null);
    }
  }

  async function confirmDeleteConversation(): Promise<void> {
    if (
      pendingDeleteId === null ||
      deletingConversationId !== null
    ) {
      return;
    }

    const targetId = pendingDeleteId;
    setDeletingConversationId(targetId);
    setHistoryError("");

    try {
      await deleteAssistantConversation(targetId);

      setConversations((current) =>
        current.filter(
          (conversation) => conversation.id !== targetId,
        ),
      );

      if (conversationId === targetId) {
        resetConversation();
      }

      setPendingDeleteId(null);
    } catch (cause) {
      setHistoryError(getAssistantErrorMessage(cause));
    } finally {
      setDeletingConversationId(null);
    }
  }

  async function sendMessage(explicitText?: string) {
    const text = (explicitText ?? input).trim();

    if (!text || sending) {
      return;
    }

    const userMessage: UiMessage = {
      id: nextMessageId("user"),
      role: "user",
      content: text,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError("");
    setSending(true);

    try {
      const response = await askAssistant({
        message: text,
        trainingId: trainingId ?? undefined,
        lessonId: lessonId ?? undefined,
        conversationId: conversationId ?? undefined,
      });

      setConversationId(response.conversationId);
      void refreshConversations(false);

      setMessages((current) => [
        ...current,
        {
          id: nextMessageId("assistant"),
          role: "assistant",
          content: normalizeAssistantText(response.answer),
          contextUsed: response.contextUsed,
        },
      ]);
    } catch (cause) {
      setError(getAssistantErrorMessage(cause));
    } finally {
      setSending(false);
    }
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        enabled={Platform.OS !== "web"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
        style={styles.keyboardRoot}
      >
        <View style={styles.page}>
          <View
            style={[
              styles.topBar,
              compactLandscape ? styles.topBarLandscape : null,
            ]}
          >
            <View
              style={[
                styles.contextChip,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.controlRadius,
                  borderWidth: theme.shape.borderWidth,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.contextLabel,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                {contextLabel}
              </Text>

</View>

            <View style={styles.topBarActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ouvrir l’historique des conversations"
                onPress={openHistory}
                style={({ pressed }) => [
                  styles.resetButton,
                  {
                    backgroundColor: pressed
                      ? theme.colors.surfaceSoft
                      : theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.shape.controlRadius,
                    borderWidth: theme.shape.borderWidth,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.resetLabel,
                    { color: theme.colors.accent },
                  ]}
                >
                  Historique
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Nouvelle conversation"
                onPress={resetConversation}
                style={({ pressed }) => [
                  styles.resetButton,
                  {
                    backgroundColor: pressed
                      ? theme.colors.surfaceSoft
                      : theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.shape.controlRadius,
                    borderWidth: theme.shape.borderWidth,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.resetLabel,
                    { color: theme.colors.accent },
                  ]}
                >
                  Nouvelle
                </Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={[
              styles.messagesContent,
              compactLandscape
                ? styles.messagesContentLandscape
                : null,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => {
              const mine = message.role === "user";

              return (
                <View
                  key={message.id}
                  style={[
                    styles.messageRow,
                    mine ? styles.messageRowMine : null,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      mine
                        ? styles.userBubble
                        : styles.assistantBubble,
                      {
                        backgroundColor: mine
                          ? theme.colors.accent
                          : theme.colors.surfaceSoft,
                        borderColor: mine
                          ? theme.colors.accent
                          : theme.colors.border,
                        borderWidth: theme.shape.borderWidth,
                      },
                    ]}
                  >
                    <Text
                      selectable
                      style={[
                        styles.messageText,
                        {
                          color: mine
                            ? theme.colors.accentForeground
                            : theme.colors.foreground,
                        },
                      ]}
                    >
                      {message.content}
                    </Text>
                  </View>
                </View>
              );
            })}

            {messages.length === 1 ? (
              <View style={styles.starters}>
                <Text
                  style={[
                    styles.startersTitle,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Suggestions
                </Text>

                {starters.map((starter) => (
                  <Pressable
                    key={starter}
                    accessibilityRole="button"
                    disabled={sending}
                    onPress={() => void sendMessage(starter)}
                    style={({ pressed }) => [
                      styles.starter,
                      {
                        backgroundColor: pressed
                          ? theme.colors.surfaceSoft
                          : theme.colors.surface,
                        borderColor: theme.colors.border,
                        borderRadius: theme.shape.controlRadius,
                        borderWidth: theme.shape.borderWidth,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.starterText,
                        { color: theme.colors.foreground },
                      ]}
                    >
                      {starter}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {sending ? (
              <View style={styles.messageRow}>
                <View
                  style={[
                    styles.typingBubble,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.border,
                      borderWidth: theme.shape.borderWidth,
                    },
                  ]}
                >
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.accent}
                  />
                  <Text
                    style={[
                      styles.typingText,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    Je prépare la réponse…
                  </Text>
                </View>
              </View>
            ) : null}

            {error ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.border,
                    borderWidth: theme.shape.borderWidth,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.errorText,
                    { color: theme.colors.foreground },
                  ]}
                >
                  {error}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fermer le message d’erreur"
                  onPress={() => setError("")}
                >
                  <Text
                    style={[
                      styles.errorDismiss,
                      { color: theme.colors.accent },
                    ]}
                  >
                    Fermer
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.composer,
              compactComposer ? styles.composerCompact : null,
              compactLandscape ? styles.composerLandscape : null,
              {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.border,
              },
            ]}
          >
            <TextInput
              accessibilityLabel="Question à l’Assistant SmartTraining"
              value={input}
              editable={!sending}
              multiline
              returnKeyType="send"
              submitBehavior="submit"
              maxLength={2000}
              onChangeText={setInput}
              onSubmitEditing={() => {
                if (!sending && input.trim()) {
                  void sendMessage();
                }
              }}
              onKeyPress={(event) => {
                const keyEvent = event.nativeEvent as typeof event.nativeEvent & {
                  shiftKey?: boolean;
                };
                const shifted =
                  keyEvent.shiftKey ??
                  (event as unknown as { shiftKey?: boolean }).shiftKey ??
                  false;

                if (
                  Platform.OS === "web" &&
                  keyEvent.key === "Enter" &&
                  !shifted
                ) {
                  event.preventDefault();
                  if (!sending && input.trim()) {
                    void sendMessage();
                  }
                }
              }}
              placeholder="Posez votre question…"
              placeholderTextColor={theme.colors.foregroundSubtle}
              style={[
                styles.input,
                compactComposer ? styles.inputCompact : null,
                compactLandscape ? styles.inputLandscape : null,
                {
                  color: theme.colors.foreground,
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.controlRadius,
                  borderWidth: theme.shape.borderWidth,
                },
              ]}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Envoyer la question"
              disabled={sending || !input.trim()}
              onPress={() => void sendMessage()}
              style={({ pressed }) => [
                styles.sendButton,
                compactComposer ? styles.sendButtonCompact : null,
                compactLandscape ? styles.sendButtonLandscape : null,
                {
                  opacity:
                    sending || !input.trim()
                      ? 0.45
                      : pressed
                        ? 0.78
                        : 1,
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.shape.controlRadius,
                },
              ]}
            >
              {sending ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.accentForeground}
                />
              ) : (
                <Text
                  style={[
                    styles.sendLabel,
                    { color: theme.colors.accentForeground },
                  ]}
                >
                  Envoyer
                </Text>
              )}
            </Pressable>
          </View>

          <AssistantHistoryModal
            visible={historyOpen}
            conversations={conversations}
            loading={historyLoading}
            error={historyError}
            openingId={openingConversationId}
            deletingId={deletingConversationId}
            pendingDeleteId={pendingDeleteId}
            onClose={() => {
              setHistoryOpen(false);
              setPendingDeleteId(null);
            }}
            onSelect={(selectedConversationId) => {
              void openConversation(selectedConversationId);
            }}
            onAskDelete={setPendingDeleteId}
            onCancelDelete={() => setPendingDeleteId(null)}
            onConfirmDelete={() => {
              void confirmDeleteConversation();
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
    minHeight: 0,
  },
  page: {
    flex: 1,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    minHeight: 0,
  },
  topBar: {
    minHeight: 48,
    paddingBottom: uxSpacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: uxSpacing.sm,
  },
  topBarLandscape: {
    minHeight: 40,
    paddingBottom: uxSpacing.xs,
    gap: uxSpacing.xs,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: uxSpacing.xs,
    flexShrink: 0,
  },
  contextChip: {
    minHeight: 36,
    flex: 1,
    minWidth: 0,
    paddingLeft: uxSpacing.sm + 2,
    flexDirection: "row",
    alignItems: "center",
  },
  contextLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: uxTypography.caption,
    fontWeight: "700",
  },
  contextClear: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  contextClearText: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "500",
  },
  resetButton: {
    minHeight: 36,
    paddingHorizontal: uxSpacing.sm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  resetLabel: {
    fontSize: uxTypography.caption,
    fontWeight: "900",
  },
  messages: {
    flex: 1,
    minHeight: 0,
  },
  messagesContent: {
    flexGrow: 1,
    paddingVertical: uxSpacing.sm,
    gap: uxSpacing.md,
  },
  messagesContentLandscape: {
    paddingVertical: uxSpacing.xs,
    gap: uxSpacing.sm,
  },
  messageRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  messageRowMine: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "88%",
    paddingHorizontal: uxSpacing.md,
    paddingVertical: uxSpacing.sm + 2,
  },
  userBubble: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 5,
  },
  assistantBubble: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 18,
  },
  messageText: {
    fontSize: uxTypography.body,
    lineHeight: 21,
  },
  contextUsed: {
    marginTop: uxSpacing.sm,
    fontSize: uxTypography.caption,
  },
  starters: {
    gap: uxSpacing.sm,
    marginTop: uxSpacing.xs,
  },
  startersTitle: {
    fontSize: uxTypography.caption,
    fontWeight: "800",
  },
  starter: {
    minHeight: 44,
    paddingHorizontal: uxSpacing.md,
    paddingVertical: uxSpacing.sm,
    justifyContent: "center",
  },
  starterText: {
    fontSize: uxTypography.caption,
    lineHeight: 18,
    fontWeight: "700",
  },
  typingBubble: {
    minHeight: 44,
    paddingHorizontal: uxSpacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: uxSpacing.sm,
    borderRadius: 18,
  },
  typingText: {
    fontSize: uxTypography.caption,
  },
  errorBox: {
    padding: uxSpacing.md,
    gap: uxSpacing.sm,
    borderRadius: 12,
  },
  errorText: {
    fontSize: uxTypography.caption,
    lineHeight: 18,
  },
  errorDismiss: {
    fontSize: uxTypography.caption,
    fontWeight: "900",
  },
  composer: {
    width: "100%",
    minWidth: 0,
    flexShrink: 0,
    paddingTop: uxSpacing.sm,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: uxSpacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerCompact: {
    gap: uxSpacing.xs,
    paddingTop: uxSpacing.xs,
    paddingBottom: uxSpacing.xs,
    alignItems: "center",
  },
  composerLandscape: {
    maxWidth: 600,
    alignSelf: "center",
    alignItems: "center",
    paddingHorizontal: uxSpacing.sm,
    paddingBottom: uxSpacing.xs,
  },
  input: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 46,
    maxHeight: 112,
    paddingHorizontal: uxSpacing.md,
    paddingVertical: uxSpacing.sm + 2,
    fontSize: uxTypography.body,
    textAlignVertical: "top",
  },
  inputCompact: {
    minHeight: 46,
    maxHeight: 84,
    paddingHorizontal: uxSpacing.sm + 2,
    paddingVertical: uxSpacing.sm,
  },
  inputLandscape: {
    minHeight: 46,
    maxHeight: 72,
    paddingVertical: uxSpacing.sm,
  },
  sendButton: {
    flexShrink: 0,
    minWidth: 78,
    minHeight: 46,
    paddingHorizontal: uxSpacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonCompact: {
    width: 82,
    minWidth: 82,
    height: 46,
    minHeight: 46,
    alignSelf: "center",
    paddingHorizontal: uxSpacing.sm,
  },
  sendButtonLandscape: {
    width: 82,
    minWidth: 82,
    height: 46,
    minHeight: 46,
    alignSelf: "center",
    paddingHorizontal: uxSpacing.sm,
  },
  sendLabel: {
    fontSize: uxTypography.caption,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.7,
  },
});

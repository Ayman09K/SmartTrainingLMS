/* eslint-disable react-hooks/set-state-in-effect */
import { useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
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
  const stackActions = viewportWidth < 340;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const params = useLocalSearchParams<{
    trainingId?: string | string[];
    lessonId?: string | string[];
  }>();

  const initialTrainingId = positiveId(params.trainingId);
  const initialLessonId = initialTrainingId
    ? positiveId(params.lessonId)
    : null;

  const [role, setRole] = useState<AssistantRole | null>(null);
  const [trainingId, setTrainingId] =
    useState<number | null>(initialTrainingId);
  const [lessonId, setLessonId] =
    useState<number | null>(initialLessonId);
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
  const windowHeightBeforeKeyboardRef = useRef(viewportHeight);
  const contextual = trainingId !== null;

  useEffect(() => {
    if (!keyboardVisible) {
      windowHeightBeforeKeyboardRef.current = viewportHeight;
    }
  }, [keyboardVisible, viewportHeight]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(
      showEvent,
      (event) => {
        setKeyboardVisible(true);

        if (Platform.OS === "android") {
          const keyboardHeight = event.endCoordinates.height;
          const beforeHeight = windowHeightBeforeKeyboardRef.current;

          setTimeout(() => {
            const currentHeight = Dimensions.get("window").height;
            const nativeResize = Math.max(
              0,
              beforeHeight - currentHeight,
            );

            setKeyboardInset(
              Math.max(0, keyboardHeight - nativeResize),
            );

            scrollRef.current?.scrollToEnd({ animated: true });
          }, 80);

          setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
          }, 240);
        } else {
          setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      },
    );

    const hideSubscription = Keyboard.addListener(
      hideEvent,
      () => {
        setKeyboardVisible(false);
        setKeyboardInset(0);
      },
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    setTrainingId(initialTrainingId);
    setLessonId(initialLessonId);
  }, [initialLessonId, initialTrainingId]);

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
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={styles.screen}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        enabled={Platform.OS === "ios"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
        style={styles.keyboardRoot}
      >
        <View style={styles.page}>
          {!keyboardVisible ? (
            <>
              {/* Compact premium hero */}
              <View style={styles.hero}>
                <View style={styles.heroDecorOne} />
                <View style={styles.heroDecorTwo} />

                <View style={styles.heroIcon}>
                  <SymbolView
                    name={{
                      ios: "sparkles",
                      android: "auto_awesome",
                      web: "auto_awesome",
                    }}
                    tintColor="#FFFFFF"
                    size={20}
                    weight="bold"
                  />
                </View>

                <View style={styles.heroCopy}>
                  <Text
                    maxFontSizeMultiplier={1.15}
                    style={styles.heroTitle}
                  >
                    Assistant IA
                  </Text>
                  <Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.15}
                    style={styles.heroSubtitle}
                  >
                    Votre copilote pour la formation
                  </Text>

                  <View style={styles.onlinePill}>
                    <View style={styles.onlineDot} />
                    <Text
                      maxFontSizeMultiplier={1.15}
                      style={styles.onlineText}
                    >
                      Disponible
                    </Text>
                  </View>
                </View>
              </View>

              {/* Guaranteed visible actions: visual container is a View */}
              <View
                style={[
                  styles.actionsRow,
                  stackActions ? styles.actionsStack : null,
                ]}
              >
                <View
                  style={[
                    styles.actionVisual,
                    styles.historyVisual,
                    stackActions ? styles.actionVisualStacked : null,
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ouvrir l’historique des conversations"
                    onPress={openHistory}
                    android_ripple={{ color: "transparent" }}
                    style={styles.actionPressable}
                  >
                    <View style={styles.historyIcon}>
                      <SymbolView
                        name={{
                          ios: "clock.arrow.circlepath",
                          android: "history",
                          web: "history",
                        }}
                        tintColor="#7C3AED"
                        size={17}
                        weight="bold"
                      />
                    </View>

                    <View style={styles.actionCopy}>
                      <Text
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.15}
                        style={styles.historyTitle}
                      >
                        Historique
                      </Text>
                      <Text
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.15}
                        style={styles.historySubtitle}
                      >
                        Voir mes conversations
                      </Text>
                    </View>

                    <SymbolView
                      name={{
                        ios: "chevron.right",
                        android: "chevron_right",
                        web: "chevron_right",
                      }}
                      tintColor="#667085"
                      size={12}
                      weight="bold"
                    />
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.actionVisual,
                    styles.newVisual,
                    stackActions ? styles.actionVisualStacked : null,
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Nouvelle conversation"
                    onPress={resetConversation}
                    android_ripple={{ color: "transparent" }}
                    style={styles.actionPressable}
                  >
                    <View style={styles.newIcon}>
                      <SymbolView
                        name={{
                          ios: "plus",
                          android: "add",
                          web: "add",
                        }}
                        tintColor="#7C3AED"
                        size={15}
                        weight="bold"
                      />
                    </View>

                    <Text
                      numberOfLines={2}
                      maxFontSizeMultiplier={1.15}
                      style={styles.newText}
                    >
                      Nouvelle conversation
                    </Text>

                    <SymbolView
                      name={{
                        ios: "chevron.right",
                        android: "chevron_right",
                        web: "chevron_right",
                      }}
                      tintColor="#FFFFFF"
                      size={12}
                      weight="bold"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Le contexte n'est affiché que lorsqu'il apporte une vraie information :
                  formation ou leçon ouverte. En mode général, on évite une carte redondante. */}
              {contextual ? (
                <View style={styles.contextCard}>
                  <View style={styles.contextIcon}>
                    <SymbolView
                      name={{
                        ios: lessonId
                          ? "doc.text.fill"
                          : "graduationcap.fill",
                        android: lessonId
                          ? "description"
                          : "school",
                        web: lessonId
                          ? "description"
                          : "school",
                      }}
                      tintColor="#7C3AED"
                      size={16}
                      weight="bold"
                    />
                  </View>

                  <View style={styles.contextCopy}>
                    <Text
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.15}
                      style={styles.contextTitle}
                    >
                      {lessonId
                        ? "Contexte : leçon active"
                        : "Contexte : formation active"}
                    </Text>
                    <Text
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.15}
                      style={styles.contextDescription}
                    >
                      L’IA utilise les informations de cet écran pour préciser sa réponse.
                    </Text>
                  </View>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.keyboardContextBar}>
              <View style={styles.keyboardContextIcon}>
                <SymbolView
                  name={{
                    ios: "sparkles",
                    android: "auto_awesome",
                    web: "auto_awesome",
                  }}
                  tintColor="#7C3AED"
                  size={13}
                  weight="bold"
                />
              </View>
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.15}
                style={styles.keyboardContextText}
              >
                {contextLabel}
              </Text>
            </View>
          )}

          {/* Conversation occupies remaining space */}
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={[
              styles.messagesContent,
              compactLandscape ? styles.messagesContentLandscape : null,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              if (sending || keyboardVisible) {
                scrollRef.current?.scrollToEnd({ animated: true });
              }
            }}
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
                  {!mine ? (
                    <View style={styles.avatar}>
                      <SymbolView
                        name={{
                          ios: "sparkles",
                          android: "auto_awesome",
                          web: "auto_awesome",
                        }}
                        tintColor="#7C3AED"
                        size={13}
                        weight="bold"
                      />
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.messageColumn,
                      mine ? styles.messageColumnMine : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        mine ? styles.userBubble : styles.aiBubble,
                      ]}
                    >
                      <Text
                        selectable
                        maxFontSizeMultiplier={1.3}
                        style={[
                          styles.messageText,
                          mine ? styles.userText : styles.aiText,
                        ]}
                      >
                        {message.content}
                      </Text>
                    </View>

                    {!mine && contextual && message.contextUsed ? (
                      <View style={styles.contextUsed}>
                        <SymbolView
                          name={{
                            ios: "checkmark.circle.fill",
                            android: "check_circle",
                            web: "check_circle",
                          }}
                          tintColor="#16A36A"
                          size={11}
                          weight="bold"
                        />
                        <Text
                          maxFontSizeMultiplier={1.15}
                          style={styles.contextUsedText}
                        >
                          Contexte SmartTraining utilisé
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}

            {messages.length === 1 && !keyboardVisible ? (
              <View style={styles.suggestionsSection}>
                <View style={styles.suggestionsHeader}>
                  <Text
                    maxFontSizeMultiplier={1.15}
                    style={styles.suggestionsTitle}
                  >
                    Suggestions
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionsRow}
                >
                  {starters.map((starter, index) => {
                    const variant =
                      index % 3 === 0
                        ? "violet"
                        : index % 3 === 1
                          ? "blue"
                          : "green";

                    return (
                      <View
                        key={starter}
                        style={[
                          styles.suggestionVisual,
                          variant === "violet"
                            ? styles.suggestionViolet
                            : variant === "blue"
                              ? styles.suggestionBlue
                              : styles.suggestionGreen,
                        ]}
                      >
                        <Pressable
                          accessibilityRole="button"
                          disabled={sending}
                          onPress={() => void sendMessage(starter)}
                          android_ripple={{ color: "transparent" }}
                          style={styles.suggestionPressable}
                        >
                          <View
                            style={[
                              styles.suggestionIcon,
                              variant === "violet"
                                ? styles.suggestionIconViolet
                                : variant === "blue"
                                  ? styles.suggestionIconBlue
                                  : styles.suggestionIconGreen,
                            ]}
                          >
                            <SymbolView
                              name={{
                                ios:
                                  index % 3 === 0
                                    ? "wand.and.stars"
                                    : index % 3 === 1
                                      ? "doc.text.fill"
                                      : "graduationcap.fill",
                                android:
                                  index % 3 === 0
                                    ? "auto_fix_high"
                                    : index % 3 === 1
                                      ? "description"
                                      : "school",
                                web:
                                  index % 3 === 0
                                    ? "auto_fix_high"
                                    : index % 3 === 1
                                      ? "description"
                                      : "school",
                              }}
                              tintColor={
                                variant === "violet"
                                  ? "#7C3AED"
                                  : variant === "blue"
                                    ? "#2677D6"
                                    : "#16A36A"
                              }
                              size={14}
                              weight="bold"
                            />
                          </View>

                          <Text
                            numberOfLines={3}
                            maxFontSizeMultiplier={1.15}
                            style={styles.suggestionText}
                          >
                            {starter}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {sending ? (
              <View style={styles.messageRow}>
                <View style={styles.avatar}>
                  <SymbolView
                    name={{
                      ios: "sparkles",
                      android: "auto_awesome",
                      web: "auto_awesome",
                    }}
                    tintColor="#7C3AED"
                    size={13}
                    weight="bold"
                  />
                </View>

                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color="#7C3AED" />
                  <Text
                    maxFontSizeMultiplier={1.15}
                    style={styles.typingText}
                  >
                    L’assistant prépare sa réponse…
                  </Text>
                </View>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <SymbolView
                  name={{
                    ios: "exclamationmark.triangle.fill",
                    android: "warning",
                    web: "warning",
                  }}
                  tintColor="#DC2626"
                  size={14}
                  weight="bold"
                />

                <Text
                  maxFontSizeMultiplier={1.2}
                  style={styles.errorText}
                >
                  {error}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fermer le message d’erreur"
                  onPress={() => setError("")}
                  android_ripple={{ color: "transparent" }}
                  style={styles.closeError}
                >
                  <SymbolView
                    name={{
                      ios: "xmark",
                      android: "close",
                      web: "close",
                    }}
                    tintColor="#7C3AED"
                    size={11}
                    weight="bold"
                  />
                </Pressable>
              </View>
            ) : null}
          </ScrollView>

          {/* Composer is a normal flex sibling.
              Android already uses softwareKeyboardLayoutMode=resize. */}
          <View
            style={[
              styles.composerShell,
              Platform.OS === "android" && keyboardInset > 0
                ? { marginBottom: keyboardInset }
                : null,
            ]}
          >
            <View style={styles.inputShell}>
              <View style={styles.inputIcon}>
                <SymbolView
                  name={{
                    ios: "sparkles",
                    android: "auto_awesome",
                    web: "auto_awesome",
                  }}
                  tintColor="#7C3AED"
                  size={14}
                  weight="bold"
                />
              </View>

              <TextInput
                accessibilityLabel="Question à l’Assistant SmartTraining"
                value={input}
                editable={!sending}
                multiline
                returnKeyType="send"
                submitBehavior="submit"
                maxLength={2000}
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }}
                onChangeText={setInput}
                onSubmitEditing={() => {
                  if (!sending && input.trim()) {
                    void sendMessage();
                  }
                }}
                onKeyPress={(event) => {
                  const keyEvent =
                    event.nativeEvent as typeof event.nativeEvent & {
                      shiftKey?: boolean;
                    };
                  const shifted =
                    keyEvent.shiftKey ??
                    (
                      event as unknown as {
                        shiftKey?: boolean;
                      }
                    ).shiftKey ??
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
                placeholder="Écrivez votre message..."
                placeholderTextColor={theme.dark ? "#667085" : theme.colors.foregroundSubtle}
                maxFontSizeMultiplier={1.2}
                style={[
                  styles.input,
                  compactComposer ? styles.inputCompact : null,
                  { color: theme.dark ? "#111827" : theme.colors.foreground },
                ]}
              />
            </View>

            <View style={styles.sendVisual}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Envoyer la question"
                disabled={sending || !input.trim()}
                onPress={() => void sendMessage()}
                android_ripple={{ color: "transparent" }}
                style={[
                  styles.sendPressable,
                  sending || !input.trim()
                    ? styles.sendDisabled
                    : null,
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <SymbolView
                    name={{
                      ios: "paperplane.fill",
                      android: "send",
                      web: "send",
                    }}
                    tintColor="#FFFFFF"
                    size={18}
                    weight="bold"
                  />
                )}
              </Pressable>
            </View>
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
  screen: {
    padding: 0,
    backgroundColor: "#F8F6F3",
  },
  keyboardRoot: {
    flex: 1,
    minHeight: 0,
  },
  page: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "#F8F6F3",
  },

  hero: {
    minHeight: 82,
    overflow: "hidden",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5D6F8",
    backgroundColor: "#F0E6FF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  heroDecorOne: {
    position: "absolute",
    width: 112,
    height: 112,
    borderRadius: 56,
    right: -28,
    top: -52,
    backgroundColor: "#DCC6FF",
    opacity: 0.58,
  },
  heroDecorTwo: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    right: 43,
    top: -20,
    backgroundColor: "#C8A6FF",
    opacity: 0.35,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 7,
    elevation: 2,
    flexShrink: 0,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },
  heroTitle: {
    color: "#5B2DC4",
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "900",
  },
  heroSubtitle: {
    marginTop: 1,
    color: "#433754",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  onlinePill: {
    alignSelf: "flex-start",
    marginTop: 5,
    minHeight: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
    backgroundColor: "#22C55E",
  },
  onlineText: {
    color: "#147A50",
    fontSize: 10,
    fontWeight: "900",
  },

  actionsRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  actionsStack: {
    flexDirection: "column",
  },
  actionVisual: {
    flex: 1,
    minWidth: 0,
    minHeight: 62,
    borderRadius: 16,
    overflow: "hidden",
  },
  actionVisualStacked: {
    width: "100%",
  },
  historyVisual: {
    borderWidth: 1,
    borderColor: "#E4DFE8",
    backgroundColor: "#FFFFFF",
  },
  newVisual: {
    borderWidth: 1,
    borderColor: "#7C3AED",
    backgroundColor: "#7C3AED",
  },
  actionPressable: {
    flex: 1,
    minHeight: 62,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  historyIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: "#F1E9FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
    marginRight: 4,
  },
  historyTitle: {
    color: "#111827",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  historySubtitle: {
    marginTop: 1,
    color: "#667085",
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "600",
  },
  newIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 7,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  newText: {
    flex: 1,
    minWidth: 0,
    marginRight: 4,
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
  },

  contextCard: {
    minHeight: 56,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4DFE8",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },
  contextIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    marginRight: 9,
    backgroundColor: "#F1E9FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  contextCopy: {
    flex: 1,
    minWidth: 0,
  },
  contextTitle: {
    color: "#111827",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  contextDescription: {
    marginTop: 1,
    color: "#667085",
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "600",
  },

  keyboardContextBar: {
    minHeight: 36,
    marginBottom: 6,
    paddingHorizontal: 9,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E4DFE8",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },
  keyboardContextIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    marginRight: 7,
    backgroundColor: "#F1E9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  keyboardContextText: {
    flex: 1,
    minWidth: 0,
    color: "#667085",
    fontSize: 10,
    fontWeight: "800",
  },

  messages: {
    flex: 1,
    minHeight: 0,
    marginTop: 8,
  },
  messagesContent: {
    flexGrow: 1,
    paddingBottom: 10,
    gap: 10,
  },
  messagesContentLandscape: {
    gap: 7,
    paddingBottom: 7,
  },
  messageRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  messageRowMine: {
    justifyContent: "flex-end",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    marginTop: 2,
    marginRight: 6,
    backgroundColor: "#F1E9FF",
    borderWidth: 1,
    borderColor: "#E1D3F5",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  messageColumn: {
    maxWidth: "86%",
    minWidth: 0,
    alignItems: "flex-start",
  },
  messageColumnMine: {
    maxWidth: "86%",
    alignItems: "flex-end",
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  aiBubble: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E4DFE8",
    borderTopLeftRadius: 5,
    borderTopRightRadius: 17,
    borderBottomLeftRadius: 17,
    borderBottomRightRadius: 17,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    borderBottomLeftRadius: 17,
    borderBottomRightRadius: 5,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  aiText: {
    color: "#111827",
  },
  userText: {
    color: "#FFFFFF",
  },
  contextUsed: {
    marginTop: 5,
    minHeight: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "#EAF8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  contextUsedText: {
    color: "#137A51",
    fontSize: 9,
    fontWeight: "800",
  },

  suggestionsSection: {
    marginTop: 2,
  },
  suggestionsHeader: {
    marginBottom: 6,
  },
  suggestionsTitle: {
    color: "#111827",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
  },
  suggestionsRow: {
    paddingRight: 8,
    gap: 7,
  },
  suggestionVisual: {
    width: 148,
    minHeight: 76,
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1,
  },
  suggestionViolet: {
    backgroundColor: "#F1E9FF",
    borderColor: "#E4D7F8",
  },
  suggestionBlue: {
    backgroundColor: "#EAF4FF",
    borderColor: "#D9EAFB",
  },
  suggestionGreen: {
    backgroundColor: "#E8F8EF",
    borderColor: "#D7EEDD",
  },
  suggestionPressable: {
    flex: 1,
    padding: 9,
  },
  suggestionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionIconViolet: {},
  suggestionIconBlue: {},
  suggestionIconGreen: {},
  suggestionText: {
    color: "#344054",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
  },

  typingBubble: {
    minHeight: 40,
    paddingHorizontal: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4DFE8",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  typingText: {
    color: "#667085",
    fontSize: 10,
    fontWeight: "700",
  },

  errorBox: {
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0CCCC",
    backgroundColor: "#FFF5F5",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  errorText: {
    flex: 1,
    minWidth: 0,
    color: "#8E2525",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
  },
  closeError: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F3EEFF",
    alignItems: "center",
    justifyContent: "center",
  },

  composerShell: {
    flexShrink: 0,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E3DEE7",
    backgroundColor: "#FBF9F7",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputShell: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    maxHeight: 96,
    paddingLeft: 7,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#DCD6E0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIcon: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: "#F1E9FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    maxHeight: 94,
    paddingHorizontal: 9,
    paddingVertical: 11,
    fontSize: 13,
    lineHeight: 18,
    textAlignVertical: "top",
  },
  inputCompact: {
    minHeight: 46,
    maxHeight: 78,
  },
  sendVisual: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#7C3AED",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 7,
    elevation: 2,
    flexShrink: 0,
  },
  sendPressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.35,
  },
});

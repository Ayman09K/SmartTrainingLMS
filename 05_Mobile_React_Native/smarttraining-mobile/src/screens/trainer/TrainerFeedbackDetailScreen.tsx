import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  getTrainerFeedbackDetail,
  markTrainerFeedbackInProgress,
  resolveTrainerFeedback,
} from "../../features/trainer/trainerFeedbackReviewService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerFeedback,
  TrainerFeedbackListItem,
} from "../../types/trainerFeedbackReviewMobile";

type Props = {
  trainerId: number;
  feedbackId: number;
};

type SymbolName =
  ComponentProps<typeof SymbolView>["name"];

type Tone = {
  color: string;
  soft: string;
  icon: SymbolName;
};

function learnerName(
  item: TrainerFeedbackListItem,
): string {
  const learner = item.learner;

  if (!learner) {
    return "Apprenant";
  }

  return (
    learner.fullName ||
    [learner.firstName, learner.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    learner.email
  );
}

function initials(
  item: TrainerFeedbackListItem,
): string {
  const value = learnerName(item).trim();

  if (!value) {
    return "A";
  }

  const parts = value
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0] ?? ""}${
    parts[parts.length - 1][0] ?? ""
  }`.toUpperCase();
}

function statusLabel(
  value?: string | null,
): string {
  const labels: Record<string, string> = {
    OPEN: "À traiter",
    IN_PROGRESS: "En cours",
    RESOLVED: "Traité",
    CLOSED: "Clôturé",
  };

  return value
    ? labels[value] || "À examiner"
    : "À examiner";
}

function statusTone(
  value?: string | null,
): Tone {
  if (value === "OPEN") {
    return {
      color: "#B45309",
      soft: "#FFF4E5",
      icon: {
        ios: "exclamationmark.circle.fill",
        android: "error",
        web: "error",
      },
    };
  }

  if (value === "IN_PROGRESS") {
    return {
      color: "#2563EB",
      soft: "#EAF3FF",
      icon: {
        ios: "clock.fill",
        android: "schedule",
        web: "schedule",
      },
    };
  }

  if (value === "RESOLVED") {
    return {
      color: "#16845A",
      soft: "#EAFBF3",
      icon: {
        ios: "checkmark.circle.fill",
        android: "check_circle",
        web: "check_circle",
      },
    };
  }

  if (value === "CLOSED") {
    return {
      color: "#667085",
      soft: "#F2F4F7",
      icon: {
        ios: "archivebox.fill",
        android: "archive",
        web: "archive",
      },
    };
  }

  return {
    color: "#7C3AED",
    soft: "#F1E9FF",
    icon: {
      ios: "bubble.left.fill",
      android: "chat",
      web: "chat",
    },
  };
}

function difficultyLabel(
  value?: string | null,
): string {
  const labels: Record<string, string> = {
    VERY_EASY: "Très facile",
    EASY: "Facile",
    NORMAL: "Normal",
    HARD: "Difficile",
    VERY_HARD: "Très difficile",
  };

  return value
    ? labels[value] || "Non renseignée"
    : "Non renseignée";
}

function difficultyTone(
  value?: string | null,
): Tone {
  if (value === "VERY_HARD") {
    return {
      color: "#B42318",
      soft: "#FEECEB",
      icon: {
        ios: "exclamationmark.triangle.fill",
        android: "warning",
        web: "warning",
      },
    };
  }

  if (value === "HARD") {
    return {
      color: "#C2413A",
      soft: "#FFF0F0",
      icon: {
        ios: "gauge.with.dots.needle.67percent",
        android: "speed",
        web: "speed",
      },
    };
  }

  if (value === "NORMAL") {
    return {
      color: "#B45309",
      soft: "#FFF4E5",
      icon: {
        ios: "gauge.with.dots.needle.50percent",
        android: "speed",
        web: "speed",
      },
    };
  }

  if (
    value === "EASY" ||
    value === "VERY_EASY"
  ) {
    return {
      color: "#16845A",
      soft: "#EAFBF3",
      icon: {
        ios: "checkmark.circle.fill",
        android: "check_circle",
        web: "check_circle",
      },
    };
  }

  return {
    color: "#667085",
    soft: "#F2F4F7",
    icon: {
      ios: "gauge.with.dots.needle.50percent",
      android: "speed",
      web: "speed",
    },
  };
}

function formatDate(
  value?: string | null,
): string {
  if (!value) {
    return "Non disponible";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(parsed);
}

export default function TrainerFeedbackDetailScreen({
  trainerId,
  feedbackId,
}: Props) {
  const { theme } =
    useSmartTrainingTheme();

  const scrollRef =
    useRef<ScrollView | null>(null);
  const responseTopRef = useRef(0);

  const [item, setItem] =
    useState<TrainerFeedbackListItem | null>(
      null,
    );
  const [
    trainerResponse,
    setTrainerResponse,
  ] = useState("");
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [keyboardHeight, setKeyboardHeight] =
    useState(0);
  const [acting, setActing] =
    useState(false);
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");

  async function load() {
    const loaded =
      await getTrainerFeedbackDetail(
        trainerId,
        feedbackId,
      );

    if (!loaded) {
      throw new Error(
        "Feedback hors périmètre.",
      );
    }

    setItem(loaded);

    if (
      loaded.feedback.trainerResponse
    ) {
      setTrainerResponse(
        loaded.feedback.trainerResponse,
      );
    }
  }

  useEffect(() => {
    let active = true;

    void getTrainerFeedbackDetail(
      trainerId,
      feedbackId,
    )
      .then((loaded) => {
        if (!active) {
          return;
        }

        if (!loaded) {
          setError(
            "Feedback introuvable ou hors de votre périmètre.",
          );
          return;
        }

        setItem(loaded);
        setTrainerResponse(
          loaded.feedback
            .trainerResponse ?? "",
        );
        setError("");
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible d’ouvrir ce feedback ou il ne fait pas partie de votre périmètre.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [feedbackId, trainerId]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios"
        ? "keyboardWillShow"
        : "keyboardDidShow";

    const hideEvent =
      Platform.OS === "ios"
        ? "keyboardWillHide"
        : "keyboardDidHide";

    const showSubscription =
      Keyboard.addListener(
        showEvent,
        (event) => {
          setKeyboardHeight(
            event.endCoordinates.height,
          );

          setTimeout(() => {
            scrollRef.current?.scrollTo({
              y: Math.max(
                0,
                responseTopRef.current - 150,
              ),
              animated: true,
            });
          }, 80);

          setTimeout(() => {
            scrollRef.current?.scrollTo({
              y: Math.max(
                0,
                responseTopRef.current - 150,
              ),
              animated: true,
            });
          }, 260);
        },
      );

    const hideSubscription =
      Keyboard.addListener(
        hideEvent,
        () => {
          setKeyboardHeight(0);
        },
      );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError(
        "Impossible d’actualiser ce feedback.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  function applyUpdatedFeedback(
    updated: TrainerFeedback,
  ) {
    setItem((current) =>
      current
        ? {
            ...current,
            feedback: updated,
          }
        : current,
    );
  }

  async function markInProgress() {
    if (!item || acting) {
      return;
    }

    setActing(true);
    setError("");
    setSuccess("");

    try {
      const updated =
        await markTrainerFeedbackInProgress(
          item.feedback.id,
        );

      applyUpdatedFeedback(updated);
      setSuccess(
        "Le feedback est maintenant pris en charge.",
      );
    } catch {
      setError(
        "La prise en charge n’a pas pu être enregistrée.",
      );
    } finally {
      setActing(false);
    }
  }

  async function resolve() {
    if (!item || acting) {
      return;
    }

    setActing(true);
    setError("");
    setSuccess("");

    try {
      const updated =
        await resolveTrainerFeedback(
          item.feedback.id,
          trainerResponse,
        );

      applyUpdatedFeedback(updated);
      setTrainerResponse(
        updated.trainerResponse ??
          trainerResponse,
      );
      setSuccess(
        "Le feedback a été traité.",
      );
    } catch {
      setError(
        "La résolution du feedback n’a pas pu être enregistrée.",
      );
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <LoadingState message="Ouverture du feedback..." />
    );
  }

  if (!item) {
    return (
      <ScreenContainer>
        <View className="mx-auto w-full max-w-[720px] pt-6">
          <ErrorMessage
            message={
              error ||
              "Feedback indisponible."
            }
            onRetry={() =>
              void refresh()
            }
          />
        </View>
      </ScreenContainer>
    );
  }

  const { feedback } = item;

  const canAct =
    feedback.status === "OPEN" ||
    feedback.status ===
      "IN_PROGRESS";

  const status =
    statusTone(feedback.status);

  const difficulty =
    difficultyTone(
      feedback.difficultyLevel,
    );

  return (
    <ScreenContainer
      edges={[
        "left",
        "right",
        "bottom",
      ]}
      style={{
        padding: 0,
        backgroundColor: "#F8F6F3",
      }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            paddingBottom:
              Platform.OS === "android" &&
              keyboardHeight > 0
                ? keyboardHeight + 24
                : 48,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios"
              ? "interactive"
              : "on-drag"
          }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              void refresh()
            }
            tintColor={
              theme.colors.accent
            }
            colors={[
              theme.colors.accent,
            ]}
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View className="mx-auto w-full max-w-[760px] px-4">
          {/* HERO PREMIUM CLAIR */}
          <View
            className="mt-4 overflow-hidden rounded-[24px] border bg-white"
            style={{
              borderColor: "#E7E2EB",
              shadowColor: "#0F172A",
              shadowOffset: {
                width: 0,
                height: 3,
              },
              shadowOpacity: 0.055,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <View
              className="h-1.5 w-full"
              style={{
                backgroundColor: "#7C3AED",
              }}
            />

            <View className="p-4">
              <View className="flex-row items-start">
                <View
                  className="h-12 w-12 items-center justify-center rounded-[16px]"
                  style={{
                    backgroundColor: "#F1E9FF",
                  }}
                >
                  <Text
                    className="text-[15px] font-black"
                    style={{
                      color: "#7C3AED",
                    }}
                  >
                    {initials(item)}
                  </Text>
                </View>

                <View className="ml-3 min-w-0 flex-1">
                  <Text
                    className="text-[18px] font-black leading-[23px]"
                    style={{
                      color: theme.colors.foreground,
                    }}
                  >
                    {learnerName(item)}
                  </Text>

                  <Text
                    numberOfLines={2}
                    className="mt-1 text-[10px] leading-[15px]"
                    style={{
                      color: theme.colors.foregroundMuted,
                    }}
                  >
                    {item.training?.title ||
                      "Formation suivie"}
                  </Text>
                </View>

                <View
                  className="ml-2 flex-row items-center rounded-full px-2.5 py-1.5"
                  style={{
                    backgroundColor: status.soft,
                  }}
                >
                  <SymbolView
                    name={status.icon}
                    tintColor={status.color}
                    size={10}
                    weight="bold"
                  />

                  <Text
                    className="ml-1.5 text-[9px] font-black"
                    style={{
                      color: status.color,
                    }}
                  >
                    {statusLabel(
                      feedback.status,
                    )}
                  </Text>
                </View>
              </View>

              <View className="mt-4 flex-row gap-2">
                <MiniMeta
                  icon={{
                    ios: "gauge.with.dots.needle.50percent",
                    android: "speed",
                    web: "speed",
                  }}
                  label="Difficulté"
                  value={difficultyLabel(
                    feedback.difficultyLevel,
                  )}
                  tone={difficulty}
                />

                <MiniMeta
                  icon={{
                    ios: "hand.raised.fill",
                    android: "front_hand",
                    web: "front_hand",
                  }}
                  label="Aide"
                  value={
                    feedback.needHelp
                      ? "Demandée"
                      : "Non demandée"
                  }
                  tone={
                    feedback.needHelp
                      ? {
                          color: "#7C3AED",
                          soft: "#F1E9FF",
                          icon: {
                            ios: "hand.raised.fill",
                            android: "front_hand",
                            web: "front_hand",
                          },
                        }
                      : {
                          color: "#667085",
                          soft: "#F2F4F7",
                          icon: {
                            ios: "minus.circle.fill",
                            android: "remove_circle",
                            web: "remove_circle",
                          },
                        }
                  }
                />
              </View>
            </View>

            <View
              className="flex-row items-center border-t px-4 py-2.5"
              style={{
                borderTopColor: "#EEE9F0",
                backgroundColor: "#FCFBFD",
              }}
            >
              <SymbolView
                name={{
                  ios: "calendar",
                  android: "calendar_today",
                  web: "calendar_today",
                }}
                tintColor={theme.colors.foregroundSubtle}
                size={11}
              />

              <Text
                className="ml-1.5 text-[9px]"
                style={{
                  color: theme.colors.foregroundMuted,
                }}
              >
                Envoyé le{" "}
                {formatDate(
                  feedback.createdAt,
                )}
              </Text>
            </View>
          </View>

          {/* MESSAGE APPRENANT */}
          <View className="mt-5">
            <View className="mb-3 flex-row items-center">
              <View
                className="h-9 w-9 items-center justify-center rounded-[12px]"
                style={{
                  backgroundColor: "#F1E9FF",
                }}
              >
                <SymbolView
                  name={{
                    ios: "bubble.left.fill",
                    android: "chat",
                    web: "chat",
                  }}
                  tintColor="#7C3AED"
                  size={14}
                  weight="bold"
                />
              </View>

              <View className="ml-2.5 min-w-0 flex-1">
                <Text
                  className="text-[8px] font-black uppercase tracking-[0.6px]"
                  style={{
                    color: theme.colors.foregroundSubtle,
                  }}
                >
                  Conversation
                </Text>

                <Text
                  className="mt-0.5 text-[15px] font-black"
                  style={{
                    color: theme.colors.foreground,
                  }}
                >
                  Message apprenant
                </Text>
              </View>
            </View>

            <View
              className="rounded-[20px] border bg-white p-3.5"
              style={{
                borderColor: "#E5DFE8",
                shadowColor: "#0F172A",
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.03,
                shadowRadius: 6,
                elevation: 1,
              }}
            >
              <View className="flex-row items-center">
                <View
                  className="h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: "#EDE7F7",
                  }}
                >
                  <Text
                    className="text-[10px] font-black"
                    style={{
                      color: "#7C3AED",
                    }}
                  >
                    {initials(item)}
                  </Text>
                </View>

                <View className="ml-2.5 min-w-0 flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-[10px] font-black"
                    style={{
                      color: theme.colors.foreground,
                    }}
                  >
                    {learnerName(item)}
                  </Text>

                  <Text
                    className="mt-0.5 text-[8px]"
                    style={{
                      color: theme.colors.foregroundSubtle,
                    }}
                  >
                    {formatDate(feedback.createdAt)}
                  </Text>
                </View>
              </View>

              <View
                className="mt-3 rounded-[15px] px-3.5 py-3"
                style={{
                  backgroundColor: "#F8F6F9",
                }}
              >
                <Text
                  className="text-[12px] leading-[19px]"
                  style={{
                    color: theme.colors.foreground,
                  }}
                >
                  {feedback.message ||
                    "Aucun commentaire ajouté."}
                </Text>
              </View>
            </View>
          </View>

          {/* SUCCESS / ERROR */}
          {success ? (
            <View
              className="mt-4 flex-row items-center rounded-[15px] px-3 py-2.5"
              style={{
                backgroundColor:
                  "#EAFBF3",
              }}
            >
              <SymbolView
                name={{
                  ios: "checkmark.circle.fill",
                  android:
                    "check_circle",
                  web:
                    "check_circle",
                }}
                tintColor="#16845A"
                size={15}
                weight="bold"
              />

              <Text
                className="ml-2 flex-1 text-[10px] font-bold"
                style={{
                  color: "#16845A",
                }}
              >
                {success}
              </Text>
            </View>
          ) : null}

          {error ? (
            <View className="mt-4">
              <ErrorMessage
                message={error}
                onRetry={() =>
                  void refresh()
                }
              />
            </View>
          ) : null}

          {/* RESPONSE COMPOSER */}
          <View
            className="mb-1 mt-5"
            onLayout={(event) => {
              responseTopRef.current =
                event.nativeEvent.layout.y;
            }}
          >
            <View className="mb-3 flex-row items-center">
              <View
                className="h-9 w-9 items-center justify-center rounded-[12px]"
                style={{
                  backgroundColor:
                    "#EAFBF3",
                }}
              >
                <SymbolView
                  name={{
                    ios: "paperplane.fill",
                    android: "send",
                    web: "send",
                  }}
                  tintColor="#16845A"
                  size={14}
                  weight="bold"
                />
              </View>

              <View className="ml-2.5 min-w-0 flex-1">
                <Text
                  className="text-[8px] font-black uppercase tracking-[0.6px]"
                  style={{
                    color:
                      theme.colors
                        .foregroundSubtle,
                  }}
                >
                  Traitement
                </Text>

                <Text
                  className="mt-0.5 text-[15px] font-black"
                  style={{
                    color:
                      theme.colors
                        .foreground,
                  }}
                >
                  Votre réponse
                </Text>
              </View>
            </View>

            {canAct ? (
              <View
                className="overflow-hidden rounded-[22px] border bg-white"
                style={{
                  borderColor:
                    "#E5DFE8",
                  shadowColor:
                    "#0F172A",
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity:
                    0.035,
                  shadowRadius: 7,
                  elevation: 1,
                }}
              >
                <View className="p-3.5">
                  <View className="flex-row items-center">
                    <View
                      className="h-9 w-9 items-center justify-center rounded-full"
                      style={{
                        backgroundColor:
                          "#F1E9FF",
                      }}
                    >
                      <SymbolView
                        name={{
                          ios: "person.crop.circle.fill",
                          android:
                            "person",
                          web:
                            "person",
                        }}
                        tintColor="#7C3AED"
                        size={15}
                        weight="bold"
                      />
                    </View>

                    <View className="ml-2.5 min-w-0 flex-1">
                      <Text
                        className="text-[10px] font-black"
                        style={{
                          color:
                            theme.colors
                              .foreground,
                        }}
                      >
                        Réponse formateur
                      </Text>

                      <Text
                        className="mt-0.5 text-[8px]"
                        style={{
                          color:
                            theme.colors
                              .foregroundMuted,
                        }}
                      >
                        Visible par l’apprenant après traitement
                      </Text>
                    </View>
                  </View>

                  <TextInput
                    value={
                      trainerResponse
                    }
                    onChangeText={
                      setTrainerResponse
                    }
                    onFocus={() => {
                      setTimeout(() => {
                        scrollRef.current?.scrollTo({
                          y: Math.max(
                            0,
                            responseTopRef.current - 150,
                          ),
                          animated: true,
                        });
                      }, 50);
                    }}
                    multiline
                    scrollEnabled
                    textAlignVertical="top"
                    placeholder="Écrire une réponse pédagogique..."
                    placeholderTextColor={
                      theme.colors
                        .foregroundSubtle
                    }
                    className="mt-3 h-[118px] rounded-[17px] border px-3.5 py-3.5 text-[12px] leading-[19px]"
                    style={{
                      backgroundColor:
                        "#F8F6F9",
                      borderColor:
                        "#E9E2ED",
                      color:
                        theme.colors
                          .foreground,
                    }}
                  />
                </View>

                <View
                  className="border-t p-3"
                  style={{
                    borderTopColor:
                      "#EEE9F0",
                    backgroundColor:
                      "#FCFBFD",
                  }}
                >
                  {feedback.status ===
                  "OPEN" ? (
                    <View className="flex-row gap-2.5">
                      <ActionButton
                        title={
                          acting
                            ? "Enregistrement..."
                            : "Prendre en charge"
                        }
                        icon={{
                          ios: "hand.raised.fill",
                          android:
                            "front_hand",
                          web:
                            "front_hand",
                        }}
                        tone="secondary"
                        compact
                        disabled={acting}
                        onPress={() =>
                          void markInProgress()
                        }
                      />

                      <ActionButton
                        title={
                          acting
                            ? "Enregistrement..."
                            : "Traiter"
                        }
                        icon={{
                          ios: "checkmark.circle.fill",
                          android:
                            "check_circle",
                          web:
                            "check_circle",
                        }}
                        tone="primary"
                        compact
                        disabled={acting}
                        onPress={() =>
                          void resolve()
                        }
                      />
                    </View>
                  ) : (
                    <ActionButton
                      title={
                        acting
                          ? "Enregistrement..."
                          : "Répondre et marquer traité"
                      }
                      icon={{
                        ios: "checkmark.circle.fill",
                        android:
                          "check_circle",
                        web:
                          "check_circle",
                      }}
                      tone="primary"
                      disabled={acting}
                      onPress={() =>
                        void resolve()
                      }
                    />
                  )}
                </View>
              </View>
            ) : (
              <View
                className="rounded-[22px] border bg-white p-3.5"
                style={{
                  borderColor:
                    "#E5DFE8",
                }}
              >
                <View className="flex-row items-start">
                  <View
                    className="h-9 w-9 items-center justify-center rounded-full"
                    style={{
                      backgroundColor:
                        "#EAFBF3",
                    }}
                  >
                    <SymbolView
                      name={{
                        ios: "checkmark.circle.fill",
                        android:
                          "check_circle",
                        web:
                          "check_circle",
                      }}
                      tintColor="#16845A"
                      size={15}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-2.5 min-w-0 flex-1">
                    <Text
                      className="text-[10px] font-black"
                      style={{
                        color:
                          theme.colors
                            .foreground,
                      }}
                    >
                      Réponse enregistrée
                    </Text>

                    <Text
                      className="mt-0.5 text-[8px]"
                      style={{
                        color:
                          theme.colors
                            .foregroundMuted,
                      }}
                    >
                      {formatDate(
                        feedback.resolvedAt,
                      )}
                    </Text>
                  </View>
                </View>

                <View
                  className="mt-3 rounded-[18px] rounded-br-[7px] px-3.5 py-3.5"
                  style={{
                    backgroundColor:
                      "#F1E9FF",
                  }}
                >
                  <Text
                    className="text-[12px] leading-[18px]"
                    style={{
                      color:
                        theme.colors
                          .foreground,
                    }}
                  >
                    {feedback.trainerResponse ||
                      "Feedback traité sans réponse écrite."}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );

  function MiniMeta({
    icon,
    label,
    value,
    tone,
  }: {
    icon: SymbolName;
    label: string;
    value: string;
    tone: Tone;
  }) {
    return (
      <View
        className="min-w-0 flex-1 rounded-[14px] border px-3 py-2.5"
        style={{
          backgroundColor: tone.soft,
          borderColor: "#EEE9F0",
        }}
      >
        <View className="flex-row items-center">
          <SymbolView
            name={icon}
            tintColor={tone.color}
            size={10}
            weight="bold"
          />

          <Text
            className="ml-1.5 text-[8px] font-bold"
            style={{
              color: theme.colors.foregroundMuted,
            }}
          >
            {label}
          </Text>
        </View>

        <View className="mt-1.5 flex-row items-center">
          <View
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: tone.color,
            }}
          />

          <Text
            numberOfLines={1}
            className="ml-1.5 min-w-0 flex-1 text-[10px] font-black"
            style={{
              color: tone.color,
            }}
          >
            {value}
          </Text>
        </View>
      </View>
    );
  }

  function ActionButton({
    title,
    icon,
    tone,
    compact = false,
    disabled,
    onPress,
  }: {
    title: string;
    icon: SymbolName;
    tone:
      | "primary"
      | "secondary";
    compact?: boolean;
    disabled: boolean;
    onPress: () => void;
  }) {
    const primary =
      tone === "primary";

    const palette = primary
      ? {
          background:
            theme.colors.accent,
          border:
            theme.colors.accent,
          color:
            theme.colors
              .accentForeground,
        }
      : {
          background: "#FFFFFF",
          border: "#D9C7F8",
          color: "#7C3AED",
        };

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{
          disabled,
        }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{
          color: "transparent",
        }}
        className={`h-[54px] flex-row items-center justify-center rounded-[15px] border px-3 ${
          compact
            ? "min-w-0 flex-1"
            : "w-full"
        }`}
        style={{
          backgroundColor:
            palette.background,
          borderColor:
            palette.border,
          opacity: disabled
            ? 0.55
            : 1,
        }}
      >
        <SymbolView
          name={icon}
          tintColor={palette.color}
          size={15}
          weight="bold"
        />

        <Text
          numberOfLines={1}
          className="ml-2 text-[11px] font-black"
          style={{
            color: palette.color,
          }}
        >
          {title}
        </Text>
      </Pressable>
    );
  }
}

import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import {
  Pressable,
  Text,
  View,
} from "react-native";

import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerFeedbackListItem,
} from "../../types/trainerFeedbackReviewMobile";

type Props = {
  item: TrainerFeedbackListItem;
  onOpen: () => void;
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
        ios: "exclamationmark.bubble.fill",
        android: "feedback",
        web: "feedback",
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
): {
  color: string;
  soft: string;
} {
  if (
    value === "HARD" ||
    value === "VERY_HARD"
  ) {
    return {
      color: "#C2413A",
      soft: "#FFF0F0",
    };
  }

  if (value === "NORMAL") {
    return {
      color: "#B45309",
      soft: "#FFF4E5",
    };
  }

  if (
    value === "EASY" ||
    value === "VERY_EASY"
  ) {
    return {
      color: "#16845A",
      soft: "#EAFBF3",
    };
  }

  return {
    color: "#667085",
    soft: "#F2F4F7",
  };
}

function formatDate(
  value?: string | null,
): string {
  if (!value) {
    return "Date non disponible";
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

export default function TrainerFeedbackCard({
  item,
  onOpen,
}: Props) {
  const { theme } =
    useSmartTrainingTheme();
  const { feedback } = item;

  const status =
    statusTone(feedback.status);
  const difficulty =
    difficultyTone(
      feedback.difficultyLevel,
    );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Examiner le feedback de ${learnerName(
        item,
      )}`}
      onPress={onOpen}
      android_ripple={{
        color: "transparent",
      }}
      className="mb-3 overflow-hidden rounded-[20px] border bg-white"
      style={{
        borderColor: "#E5DFE8",
        shadowColor: "#0F172A",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      <View className="p-3.5">
        <View className="flex-row items-start">
          <View
            className="h-11 w-11 items-center justify-center rounded-[14px]"
            style={{
              backgroundColor:
                status.soft,
            }}
          >
            <SymbolView
              name={status.icon}
              tintColor={status.color}
              size={18}
              weight="bold"
            />
          </View>

          <View className="ml-3 min-w-0 flex-1">
            <View className="flex-row flex-wrap items-center gap-1.5">
              <View
                className="rounded-full px-2 py-1"
                style={{
                  backgroundColor:
                    status.soft,
                }}
              >
                <Text
                  className="text-[8px] font-black"
                  style={{
                    color:
                      status.color,
                  }}
                >
                  {statusLabel(
                    feedback.status,
                  )}
                </Text>
              </View>

              {feedback.needHelp ? (
                <View
                  className="flex-row items-center rounded-full px-2 py-1"
                  style={{
                    backgroundColor:
                      "#F1E9FF",
                  }}
                >
                  <SymbolView
                    name={{
                      ios: "hand.raised.fill",
                      android:
                        "front_hand",
                      web: "front_hand",
                    }}
                    tintColor="#7C3AED"
                    size={8}
                    weight="bold"
                  />

                  <Text
                    className="ml-1 text-[8px] font-black"
                    style={{
                      color:
                        "#7C3AED",
                    }}
                  >
                    Demande d’aide
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              numberOfLines={1}
              className="mt-2 text-[14px] font-black"
              style={{
                color:
                  theme.colors
                    .foreground,
              }}
            >
              {learnerName(item)}
            </Text>

            <Text
              numberOfLines={1}
              className="mt-1 text-[9px]"
              style={{
                color:
                  theme.colors
                    .foregroundMuted,
              }}
            >
              {item.training?.title ||
                "Formation suivie"}
            </Text>
          </View>
        </View>

        <View
          className="mt-3 flex-row items-center rounded-[13px] px-3 py-2.5"
          style={{
            backgroundColor:
              difficulty.soft,
          }}
        >
          <SymbolView
            name={{
              ios: "gauge.with.dots.needle.67percent",
              android: "speed",
              web: "speed",
            }}
            tintColor={
              difficulty.color
            }
            size={13}
            weight="bold"
          />

          <Text
            className="ml-2 text-[9px] font-bold"
            style={{
              color:
                theme.colors
                  .foregroundMuted,
            }}
          >
            Difficulté ressentie
          </Text>

          <Text
            className="ml-auto text-[9px] font-black"
            style={{
              color:
                difficulty.color,
            }}
          >
            {difficultyLabel(
              feedback.difficultyLevel,
            )}
          </Text>
        </View>

        <View
          className="mt-3 rounded-[14px] px-3 py-3"
          style={{
            backgroundColor:
              "#F8F6F9",
          }}
        >
          <Text
            numberOfLines={3}
            className="text-[10px] leading-[16px]"
            style={{
              color:
                theme.colors
                  .foregroundMuted,
            }}
          >
            {feedback.message ||
              "Aucun commentaire ajouté."}
          </Text>
        </View>
      </View>

      <View
        className="flex-row items-center border-t px-3.5 py-2.5"
        style={{
          borderTopColor: "#EEE9F0",
          backgroundColor: "#FCFBFD",
        }}
      >
        <SymbolView
          name={{
            ios: "calendar",
            android:
              "calendar_today",
            web: "calendar_today",
          }}
          tintColor={
            theme.colors
              .foregroundSubtle
          }
          size={11}
        />

        <Text
          className="ml-1.5 flex-1 text-[8px]"
          style={{
            color:
              theme.colors
                .foregroundSubtle,
          }}
        >
          {formatDate(
            feedback.createdAt,
          )}
        </Text>

        <Text
          className="mr-1.5 text-[9px] font-black"
          style={{
            color:
              theme.colors.accent,
          }}
        >
          Examiner
        </Text>

        <SymbolView
          name={{
            ios: "chevron.right",
            android:
              "chevron_right",
            web: "chevron_right",
          }}
          tintColor={
            theme.colors.accent
          }
          size={13}
          weight="bold"
        />
      </View>
    </Pressable>
  );
}

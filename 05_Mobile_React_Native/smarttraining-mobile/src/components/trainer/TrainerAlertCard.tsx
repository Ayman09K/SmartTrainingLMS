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
  TrainerAlertListItem,
} from "../../types/trainerAlertMobile";

type Props = {
  item: TrainerAlertListItem;
  onOpen: () => void;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];

type Visual = {
  color: string;
  soft: string;
  icon: SymbolName;
};

function learnerName(
  item: TrainerAlertListItem,
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
    RESOLVED: "Résolue",
    IGNORED: "Ignorée",
  };

  return value
    ? labels[value] || "À examiner"
    : "À examiner";
}

function statusVisual(
  value?: string | null,
): Visual {
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

  if (value === "IGNORED") {
    return {
      color: "#667085",
      soft: "#F2F4F7",
      icon: {
        ios: "eye.slash.fill",
        android: "visibility_off",
        web: "visibility_off",
      },
    };
  }

  return {
    color: "#7C3AED",
    soft: "#F1E9FF",
    icon: {
      ios: "bell.fill",
      android: "notifications",
      web: "notifications",
    },
  };
}

function severityLabel(
  value?: string | null,
): string {
  const labels: Record<string, string> = {
    LOW: "Faible",
    MEDIUM: "Moyenne",
    HIGH: "Élevée",
  };

  return value
    ? labels[value] || "À examiner"
    : "À examiner";
}

function severityVisual(
  value?: string | null,
): {
  color: string;
  soft: string;
} {
  if (value === "HIGH") {
    return {
      color: "#C2413A",
      soft: "#FFF0F0",
    };
  }

  if (value === "MEDIUM") {
    return {
      color: "#B45309",
      soft: "#FFF4E5",
    };
  }

  if (value === "LOW") {
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

function typeLabel(
  value?: string | null,
): string {
  const labels: Record<string, string> = {
    LOW_PROGRESS: "Progression faible",
    LOW_SCORE: "Score à renforcer",
    INACTIVITY: "Inactivité",
    AI_RISK: "Signal d’accompagnement",
    QUIZ_FAILURE: "Quiz à reprendre",
    LOW_ACTIVITY: "Activité faible",
  };

  return value
    ? labels[value] || "Signal pédagogique"
    : "Signal pédagogique";
}

function typeIcon(
  value?: string | null,
): SymbolName {
  if (value === "LOW_PROGRESS") {
    return {
      ios: "chart.line.downtrend.xyaxis",
      android: "trending_down",
      web: "trending_down",
    };
  }

  if (value === "LOW_SCORE") {
    return {
      ios: "chart.bar.fill",
      android: "bar_chart",
      web: "bar_chart",
    };
  }

  if (value === "INACTIVITY") {
    return {
      ios: "clock.badge.exclamationmark.fill",
      android: "schedule",
      web: "schedule",
    };
  }

  if (value === "AI_RISK") {
    return {
      ios: "sparkles",
      android: "auto_awesome",
      web: "auto_awesome",
    };
  }

  if (value === "QUIZ_FAILURE") {
    return {
      ios: "questionmark.circle.fill",
      android: "quiz",
      web: "quiz",
    };
  }

  if (value === "LOW_ACTIVITY") {
    return {
      ios: "waveform.path.ecg",
      android: "monitoring",
      web: "monitoring",
    };
  }

  return {
    ios: "bell.fill",
    android: "notifications",
    web: "notifications",
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

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function TrainerAlertCard({
  item,
  onOpen,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const { alert } = item;

  const status =
    statusVisual(alert.status);
  const severity =
    severityVisual(alert.severity);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Examiner l’alerte ${
        alert.title ||
        typeLabel(alert.alertType)
      }`}
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
              backgroundColor: status.soft,
            }}
          >
            <SymbolView
              name={typeIcon(alert.alertType)}
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
                  backgroundColor: status.soft,
                }}
              >
                <Text
                  className="text-[10px] font-black"
                  style={{
                    color: status.color,
                  }}
                >
                  {statusLabel(alert.status)}
                </Text>
              </View>

              <View
                className="rounded-full px-2 py-1"
                style={{
                  backgroundColor: severity.soft,
                }}
              >
                <Text
                  className="text-[10px] font-black"
                  style={{
                    color: severity.color,
                  }}
                >
                  Priorité {severityLabel(
                    alert.severity,
                  ).toLowerCase()}
                </Text>
              </View>
            </View>

            <Text
              numberOfLines={2}
              className="mt-2 text-[15px] font-black leading-[21px]"
              style={{
                color: theme.colors.foreground,
              }}
            >
              {alert.title ||
                typeLabel(alert.alertType)}
            </Text>

            <View className="mt-1.5 flex-row items-center">
              <SymbolView
                name={{
                  ios: "waveform.path.ecg",
                  android: "monitoring",
                  web: "monitoring",
                }}
                tintColor="#7C3AED"
                size={11}
              />

              <Text
                className="ml-1.5 text-[11px] font-extrabold"
                style={{
                  color: "#7C3AED",
                }}
              >
                {typeLabel(alert.alertType)}
              </Text>
            </View>
          </View>
        </View>

        <View
          className="mt-3 rounded-[14px] px-3 py-2.5"
          style={{
            backgroundColor: "#F8F6F9",
          }}
        >
          <View className="flex-row items-center">
            <SymbolView
              name={{
                ios: "person.fill",
                android: "person",
                web: "person",
              }}
              tintColor={
                theme.colors.foregroundSubtle
              }
              size={12}
            />

            <Text
              numberOfLines={1}
              className="ml-2 flex-1 text-[12px] font-black"
              style={{
                color: theme.colors.foreground,
              }}
            >
              {learnerName(item)}
            </Text>
          </View>

          <View className="mt-2 flex-row items-center">
            <SymbolView
              name={{
                ios: "graduationcap.fill",
                android: "school",
                web: "school",
              }}
              tintColor={
                theme.colors.foregroundSubtle
              }
              size={12}
            />

            <Text
              numberOfLines={1}
              className="ml-2 flex-1 text-[11px]"
              style={{
                color:
                  theme.colors.foregroundMuted,
              }}
            >
              {item.training?.title ||
                "Formation suivie"}
            </Text>
          </View>
        </View>

        {alert.message ? (
          <Text
            numberOfLines={2}
            className="mt-3 text-[12px] leading-[18px]"
            style={{
              color:
                theme.colors.foregroundMuted,
            }}
          >
            {alert.message}
          </Text>
        ) : null}
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
            android: "calendar_today",
            web: "calendar_today",
          }}
          tintColor={
            theme.colors.foregroundSubtle
          }
          size={11}
        />

        <Text
          className="ml-1.5 flex-1 text-[10px]"
          style={{
            color:
              theme.colors.foregroundSubtle,
          }}
        >
          {formatDate(alert.createdAt)}
        </Text>

        <Text
          className="mr-1.5 text-[11px] font-black"
          style={{
            color: theme.colors.accent,
          }}
        >
          Examiner
        </Text>

        <SymbolView
          name={{
            ios: "chevron.right",
            android: "chevron_right",
            web: "chevron_right",
          }}
          tintColor={theme.colors.accent}
          size={13}
          weight="bold"
        />
      </View>
    </Pressable>
  );
}

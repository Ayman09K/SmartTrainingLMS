import { SymbolView } from "expo-symbols";
import { type ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";

import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import { RecommendationResponse } from "../../types/analytics";

type Props = {
  recommendation: RecommendationResponse;
  trainingTitle: string;
  busy: boolean;
  onAccept: () => void;
  onComplete: () => void;
  onDismiss: () => void;
  onOpenTraining: () => void;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];

function typePresentation(
  value: string,
): {
  label: string;
  icon: SymbolName;
  tint: string;
  background: string;
} {
  if (value === "REVIEW_LESSON") {
    return {
      label: "Revoir une leçon",
      icon: {
        ios: "book.pages.fill",
        android: "menu_book",
        web: "menu_book",
      },
      tint: "#7C3AED",
      background: "#F3EEFF",
    };
  }

  if (value === "RETAKE_QUIZ") {
    return {
      label: "Refaire une évaluation",
      icon: {
        ios: "checklist",
        android: "fact_check",
        web: "fact_check",
      },
      tint: "#2563EB",
      background: "#EFF6FF",
    };
  }

  if (
    value ===
    "CONSULT_RESOURCE"
  ) {
    return {
      label: "Consulter une ressource",
      icon: {
        ios: "doc.text.fill",
        android: "description",
        web: "description",
      },
      tint: "#0891B2",
      background: "#ECFEFF",
    };
  }

  if (
    value ===
    "CONTACT_TRAINER"
  ) {
    return {
      label: "Contacter le formateur",
      icon: {
        ios: "person.crop.circle.badge.questionmark",
        android: "support_agent",
        web: "support_agent",
      },
      tint: "#D97706",
      background: "#FFF7ED",
    };
  }

  if (
    value ===
    "CONTINUE_TRAINING"
  ) {
    return {
      label: "Continuer la formation",
      icon: {
        ios: "play.circle.fill",
        android: "play_circle",
        web: "play_circle",
      },
      tint: "#16A36A",
      background: "#ECFDF3",
    };
  }

  return {
    label: "Conseil pédagogique",
    icon: {
      ios: "lightbulb.fill",
      android: "lightbulb",
      web: "lightbulb",
    },
    tint: "#7C3AED",
    background: "#F3EEFF",
  };
}

function priorityPresentation(
  value: string,
): {
  label: string;
  tint: string;
  background: string;
} {
  if (value === "HIGH") {
    return {
      label: "Prioritaire",
      tint: "#DC2626",
      background: "#FEF2F2",
    };
  }

  if (value === "MEDIUM") {
    return {
      label: "À faire prochainement",
      tint: "#D97706",
      background: "#FFF7ED",
    };
  }

  return {
    label: "Suggestion",
    tint: "#2563EB",
    background: "#EFF6FF",
  };
}

function statusPresentation(
  value: string,
): {
  label: string;
  tint: string;
  background: string;
} {
  if (value === "ACCEPTED") {
    return {
      label: "En cours",
      tint: "#2563EB",
      background: "#EFF6FF",
    };
  }

  if (value === "COMPLETED") {
    return {
      label: "Terminée",
      tint: "#16A36A",
      background: "#ECFDF3",
    };
  }

  if (value === "DISMISSED") {
    return {
      label: "Ignorée",
      tint: "#667085",
      background: "#F2F4F7",
    };
  }

  return {
    label: "À consulter",
    tint: "#7C3AED",
    background: "#F3EEFF",
  };
}

function sourcePresentation(
  value: string,
): {
  label: string;
  icon: SymbolName;
} {
  if (value === "AI_BASED") {
    return {
      label:
        "Suggestion personnalisée",
      icon: {
        ios: "sparkles",
        android: "auto_awesome",
        web: "auto_awesome",
      },
    };
  }

  if (value === "RULE_BASED") {
    return {
      label:
        "Conseil pédagogique",
      icon: {
        ios: "slider.horizontal.3",
        android: "tune",
        web: "tune",
      },
    };
  }

  if (value === "MANUAL") {
    return {
      label:
        "Conseil du formateur",
      icon: {
        ios: "person.fill",
        android: "person",
        web: "person",
      },
    };
  }

  return {
    label: "Conseil",
    icon: {
      ios: "lightbulb.fill",
      android: "lightbulb",
      web: "lightbulb",
    },
  };
}

function formatDate(
  value?: string,
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
    },
  ).format(date);
}

export default function LearnerRecommendationCard({
  recommendation,
  trainingTitle,
  busy,
  onAccept,
  onComplete,
  onDismiss,
  onOpenTraining,
}: Props) {
  const { theme } =
    useSmartTrainingTheme();

  const priority =
    priorityPresentation(
      recommendation.priority,
    );

  const status =
    statusPresentation(
      recommendation.status,
    );

  const type =
    typePresentation(
      recommendation.recommendationType,
    );

  const source =
    sourcePresentation(
      recommendation.source,
    );

  const createdAt =
    formatDate(
      recommendation.createdAt,
    );

  const active =
    recommendation.status ===
      "PROPOSED" ||
    recommendation.status ===
      "ACCEPTED";

  const mainAction =
    recommendation.status ===
    "PROPOSED"
      ? {
          eyebrow:
            "RECOMMANDATION",
          label:
            "Suivre cette recommandation",
          icon: {
            ios: "checkmark.circle.fill",
            android: "check_circle",
            web: "check_circle",
          } as SymbolName,
          onPress: onAccept,
        }
      : recommendation.status ===
          "ACCEPTED"
        ? {
            eyebrow:
              "ACTION EN COURS",
            label:
              "Marquer comme faite",
            icon: {
              ios: "checkmark.seal.fill",
              android: "task_alt",
              web: "task_alt",
            } as SymbolName,
            onPress: onComplete,
          }
        : null;

  return (
    <View
      className="rounded-[21px] border bg-[#FFFFFF] p-[12px]" style={[{ shadowOpacity: 0.035, shadowRadius: 8, shadowOffset: {
        width: 0,
        height: 3,
      }, elevation: 1 }, {
          borderColor:
            theme.colors.border,
          shadowColor:
            theme.colors.shadow,
        }]}
    >
      <View
        className="flex-row items-center justify-between gap-[8px]"
      >
        <View
          className="min-h-[29px] max-w-[57%] px-[9px] rounded-full flex-row items-center" style={{
              backgroundColor:
                priority.background,
            }}
        >
          <View
            className="w-[6px] h-[6px] mr-[5px] rounded-[3px]" style={{
                backgroundColor:
                  priority.tint,
              }}
          />
          <Text
            className="text-[10px] leading-[13px] font-black" style={{
                color:
                  priority.tint,
              }}
          >
            {priority.label}
          </Text>
        </View>

        <View
          className="min-h-[29px] max-w-[57%] px-[9px] rounded-full flex-row items-center" style={{
              backgroundColor:
                status.background,
            }}
        >
          <Text
            className="text-[10px] leading-[13px] font-black" style={{
                color:
                  status.tint,
              }}
          >
            {status.label}
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={2}
        className="mt-[10px] text-[16px] leading-[21px] font-black tracking-[-0.15px]" style={{
            color:
              theme.colors.foreground,
          }}
      >
        {recommendation.title}
      </Text>

      <View
        className="mt-[7px] flex-row items-center"
      >
        <View
          className="w-[28px] h-[28px] rounded-[9px] mr-[7px] bg-[#F3EEFF] items-center justify-center"
        >
          <SymbolView
            name={{
              ios: "book.closed.fill",
              android: "menu_book",
              web: "menu_book",
            }}
            tintColor="#7C3AED"
            size={12}
            weight="bold"
          />
        </View>

        <Text
          numberOfLines={1}
          className="flex-1 min-w-[0px] text-[#475467] text-[12px] leading-[16px] font-extrabold"
        >
          {trainingTitle}
        </Text>
      </View>

      <View
        className="mt-[10px] flex-row gap-[7px]"
      >
        <DetailItem
          icon={type.icon}
          label="Action suggérée"
          value={type.label}
          tint={type.tint}
          background={
            type.background
          }
        />

        <DetailItem
          icon={source.icon}
          label="Origine"
          value={source.label}
          tint="#7C3AED"
          background="#F3EEFF"
        />
      </View>

      <View
        className="mt-[10px] rounded-[14px] bg-[#F8F6F3] p-[9px] flex-row items-start"
      >
        <View
          className="w-[27px] h-[27px] rounded-[9px] mr-[7px] bg-[#FFFFFF] items-center justify-center"
        >
          <SymbolView
            name={{
              ios: "text.alignleft",
              android: "notes",
              web: "notes",
            }}
            tintColor="#667085"
            size={13}
            weight="bold"
          />
        </View>

        <Text
          className="flex-1 min-w-[0px] text-[12px] leading-[17px]" style={{
              color:
                theme.colors.foregroundMuted,
            }}
        >
          {recommendation.description}
        </Text>
      </View>

      {createdAt ? (
        <View
          className="mt-[7px] flex-row items-center gap-[5px]"
        >
          <SymbolView
            name={{
              ios: "calendar",
              android: "event",
              web: "event",
            }}
            tintColor="#98A2B3"
            size={10}
            weight="bold"
          />

          <Text
            className="text-[#98A2B3] text-[10px] leading-[13px] font-bold"
          >
            Proposée le {createdAt}
          </Text>
        </View>
      ) : null}

      {busy ? (
        <View
          className="mt-[10px] min-h-[48px] rounded-[14px] bg-[#F3EEFF] flex-row items-center justify-center gap-[8px]"
        >
          <ActivityIndicator
            size="small"
            color="#7C3AED"
          />

          <Text
            className="text-[#7C3AED] text-[11px] font-black"
          >
            Mise à jour en cours...
          </Text>
        </View>
      ) : (
        <>
          {mainAction ? (
            <Pressable
              accessibilityRole="button"
              onPress={
                mainAction.onPress
              }
              android_ripple={{
                color:
                  "transparent",
              }}
              className="mt-[10px] min-h-[52px] rounded-[15px] border border-[#7C3AED] bg-[#7C3AED] px-[7px] flex-row items-center"
            >
              <View
                className="w-[36px] h-[36px] rounded-[12px] mr-[9px] bg-[rgba(255,255,255,0.16)] items-center justify-center"
              >
                <SymbolView
                  name={
                    mainAction.icon
                  }
                  tintColor="#FFFFFF"
                  size={13}
                  weight="bold"
                />
              </View>

              <View
                className="flex-1 min-w-[0px]"
              >
                <Text
                  className="text-[rgba(255,255,255,0.78)] text-[9px] leading-[11px] font-black tracking-[0.45px]"
                >
                  {
                    mainAction.eyebrow
                  }
                </Text>

                <Text
                  numberOfLines={1}
                  className="mt-[2px] text-[#FFFFFF] text-[12px] leading-[16px] font-black"
                >
                  {
                    mainAction.label
                  }
                </Text>
              </View>

              <View
                className="w-[30px] h-[30px] rounded-[15px] bg-[rgba(255,255,255,0.16)] items-center justify-center"
              >
                <SymbolView
                  name={{
                    ios: "chevron.right",
                    android: "chevron_right",
                    web: "chevron_right",
                  }}
                  tintColor="#FFFFFF"
                  size={11}
                  weight="bold"
                />
              </View>
            </Pressable>
          ) : null}

          {active ? (
            <View
              className="mt-[8px] flex-row gap-[7px]"
            >
              <SecondaryAction
                label="Ignorer"
                icon={{
                  ios: "xmark",
                  android: "close",
                  web: "close",
                }}
                onPress={
                  onDismiss
                }
              />

              <SecondaryAction
                label="Ouvrir la formation"
                icon={{
                  ios: "arrow.up.right.square.fill",
                  android: "open_in_new",
                  web: "open_in_new",
                }}
                onPress={
                  onOpenTraining
                }
                accent
              />
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={
                onOpenTraining
              }
              android_ripple={{
                color:
                  "transparent",
              }}
              className="mt-[10px] min-h-[52px] rounded-[15px] border border-[#5B21B6] bg-[#5B21B6] px-[7px] flex-row items-center"
            >
              <View
                className="w-[36px] h-[36px] rounded-[12px] mr-[9px] bg-[rgba(255,255,255,0.16)] items-center justify-center"
              >
                <SymbolView
                  name={{
                    ios: "eye.fill",
                    android: "visibility",
                    web: "visibility",
                  }}
                  tintColor="#FFFFFF"
                  size={13}
                  weight="bold"
                />
              </View>

              <View
                className="flex-1 min-w-[0px]"
              >
                <Text
                  className="text-[rgba(255,255,255,0.78)] text-[9px] leading-[11px] font-black tracking-[0.45px]"
                >
                  FORMATION ASSOCIÉE
                </Text>

                <Text
                  className="mt-[2px] text-[#FFFFFF] text-[12px] leading-[16px] font-black"
                >
                  Ouvrir la formation
                </Text>
              </View>

              <View
                className="w-[30px] h-[30px] rounded-[15px] bg-[rgba(255,255,255,0.16)] items-center justify-center"
              >
                <SymbolView
                  name={{
                    ios: "chevron.right",
                    android: "chevron_right",
                    web: "chevron_right",
                  }}
                  tintColor="#FFFFFF"
                  size={11}
                  weight="bold"
                />
              </View>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

function DetailItem({
  icon,
  label,
  value,
  tint,
  background,
}: {
  icon: SymbolName;
  label: string;
  value: string;
  tint: string;
  background: string;
}) {
  return (
    <View
      className="flex-1 min-w-[0px] min-h-[58px] rounded-[14px] border border-[#EEE9F0] bg-[#FBFAFC] px-[7px] flex-row items-center"
    >
      <View
        className="w-[30px] h-[30px] rounded-[10px] mr-[7px] items-center justify-center" style={{
            backgroundColor:
              background,
          }}
      >
        <SymbolView
          name={icon}
          tintColor={tint}
          size={12}
          weight="bold"
        />
      </View>

      <View
        className="flex-1 min-w-[0px]"
      >
        <Text
          className="text-[#98A2B3] text-[9px] leading-[11px] font-extrabold"
        >
          {label}
        </Text>

        <Text
          numberOfLines={2}
          className="mt-[2px] text-[#344054] text-[10px] leading-[13px] font-black"
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function SecondaryAction({
  label,
  icon,
  onPress,
  accent = false,
}: {
  label: string;
  icon: SymbolName;
  onPress: () => void;
  accent?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{
        color: "transparent",
      }}
      className={`flex-1 min-h-[42px] rounded-[13px] border border-[#E2DCE6] bg-[#FFFFFF] px-[8px] flex-row items-center justify-center gap-[6px] ${(accent ? "border-[#DCCFF0] bg-[#FAF7FF]" : "")}`}
    >
      <SymbolView
        name={icon}
        tintColor={
          accent
            ? "#7C3AED"
            : "#667085"
        }
        size={12}
        weight="bold"
      />

      <Text
        numberOfLines={1}
        className={`text-[#667085] text-[10px] font-black ${(accent ? "text-[#7C3AED]" : "")}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

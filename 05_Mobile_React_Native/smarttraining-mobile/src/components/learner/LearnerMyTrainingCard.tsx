import { SymbolView } from "expo-symbols";
import { type ComponentProps } from "react";
import {
  Pressable,
  Text,
  View,
} from "react-native";

import { TrainingCover } from "../ux/RichPrimitives";
import {
  buildLearnerMediaUrl,
} from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import { LearnerMyTraining } from "../../types/learnerTraining";

type Props = {
  training: LearnerMyTraining;
  onOpen: () => void;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];

function clampProgress(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDuration(value?: number | null): string {
  if (
    typeof value !== "number" ||
    Number.isNaN(value)
  ) {
    return "Non indiquée";
  }

  if (Number.isInteger(value)) {
    return `${value} h`;
  }

  const wholeHours = Math.floor(value);
  const minutes = Math.round((value - wholeHours) * 60);

  if (!wholeHours) {
    return `${minutes} min`;
  }

  return `${wholeHours}h ${String(minutes).padStart(2, "0")}`;
}

function formatDate(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function levelLabel(level?: string | null): string {
  if (level === "DEBUTANT") return "Débutant";
  if (level === "INTERMEDIAIRE") return "Intermédiaire";
  if (level === "AVANCE") return "Avancé";

  return level || "Non indiqué";
}

function statusPresentation(
  training: LearnerMyTraining,
): {
  label: string;
  color: string;
  soft: string;
} {
  const progress = clampProgress(training.progressPercentage);

  if (
    training.enrollmentStatus === "COMPLETED" ||
    progress >= 100
  ) {
    return {
      label: "Terminée",
      color: "#16A36A",
      soft: "#ECFDF3",
    };
  }

  if (progress > 0) {
    return {
      label: "En cours",
      color: "#2563EB",
      soft: "#EFF6FF",
    };
  }

  return {
    label: "À commencer",
    color: "#7C3AED",
    soft: "#F3EEFF",
  };
}

function InfoPill({
  icon,
  value,
  tint,
  background,
}: {
  icon: SymbolName;
  value: string;
  tint: string;
  background: string;
}) {
  return (
    <View className="min-h-[29px] rounded-[10px] border border-[#EEE9F0] bg-[#FBFAFC] px-[6px] flex-row items-center">
      <View
        className="w-[22px] h-[22px] rounded-[7px] mr-[5px] items-center justify-center" style={{ backgroundColor: background }}
      >
        <SymbolView
          name={icon}
          tintColor={tint}
          size={11}
          weight="bold"
        />
      </View>

      <Text
        numberOfLines={1}
        className="text-[#475467] text-[9px] font-extrabold"
      >
        {value}
      </Text>
    </View>
  );
}

export default function LearnerMyTrainingCard({
  training,
  onOpen,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const progress = clampProgress(
    training.progressPercentage,
  );

  const completed =
    training.enrollmentStatus === "COMPLETED" ||
    progress >= 100;

  const status = statusPresentation(training);
  const dueAt = formatDate(training.dueAt);


  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir ${training.title}`}
      onPress={onOpen}
      android_ripple={{ color: "transparent" }}
      className="overflow-hidden rounded-[20px] border bg-[#FFFFFF]" style={[{ shadowOpacity: 0.03, shadowRadius: 7, shadowOffset: {
      width: 0,
      height: 3,
    }, elevation: 1 }, {
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
        }]}
    >
      <View className="h-[94px] overflow-hidden bg-[#F4F1F6]">
        <TrainingCover
          title={training.title}
          coverUrl={buildLearnerMediaUrl(
            training.coverImageUrl,
          )}
        />

        <View
          className="absolute top-[8px] left-[8px] min-h-[26px] px-[8px] rounded-full flex-row items-center" style={{ backgroundColor: status.soft }}
        >
          <View
            className="w-[6px] h-[6px] rounded-[3px] mr-[5px]" style={{ backgroundColor: status.color }}
          />
          <Text
            className="text-[10px] font-black" style={{ color: status.color }}
          >
            {status.label}
          </Text>
        </View>

        <View className="absolute top-[8px] right-[8px] min-w-[44px] min-h-[27px] px-[8px] rounded-full bg-[rgba(15,23,42,0.84)] items-center justify-center">
          <Text className="text-[#FFFFFF] text-[10px] font-black">
            {progress}%
          </Text>
        </View>
      </View>

      <View className="p-[10px]">
        <View className="flex-row items-start gap-[8px]">
          <View className="flex-1 min-w-[0px]">
            <Text
              numberOfLines={2}
              className="text-[15px] leading-[19px] font-black tracking-[-0.15px]" style={{ color: theme.colors.foreground }}
            >
              {training.title}
            </Text>

            {training.shortDescription ? (
              <Text
                numberOfLines={1}
                className="mt-[2px] text-[11px] leading-[15px]" style={{
                    color:
                      theme.colors.foregroundMuted,
                  }}
              >
                {training.shortDescription}
              </Text>
            ) : null}
          </View>

          {training.category ? (
            <View className="max-w-[125px] min-h-[28px] px-[8px] rounded-full bg-[#F3EEFF] justify-center">
              <Text
                numberOfLines={1}
                className="text-[#7C3AED] text-[9px] font-black"
              >
                {training.category}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-[8px] flex-row flex-wrap gap-[6px]">
          <InfoPill
            icon={{
              ios: "chart.bar.fill",
              android: "bar_chart",
              web: "bar_chart",
            }}
            value={levelLabel(training.level)}
            tint="#7C3AED"
            background="#F3EEFF"
          />

          <InfoPill
            icon={{
              ios: "clock.fill",
              android: "schedule",
              web: "schedule",
            }}
            value={formatDuration(
              training.estimatedDurationHours,
            )}
            tint="#2563EB"
            background="#EFF6FF"
          />

          {dueAt ? (
            <InfoPill
              icon={{
                ios: "calendar",
                android: "event",
                web: "event",
              }}
              value={dueAt}
              tint="#D97706"
              background="#FFF7ED"
            />
          ) : null}
        </View>

        <View className="mt-[8px] min-h-[22px] flex-row items-center">
          <Text className="w-[70px] text-[#667085] text-[10px] font-extrabold">
            Progression
          </Text>

          <View className="flex-1 h-[6px] overflow-hidden rounded-full bg-[#E9E4EC]">
            <View
              className="h-full rounded-full" style={{
                  width: `${progress}%`,
                  backgroundColor: status.color,
                }}
            />
          </View>

          <Text
            className="w-[42px] ml-[8px] text-right text-[10px] font-black" style={{ color: status.color }}
          >
            {progress}%
          </Text>
        </View>

        <View
          className={`mt-[9px] min-h-[52px] rounded-[15px] border px-[7px] flex-row items-center ${(completed ? "border-[#5B21B6] bg-[#5B21B6]" : (progress > 0 ? "border-[#7C3AED] bg-[#7C3AED]" : "border-[#6D28D9] bg-[#6D28D9]"))}`}
        >
          <View
            className={`w-[36px] h-[36px] rounded-[12px] mr-[9px] items-center justify-center ${(completed ? "bg-[rgba(255,255,255,0.16)]" : (progress > 0 ? "bg-[rgba(255,255,255,0.16)]" : "bg-[rgba(255,255,255,0.16)]"))}`}
          >
            <SymbolView
              name={{
                ios: completed
                  ? "eye.fill"
                  : progress > 0
                    ? "play.fill"
                    : "arrow.right.circle.fill",
                android: completed
                  ? "visibility"
                  : progress > 0
                    ? "play_arrow"
                    : "arrow_circle_right",
                web: completed
                  ? "visibility"
                  : progress > 0
                    ? "play_arrow"
                    : "arrow_circle_right",
              }}
              tintColor="#FFFFFF"
              size={13}
              weight="bold"
            />
          </View>

          <View className="flex-1 min-w-[0px]">
            <Text
              numberOfLines={1}
              className="text-[8px] leading-[10px] font-black tracking-[0.45px] text-[rgba(255,255,255,0.78)]"
            >
              {completed
                ? "FORMATION TERMINÉE"
                : progress > 0
                  ? "REPRENDRE"
                  : "DÉMARRER"}
            </Text>

            <Text
              numberOfLines={1}
              className="mt-[2px] text-[11px] leading-[14px] font-black text-[#FFFFFF]"
            >
              {completed
                ? "Consulter la formation"
                : progress > 0
                  ? "Continuer la formation"
                  : "Commencer la formation"}
            </Text>
          </View>

          <View
            className={`w-[30px] h-[30px] rounded-[15px] items-center justify-center ${(completed || progress > 0 ? "bg-[rgba(255,255,255,0.16)]" : "bg-[rgba(255,255,255,0.16)]")}`}
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
        </View>
      </View>
    </Pressable>
  );
}

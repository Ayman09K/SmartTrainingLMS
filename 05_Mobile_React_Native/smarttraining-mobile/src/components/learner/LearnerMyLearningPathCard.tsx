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
import {
  LearningPathCatalog,
  LearningPathProgress,
} from "../../types/learningPath";

type Props = {
  progress: LearningPathProgress;
  catalog?: LearningPathCatalog;
  onOpen: () => void;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];

function clampProgress(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDuration(value?: number | null): string | null {
  if (
    typeof value !== "number" ||
    Number.isNaN(value)
  ) {
    return null;
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

function MetaPill({
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

export default function LearnerMyLearningPathCard({
  progress,
  catalog,
  onOpen,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const value = clampProgress(
    progress.overallProgressPercentage,
  );

  const coverUrl = buildLearnerMediaUrl(
    catalog?.coverImageUrl ||
      catalog?.coverImagePath,
  );

  const nextTraining =
    progress.trainings.find(
      (item) =>
        item.trainingId ===
        progress.nextTrainingId,
    );

  const duration = formatDuration(
    catalog?.estimatedDurationHours,
  );

  const dueAt = formatDate(progress.pathDueAt);
  const completed = Boolean(progress.completed);

  const status = completed
    ? {
        label: "Terminé",
        color: "#16A36A",
        soft: "#ECFDF3",
      }
    : value > 0
      ? {
          label: "En cours",
          color: "#7C3AED",
          soft: "#F3EEFF",
        }
      : {
          label: "À commencer",
          color: "#2563EB",
          soft: "#EFF6FF",
        };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir le parcours ${progress.pathTitle}`}
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
      <View className="h-[88px] overflow-hidden bg-[#F7F4F9]">
        <TrainingCover
          title={progress.pathTitle}
          coverUrl={coverUrl}
          resizeMode="contain"
        />

        <View className="absolute top-[8px] left-[8px] min-h-[26px] px-[8px] rounded-full bg-[rgba(255,255,255,0.95)] flex-row items-center gap-[5px]">
          <SymbolView
            name={{
              ios: "point.topleft.down.curvedto.point.bottomright.up",
              android: "route",
              web: "route",
            }}
            tintColor="#7C3AED"
            size={10}
            weight="bold"
          />
          <Text className="text-[#7C3AED] text-[10px] font-black">
            Parcours
          </Text>
        </View>

        <View className="absolute top-[8px] right-[8px] min-w-[44px] min-h-[27px] px-[8px] rounded-full bg-[rgba(15,23,42,0.84)] items-center justify-center">
          <Text className="text-[#FFFFFF] text-[10px] font-black">
            {value}%
          </Text>
        </View>
      </View>

      <View className="p-[10px]">
        <View className="flex-row items-center justify-between gap-[8px]">
          <View
            className="min-h-[26px] px-[8px] rounded-full flex-row items-center" style={{ backgroundColor: status.soft }}
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

          <Text className="text-[#667085] text-[9px] font-extrabold">
            {progress.totalSteps} formation
            {progress.totalSteps > 1 ? "s" : ""}
          </Text>
        </View>

        <Text
          numberOfLines={2}
          className="mt-[6px] text-[15px] leading-[19px] font-black" style={{ color: theme.colors.foreground }}
        >
          {progress.pathTitle}
        </Text>

        <Text
          numberOfLines={1}
          className="mt-[2px] text-[11px] leading-[15px]" style={{
              color:
                theme.colors.foregroundMuted,
            }}
        >
          {catalog?.shortDescription ||
            catalog?.description ||
            "Parcours de formation affecté à ton compte."}
        </Text>

        <View className="mt-[7px] flex-row flex-wrap gap-[6px]">
          <MetaPill
            icon={{
              ios: "rectangle.stack.fill",
              android: "view_agenda",
              web: "view_agenda",
            }}
            value={`${progress.totalSteps} formation${
              progress.totalSteps > 1 ? "s" : ""
            }`}
            tint="#7C3AED"
            background="#F3EEFF"
          />

          {duration ? (
            <MetaPill
              icon={{
                ios: "clock.fill",
                android: "schedule",
                web: "schedule",
              }}
              value={duration}
              tint="#667085"
              background="#F2F4F7"
            />
          ) : null}

          {dueAt ? (
            <MetaPill
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

        <View className="mt-[7px] min-h-[22px] flex-row items-center">
          <Text className="w-[70px] text-[#667085] text-[10px] font-extrabold">
            Progression
          </Text>

          <View className="flex-1 h-[6px] overflow-hidden rounded-full bg-[#E9E4EC]">
            <View
              className="h-full rounded-full" style={{
                  width: `${value}%`,
                  backgroundColor: status.color,
                }}
            />
          </View>

          <Text
            className="w-[42px] ml-[8px] text-right text-[10px] font-black" style={{ color: status.color }}
          >
            {value}%
          </Text>
        </View>

        {!completed &&
        nextTraining?.trainingTitle ? (
          <View className="mt-[7px] min-h-[36px] rounded-[11px] bg-[#F8F6F3] px-[7px] flex-row items-center">
            <View className="w-[26px] h-[26px] rounded-[8px] mr-[7px] bg-[#F3EEFF] items-center justify-center">
              <SymbolView
                name={{
                  ios: "arrow.right.circle.fill",
                  android: "arrow_circle_right",
                  web: "arrow_circle_right",
                }}
                tintColor="#7C3AED"
                size={12}
                weight="bold"
              />
            </View>

            <View className="flex-1 min-w-[0px]">
              <Text className="text-[#98A2B3] text-[8px] font-extrabold">
                Prochaine étape
              </Text>
              <Text
                numberOfLines={1}
                className="mt-[1px] text-[#344054] text-[9px] font-black"
              >
                {nextTraining.trainingTitle}
              </Text>
            </View>
          </View>
        ) : null}

        <View
          className={`mt-[8px] min-h-[50px] rounded-[15px] border px-[7px] flex-row items-center ${(completed ? "border-[#5B21B6] bg-[#5B21B6]" : (value > 0 ? "border-[#7C3AED] bg-[#7C3AED]" : "border-[#6D28D9] bg-[#6D28D9]"))}`}
        >
          <View
            className={`w-[36px] h-[36px] rounded-[12px] mr-[9px] items-center justify-center ${(completed ? "bg-[rgba(255,255,255,0.16)]" : (value > 0 ? "bg-[rgba(255,255,255,0.16)]" : "bg-[rgba(255,255,255,0.16)]"))}`}
          >
            <SymbolView
              name={{
                ios: completed
                  ? "eye.fill"
                  : value > 0
                    ? "play.fill"
                    : "arrow.right.circle.fill",
                android: completed
                  ? "visibility"
                  : value > 0
                    ? "play_arrow"
                    : "arrow_circle_right",
                web: completed
                  ? "visibility"
                  : value > 0
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
                ? "PARCOURS TERMINÉ"
                : value > 0
                  ? "REPRENDRE"
                  : "DÉMARRER"}
            </Text>

            <Text
              numberOfLines={1}
              className="mt-[2px] text-[11px] leading-[14px] font-black text-[#FFFFFF]"
            >
              {completed
                ? "Consulter le parcours"
                : value > 0
                  ? "Continuer le parcours"
                  : "Commencer le parcours"}
            </Text>
          </View>

          <View
            className={`w-[30px] h-[30px] rounded-[15px] items-center justify-center ${(completed || value > 0 ? "bg-[rgba(255,255,255,0.16)]" : "bg-[rgba(255,255,255,0.16)]")}`}
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

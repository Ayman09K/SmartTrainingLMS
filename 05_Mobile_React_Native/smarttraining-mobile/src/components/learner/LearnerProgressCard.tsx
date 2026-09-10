import { SymbolView } from "expo-symbols";
import { type ComponentProps } from "react";
import {
  Pressable,
  Text,
  View,
} from "react-native";

import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import { LearnerProgressResponse } from "../../types/analytics";

type Props = {
  trainingTitle: string;
  fallbackPercentage?: number | null;
  progress?: LearnerProgressResponse;
  onOpenTraining: () => void;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];

function clamp(
  value?: number | null,
): number {
  if (
    typeof value !== "number" ||
    Number.isNaN(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(value)),
  );
}

function formatDate(
  value?: string | null,
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
    },
  ).format(date);
}

function MetaPill({
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
      className="min-h-[42px] max-w-[49%] grow basis-[145px] rounded-[12px] border border-[#EEE9F0] bg-[#FBFAFC] px-[7px] flex-row items-center"
    >
      <View
        className="w-[27px] h-[27px] rounded-[9px] mr-[6px] items-center justify-center" style={{
            backgroundColor:
              background,
          }}
      >
        <SymbolView
          name={icon}
          tintColor={tint}
          size={11}
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
          numberOfLines={1}
          className="mt-[1px] text-[#344054] text-[10px] leading-[13px] font-black"
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function LearnerProgressCard({
  trainingTitle,
  fallbackPercentage,
  progress,
  onOpenTraining,
}: Props) {
  const { theme } =
    useSmartTrainingTheme();

  const percentage = clamp(
    progress?.progressPercentage ??
      fallbackPercentage,
  );

  const completed =
    progress?.status ===
      "COMPLETED" ||
    percentage >= 100;

  const atRisk =
    progress?.status === "AT_RISK";

  const inProgress =
    progress?.status ===
      "IN_PROGRESS" ||
    (!completed &&
      !atRisk &&
      percentage > 0);

  const status =
    completed
      ? "Terminée"
      : atRisk
        ? "À reprendre"
        : inProgress
          ? "En cours"
          : "À commencer";

  const statusColor =
    atRisk
      ? theme.colors.warning
      : completed
        ? theme.colors.success
        : inProgress
          ? "#2563EB"
          : theme.colors.accent;

  const statusSoft =
    atRisk
      ? "#FFF7ED"
      : completed
        ? "#ECFDF3"
        : inProgress
          ? "#EFF6FF"
          : "#F3EEFF";

  const lastActivity =
    formatDate(
      progress?.lastActivityAt,
    );

  const hasLessonCounters =
    typeof progress?.completedLessons ===
      "number" &&
    typeof progress?.totalLessons ===
      "number" &&
    progress.totalLessons > 0;

  const hasQuizCounters =
    typeof progress?.completedQuizzes ===
      "number" &&
    typeof progress?.totalQuizzes ===
      "number" &&
    progress.totalQuizzes > 0;

  const hasScore =
    typeof progress?.averageScore ===
      "number" &&
    Number.isFinite(
      progress.averageScore,
    );

  const eyebrow =
    completed
      ? "FORMATION TERMINÉE"
      : atRisk
        ? "À REPRENDRE"
        : inProgress
          ? "CONTINUER"
          : "DÉMARRER";

  const actionTitle =
    completed
      ? "Consulter la formation"
      : inProgress || atRisk
        ? "Continuer la formation"
        : "Commencer la formation";

  return (
    <View
      className="rounded-[20px] border bg-[#FFFFFF] p-[11px]" style={[{ shadowOpacity: 0.035, shadowRadius: 8, shadowOffset: {
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
        className="flex-row items-center justify-between"
      >
        <View
          className="min-h-[29px] px-[9px] rounded-full flex-row items-center" style={{
              backgroundColor:
                statusSoft,
            }}
        >
          <View
            className="w-[7px] h-[7px] mr-[6px] rounded-[4px]" style={{
                backgroundColor:
                  statusColor,
              }}
          />
          <Text
            className="text-[11px] font-black" style={{
                color:
                  statusColor,
              }}
          >
            {status}
          </Text>
        </View>

        <View
          className="min-w-[50px] min-h-[30px] px-[9px] rounded-full bg-[#111827] items-center justify-center"
        >
          <Text
            className="text-[#FFFFFF] text-[11px] font-black"
          >
            {percentage}%
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={2}
        className="mt-[9px] text-[16px] leading-[21px] font-black tracking-[-0.15px]" style={{
            color:
              theme.colors.foreground,
          }}
      >
        {trainingTitle}
      </Text>

      <View
        className="mt-[10px] min-h-[24px] flex-row items-center"
      >
        <Text
          className="w-[74px] text-[#667085] text-[11px] font-extrabold"
        >
          Progression
        </Text>

        <View
          className="flex-1 h-[7px] overflow-hidden rounded-full bg-[#E9E4EC]"
        >
          <View
            className="h-full rounded-full" style={{
                width: `${percentage}%`,
                backgroundColor:
                  statusColor,
              }}
          />
        </View>

        <Text
          className="w-[44px] ml-[8px] text-right text-[11px] font-black" style={{
              color:
                statusColor,
            }}
        >
          {percentage}%
        </Text>
      </View>

      {hasLessonCounters ||
      hasQuizCounters ||
      hasScore ||
      lastActivity ? (
        <View
          className="mt-[9px] flex-row flex-wrap gap-[6px]"
        >
          {hasLessonCounters ? (
            <MetaPill
              icon={{
                ios: "book.pages.fill",
                android: "menu_book",
                web: "menu_book",
              }}
              label="Leçons"
              value={`${progress?.completedLessons} / ${progress?.totalLessons}`}
              tint="#7C3AED"
              background="#F3EEFF"
            />
          ) : null}

          {hasQuizCounters ? (
            <MetaPill
              icon={{
                ios: "checklist",
                android: "fact_check",
                web: "fact_check",
              }}
              label="Évaluations"
              value={`${progress?.completedQuizzes} / ${progress?.totalQuizzes}`}
              tint="#2563EB"
              background="#EFF6FF"
            />
          ) : null}

          {hasScore ? (
            <MetaPill
              icon={{
                ios: "star.fill",
                android: "star",
                web: "star",
              }}
              label="Score"
              value={`${Math.round(progress?.averageScore ?? 0)}%`}
              tint="#D97706"
              background="#FFF7ED"
            />
          ) : null}

          {lastActivity ? (
            <MetaPill
              icon={{
                ios: "clock.fill",
                android: "schedule",
                web: "schedule",
              }}
              label="Dernière activité"
              value={lastActivity}
              tint="#667085"
              background="#F2F4F7"
            />
          ) : null}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          actionTitle
        }
        onPress={onOpenTraining}
        android_ripple={{
          color: "transparent",
        }}
        className={`mt-[10px] min-h-[52px] rounded-[15px] border px-[7px] flex-row items-center ${(completed ? "border-[#5B21B6] bg-[#5B21B6]" : (atRisk ? "border-[#B45309] bg-[#B45309]" : "border-[#7C3AED] bg-[#7C3AED]"))}`}
      >
        <View
          className="w-[36px] h-[36px] rounded-[12px] mr-[9px] bg-[rgba(255,255,255,0.16)] items-center justify-center"
        >
          <SymbolView
            name={{
              ios: completed
                ? "eye.fill"
                : "play.fill",
              android: completed
                ? "visibility"
                : "play_arrow",
              web: completed
                ? "visibility"
                : "play_arrow",
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
            {eyebrow}
          </Text>

          <Text
            numberOfLines={1}
            className="mt-[2px] text-[#FFFFFF] text-[12px] leading-[16px] font-black"
          >
            {actionTitle}
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
    </View>
  );
}

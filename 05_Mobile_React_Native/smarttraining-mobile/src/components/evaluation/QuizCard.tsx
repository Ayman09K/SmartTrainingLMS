import { SymbolView } from "expo-symbols";
import { Pressable, Text, View } from "react-native";

import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type { Quiz } from "../../types/evaluation";

function attemptLabel(maxAttempts: number): string {
  return maxAttempts === 1 ? "1 tentative" : `${maxAttempts} tentatives`;
}

function MetaItem({
  icon,
  label,
  tint,
}: {
  icon: React.ComponentProps<typeof SymbolView>["name"];
  label: string;
  tint: string;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View className="flex-row items-center gap-1.5">
      <SymbolView name={icon} size={12} tintColor={tint} weight="semibold" />
      <Text
        maxFontSizeMultiplier={1}
        numberOfLines={1}
        className="text-[11px] font-bold"
        style={{ color: theme.colors.foregroundMuted }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function QuizCard({
  quiz,
  questionCount,
  onPress,
}: {
  quiz: Quiz;
  questionCount: number | null;
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir le quiz ${quiz.title}`}
      onPress={onPress}
      className="overflow-hidden rounded-[24px] border p-4 active:opacity-90"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.055,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 7 },
        elevation: 2,
      }}
    >
      <View className="flex-row items-start gap-3">
        <View
          className="h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[18px]"
          style={{ backgroundColor: theme.colors.surfaceSoft }}
        >
          <Text
            maxFontSizeMultiplier={1}
            className="text-[27px] font-black leading-[30px]"
            style={{ color: theme.colors.accent }}
          >
            ✓
          </Text>
        </View>

        <View className="min-w-0 flex-1">
          <View className="flex-row items-start gap-2">
            <Text
              className="min-w-0 flex-1 text-[18px] font-black leading-[23px]"
              style={{ color: theme.colors.foreground }}
            >
              {quiz.title}
            </Text>

            <View className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1.5">
              <Text
                maxFontSizeMultiplier={1}
                className="text-[10px] font-extrabold text-emerald-700"
              >
                Disponible
              </Text>
            </View>
          </View>

          {quiz.description ? (
            <Text
              numberOfLines={2}
              className="mt-1.5 text-[13px] leading-[19px]"
              style={{ color: theme.colors.foregroundMuted }}
            >
              {quiz.description}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        className="mt-4 flex-row flex-wrap gap-x-4 gap-y-2 border-t pt-3.5"
        style={{ borderColor: theme.colors.border }}
      >
        <MetaItem
          icon="doc.text.fill"
          label={
            questionCount === null
              ? "Questions indisponibles"
              : `${questionCount} question${questionCount > 1 ? "s" : ""}`
          }
          tint={theme.colors.accent}
        />
        <MetaItem
          icon="clock.fill"
          label={`${quiz.timeLimitMinutes} min`}
          tint="#F59E0B"
        />
        <MetaItem
          icon="scope"
          label={`${quiz.passingScore}% requis`}
          tint="#8B5CF6"
        />
        <MetaItem
          icon="arrow.triangle.2.circlepath"
          label={attemptLabel(quiz.maxAttempts)}
          tint="#0EA5E9"
        />
      </View>

      <View
        className="mt-4 flex-row items-center justify-center rounded-[16px] px-4 py-3.5"
        style={{ backgroundColor: theme.colors.accent }}
      >
        <Text
          className="text-[14px] font-black"
          style={{ color: theme.colors.accentForeground }}
        >
          Ouvrir le quiz
        </Text>
        <SymbolView
          name="chevron.right"
          size={13}
          weight="bold"
          tintColor={theme.colors.accentForeground}
          style={{ marginLeft: 8 }}
        />
      </View>
    </Pressable>
  );
}

import { SymbolView } from "expo-symbols";
import { Pressable, Text, View } from "react-native";

import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type { AnswerOption } from "../../types/evaluation";

export default function AnswerOptionItem({
  option,
  selected,
  onPress,
}: {
  option: AnswerOption;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={option.content}
      accessibilityState={{ selected }}
      onPress={onPress}
      className="min-h-[58px] flex-row items-center rounded-[18px] border px-4 py-3.5 active:opacity-80"
      style={{
        backgroundColor: selected
          ? theme.colors.surfaceSoft
          : theme.colors.surface,
        borderColor: selected ? theme.colors.accent : theme.colors.border,
        borderWidth: selected ? 2 : 1,
      }}
    >
      <View
        className="mr-3 h-7 w-7 shrink-0 items-center justify-center rounded-full border"
        style={{
          backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
        }}
      >
        {selected ? (
          <SymbolView
            name="checkmark"
            size={12}
            weight="bold"
            tintColor={theme.colors.accentForeground}
          />
        ) : null}
      </View>

      <Text
        className="min-w-0 flex-1 text-[15px] font-semibold leading-[21px]"
        style={{
          color: selected ? theme.colors.accent : theme.colors.foreground,
        }}
      >
        {option.content}
      </Text>
    </Pressable>
  );
}

import { Href } from "expo-router";
import { Pressable, Text } from "react-native";

import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import { navigateBackOrReplace } from "./mobileNavigation";

type BackProps = {
  fallback: Href;
};

export function SafeHeaderBackButton({ fallback }: BackProps) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retour"
      accessibilityHint="Revient à l’écran précédent ou à l’accueil de cet espace"
      hitSlop={8}
      onPress={() => navigateBackOrReplace(fallback)}
      style={({ pressed }) => ({
        width: 44,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Text
        style={{
          color: theme.colors.headerForeground,
          fontSize: 30,
          fontWeight: "600",
          lineHeight: 32,
        }}
      >
        ‹
      </Text>
    </Pressable>
  );
}

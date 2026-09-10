import { Href, router, useNavigation } from "expo-router";
import { Pressable, Text } from "react-native";

import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";

type BackProps = {
  fallback: Href;
};

export function SafeHeaderBackButton({ fallback }: BackProps) {
  const { theme } = useSmartTrainingTheme();
  const navigation = useNavigation();

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    router.replace(fallback);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retour"
      accessibilityHint="Revient à l’écran précédent ou à l’accueil de cet espace"
      hitSlop={12}
      onPress={handleBack}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
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

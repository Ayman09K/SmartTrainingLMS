import SmartTrainingBrandMark from "./branding/SmartTrainingBrandMark";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useSmartTrainingTheme,
} from "../theme/provider/SmartTrainingThemeProvider";

type LoadingStateProps = {
  message: string;
};

export default function LoadingState({
  message,
}: LoadingStateProps) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          gap: theme.shape.sectionGap,
        },
      ]}
    >
      <SmartTrainingBrandMark size={58} />
      <ActivityIndicator
        size="large"
        color={theme.colors.accent}
      />
      <Text
        style={[
          styles.text,
          {
            color: theme.colors.foregroundMuted,
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  text: {
    fontSize: 15,
    textAlign: "center",
  },
});
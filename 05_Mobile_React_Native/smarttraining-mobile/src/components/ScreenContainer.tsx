import { ReactNode } from "react";
import {
  StyleSheet,
  ViewStyle,
} from "react-native";

import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import {
  useSmartTrainingTheme,
} from "../theme/provider/SmartTrainingThemeProvider";

type ScreenContainerProps = {
  children: ReactNode;
  style?: ViewStyle;
  edges?: Edge[];
};

export default function ScreenContainer({
  children,
  style,
  edges = ["left", "right", "bottom"],
}: ScreenContainerProps) {
  const { theme } = useSmartTrainingTheme();

  return (
    <SafeAreaView
      edges={edges}
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          padding: theme.shape.cardPadding,
        },
        style,
      ]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
});
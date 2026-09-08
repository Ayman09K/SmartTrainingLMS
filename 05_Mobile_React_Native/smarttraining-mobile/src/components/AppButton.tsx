import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

import {
  useSmartTrainingTheme,
} from "../theme/provider/SmartTrainingThemeProvider";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  style?: ViewStyle;
};

export default function AppButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
}: AppButtonProps) {
  const { theme } = useSmartTrainingTheme();
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === "secondary"
      ? theme.colors.surface
      : variant === "danger"
        ? theme.colors.danger
        : theme.colors.accent;

  const foregroundColor =
    variant === "secondary"
      ? theme.colors.foreground
      : variant === "danger"
        ? theme.colors.statusForeground
        : theme.colors.accentForeground;

  const spinnerColor =
    variant === "secondary"
      ? theme.colors.accent
      : foregroundColor;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor:
            variant === "secondary"
              ? theme.colors.border
              : backgroundColor,
          borderRadius: theme.shape.controlRadius,
          borderWidth:
            variant === "secondary"
              ? theme.shape.borderWidth
              : 0,
          minHeight: theme.shape.minTouchTarget,
        },
        isDisabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            {
              color: foregroundColor,
            },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  disabledButton: {
    opacity: 0.55,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
});
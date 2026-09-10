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

  const borderColor =
    variant === "secondary"
      ? theme.colors.border
      : backgroundColor;

  const borderWidth =
    variant === "secondary"
      ? theme.shape.borderWidth
      : 0;

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
      onPress={onPress}
      disabled={isDisabled}

      // Supprime le fond gris au clic sur Android
      android_ripple={{
        color: "transparent",
      }}

      android_disableSound

      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
          borderWidth,
          borderRadius: theme.shape.controlRadius,
          minHeight: theme.shape.minTouchTarget,
        },
        variant === "primary" && styles.primaryButton,
        isDisabled && styles.disabledButton,
        style,
      ]}
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
    paddingVertical: 11,

    minWidth: 0,
  },

  primaryButton: {
    elevation: 0,
  },

  disabledButton: {
    opacity: 0.5,
  },

  buttonText: {
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
});
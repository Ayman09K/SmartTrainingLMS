import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useSmartTrainingTheme,
} from "../theme/provider/SmartTrainingThemeProvider";
import AppButton from "./AppButton";

type ErrorMessageProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export default function ErrorMessage({
  title = "Une erreur est survenue",
  message,
  onRetry,
}: ErrorMessageProps) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.danger,
          borderRadius: theme.shape.controlRadius,
          borderWidth: Math.max(1, theme.shape.borderWidth),
          marginBottom: theme.shape.sectionGap,
          padding: theme.shape.cardPadding,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            color: theme.colors.danger,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.message,
          {
            color: theme.colors.foregroundMuted,
          },
        ]}
      >
        {message}
      </Text>

      {onRetry ? (
        <AppButton
          title={"R\u00E9essayer"}
          onPress={onRetry}
          variant="secondary"
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  title: {
    fontWeight: "800",
    marginBottom: 6,
  },
  message: {
    lineHeight: 20,
  },
  button: {
    marginTop: 14,
  },
});
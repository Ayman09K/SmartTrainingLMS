import { useLocalSearchParams } from "expo-router";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import ScormPlayerScreen from "../../screens/scorm/ScormPlayerScreen";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";

export default function ScormRoute() {
  const { theme } = useSmartTrainingTheme();
  const params = useLocalSearchParams<{
    resourceId?: string;
    mode?: string;
  }>();
  const resourceId = Number(params.resourceId);
  const authorPreview = params.mode === "author";

  if (!Number.isInteger(resourceId) || resourceId <= 0) {
    return (
      <View
        style={[
          styles.invalidPage,
          {
            backgroundColor: theme.colors.background,
            padding: theme.shape.cardPadding,
          },
        ]}
      >
        <View
          style={[
            styles.invalidCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.danger,
              borderRadius: theme.shape.cardRadius,
              borderWidth: Math.max(1, theme.shape.borderWidth),
              padding: theme.shape.cardPadding,
            },
          ]}
        >
          <Text
            style={[
              styles.invalidEyebrow,
              { color: theme.colors.danger },
            ]}
          >
            SCORM
          </Text>

          <Text
            style={[
              styles.invalidTitle,
              { color: theme.colors.foreground },
            ]}
          >
            Ressource invalide
          </Text>

          <Text
            style={[
              styles.invalidText,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            Cette ressource SCORM ne peut pas {"\u00EAtre"} ouverte.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScormPlayerScreen
      resourceId={resourceId}
      authorPreview={authorPreview}
    />
  );
}

const styles = StyleSheet.create({
  invalidPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  invalidCard: {
    width: "100%",
    maxWidth: 680,
  },
  invalidEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    marginBottom: 6,
  },
  invalidTitle: {
    fontSize: 21,
    fontWeight: "900",
  },
  invalidText: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
});
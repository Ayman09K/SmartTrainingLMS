import { Href, router } from "expo-router";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../AppButton";
import { removeToken } from "../../storage/tokenStorage";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";

export default function AccountSessionCard() {
  const { theme } = useSmartTrainingTheme();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout(): Promise<void> {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await removeToken();
    } finally {
      router.replace("/" as Href);
    }
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.shape.cardRadius,
          borderWidth: theme.shape.borderWidth,
          padding: theme.shape.cardPadding,
        },
      ]}
    >
      <Text
        style={[
          styles.eyebrow,
          { color: theme.colors.accent },
        ]}
      >
        SESSION
      </Text>

      <Text
        style={[
          styles.title,
          { color: theme.colors.foreground },
        ]}
      >
        Se déconnecter
      </Text>

      <Text
        style={[
          styles.help,
          { color: theme.colors.foregroundMuted },
        ]}
      >
        Fermez votre session SmartTraining sur cet appareil.
        Une reconnexion sera nécessaire.
      </Text>

      <AppButton
        title={
          loggingOut
            ? "Déconnexion..."
            : "Se déconnecter"
        }
        onPress={() => void handleLogout()}
        disabled={loggingOut}
        variant="secondary"
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
  },
  help: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  button: {
    marginTop: 14,
  },
});

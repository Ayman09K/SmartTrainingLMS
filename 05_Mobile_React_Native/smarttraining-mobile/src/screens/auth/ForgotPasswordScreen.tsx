import SmartTrainingBrandLockup from "../../components/branding/SmartTrainingBrandLockup";
import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import {
  requestPasswordReset,
} from "../../features/auth/passwordResetService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";

type SmartTheme =
  ReturnType<typeof useSmartTrainingTheme>["theme"];

type ForgotPasswordScreenProps = {
  onBackToLogin: () => void;
};

const NEUTRAL_MESSAGE =
  "Si un compte correspond \u00E0 cette adresse e-mail, "
  + "un lien de r\u00E9initialisation a \u00E9t\u00E9 envoy\u00E9.";

export default function ForgotPasswordScreen({
  onBackToLogin,
}: ForgotPasswordScreenProps) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);

  // PATCH20_A2_AUTH_KEYBOARD_SAFE
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener(
      "keyboardDidHide",
      () => setKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage(
        "Saisis ton adresse e-mail.",
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorMessage(
        "Saisis une adresse e-mail valide.",
      );
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setErrorMessage("");

      await requestPasswordReset(normalizedEmail);

      setMessage(NEUTRAL_MESSAGE);
    }
    catch {
      setErrorMessage(
        "Impossible de traiter la demande pour le moment. "
        + "R\u00E9essaie ult\u00E9rieurement.",
      );
    }
    finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.container,
          keyboardVisible && styles.containerKeyboard,
        ]}
      >
        <View style={styles.brandBlock}>
          <SmartTrainingBrandLockup />

          <Text style={styles.subtitle}>
            {
              "Retrouve l\u2019acc\u00E8s \u00E0 ton compte SmartTraining."
            }
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {"Mot de passe oubli\u00E9"}
          </Text>

          <Text style={styles.description}>
            {
              "Indique l\u2019adresse e-mail de ton compte. "
              + "Si elle correspond \u00E0 un compte, "
              + "un lien temporaire sera envoy\u00E9."
            }
          </Text>

          {errorMessage.length > 0 ? (
            <ErrorMessage
              title={"Demande impossible"}
              message={errorMessage}
            />
          ) : null}

          {message.length > 0 ? (
            <View
              accessible
              accessibilityRole="text"
              style={styles.messageBox}
            >
              <Text style={styles.messageText}>
                {message}
              </Text>
            </View>
          ) : null}

          <Text style={styles.label}>
            {"Adresse e-mail"}
          </Text>

          <TextInput
            accessibilityLabel={"Adresse e-mail"}
            style={styles.input}
            placeholder="nom@entreprise.com"
            placeholderTextColor={
              theme.colors.foregroundSubtle
            }
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={() => void handleSubmit()}
            editable={!loading}
          />

          <AppButton
            title={"Recevoir le lien"}
            onPress={() => void handleSubmit()}
            loading={loading}
          />

          <View style={styles.backRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                "Retour \u00E0 la connexion"
              }
              accessibilityState={{
                disabled: loading,
              }}
              disabled={loading}
              onPress={onBackToLogin}
            >
              <Text style={styles.backLink}>
                {"Retour \u00E0 la connexion"}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.webFallback}>
            {
              "Le lien re\u00E7u par e-mail ouvrira "
              + "la page Web s\u00E9curis\u00E9e SmartTraining "
              + "pour choisir le nouveau mot de passe."
            }
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: SmartTheme) {
  return StyleSheet.create({
    keyboardView: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flexGrow: 1,
      justifyContent: "center",
      padding: theme.shape.cardPadding,
      backgroundColor: theme.colors.background,
    },
    containerKeyboard: {
      justifyContent: "flex-start",
      paddingTop: theme.shape.cardPadding,
      paddingBottom: theme.shape.cardPadding * 2.5,
    },
    brandBlock: {
      alignItems: "center",
      marginBottom: theme.shape.cardPadding * 2,
    },
    subtitle: {
      color: theme.colors.foregroundMuted,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 12,
      textAlign: "center",
    },
    form: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.shape.cardRadius,
      borderWidth: theme.shape.borderWidth,
      elevation: 3,
      padding: theme.shape.cardPadding,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
    },
    formTitle: {
      color: theme.colors.foreground,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 8,
    },
    description: {
      color: theme.colors.foregroundMuted,
      fontSize: 14,
      lineHeight: 21,
      marginBottom: 18,
    },
    label: {
      color: theme.colors.foregroundMuted,
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 5,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.shape.controlRadius,
      borderWidth: theme.shape.borderWidth,
      color: theme.colors.foreground,
      marginBottom: 14,
      minHeight: theme.shape.minTouchTarget,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    messageBox: {
      backgroundColor: theme.colors.surfaceSoft,
      borderColor: theme.colors.border,
      borderRadius: theme.shape.controlRadius,
      borderWidth: theme.shape.borderWidth,
      marginBottom: 16,
      padding: 12,
    },
    messageText: {
      color: theme.colors.foreground,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19,
    },
    backRow: {
      alignItems: "center",
      marginTop: 18,
    },
    backLink: {
      color: theme.colors.accent,
      fontSize: 15,
      fontWeight: "800",
    },
    webFallback: {
      color: theme.colors.foregroundSubtle,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 20,
      textAlign: "center",
    },
  });
}
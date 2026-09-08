import SmartTrainingBrandLockup from "../../components/branding/SmartTrainingBrandLockup";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
type SmartTheme = ReturnType<typeof useSmartTrainingTheme>["theme"];
import { useEffect, useRef, useState } from "react";
import {
  Alert,
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
import { login } from "../../features/auth/authService";



import { ConnectedUser } from "../../types/auth";

type LoginScreenProps = {
  onLoginSuccess: (user: ConnectedUser) => void;
  onCreateAccount: () => void;
  onForgotPassword: () => void;
};

export default function LoginScreen({
  onLoginSuccess,
  onCreateAccount,
  onForgotPassword,
}: LoginScreenProps) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // PATCH20_A1_LOGIN_KEYBOARD_CTA_SAFE
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
  const [errorMessage, setErrorMessage] = useState("");
  // MOBILE_LOGIN_KEYBOARD_SUBMIT_SAFE_V1
  const passwordInputRef = useRef<TextInput>(null);
  // MOBILE_LOGIN_KEYBOARD_SUBMIT_SAFE_V3
  const keyboardSubmitLockRef = useRef(false);

  async function handleLogin() {

    if (loading) {

      return;

    }
    if (!email.trim() || !password) {
      setErrorMessage("Saisis ton adresse e-mail et ton mot de passe.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const authResponse = await login({
        email: email.trim(),
        password,
      });

      onLoginSuccess({
        userId: authResponse.userId,
        email: authResponse.email,
        role: authResponse.role,
        firstName: authResponse.firstName,
        lastName: authResponse.lastName,
      });
    } catch (error: unknown) {
      const candidate = error as {
        response?: {
          data?: {
            message?: string;
            error?: string;
          };
        };
      };

      const backendMessage =
        candidate.response?.data?.message ||
        candidate.response?.data?.error ||
        "Connexion impossible. Vérifie ton adresse e-mail et ton mot de passe.";

      setErrorMessage(backendMessage);

      if (Platform.OS !== "web") {
        Alert.alert("Connexion impossible", backendMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyboardLogin() {
    if (keyboardSubmitLockRef.current || loading) {
      return;
    }

    keyboardSubmitLockRef.current = true;

    void handleLogin().finally(() => {
      keyboardSubmitLockRef.current = false;
    });
  }
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          keyboardVisible && styles.scrollContentKeyboard,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.brandBlock}>
        <SmartTrainingBrandLockup />
        <Text style={styles.subtitle}>
          Ton espace mobile pour apprendre, progresser et retrouver tes formations.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>Connexion</Text>

        {errorMessage.length > 0 ? (
          <ErrorMessage title="Connexion impossible" message={errorMessage} />
        ) : null}

        <Text style={styles.label}>Adresse e-mail</Text>
        <TextInput
          style={styles.input}
          placeholder="nom@entreprise.com"
              accessibilityLabel="Adresse e-mail"
              placeholderTextColor={theme.colors.foregroundSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
          value={email}
          onChangeText={setEmail}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          onKeyPress={(event) => {
            if (event.nativeEvent.key === "Enter") {
              passwordInputRef.current?.focus();
            }
          }}
        />

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
              accessibilityLabel="Mot de passe"
              placeholderTextColor={theme.colors.foregroundSubtle}
          secureTextEntry
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          ref={passwordInputRef}
          returnKeyType="go"
          blurOnSubmit
          onSubmitEditing={handleKeyboardLogin}
          onKeyPress={(event) => {
            if (event.nativeEvent.key === "Enter") {
              handleKeyboardLogin();
            }
          }}
/>

        <View style={styles.forgotRow}>

          <Pressable

            accessibilityRole="button"

            accessibilityLabel={

              "Mot de passe oubli\u00E9"

            }

            accessibilityHint={

              "Ouvre l\u2019\u00E9cran de r\u00E9initialisation du mot de passe"

            }

            accessibilityState={{

              disabled: loading,

            }}

            disabled={loading}

            onPress={onForgotPassword}

          >

            <Text style={styles.registerLink}>

              {"Mot de passe oubli\u00E9 ?"}

            </Text>

          </Pressable>

        </View>


        <AppButton
          title="Se connecter"
          onPress={() => void handleLogin()}
          loading={loading}
        />

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Pas encore de compte ?</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Créer mon compte"
            disabled={loading}
              accessibilityState={{ disabled: loading }}
            onPress={onCreateAccount}
          >
            <Text style={styles.registerLink}>Créer mon compte</Text>
          </Pressable>
        </View>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: SmartTheme) {
  return StyleSheet.create({
  // PATCH19_R1_LOGIN_KEYBOARD_SAFE_V1
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: theme.shape.cardPadding,
    paddingVertical: theme.shape.cardPadding * 1.5,
  },
  scrollContentKeyboard: {
    justifyContent: "flex-start",
    paddingTop: theme.shape.cardPadding,
    paddingBottom: theme.shape.cardPadding * 2.5,
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: theme.shape.cardPadding * 2,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  logoText: {
    color: theme.colors.accentForeground,
    fontSize: 24,
    fontWeight: "900",
  },
  logo: {
    fontSize: 31,
    fontWeight: "900",
    color: theme.colors.foreground,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  form: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.cardRadius,
    padding: theme.shape.cardPadding,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  formTitle: {
    color: theme.colors.foreground,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.foregroundMuted,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.shape.controlRadius,
    marginBottom: 14,
    color: theme.colors.foreground,
  },
  forgotRow: {
    alignItems: "flex-end",
    marginBottom: 14,
  },
  registerRow: {
    marginTop: 18,
    alignItems: "center",
    gap: 5,
  },
  registerText: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
  },
  registerLink: {
    color: theme.colors.accent,
    fontSize: 15,
    fontWeight: "800",
  },
});
}

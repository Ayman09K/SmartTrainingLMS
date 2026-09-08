import SmartTrainingBrandLockup from "../../components/branding/SmartTrainingBrandLockup";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
type SmartTheme = ReturnType<typeof useSmartTrainingTheme>["theme"];
import { useEffect, useState } from "react";
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
import { register } from "../../features/auth/authService";




type RegisterScreenProps = {
  onBackToLogin: () => void;
  onOpenPrivacy: () => void;
};

function registrationErrorMessage(error: unknown): string {
  const candidate = error as {
    response?: {
      data?: unknown;
    };
  };

  const data = candidate.response?.data;

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const message =
      typeof record.message === "string" ? record.message : "";
    const normalizedMessage = message.toLocaleLowerCase("fr");

    if (
      normalizedMessage.includes("existe déjà") ||
      normalizedMessage.includes("already")
    ) {
      return "Cette adresse e-mail est déjà utilisée.";
    }

    const fieldMessage = Object.values(record).find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );

    if (fieldMessage) {
      return fieldMessage;
    }
  }

  if (!candidate.response) {
    return "Impossible de joindre SmartTraining. Vérifie ta connexion puis réessaie.";
  }

  return "Impossible de créer le compte pour le moment.";
}

export default function RegisterScreen({
  onBackToLogin,
  onOpenPrivacy,
}: RegisterScreenProps) {
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [registered, setRegistered] = useState(false);

  async function handleRegister() {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      !normalizedEmail ||
      !password ||
      !confirmPassword
    ) {
      setErrorMessage("Tous les champs sont obligatoires.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorMessage("Saisis une adresse e-mail valide.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const response = await register({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        password,
      });

      if (response.role !== "APPRENANT") {
        setErrorMessage(
          "Le serveur n'a pas confirmé la création d'un compte apprenant.",
        );
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setRegistered(true);
    } catch (error: unknown) {
      const message = registrationErrorMessage(error);
      setErrorMessage(message);

      if (Platform.OS !== "web") {
        Alert.alert("Création du compte impossible", message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Compte créé avec succès</Text>
          <Text style={styles.successText}>
            Ton compte apprenant est prêt. Connecte-toi maintenant avec ton
            adresse e-mail et ton mot de passe.
          </Text>
          <AppButton title="Se connecter" onPress={onBackToLogin} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          keyboardVisible && styles.containerKeyboard,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandBlock}>
        <SmartTrainingBrandLockup />
          <Text style={styles.subtitle}>Crée ton espace apprenant.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Créer mon compte</Text>
          <Text style={styles.formHelp}>
            L’inscription publique crée toujours un compte Apprenant.
          </Text>

          {errorMessage.length > 0 ? (
            <ErrorMessage
              title="Création du compte impossible"
              message={errorMessage}
            />
          ) : null}

          <Text style={styles.label}>Prénom</Text>
          <TextInput
            style={styles.input}
            value={firstName}
              accessibilityLabel={"Pr\u00E9nom"}
            onChangeText={setFirstName}
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="givenName"
            maxLength={80}
          />

          <Text style={styles.label}>Nom</Text>
          <TextInput
            style={styles.input}
            value={lastName}
              accessibilityLabel="Nom"
            onChangeText={setLastName}
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="familyName"
            maxLength={80}
          />

          <Text style={styles.label}>Adresse e-mail</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="nom@entreprise.com"
              accessibilityLabel="Adresse e-mail"
              placeholderTextColor={theme.colors.foregroundSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            maxLength={150}
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="6 caractères minimum"
              accessibilityLabel="Mot de passe"
              placeholderTextColor={theme.colors.foregroundSubtle}
            secureTextEntry
            textContentType="newPassword"
          />

          <Text style={styles.label}>Confirmer le mot de passe</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Répète ton mot de passe"
              accessibilityLabel="Confirmer le mot de passe"
              placeholderTextColor={theme.colors.foregroundSubtle}
            secureTextEntry
            textContentType="newPassword"
            onSubmitEditing={() => void handleRegister()}
          />

          <AppButton
            title="Créer mon compte"
            onPress={() => void handleRegister()}
            loading={loading}
          />

          <View style={styles.loginRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ouvrir la politique de confidentialité"
              disabled={loading}
              onPress={onOpenPrivacy}
            >
              <Text style={styles.loginLink}>
                Politique de confidentialité
              </Text>
            </Pressable>
          </View>
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Déjà un compte ?</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retour à la connexion"
              disabled={loading}
              accessibilityState={{ disabled: loading }}
              onPress={onBackToLogin}
            >
              <Text style={styles.loginLink}>Se connecter</Text>
            </Pressable>
          </View>
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
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    padding: theme.shape.cardPadding,
    justifyContent: "center",
  },
    containerKeyboard: {
      justifyContent: "flex-start",
      paddingTop: theme.shape.cardPadding,
      paddingBottom: theme.shape.cardPadding * 2.5,
    },
  brandBlock: {
    alignItems: "center",
    marginTop: 18,
    marginBottom: theme.shape.cardPadding,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoText: {
    color: theme.colors.accentForeground,
    fontSize: 22,
    fontWeight: "900",
  },
  logo: {
    color: theme.colors.foreground,
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 5,
    color: theme.colors.foregroundMuted,
    fontSize: 15,
    textAlign: "center",
  },
  form: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.cardRadius,
    padding: theme.shape.cardPadding,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  formTitle: {
    color: theme.colors.foreground,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 5,
  },
  formHelp: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
    lineHeight: 20,
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
  loginRow: {
    marginTop: 18,
    alignItems: "center",
    gap: 5,
  },
  loginText: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
  },
  loginLink: {
    color: theme.colors.accent,
    fontSize: 15,
    fontWeight: "800",
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    padding: theme.shape.cardPadding,
    backgroundColor: theme.colors.background,
  },
  successCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.cardRadius,
    padding: theme.shape.cardPadding,
    alignItems: "center",
  },
  successIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
    marginBottom: 18,
  },
  successIconText: {
    color: theme.colors.success,
    fontSize: 30,
    fontWeight: "900",
  },
  successTitle: {
    color: theme.colors.foreground,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  successText: {
    color: theme.colors.foregroundMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: theme.shape.cardPadding,
  },
});
}

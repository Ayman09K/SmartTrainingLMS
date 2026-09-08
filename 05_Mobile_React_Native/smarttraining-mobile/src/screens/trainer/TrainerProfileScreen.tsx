import { isAxiosError } from "axios";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import AccountDeletionRequestCard from "../../components/account/AccountDeletionRequestCard";
import AccountSessionCard from "../../components/account/AccountSessionCard";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import {
  changeMyPassword,
  getMyProfile,
  updateMyProfile,
} from "../../features/auth/learnerProfileService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  LearnerCivilite,
  LearnerProfile,
} from "../../types/learnerProfile";

type Props = {
  onBackHome: () => void;
  onOpenAppearance: () => void;
  onOpenPrivacy: () => void;
};

const civilites: {
  value: LearnerCivilite;
  label: string;
}[] = [
  {
    value: "NON_RENSEIGNEE",
    label: "Non renseignée",
  },
  {
    value: "MONSIEUR",
    label: "Monsieur",
  },
  {
    value: "MADAME",
    label: "Madame",
  },
];

const MAX_AVATAR_DATA_URL_LENGTH = 1_500_000;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function initials(
  firstName: string,
  lastName: string,
): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);

  return `${first}${last}`.toUpperCase() || "?";
}

function messageFromError(
  error: unknown,
  fallback: string,
): string {
  if (!isAxiosError(error)) {
    return fallback;
  }

  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof data.message === "string" &&
    data.message.trim()
  ) {
    return data.message;
  }

  return fallback;
}

export default function TrainerProfileScreen({
  onBackHome,
  onOpenAppearance,
  onOpenPrivacy,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [profile, setProfile] =
    useState<LearnerProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [initialEmail, setInitialEmail] = useState("");
  const [civilite, setCivilite] =
    useState<LearnerCivilite>("NON_RENSEIGNEE");
  const [avatarDataUrl, setAvatarDataUrl] =
    useState<string | null>(null);
  const [currentEmailPassword, setCurrentEmailPassword] =
    useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [selectingPhoto, setSelectingPhoto] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const emailChanged =
    normalizeEmail(email) !== normalizeEmail(initialEmail);

  function applyProfile(next: LearnerProfile) {
    if (next.role !== "FORMATEUR") {
      throw new Error(
        "Le profil connecté n’est pas un profil formateur.",
      );
    }

    setProfile(next);
    setFirstName(next.firstName ?? "");
    setLastName(next.lastName ?? "");
    setEmail(next.email ?? "");
    setInitialEmail(next.email ?? "");
    setCivilite(
      next.civilite ?? "NON_RENSEIGNEE",
    );
    setAvatarDataUrl(next.avatarDataUrl ?? null);
  }

  async function loadProfile() {
    const next = await getMyProfile();
    applyProfile(next);
  }

  useEffect(() => {
    let active = true;

    void getMyProfile()
      .then((next) => {
        if (!active) {
          return;
        }

        if (next.role !== "FORMATEUR") {
          setProfileError(
            "Ce compte n’est pas autorisé dans l’espace formateur.",
          );
          return;
        }

        applyProfile(next);
        setProfileError("");
      })
      .catch((error) => {
        if (active) {
          setProfileError(
            messageFromError(
              error,
              "Impossible de charger votre profil formateur.",
            ),
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function refresh() {
    setRefreshing(true);

    try {
      await loadProfile();
      setProfileError("");
    } catch (error) {
      setProfileError(
        messageFromError(
          error,
          "Impossible d’actualiser votre profil.",
        ),
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function choosePhoto() {
    if (selectingPhoto) {
      return;
    }

    setSelectingPhoto(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.72,
          base64: true,
        });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset?.base64) {
        setProfileError(
          "La photo sélectionnée ne peut pas être préparée.",
        );
        return;
      }

      const dataUrl =
        `data:image/jpeg;base64,${asset.base64}`;

      if (dataUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
        setProfileError(
          "Cette photo est trop volumineuse. Choisissez une image plus légère.",
        );
        return;
      }

      setAvatarDataUrl(dataUrl);
    } catch {
      setProfileError(
        "Impossible d’ouvrir la galerie de photos.",
      );
    } finally {
      setSelectingPhoto(false);
    }
  }

  async function saveProfile() {
    const nextFirstName = firstName.trim();
    const nextLastName = lastName.trim();
    const nextEmail = normalizeEmail(email);

    setProfileError("");
    setProfileSuccess("");

    if (!nextFirstName || !nextLastName) {
      setProfileError(
        "Le prénom et le nom sont obligatoires.",
      );
      return;
    }

    if (!nextEmail || !nextEmail.includes("@")) {
      setProfileError(
        "Renseignez une adresse e-mail valide.",
      );
      return;
    }

    if (emailChanged && !currentEmailPassword) {
      setProfileError(
        "Le mot de passe actuel est obligatoire uniquement pour modifier l’adresse e-mail.",
      );
      return;
    }

    setSavingProfile(true);

    try {
      await updateMyProfile({
        firstName: nextFirstName,
        lastName: nextLastName,
        email: nextEmail,
        civilite,
        avatarDataUrl,
        currentPassword: emailChanged
          ? currentEmailPassword
          : undefined,
      });

      const fresh = await getMyProfile();
      applyProfile(fresh);
      setCurrentEmailPassword("");
      setProfileSuccess(
        "Votre profil formateur a été enregistré.",
      );
    } catch (error) {
      setProfileError(
        messageFromError(
          error,
          "Impossible d’enregistrer votre profil.",
        ),
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError(
        "Renseignez votre mot de passe actuel.",
      );
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(
        "Le nouveau mot de passe doit contenir au moins 6 caractères.",
      );
      return;
    }

    if (newPassword.length > 100) {
      setPasswordError(
        "Le nouveau mot de passe est trop long.",
      );
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError(
        "Le nouveau mot de passe doit être différent de l’actuel.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "La confirmation du nouveau mot de passe ne correspond pas.",
      );
      return;
    }

    setSavingPassword(true);

    try {
      await changeMyPassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(
        "Votre mot de passe a été modifié.",
      );
    } catch (error) {
      setPasswordError(
        messageFromError(
          error,
          "Impossible de modifier votre mot de passe.",
        ),
      );
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <LoadingState message="Chargement de votre compte..." />
    );
  }

  const inputStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.controlRadius,
    borderWidth: theme.shape.borderWidth,
    color: theme.colors.foreground,
    minHeight: theme.shape.minTouchTarget,
  };

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: theme.shape.cardPadding * 2,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <View style={styles.topActions}>
            <AppButton
              title="Retour à l’espace formateur"
              onPress={onBackHome}
              variant="secondary"
              style={styles.backButton}
            />
          </View>

          <SectionHeader
            title="Mon compte"
            subtitle="Gérez votre identité, votre photo, votre sécurité et l’apparence de votre espace."
          />

          {profileError ? (
            <ErrorMessage
              message={profileError}
              onRetry={() => void refresh()}
            />
          ) : null}

          {profileSuccess ? (
            <View
              style={[
                styles.success,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderRadius: theme.shape.cardRadius,
                },
              ]}
            >
              <Text
                style={[
                  styles.successText,
                  { color: theme.colors.foreground },
                ]}
              >
                {profileSuccess}
              </Text>
            </View>
          ) : null}

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
            <View style={styles.identityRow}>
              {avatarDataUrl ? (
                <Image
                  source={{ uri: avatarDataUrl }}
                  style={styles.avatar}
                  accessibilityLabel="Photo du profil formateur"
                />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    {
                      backgroundColor:
                        theme.colors.surfaceSoft,
                      borderColor: theme.colors.border,
                      borderWidth: theme.shape.borderWidth,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarText,
                      { color: theme.colors.accent },
                    ]}
                  >
                    {initials(firstName, lastName)}
                  </Text>
                </View>
              )}

              <View style={styles.identityCopy}>
                <Text
                  style={[
                    styles.eyebrow,
                    { color: theme.colors.foregroundSubtle },
                  ]}
                >
                  PROFIL CONNECTÉ
                </Text>
                <Text
                  style={[
                    styles.identityName,
                    { color: theme.colors.foreground },
                  ]}
                >
                  {[firstName, lastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim() || email}
                </Text>
                <Text
                  style={[
                    styles.identityEmail,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {email}
                </Text>
                <Text
                  style={[
                    styles.role,
                    { color: theme.colors.accent },
                  ]}
                >
                  Rôle : Formateur
                </Text>
              </View>
            </View>

            <View style={styles.photoActions}>
              <AppButton
                title={
                  selectingPhoto
                    ? "Ouverture..."
                    : "Choisir une photo"
                }
                onPress={() => void choosePhoto()}
                disabled={selectingPhoto}
                variant="secondary"
              />
              {avatarDataUrl ? (
                <AppButton
                  title="Retirer la photo"
                  onPress={() => setAvatarDataUrl(null)}
                  variant="secondary"
                />
              ) : null}
            </View>
          </View>

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
                styles.cardTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Informations personnelles
            </Text>

            <Text
              style={[
                styles.label,
                { color: theme.colors.foreground },
              ]}
            >
              Civilité
            </Text>

            <View style={styles.choiceRow}>
              {civilites.map((item) => {
                const selected = civilite === item.value;

                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    accessibilityLabel={`Civilité ${item.label}`}
                    accessibilityState={{ selected }}
                    onPress={() => setCivilite(item.value)}
                    style={[
                      styles.choice,
                      {
                        backgroundColor: selected
                          ? theme.colors.accent
                          : theme.colors.surfaceSoft,
                        borderColor: selected
                          ? theme.colors.accent
                          : theme.colors.border,
                        borderWidth:
                          theme.shape.borderWidth,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        {
                          color: selected
                            ? theme.colors.background
                            : theme.colors.foreground,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Field
              label="Prénom"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              accessibilityLabel="Prénom"
            />

            <Field
              label="Nom"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              accessibilityLabel="Nom"
            />

            <Field
              label="Adresse e-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              accessibilityLabel="Adresse e-mail"
            />

            {emailChanged ? (
              <>
                <Text
                  style={[
                    styles.help,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Pour protéger votre compte, le mot de passe
                  actuel est requis uniquement lorsque l’adresse
                  e-mail change.
                </Text>
                <TextInput
                  value={currentEmailPassword}
                  onChangeText={setCurrentEmailPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholder="Mot de passe actuel"
                  placeholderTextColor={
                    theme.colors.foregroundSubtle
                  }
                  accessibilityLabel="Mot de passe actuel pour confirmer le changement d’e-mail"
                  style={[styles.input, inputStyle]}
                />
              </>
            ) : null}

            <AppButton
              title={
                savingProfile
                  ? "Enregistrement..."
                  : "Enregistrer mon profil"
              }
              onPress={() => void saveProfile()}
              disabled={savingProfile}
              style={styles.saveButton}
            />
          </View>

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
                styles.cardTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Apparence
            </Text>
            <Text
              style={[
                styles.help,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Utilisez les mêmes thèmes et couleurs d’accent
              SmartTraining sur votre espace formateur.
            </Text>
            <AppButton
              title="Configurer l’apparence"
              onPress={onOpenAppearance}
              variant="secondary"
              style={styles.saveButton}
            />
          </View>

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
                styles.cardTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Sécurité
            </Text>

            {passwordError ? (
              <ErrorMessage message={passwordError} />
            ) : null}

            {passwordSuccess ? (
              <View
                style={[
                  styles.success,
                  {
                    backgroundColor:
                      theme.colors.surfaceSoft,
                    borderRadius: theme.shape.cardRadius,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.successText,
                    { color: theme.colors.foreground },
                  ]}
                >
                  {passwordSuccess}
                </Text>
              </View>
            ) : null}

            <PasswordField
              label="Mot de passe actuel"
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <PasswordField
              label="Nouveau mot de passe"
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <PasswordField
              label="Confirmer le nouveau mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <AppButton
              title={
                savingPassword
                  ? "Enregistrement..."
                  : "Modifier mon mot de passe"
              }
              onPress={() => void savePassword()}
              disabled={savingPassword}
              style={styles.saveButton}
            />
          </View>

          <AccountDeletionRequestCard />

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
              style={{
                color: theme.colors.accent,
                fontSize: 11,
                fontWeight: "900",
                letterSpacing: 0.8,
                marginBottom: 6,
              }}
            >
              CONFIDENTIALITÉ
            </Text>
            <Text
              style={{
                color: theme.colors.foreground,
                fontSize: 18,
                fontWeight: "900",
                lineHeight: 24,
              }}
            >
              Vos données et votre vie privée
            </Text>
            <Text
              style={{
                color: theme.colors.foregroundMuted,
                fontSize: 13,
                lineHeight: 20,
                marginTop: 8,
              }}
            >
              Consultez les données utilisées par SmartTraining, leurs finalités,
              les mesures de sécurité et les modalités de demande relatives à vos données.
            </Text>

            <AppButton
              title="Voir la politique de confidentialité"
              onPress={onOpenPrivacy}
              variant="secondary"
              style={styles.saveButton}
            />
          </View>
          <AccountSessionCard />

          {profile ? (
            <Text
              style={[
                styles.accountState,
                { color: theme.colors.foregroundSubtle },
              ]}
            >
              Compte actif · profil Formateur
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function Field({
    label,
    value,
    onChangeText,
    autoCapitalize,
    keyboardType,
    accessibilityLabel,
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    autoCapitalize: "none" | "words";
    keyboardType?: "email-address";
    accessibilityLabel: string;
  }) {
    return (
      <View style={styles.field}>
        <Text
          style={[
            styles.label,
            { color: theme.colors.foreground },
          ]}
        >
          {label}
        </Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          maxLength={150}
          placeholderTextColor={
            theme.colors.foregroundSubtle
          }
          accessibilityLabel={accessibilityLabel}
          style={[styles.input, inputStyle]}
        />
      </View>
    );
  }

  function PasswordField({
    label,
    value,
    onChangeText,
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
  }) {
    return (
      <View style={styles.field}>
        <Text
          style={[
            styles.label,
            { color: theme.colors.foreground },
          ]}
        >
          {label}
        </Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry
          autoCapitalize="none"
          maxLength={100}
          placeholderTextColor={
            theme.colors.foregroundSubtle
          }
          accessibilityLabel={label}
          style={[styles.input, inputStyle]}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flexGrow: 1,
  },
  page: {
    width: "100%",
    maxWidth: 920,
    alignSelf: "center",
  },
  topActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  backButton: {
    alignSelf: "flex-start",
  },
  logoutButton: {
    alignSelf: "flex-start",
  },
  card: {
    marginBottom: 18,
  },
  identityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  avatarFallback: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 30,
    fontWeight: "900",
  },
  identityCopy: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 220,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  identityName: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 5,
  },
  identityEmail: {
    fontSize: 13,
    marginTop: 4,
  },
  role: {
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8,
  },
  photoActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 4,
  },
  field: {
    marginTop: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 7,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 2,
  },
  choice: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  choiceText: {
    fontSize: 12,
    fontWeight: "900",
  },
  help: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 10,
  },
  saveButton: {
    alignSelf: "flex-start",
    marginTop: 16,
    minWidth: 200,
  },
  success: {
    padding: 12,
    marginBottom: 14,
  },
  successText: {
    fontSize: 13,
    fontWeight: "800",
  },
  accountState: {
    fontSize: 11,
    textAlign: "center",
    marginBottom: 10,
  },
});

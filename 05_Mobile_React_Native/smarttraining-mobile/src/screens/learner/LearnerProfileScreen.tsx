import { isAxiosError } from "axios";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
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
import { AppEmptyState, AppErrorState } from "../../components/ux/AppStates";
import {
  changeMyPassword,
  getMyProfile,
  updateMyProfile,
} from "../../features/auth/learnerProfileService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
  LearnerCivilite,
  LearnerProfile,
} from "../../types/learnerProfile";

type Props = {
  onBackHome: () => void;
  onOpenBecomeTrainer: () => void;
  onOpenAppearance: () => void;
  onOpenPrivacy: () => void;
};

const civilites: {
  value: LearnerCivilite;
  label: string;
}[] = [
  { value: "NON_RENSEIGNEE", label: "Non renseign\u00E9e" },
  { value: "MONSIEUR", label: "Monsieur" },
  { value: "MADAME", label: "Madame" },
];

const MAX_AVATAR_DATA_URL_LENGTH = 1_500_000;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function messageFromError(error: unknown, fallback: string): string {
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

function initials(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);

  return `${first}${last}`.toUpperCase() || "?";
}

export default function LearnerProfileScreen({
  onBackHome,
  onOpenBecomeTrainer,
  onOpenAppearance,
  onOpenPrivacy,
}: Props) {
  const { theme, themeName } = useSmartTrainingTheme();

  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [initialEmail, setInitialEmail] = useState("");
  const [civilite, setCivilite] = useState<LearnerCivilite>("NON_RENSEIGNEE");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [currentEmailPassword, setCurrentEmailPassword] = useState("");

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

  useEffect(() => {
    type WebStyleNode = {
      id: string;
      textContent: string | null;
      remove: () => void;
    };

    type WebDocument = {
      head?: {
        appendChild: (node: WebStyleNode) => void;
      };
      documentElement?: {
        style?: {
          colorScheme?: string;
        };
      };
      getElementById: (id: string) => WebStyleNode | null;
      createElement: (tagName: string) => WebStyleNode;
    };

    const webDocument = (
      globalThis as unknown as { document?: WebDocument }
    ).document;

    if (!webDocument?.head) {
      return;
    }

    const styleId = "smarttraining-profile-autofill-theme";
    const existing = webDocument.getElementById(styleId);

    if (existing) {
      existing.remove();
    }

    const styleNode = webDocument.createElement("style");
    const background = theme.colors.surfaceElevated;
    const foreground = theme.colors.foreground;

    styleNode.id = styleId;
    styleNode.textContent = `
      input:autofill,
      input:-webkit-autofill {
        background-color: ${background} !important;
        color: ${foreground} !important;
        box-shadow: 0 0 0 1000px ${background} inset !important;
        -webkit-box-shadow: 0 0 0 1000px ${background} inset !important;
        -webkit-text-fill-color: ${foreground} !important;
        caret-color: ${foreground} !important;
        filter: none !important;
      }
    `;

    webDocument.head.appendChild(styleNode);

    const rootStyle = webDocument.documentElement?.style;
    const previousColorScheme = rootStyle?.colorScheme ?? "";

    if (rootStyle) {
      rootStyle.colorScheme =
        themeName === "DARK" ? "dark" : "light";
    }

    return () => {
      styleNode.remove();

      if (rootStyle) {
        rootStyle.colorScheme = previousColorScheme;
      }
    };
  }, [
    theme.colors.foreground,
    theme.colors.surfaceElevated,
    themeName,
  ]);

  function applyProfile(data: LearnerProfile) {
    setProfile(data);
    setFirstName(data.firstName ?? "");
    setLastName(data.lastName ?? "");
    setEmail(data.email ?? "");
    setInitialEmail(data.email ?? "");
    setCivilite(data.civilite ?? "NON_RENSEIGNEE");
    setAvatarDataUrl(data.avatarDataUrl ?? null);
    setCurrentEmailPassword("");
  }

  async function load() {
    const data = await getMyProfile();
    applyProfile(data);
  }

  useEffect(() => {
    let active = true;

    void getMyProfile()
      .then((data) => {
        if (!active) return;
        applyProfile(data);
        setProfileError("");
      })
      .catch((error: unknown) => {
        if (active) {
          setProfileError(
            messageFromError(error, "Impossible de charger ton profil."),
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

  const displayInitials = useMemo(
    () => initials(firstName, lastName),
    [firstName, lastName],
  );

  async function refresh() {
    setRefreshing(true);
    setProfileSuccess("");

    try {
      await load();
      setProfileError("");
    }
    catch (error: unknown) {
      setProfileError(
        messageFromError(error, "Impossible d\u2019actualiser ton profil."),
      );
    }
    finally {
      setRefreshing(false);
    }
  }

  async function choosePhoto() {
    setSelectingPhoto(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset?.base64) {
        setProfileError(
          "La photo s\u00E9lectionn\u00E9e n\u2019a pas pu \u00EAtre pr\u00E9par\u00E9e.",
        );
        return;
      }

      const dataUrl = `data:image/jpeg;base64,${asset.base64}`;

      if (dataUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
        setProfileError(
          "Cette photo est trop volumineuse. Choisis une image plus l\u00E9g\u00E8re.",
        );
        return;
      }

      setAvatarDataUrl(dataUrl);
    }
    catch {
      setProfileError(
        "Impossible d\u2019ouvrir la biblioth\u00E8que de photos.",
      );
    }
    finally {
      setSelectingPhoto(false);
    }
  }

  async function saveProfile() {
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = normalizeEmail(email);

    if (!cleanFirstName || !cleanLastName || !cleanEmail) {
      setProfileError(
        "Le pr\u00E9nom, le nom et l\u2019adresse e-mail sont obligatoires.",
      );
      return;
    }

    if (!cleanEmail.includes("@")) {
      setProfileError("L\u2019adresse e-mail n\u2019est pas valide.");
      return;
    }

    if (emailChanged && !currentEmailPassword) {
      setProfileError(
        "Saisis ton mot de passe actuel pour modifier l\u2019adresse e-mail.",
      );
      return;
    }

    setSavingProfile(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const updated = await updateMyProfile({
        firstName: cleanFirstName,
        lastName: cleanLastName,
        email: cleanEmail,
        civilite,
        avatarDataUrl,
        currentPassword: emailChanged
          ? currentEmailPassword
          : undefined,
      });

      setFirstName(updated.firstName);
      setLastName(updated.lastName);
      setEmail(updated.email);
      setInitialEmail(updated.email);
      setCivilite(updated.civilite);
      setAvatarDataUrl(updated.avatarDataUrl ?? null);
      setCurrentEmailPassword("");

      setProfile((current) =>
        current
          ? {
              ...current,
              firstName: updated.firstName,
              lastName: updated.lastName,
              fullName: `${updated.firstName} ${updated.lastName}`.trim(),
              email: updated.email,
              civilite: updated.civilite,
              avatarDataUrl: updated.avatarDataUrl ?? null,
              role: updated.role,
              accountStatus:
                updated.accountStatus ?? current.accountStatus,
            }
          : current,
      );

      setProfileSuccess("Ton profil a \u00E9t\u00E9 mis \u00E0 jour.");
    }
    catch (error: unknown) {
      setProfileError(
        messageFromError(
          error,
          "Ton profil n\u2019a pas pu \u00EAtre enregistr\u00E9.",
        ),
      );
    }
    finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    if (!currentPassword) {
      setPasswordError("Saisis ton mot de passe actuel.");
      return;
    }

    if (newPassword.length < 6 || newPassword.length > 100) {
      setPasswordError(
        "Le nouveau mot de passe doit contenir entre 6 et 100 caract\u00E8res.",
      );
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError(
        "Le nouveau mot de passe doit \u00EAtre diff\u00E9rent de l\u2019ancien.",
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
    setPasswordError("");
    setPasswordSuccess("");

    try {
      await changeMyPassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(
        "Ton mot de passe a \u00E9t\u00E9 modifi\u00E9.",
      );
    }
    catch (error: unknown) {
      setPasswordError(
        messageFromError(
          error,
          "Le mot de passe n\u2019a pas pu \u00EAtre modifi\u00E9.",
        ),
      );
    }
    finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return <LoadingState message="Chargement de ton compte..." />;
  }

  if (!profile) {
    return (
      <ScreenContainer>
        {profileError ? (
          <AppErrorState
            title="Profil indisponible"
            description={profileError}
            actionLabel="Réessayer"
            onAction={() => void refresh()}
          />
        ) : (
          <AppEmptyState
            title="Profil indisponible"
            description="Aucune information de profil n’est disponible pour le moment. Réessaie pour recharger ton compte."
            actionLabel="Réessayer"
            onAction={() => void refresh()}
          />
        )}
      </ScreenContainer>
    );
  }

  const inputStyle = {
    borderColor: theme.colors.border,
    borderRadius: theme.shape.controlRadius,
    borderWidth: theme.shape.borderWidth,
    backgroundColor: theme.colors.surfaceElevated,
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
          <AppButton
            title={"Retour \u00E0 l\u2019accueil"}
            onPress={onBackHome}
            variant="secondary"
            style={styles.backButton}
          />

          <View
            style={[
              styles.introPanel,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <SectionHeader
              title="Mon compte"
              subtitle={
                "G\u00E8re ton identit\u00E9, ta photo, la s\u00E9curit\u00E9 et l\u2019apparence de ton espace."
              }
            />

            <View style={styles.identityRow}>
              {avatarDataUrl ? (
                <Image
                  source={{ uri: avatarDataUrl }}
                  accessibilityLabel="Photo de profil"
                  style={[
                    styles.avatar,
                    {
                      borderColor: theme.colors.border,
                    },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    {
                      backgroundColor: theme.colors.accent,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarInitials,
                      {
                        color: theme.colors.accentForeground,
                      },
                    ]}
                  >
                    {displayInitials}
                  </Text>
                </View>
              )}

              <View style={styles.identityText}>
                <Text
                  style={[
                    styles.identityName,
                    {
                      color: theme.colors.foreground,
                    },
                  ]}
                >
                  {[firstName, lastName].filter(Boolean).join(" ")}
                </Text>
                <Text
                  style={[
                    styles.identityEmail,
                    {
                      color: theme.colors.foregroundMuted,
                    },
                  ]}
                >
                  {email}
                </Text>
                <View
                  style={[
                    styles.rolePill,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.rolePillText,
                      {
                        color: theme.colors.accent,
                      },
                    ]}
                  >
                    Apprenant
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {profileSuccess ? (
            <View
              style={[
                styles.successBox,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderColor: theme.colors.success,
                  borderRadius: theme.shape.controlRadius,
                  borderWidth: Math.max(1, theme.shape.borderWidth),
                  padding: theme.shape.cardPadding,
                },
              ]}
            >
              <Text
                style={[
                  styles.successText,
                  {
                    color: theme.colors.success,
                  },
                ]}
              >
                {profileSuccess}
              </Text>
            </View>
          ) : null}

          {profileError ? (
            <ErrorMessage message={profileError} />
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
            <Text style={[styles.cardEyebrow,{ color: theme.colors.accent }]}>
              PHOTO
            </Text>
            <Text style={[styles.cardTitle,{ color: theme.colors.foreground }]}>
              Photo de profil
            </Text>
            <Text style={[styles.helpText,{ color: theme.colors.foregroundMuted }]}>
              {"Choisis une image depuis ton appareil. La photo sera enregistr\u00E9e avec ton profil."}
            </Text>

            <View style={styles.buttonRow}>
              <AppButton
                title={selectingPhoto ? "Ouverture..." : "Choisir une photo"}
                onPress={() => void choosePhoto()}
                loading={selectingPhoto}
                variant="secondary"
                style={styles.flexButton}
              />

              {avatarDataUrl ? (
                <AppButton
                  title="Supprimer la photo"
                  onPress={() => setAvatarDataUrl(null)}
                  variant="secondary"
                  style={styles.flexButton}
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
            <Text style={[styles.cardEyebrow,{ color: theme.colors.accent }]}>
              {"IDENTIT\u00C9"}
            </Text>
            <Text style={[styles.cardTitle,{ color: theme.colors.foreground }]}>
              Informations personnelles
            </Text>

            <Text style={[styles.label,{ color: theme.colors.foreground }]}>
              {"Civilit\u00E9"}
            </Text>

            <View style={styles.choiceRow}>
              {civilites.map((item) => {
                const selected = item.value === civilite;

                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setCivilite(item.value)}
                    accessibilityRole="radio"
                accessibilityLabel={item.label}
                accessibilityState={{ selected }}
                    style={[
                      styles.choice,
                      {
                        borderColor: selected
                          ? theme.colors.accent
                          : theme.colors.border,
                        borderWidth: selected
                          ? Math.max(2, theme.shape.borderWidth)
                          : theme.shape.borderWidth,
                        borderRadius: theme.shape.controlRadius,
                        backgroundColor: selected
                          ? theme.colors.surfaceSoft
                          : theme.colors.surfaceElevated,
                        minHeight: theme.shape.minTouchTarget,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        {
                          color: selected
                            ? theme.colors.accent
                            : theme.colors.foregroundMuted,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label,{ color: theme.colors.foreground }]}>
              {"Pr\u00E9nom"}
            </Text>
            <TextInput
              value={firstName}
              accessibilityLabel={"Pr\u00E9nom"}
              onChangeText={setFirstName}
              autoCapitalize="words"
              maxLength={80}
              placeholderTextColor={theme.colors.foregroundSubtle}
              style={[styles.input, inputStyle]}
            />

            <Text style={[styles.label,{ color: theme.colors.foreground }]}>
              Nom
            </Text>
            <TextInput
              value={lastName}
              accessibilityLabel="Nom"
              onChangeText={setLastName}
              autoCapitalize="words"
              maxLength={80}
              placeholderTextColor={theme.colors.foregroundSubtle}
              style={[styles.input, inputStyle]}
            />

            <Text style={[styles.label,{ color: theme.colors.foreground }]}>
              Adresse e-mail
            </Text>
            <TextInput
              value={email}
              accessibilityLabel="Adresse e-mail"
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              maxLength={150}
              placeholderTextColor={theme.colors.foregroundSubtle}
              style={[styles.input, inputStyle]}
            />

            {emailChanged ? (
              <View
                style={[
                  styles.securityBox,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.warning,
                    borderRadius: theme.shape.controlRadius,
                    borderWidth: Math.max(1, theme.shape.borderWidth),
                    padding: theme.shape.cardPadding,
                  },
                ]}
              >
                <Text style={[styles.securityTitle,{ color: theme.colors.warning }]}>
                  {"V\u00E9rification de s\u00E9curit\u00E9"}
                </Text>
                <Text style={[styles.helpText,{ color: theme.colors.foregroundMuted }]}>
                  {"Ton mot de passe actuel est obligatoire uniquement parce que tu modifies ton adresse e-mail."}
                </Text>

                <TextInput
                  value={currentEmailPassword}
              accessibilityLabel={"Mot de passe actuel pour modifier l\u2019adresse e-mail"}
                  onChangeText={setCurrentEmailPassword}
                  secureTextEntry
                  placeholder="Mot de passe actuel"
                  placeholderTextColor={theme.colors.foregroundSubtle}
                  autoCapitalize="none"
                  style={[styles.input, inputStyle]}
                />
              </View>
            ) : null}

            <View
              style={[
                styles.readOnlyBox,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderRadius: theme.shape.controlRadius,
                },
              ]}
            >
              <Text style={[styles.readOnlyLabel,{ color: theme.colors.foregroundSubtle }]}>
                {"R\u00F4le"}
              </Text>
              <Text style={[styles.readOnlyValue,{ color: theme.colors.foreground }]}>
                Apprenant
              </Text>
            </View>

            <AppButton
              title="Enregistrer mon profil"
              onPress={() => void saveProfile()}
              loading={savingProfile}
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
            <Text style={[styles.cardEyebrow,{ color: theme.colors.accent }]}>
              {"\u00C9VOLUTION"}
            </Text>
            <Text style={[styles.cardTitle,{ color: theme.colors.foreground }]}>
              {"\u00C9volution du compte"}
            </Text>
            <Text style={[styles.helpText,{ color: theme.colors.foregroundMuted }]}>
              {"Ton r\u00F4le actuel est Apprenant. Si tu souhaites \u00E9galement cr\u00E9er et animer des formations, tu peux envoyer une demande \u00E0 l\u2019administration."}
            </Text>

            <View
              style={[
                styles.readOnlyBox,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderRadius: theme.shape.controlRadius,
                },
              ]}
            >
              <Text style={[styles.readOnlyLabel,{ color: theme.colors.foregroundSubtle }]}>
                {"R\u00F4le actuel"}
              </Text>
              <Text style={[styles.readOnlyValue,{ color: theme.colors.foreground }]}>
                Apprenant
              </Text>
            </View>

            <AppButton
              title={"Demander \u00E0 devenir formateur"}
              onPress={onOpenBecomeTrainer}
              variant="secondary"
              style={styles.saveButton}
            />
          </View>

          <View
            style={[
              styles.appearanceCard,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.accent,
                borderRadius: theme.shape.cardRadius,
                borderWidth: Math.max(2, theme.shape.borderWidth),
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <View style={styles.appearanceCopy}>
              <Text style={[styles.cardEyebrow,{ color: theme.colors.accent }]}>
                APPARENCE
              </Text>
              <Text style={[styles.cardTitle,{ color: theme.colors.foreground }]}>
                Personnaliser mon espace
              </Text>
              <Text style={[styles.helpText,{ color: theme.colors.foregroundMuted }]}>
                {"Choisis le th\u00E8me et la couleur d\u2019accent de SmartTraining. Tes pr\u00E9f\u00E9rences sont li\u00E9es \u00E0 ton compte."}
              </Text>
            </View>

            <AppButton
              title={"Configurer l\u2019apparence"}
              onPress={onOpenAppearance}
              variant="secondary"
              style={styles.appearanceButton}
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
            <Text style={[styles.cardEyebrow,{ color: theme.colors.accent }]}>
              {"S\u00C9CURIT\u00C9"}
            </Text>
            <Text style={[styles.cardTitle,{ color: theme.colors.foreground }]}>
              Changer mon mot de passe
            </Text>
            <Text style={[styles.helpText,{ color: theme.colors.foregroundMuted }]}>
              {"Le nouveau mot de passe doit contenir entre 6 et 100 caract\u00E8res et \u00EAtre diff\u00E9rent de l\u2019ancien."}
            </Text>

            {passwordSuccess ? (
              <View
                style={[
                  styles.successBox,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.success,
                    borderRadius: theme.shape.controlRadius,
                    borderWidth: Math.max(1, theme.shape.borderWidth),
                    padding: theme.shape.cardPadding,
                  },
                ]}
              >
                <Text style={[styles.successText,{ color: theme.colors.success }]}>
                  {passwordSuccess}
                </Text>
              </View>
            ) : null}

            {passwordError ? (
              <ErrorMessage message={passwordError} />
            ) : null}

            <Text style={[styles.label,{ color: theme.colors.foreground }]}>
              Mot de passe actuel
            </Text>
            <TextInput
              value={currentPassword}
              accessibilityLabel="Mot de passe actuel"
              onChangeText={setCurrentPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor={theme.colors.foregroundSubtle}
              style={[styles.input, inputStyle]}
            />

            <Text style={[styles.label,{ color: theme.colors.foreground }]}>
              Nouveau mot de passe
            </Text>
            <TextInput
              value={newPassword}
              accessibilityLabel="Nouveau mot de passe"
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              maxLength={100}
              placeholderTextColor={theme.colors.foregroundSubtle}
              style={[styles.input, inputStyle]}
            />

            <Text style={[styles.label,{ color: theme.colors.foreground }]}>
              Confirmer le nouveau mot de passe
            </Text>
            <TextInput
              value={confirmPassword}
              accessibilityLabel="Confirmer le nouveau mot de passe"
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              maxLength={100}
              placeholderTextColor={theme.colors.foregroundSubtle}
              style={[styles.input, inputStyle]}
            />

            <AppButton
              title="Modifier mon mot de passe"
              onPress={() => void savePassword()}
              loading={savingPassword}
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

          {profile?.createdAt ? (
            <Text style={[styles.accountMeta,{ color: theme.colors.foregroundSubtle }]}>
              Compte SmartTraining actif
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
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
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  introPanel: {
    marginBottom: 20,
  },
  identityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 18,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
  },
  avatarFallback: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: "900",
  },
  identityText: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 220,
  },
  identityName: {
    fontSize: 22,
    fontWeight: "900",
  },
  identityEmail: {
    fontSize: 14,
    marginTop: 4,
  },
  rolePill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: "900",
  },
  card: {
    marginBottom: 18,
  },
  appearanceCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 18,
  },
  appearanceCopy: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 240,
  },
  appearanceButton: {
    minWidth: 180,
  },
  cardEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  choice: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  choiceText: {
    fontSize: 14,
    fontWeight: "800",
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  flexButton: {
    flexGrow: 1,
    minWidth: 170,
  },
  securityBox: {
    marginTop: 18,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 6,
  },
  readOnlyBox: {
    padding: 14,
    marginTop: 18,
  },
  readOnlyLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  readOnlyValue: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 4,
  },
  saveButton: {
    alignSelf: "flex-start",
    minWidth: 190,
    marginTop: 18,
  },
  successBox: {
    marginBottom: 16,
  },
  successText: {
    fontSize: 14,
    fontWeight: "800",
  },
  accountMeta: {
    fontSize: 11,
    textAlign: "center",
    marginBottom: 18,
  },
});
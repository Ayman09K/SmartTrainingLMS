import { isAxiosError } from "axios";
import * as ImagePicker from "expo-image-picker";
import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import AccountDeletionRequestCard from "../../components/account/AccountDeletionRequestCard";
import AccountSessionCard from "../../components/account/AccountSessionCard";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  changeMyPassword,
  getMyProfile,
  updateMyProfile,
} from "../../features/auth/learnerProfileService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  LearnerCivilite,
  LearnerProfile,
} from "../../types/learnerProfile";

type Props = {
  onBackHome: () => void;
  onOpenAppearance: () => void;
  onOpenPrivacy: () => void;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  autoCapitalize?: "none" | "words";
  keyboardType?: "email-address";
  secureTextEntry?: boolean;
  maxLength?: number;
  accessibilityLabel: string;
  placeholder?: string;
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

function initials(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);

  return `${first}${last}`.toUpperCase() || "?";
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

function ProfileField({
  label,
  value,
  onChangeText,
  autoCapitalize = "none",
  keyboardType,
  secureTextEntry = false,
  maxLength = 150,
  accessibilityLabel,
  placeholder,
}: FieldProps) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View className="mb-3">
      <Text
        className="mb-1.5 text-[12px] font-black"
        style={{ color: theme.colors.foreground }}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.foregroundSubtle}
        accessibilityLabel={accessibilityLabel}
        className="h-[50px] rounded-[14px] border px-3.5 text-[14px]"
        style={{
          backgroundColor: "#FCFBFD",
          borderColor: "#E5DFE8",
          color: theme.colors.foreground,
        }}
      />
    </View>
  );
}

export default function AdminProfileScreen({
  onBackHome,
  onOpenAppearance,
  onOpenPrivacy,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [initialEmail, setInitialEmail] = useState("");
  const [civilite, setCivilite] =
    useState<LearnerCivilite>("NON_RENSEIGNEE");
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

  function applyProfile(next: LearnerProfile) {
    if (next.role !== "ADMIN") {
      throw new Error("Le profil connecté n’est pas un profil administrateur.");
    }

    setProfile(next);
    setFirstName(next.firstName ?? "");
    setLastName(next.lastName ?? "");
    setEmail(next.email ?? "");
    setInitialEmail(next.email ?? "");
    setCivilite(next.civilite ?? "NON_RENSEIGNEE");
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

        if (next.role !== "ADMIN") {
          setProfileError(
            "Ce compte n’est pas autorisé dans l’espace administrateur.",
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
              "Impossible de charger votre profil administrateur.",
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
      const result = await ImagePicker.launchImageLibraryAsync({
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
        setProfileError("La photo sélectionnée ne peut pas être préparée.");
        return;
      }

      const dataUrl = `data:image/jpeg;base64,${asset.base64}`;

      if (dataUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
        setProfileError(
          "Cette photo est trop volumineuse. Choisissez une image plus légère.",
        );
        return;
      }

      setAvatarDataUrl(dataUrl);
    } catch {
      setProfileError("Impossible d’ouvrir la galerie de photos.");
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
      setProfileError("Le prénom et le nom sont obligatoires.");
      return;
    }

    if (!nextEmail || !nextEmail.includes("@")) {
      setProfileError("Renseignez une adresse e-mail valide.");
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
      setProfileSuccess("Votre profil administrateur a été enregistré.");
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
      setPasswordError("Renseignez votre mot de passe actuel.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(
        "Le nouveau mot de passe doit contenir au moins 6 caractères.",
      );
      return;
    }

    if (newPassword.length > 100) {
      setPasswordError("Le nouveau mot de passe est trop long.");
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
      setPasswordSuccess("Votre mot de passe a été modifié.");
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
    return <LoadingState message="Chargement de votre compte..." />;
  }

  const displayName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || email;

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{ padding: 0, backgroundColor: "#F8F6F3" }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={16}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={theme.colors.accent}
              colors={[theme.colors.accent]}
            />
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
        >
          <View className="mx-auto w-full max-w-[760px] px-4">
            <View
              className="mt-4 overflow-hidden rounded-[24px] border bg-white"
              style={{
                borderColor: "#E5DFE8",
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.05,
                shadowRadius: 9,
                elevation: 2,
              }}
            >
              <View className="h-1.5 bg-[#7C3AED]" />

              <View className="p-4">
                <View className="flex-row items-center">
                  {avatarDataUrl ? (
                    <Image
                      source={{ uri: avatarDataUrl }}
                      className="h-[70px] w-[70px] rounded-full"
                      accessibilityLabel="Photo du profil administrateur"
                    />
                  ) : (
                    <View className="h-[70px] w-[70px] items-center justify-center rounded-full bg-[#F1E9FF]">
                      <Text className="text-[22px] font-black text-[#7C3AED]">
                        {initials(firstName, lastName)}
                      </Text>
                    </View>
                  )}

                  <View className="ml-4 min-w-0 flex-1">
                    <View className="self-start rounded-full bg-[#F3EEFF] px-2.5 py-1">
                      <Text className="text-[10px] font-black uppercase tracking-[0.6px] text-[#7C3AED]">
                        Administrateur
                      </Text>
                    </View>

                    <Text
                      numberOfLines={1}
                      className="mt-2 text-[21px] font-black"
                      style={{ color: theme.colors.foreground }}
                    >
                      {displayName}
                    </Text>

                    <Text
                      numberOfLines={1}
                      className="mt-0.5 text-[12px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      {email}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row gap-2">
                  <SmallAction
                    icon={{
                      ios: "photo.fill",
                      android: "photo_library",
                      web: "photo_library",
                    }}
                    label={selectingPhoto ? "Ouverture..." : "Photo"}
                    onPress={() => void choosePhoto()}
                    disabled={selectingPhoto}
                  />

                  {avatarDataUrl ? (
                    <SmallAction
                      icon={{
                        ios: "trash.fill",
                        android: "delete",
                        web: "delete",
                      }}
                      label="Retirer"
                      onPress={() => setAvatarDataUrl(null)}
                    />
                  ) : null}

                  <SmallAction
                    icon={{
                      ios: "house.fill",
                      android: "home",
                      web: "home",
                    }}
                    label="Espace"
                    onPress={onBackHome}
                  />
                </View>
              </View>
            </View>

            {profileError ? (
              <View className="mt-3">
                <ErrorMessage
                  message={profileError}
                  onRetry={() => void refresh()}
                />
              </View>
            ) : null}

            {profileSuccess ? (
              <SuccessBanner message={profileSuccess} />
            ) : null}

            <SectionTitle
              eyebrow="Identité"
              title="Informations personnelles"
              icon={{
                ios: "person.text.rectangle.fill",
                android: "badge",
                web: "badge",
              }}
            />

            <View
              className="rounded-[20px] border bg-white p-3.5"
              style={{ borderColor: "#E5DFE8" }}
            >
              <Text
                className="mb-2 text-[12px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Civilité
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingRight: 4 }}
              >
                {civilites.map((item) => {
                  const selected = civilite === item.value;

                  return (
                    <Pressable
                      key={item.value}
                      accessibilityRole="button"
                      accessibilityLabel={`Civilité ${item.label}`}
                      accessibilityState={{ selected }}
                      onPress={() => setCivilite(item.value)}
                      android_ripple={{ color: "transparent" }}
                      className="h-[40px] items-center justify-center rounded-[12px] border px-3"
                      style={{
                        backgroundColor: selected
                          ? theme.colors.accent
                          : theme.colors.surface,
                        borderColor: selected
                          ? theme.colors.accent
                          : theme.colors.border,
                      }}
                    >
                      <Text
                        className="text-[14px] font-black"
                        style={{
                          color: selected ? "#FFFFFF" : theme.colors.foregroundMuted,
                        }}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View className="mt-4">
                <ProfileField
                  label="Prénom"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  accessibilityLabel="Prénom"
                />

                <ProfileField
                  label="Nom"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  accessibilityLabel="Nom"
                />

                <ProfileField
                  label="Adresse e-mail"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  accessibilityLabel="Adresse e-mail"
                />

                {emailChanged ? (
                  <View
                    className="mb-3 rounded-[15px] border px-3 py-3"
                    style={{
                      backgroundColor: "#FFF9EE",
                      borderColor: "#F1D6A8",
                    }}
                  >
                    <View className="mb-2 flex-row items-start">
                      <SymbolView
                        name={{
                          ios: "lock.shield.fill",
                          android: "verified_user",
                          web: "verified_user",
                        }}
                        tintColor="#B76B00"
                        size={13}
                        weight="bold"
                      />
                      <Text className="ml-2 flex-1 text-[11px] leading-[17px] text-[#80521A]">
                        Pour protéger votre compte, le mot de passe actuel est requis uniquement lorsque l’adresse e-mail change.
                      </Text>
                    </View>

                    <ProfileField
                      label="Mot de passe actuel"
                      value={currentEmailPassword}
                      onChangeText={setCurrentEmailPassword}
                      autoCapitalize="none"
                      secureTextEntry
                      maxLength={100}
                      accessibilityLabel="Mot de passe actuel pour confirmer le changement d’e-mail"
                      placeholder="Confirmer le changement d’e-mail"
                    />
                  </View>
                ) : null}

                <PrimaryButton
                  icon={{
                    ios: "checkmark.circle.fill",
                    android: "save",
                    web: "save",
                  }}
                  label={
                    savingProfile
                      ? "Enregistrement..."
                      : "Enregistrer mon profil"
                  }
                  disabled={savingProfile}
                  onPress={() => void saveProfile()}
                />
              </View>
            </View>

            <SectionTitle
              eyebrow="Préférences"
              title="Apparence"
              icon={{
                ios: "paintbrush.fill",
                android: "palette",
                web: "palette",
              }}
            />

            <FeatureCard
              icon={{
                ios: "paintbrush.pointed.fill",
                android: "palette",
                web: "palette",
              }}
              title="Personnaliser l’interface"
              description="Configurez les thèmes et couleurs d’accent de votre espace administrateur."
              actionLabel="Configurer l’apparence"
              onPress={onOpenAppearance}
            />

            <SectionTitle
              eyebrow="Compte"
              title="Sécurité"
              icon={{
                ios: "lock.shield.fill",
                android: "security",
                web: "security",
              }}
            />

            <View
              className="rounded-[20px] border bg-white p-3.5"
              style={{ borderColor: "#E5DFE8" }}
            >
              {passwordError ? (
                <View className="mb-3">
                  <ErrorMessage message={passwordError} />
                </View>
              ) : null}

              {passwordSuccess ? (
                <SuccessBanner message={passwordSuccess} compact />
              ) : null}

              <ProfileField
                label="Mot de passe actuel"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                autoCapitalize="none"
                secureTextEntry
                maxLength={100}
                accessibilityLabel="Mot de passe actuel"
              />

              <ProfileField
                label="Nouveau mot de passe"
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
                secureTextEntry
                maxLength={100}
                accessibilityLabel="Nouveau mot de passe"
              />

              <ProfileField
                label="Confirmer le nouveau mot de passe"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                secureTextEntry
                maxLength={100}
                accessibilityLabel="Confirmer le nouveau mot de passe"
              />

              <PrimaryButton
                icon={{
                  ios: "key.fill",
                  android: "key",
                  web: "key",
                }}
                label={
                  savingPassword
                    ? "Enregistrement..."
                    : "Modifier mon mot de passe"
                }
                disabled={savingPassword}
                onPress={() => void savePassword()}
              />
            </View>

            <SectionTitle
              eyebrow="Données"
              title="Confidentialité"
              icon={{
                ios: "hand.raised.fill",
                android: "privacy_tip",
                web: "privacy_tip",
              }}
            />

            <FeatureCard
              icon={{
                ios: "hand.raised.fill",
                android: "privacy_tip",
                web: "privacy_tip",
              }}
              title="Vos données et votre vie privée"
              description="Consultez les données utilisées par SmartTraining, leurs finalités, les mesures de sécurité et les modalités de demande."
              actionLabel="Voir la politique de confidentialité"
              onPress={onOpenPrivacy}
            />

            <View className="mt-5">
              <AccountDeletionRequestCard />
            </View>

            <View className="mt-3">
              <AccountSessionCard />
            </View>

            {profile ? (
              <View className="mb-2 mt-4 flex-row items-center justify-center">
                <View className="h-2 w-2 rounded-full bg-[#16A36A]" />
                <Text
                  className="ml-2 text-[11px] font-bold"
                  style={{ color: theme.colors.foregroundSubtle }}
                >
                  Compte actif · profil Administrateur
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );

  function SectionTitle({
    eyebrow,
    title,
    icon,
  }: {
    eyebrow: string;
    title: string;
    icon: SymbolName;
  }) {
    return (
      <View className="mb-2.5 mt-5 flex-row items-center">
        <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-[#F1E9FF]">
          <SymbolView
            name={icon}
            tintColor="#7C3AED"
            size={13}
            weight="bold"
          />
        </View>

        <View className="ml-2.5 min-w-0 flex-1">
          <Text
            className="text-[10px] font-black uppercase tracking-[0.6px]"
            style={{ color: theme.colors.foregroundSubtle }}
          >
            {eyebrow}
          </Text>

          <Text
            className="mt-0.5 text-[18px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {title}
          </Text>
        </View>
      </View>
    );
  }

  function SuccessBanner({
    message,
    compact = false,
  }: {
    message: string;
    compact?: boolean;
  }) {
    return (
      <View
        className={`${compact ? "mb-3" : "mt-3"} flex-row items-center rounded-[15px] bg-[#EAFBF3] px-3 py-2.5`}
      >
        <SymbolView
          name={{
            ios: "checkmark.circle.fill",
            android: "check_circle",
            web: "check_circle",
          }}
          tintColor="#16845A"
          size={14}
          weight="bold"
        />
        <Text className="ml-2 flex-1 text-[12px] font-bold text-[#16845A]">
          {message}
        </Text>
      </View>
    );
  }

  function SmallAction({
    icon,
    label,
    onPress,
    disabled = false,
  }: {
    icon: SymbolName;
    label: string;
    onPress: () => void;
    disabled?: boolean;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="min-w-0 flex-1 flex-row items-center justify-center rounded-[12px] border px-2 py-2.5"
        style={{
          backgroundColor: "#FBF9FC",
          borderColor: "#E5DFE8",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <SymbolView
          name={icon}
          tintColor="#7C3AED"
          size={11}
          weight="bold"
        />
        <Text
          numberOfLines={1}
          className="ml-1.5 text-[11px] font-black"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function PrimaryButton({
    icon,
    label,
    disabled,
    onPress,
  }: {
    icon: SymbolName;
    label: string;
    disabled: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="h-[52px] w-full flex-row items-center justify-center rounded-[14px]"
        style={{
          backgroundColor: theme.colors.accent,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <SymbolView
          name={icon}
          tintColor="#FFFFFF"
          size={14}
          weight="bold"
        />
        <Text className="ml-2 text-[13px] font-black text-white">
          {label}
        </Text>
      </Pressable>
    );
  }

  function FeatureCard({
    icon,
    title,
    description,
    actionLabel,
    onPress,
  }: {
    icon: SymbolName;
    title: string;
    description: string;
    actionLabel: string;
    onPress: () => void;
  }) {
    return (
      <View
        className="rounded-[20px] border bg-white p-3.5"
        style={{ borderColor: "#E5DFE8" }}
      >
        <View className="flex-row items-start">
          <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-[#F1E9FF]">
            <SymbolView
              name={icon}
              tintColor="#7C3AED"
              size={15}
              weight="bold"
            />
          </View>

          <View className="ml-3 min-w-0 flex-1">
            <Text
              className="text-[14px] font-black"
              style={{ color: theme.colors.foreground }}
            >
              {title}
            </Text>

            <Text
              className="mt-1 text-[11px] leading-[17px]"
              style={{ color: theme.colors.foregroundMuted }}
            >
              {description}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          android_ripple={{ color: "transparent" }}
          className="mt-3 flex-row items-center justify-between rounded-[13px] bg-[#F7F2FF] px-3 py-3"
        >
          <Text className="text-[12px] font-black text-[#7C3AED]">
            {actionLabel}
          </Text>
          <SymbolView
            name={{
              ios: "chevron.right",
              android: "chevron_right",
              web: "chevron_right",
            }}
            tintColor="#7C3AED"
            size={12}
            weight="bold"
          />
        </Pressable>
      </View>
    );
  }
}

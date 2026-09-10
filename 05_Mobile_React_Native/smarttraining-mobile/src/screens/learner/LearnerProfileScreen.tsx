import { isAxiosError } from "axios";
import * as ImagePicker from "expo-image-picker";
import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
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
  onLogout: () => void;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];
type AccountPanel =
  | "overview"
  | "profile"
  | "security"
  | "deletion"
  | "session";

const civilites: {
  value: LearnerCivilite;
  label: string;
}[] = [
  { value: "NON_RENSEIGNEE", label: "Non renseignée" },
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

function roleLabel(role: LearnerProfile["role"]): string {
  if (role === "FORMATEUR") return "Formateur";
  if (role === "ADMIN") return "Administrateur";
  return "Apprenant";
}

export default function LearnerProfileScreen({
  onBackHome,
  onOpenBecomeTrainer,
  onOpenAppearance,
  onOpenPrivacy,
  onLogout,
}: Props) {
  const { theme, themeName } = useSmartTrainingTheme();

  const [panel, setPanel] = useState<AccountPanel>("overview");
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
      rootStyle.colorScheme = themeName === "DARK" ? "dark" : "light";
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
    } catch (error: unknown) {
      setProfileError(
        messageFromError(error, "Impossible d’actualiser ton profil."),
      );
    } finally {
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
          "La photo sélectionnée n’a pas pu être préparée.",
        );
        return;
      }

      const dataUrl = `data:image/jpeg;base64,${asset.base64}`;

      if (dataUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
        setProfileError(
          "Cette photo est trop volumineuse. Choisis une image plus légère.",
        );
        return;
      }

      setAvatarDataUrl(dataUrl);
    } catch {
      setProfileError(
        "Impossible d’ouvrir la bibliothèque de photos.",
      );
    } finally {
      setSelectingPhoto(false);
    }
  }

  async function saveProfile() {
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = normalizeEmail(email);

    if (!cleanFirstName || !cleanLastName || !cleanEmail) {
      setProfileError(
        "Le prénom, le nom et l’adresse e-mail sont obligatoires.",
      );
      return;
    }

    if (!cleanEmail.includes("@")) {
      setProfileError("L’adresse e-mail n’est pas valide.");
      return;
    }

    if (emailChanged && !currentEmailPassword) {
      setProfileError(
        "Saisis ton mot de passe actuel pour modifier l’adresse e-mail.",
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

      setProfileSuccess("Ton profil a été mis à jour.");
    } catch (error: unknown) {
      setProfileError(
        messageFromError(
          error,
          "Ton profil n’a pas pu être enregistré.",
        ),
      );
    } finally {
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
        "Le nouveau mot de passe doit contenir entre 6 et 100 caractères.",
      );
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError(
        "Le nouveau mot de passe doit être différent de l’ancien.",
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
        "Ton mot de passe a été modifié.",
      );
    } catch (error: unknown) {
      setPasswordError(
        messageFromError(
          error,
          "Le mot de passe n’a pas pu être modifié.",
        ),
      );
    } finally {
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

  const loadedProfile = profile;
  const currentRoleLabel = roleLabel(loadedProfile.role);
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || email;

  return (
    <ScreenContainer
      edges={["left", "right"]}
      style={{ padding: 0, backgroundColor: "#F8F6F3" }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={theme.colors.accent}
              colors={[theme.colors.accent]}
            />
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          showsVerticalScrollIndicator={false}
        >
          <View className="mx-auto w-full max-w-[720px] px-3.5 pt-3">
            {panel === "overview" ? renderOverview() : null}
            {panel === "profile" ? renderProfileEditor() : null}
            {panel === "security" ? renderSecurity() : null}
            {panel === "deletion" ? renderDeletion() : null}
            {panel === "session" ? renderSession() : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );

  function renderOverview() {
    return (
      <>
        <View
          className="overflow-hidden rounded-[22px] border bg-white"
          style={{
            borderColor: "#E7E2EB",
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.045,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View className="h-1 bg-[#7C3AED]" />

          <View className="p-3.5">
            <View className="flex-row items-center">
              <View className="relative">
                {avatarDataUrl ? (
                  <Image
                    source={{ uri: avatarDataUrl }}
                    accessibilityLabel="Photo de profil"
                    className="h-[76px] w-[76px] rounded-full border"
                    style={{ borderColor: "#E7E2EB" }}
                  />
                ) : (
                  <View className="h-[76px] w-[76px] items-center justify-center rounded-full bg-[#F1E9FF]">
                    <Text className="text-[22px] font-black text-[#7C3AED]">
                      {displayInitials}
                    </Text>
                  </View>
                )}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Modifier la photo de profil"
                  onPress={() => {
                    setPanel("profile");
                    void choosePhoto();
                  }}
                  android_ripple={{ color: "transparent" }}
                  className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#7C3AED]"
                >
                  <SymbolView
                    name={{
                      ios: "camera.fill",
                      android: "photo_camera",
                      web: "photo_camera",
                    }}
                    tintColor="#FFFFFF"
                    size={13}
                    weight="bold"
                  />
                </Pressable>
              </View>

              <View className="ml-3 min-w-0 flex-1">
                <Text
                  numberOfLines={1}
                  className="text-[20px] font-black leading-[24px]"
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

                <View className="mt-2 self-start rounded-full bg-[#F3EEFF] px-2.5 py-1">
                  <Text className="text-[11px] font-black text-[#7C3AED]">
                    {currentRoleLabel}
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retour à l’accueil"
                onPress={onBackHome}
                android_ripple={{ color: "transparent" }}
                className="ml-2 h-9 w-9 items-center justify-center rounded-[12px] bg-[#F7F4FA]"
              >
                <SymbolView
                  name={{
                    ios: "house.fill",
                    android: "home",
                    web: "home",
                  }}
                  tintColor="#64748B"
                  size={15}
                  weight="bold"
                />
              </Pressable>
            </View>

            <View className="mt-3 flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setPanel("profile");
                  void choosePhoto();
                }}
                disabled={selectingPhoto}
                android_ripple={{ color: "transparent" }}
                className="min-h-[40px] flex-1 flex-row items-center justify-center rounded-[12px] border bg-white px-2"
                style={{
                  borderColor: "#E7E2EB",
                  opacity: selectingPhoto ? 0.55 : 1,
                }}
              >
                <SymbolView
                  name={{
                    ios: "photo.fill",
                    android: "photo_library",
                    web: "photo_library",
                  }}
                  tintColor="#7C3AED"
                  size={12}
                  weight="bold"
                />
                <Text
                  className="ml-1.5 text-[11px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  {selectingPhoto ? "Ouverture..." : "Changer la photo"}
                </Text>
              </Pressable>

              {avatarDataUrl ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setAvatarDataUrl(null);
                    setPanel("profile");
                  }}
                  android_ripple={{ color: "transparent" }}
                  className="min-h-[40px] flex-1 flex-row items-center justify-center rounded-[12px] border bg-[#FFF7F7] px-2"
                  style={{ borderColor: "#F1CCCC" }}
                >
                  <SymbolView
                    name={{
                      ios: "trash.fill",
                      android: "delete",
                      web: "delete",
                    }}
                    tintColor="#D33A3A"
                    size={12}
                    weight="bold"
                  />
                  <Text className="ml-1.5 text-[11px] font-black text-[#D33A3A]">
                    Retirer
                  </Text>
                </Pressable>
              ) : null}
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

        <View className="mt-3 overflow-hidden rounded-[20px] border bg-white" style={{ borderColor: "#E7E2EB" }}>
          <MenuRow
            icon={{ ios: "person.fill", android: "person", web: "person" }}
            tone="blue"
            title="Informations personnelles"
            subtitle="Identité, civilité et adresse e-mail"
            onPress={() => setPanel("profile")}
          />

          {loadedProfile.role === "APPRENANT" ? (
            <MenuRow
              icon={{ ios: "graduationcap.fill", android: "school", web: "school" }}
              tone="violet"
              title="Devenir formateur"
              subtitle="Demander à créer et animer des formations"
              onPress={onOpenBecomeTrainer}
            />
          ) : null}

          <MenuRow
            icon={{ ios: "paintpalette.fill", android: "palette", web: "palette" }}
            tone="pink"
            title="Apparence"
            subtitle="Thème et couleur d’accent"
            onPress={onOpenAppearance}
          />

          <MenuRow
            icon={{ ios: "lock.fill", android: "lock", web: "lock" }}
            tone="green"
            title="Sécurité"
            subtitle="Changer mon mot de passe"
            onPress={() => setPanel("security")}
          />

          <MenuRow
            icon={{ ios: "hand.raised.fill", android: "privacy_tip", web: "privacy_tip" }}
            tone="blue"
            title="Confidentialité"
            subtitle="Mes données et ma vie privée"
            onPress={onOpenPrivacy}
          />

          <MenuRow
            icon={{ ios: "trash.fill", android: "delete", web: "delete" }}
            tone="red"
            title="Suppression du compte"
            subtitle="Gérer ma demande de suppression"
            onPress={() => setPanel("deletion")}
          />

          <MenuRow
            icon={{ ios: "rectangle.portrait.and.arrow.right", android: "logout", web: "logout" }}
            tone="gray"
            title="Se déconnecter"
            subtitle="Fermer la session sur cet appareil"
            onPress={onLogout}
            last
          />
        </View>

        <View className="mt-3 flex-row items-center justify-center">
          <View
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: loadedProfile.enabled ? "#16A36A" : "#94A3B8",
            }}
          />
          <Text
            className="ml-2 text-[11px] font-bold"
            style={{ color: theme.colors.foregroundSubtle }}
          >
            {loadedProfile.enabled ? "Compte actif" : "Compte inactif"} · {currentRoleLabel}
          </Text>
        </View>
      </>
    );
  }

  function renderProfileEditor() {
    return (
      <>
        <SubPageHeader
          title="Informations personnelles"
          subtitle="Modifie uniquement les informations de ton profil."
          onBack={() => setPanel("overview")}
        />

        {profileError ? (
          <View className="mb-3">
            <ErrorMessage message={profileError} />
          </View>
        ) : null}

        {profileSuccess ? (
          <SuccessBanner message={profileSuccess} compact />
        ) : null}

        <View className="mb-3 rounded-[20px] border bg-white p-3.5" style={{ borderColor: "#E7E2EB" }}>
          <View className="items-center">
            <View className="relative">
              {avatarDataUrl ? (
                <Image
                  source={{ uri: avatarDataUrl }}
                  accessibilityLabel="Photo de profil"
                  className="h-[86px] w-[86px] rounded-full border"
                  style={{ borderColor: "#E7E2EB" }}
                />
              ) : (
                <View className="h-[86px] w-[86px] items-center justify-center rounded-full bg-[#F1E9FF]">
                  <Text className="text-[25px] font-black text-[#7C3AED]">
                    {displayInitials}
                  </Text>
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Changer la photo"
                onPress={() => void choosePhoto()}
                disabled={selectingPhoto}
                android_ripple={{ color: "transparent" }}
                className="absolute -bottom-1 -right-1 h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-[#7C3AED]"
              >
                <SymbolView
                  name={{ ios: "camera.fill", android: "photo_camera", web: "photo_camera" }}
                  tintColor="#FFFFFF"
                  size={14}
                  weight="bold"
                />
              </Pressable>
            </View>

            <Text
              className="mt-2 text-[11px]"
              style={{ color: theme.colors.foregroundMuted }}
            >
              {selectingPhoto
                ? "Ouverture de la galerie..."
                : "Appuie sur l’appareil photo pour modifier l’image"}
            </Text>

            {avatarDataUrl ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setAvatarDataUrl(null)}
                android_ripple={{ color: "transparent" }}
                className="mt-2 rounded-full bg-[#FFF3F3] px-3 py-1.5"
              >
                <Text className="text-[11px] font-black text-[#D33A3A]">
                  Retirer la photo
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View className="rounded-[20px] border bg-white p-3.5" style={{ borderColor: "#E7E2EB" }}>
          <FieldLabel label="Civilité" />

          <View className="mb-3 flex-row gap-2">
            {civilites.map((item) => {
              const selected = item.value === civilite;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => setCivilite(item.value)}
                  accessibilityRole="radio"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected }}
                  android_ripple={{ color: "transparent" }}
                  className="min-h-[46px] min-w-0 flex-1 items-center justify-center rounded-[12px] border px-1"
                  style={{
                    borderColor: selected ? "#7C3AED" : "#E2E8F0",
                    borderWidth: selected ? 2 : 1,
                    backgroundColor: selected ? "#F6F0FF" : "#FFFFFF",
                  }}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    className="text-[14px] font-black"
                    style={{
                      color: selected ? "#7C3AED" : theme.colors.foregroundMuted,
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ProfileField
            label="Prénom"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            maxLength={80}
            accessibilityLabel="Prénom"
          />

          <ProfileField
            label="Nom"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            maxLength={80}
            accessibilityLabel="Nom"
          />

          <ProfileField
            label="Adresse e-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            maxLength={150}
            accessibilityLabel="Adresse e-mail"
          />

          {emailChanged ? (
            <View className="mb-3 rounded-[14px] border bg-[#FFF9EE] p-3" style={{ borderColor: "#F0D7AD" }}>
              <View className="mb-2 flex-row items-start">
                <SymbolView
                  name={{ ios: "lock.shield.fill", android: "verified_user", web: "verified_user" }}
                  tintColor="#B76B00"
                  size={14}
                  weight="bold"
                />
                <Text className="ml-2 flex-1 text-[11px] leading-[17px] text-[#80521A]">
                  Ton mot de passe actuel est obligatoire uniquement parce que tu modifies ton adresse e-mail.
                </Text>
              </View>

              <TextInput
                value={currentEmailPassword}
                accessibilityLabel="Mot de passe actuel pour modifier l’adresse e-mail"
                onChangeText={setCurrentEmailPassword}
                secureTextEntry
                placeholder="Mot de passe actuel"
                placeholderTextColor={theme.colors.foregroundSubtle}
                autoCapitalize="none"
                className="min-h-[50px] rounded-[12px] border bg-white px-3.5 text-[14px]"
                style={{
                  borderColor: "#E2E8F0",
                  color: theme.colors.foreground,
                }}
              />
            </View>
          ) : null}

          <View className="mb-3 rounded-[14px] bg-[#F6F0FF] px-3 py-2.5">
            <Text className="text-[10px] font-black uppercase tracking-[0.6px] text-[#A08AB7]">
              Rôle
            </Text>
            <Text
              className="mt-0.5 text-[14px] font-black"
              style={{ color: theme.colors.foreground }}
            >
              {currentRoleLabel}
            </Text>
          </View>

          <PrimaryButton
            icon={{ ios: "checkmark.circle.fill", android: "save", web: "save" }}
            label={savingProfile ? "Enregistrement..." : "Enregistrer mon profil"}
            disabled={savingProfile}
            onPress={() => void saveProfile()}
          />
        </View>
      </>
    );
  }

  function renderSecurity() {
    return (
      <>
        <SubPageHeader
          title="Sécurité"
          subtitle="Protège ton compte et modifie ton mot de passe."
          onBack={() => setPanel("overview")}
        />

        <View className="rounded-[20px] border bg-white p-3.5" style={{ borderColor: "#E7E2EB" }}>
          <View className="mb-3 flex-row items-start">
            <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-[#E8F8F0]">
              <SymbolView
                name={{ ios: "lock.fill", android: "lock", web: "lock" }}
                tintColor="#13966A"
                size={16}
                weight="bold"
              />
            </View>
            <View className="ml-3 min-w-0 flex-1">
              <Text
                className="text-[18px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Changer mon mot de passe
              </Text>
              <Text
                className="mt-1 text-[12px] leading-[18px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Le nouveau mot de passe doit contenir entre 6 et 100 caractères et être différent de l’ancien.
              </Text>
            </View>
          </View>

          {passwordSuccess ? (
            <SuccessBanner message={passwordSuccess} compact />
          ) : null}

          {passwordError ? (
            <View className="mb-3">
              <ErrorMessage message={passwordError} />
            </View>
          ) : null}

          <ProfileField
            label="Mot de passe actuel"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            maxLength={100}
            accessibilityLabel="Mot de passe actuel"
          />

          <ProfileField
            label="Nouveau mot de passe"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            maxLength={100}
            accessibilityLabel="Nouveau mot de passe"
          />

          <ProfileField
            label="Confirmer le nouveau mot de passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            maxLength={100}
            accessibilityLabel="Confirmer le nouveau mot de passe"
          />

          <PrimaryButton
            icon={{ ios: "key.fill", android: "key", web: "key" }}
            label={savingPassword ? "Modification..." : "Modifier mon mot de passe"}
            disabled={savingPassword}
            onPress={() => void savePassword()}
          />
        </View>

        <View className="mt-3 overflow-hidden rounded-[20px] border bg-white" style={{ borderColor: "#E7E2EB" }}>
          <MenuRow
            icon={{ ios: "hand.raised.fill", android: "privacy_tip", web: "privacy_tip" }}
            tone="blue"
            title="Confidentialité"
            subtitle="Consulter la politique de confidentialité"
            onPress={onOpenPrivacy}
          />
          <MenuRow
            icon={{ ios: "trash.fill", android: "delete", web: "delete" }}
            tone="red"
            title="Suppression du compte"
            subtitle="Gérer ma demande de suppression"
            onPress={() => setPanel("deletion")}
            last
          />
        </View>
      </>
    );
  }

  function renderDeletion() {
    return (
      <>
        <SubPageHeader
          title="Suppression du compte"
          subtitle="Retrouve ici le suivi réel de ta demande."
          onBack={() => setPanel("overview")}
        />

        <AccountDeletionRequestCard />

        <View className="mt-3 overflow-hidden rounded-[20px] border bg-white" style={{ borderColor: "#E7E2EB" }}>
          <MenuRow
            icon={{ ios: "hand.raised.fill", android: "privacy_tip", web: "privacy_tip" }}
            tone="blue"
            title="Confidentialité"
            subtitle="Consulter la politique de confidentialité"
            onPress={onOpenPrivacy}
            last
          />
        </View>
      </>
    );
  }

  function renderSession() {
    return (
      <>
        <SubPageHeader
          title="Session"
          subtitle="Gère la session SmartTraining ouverte sur cet appareil."
          onBack={() => setPanel("overview")}
        />

        <AccountSessionCard />
      </>
    );
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
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    autoCapitalize?: "none" | "words";
    keyboardType?: "email-address";
    secureTextEntry?: boolean;
    maxLength?: number;
    accessibilityLabel: string;
  }) {
    return (
      <View className="mb-3">
        <FieldLabel label={label} />
        <TextInput
          value={value}
          accessibilityLabel={accessibilityLabel}
          onChangeText={onChangeText}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          placeholderTextColor={theme.colors.foregroundSubtle}
          className="min-h-[50px] rounded-[12px] border bg-white px-3.5 text-[14px]"
          style={{
            borderColor: "#E2E8F0",
            color: theme.colors.foreground,
          }}
        />
      </View>
    );
  }

  function FieldLabel({ label }: { label: string }) {
    return (
      <Text
        className="mb-1.5 text-[12px] font-black"
        style={{ color: theme.colors.foreground }}
      >
        {label}
      </Text>
    );
  }

  function SubPageHeader({
    title,
    subtitle,
    onBack,
  }: {
    title: string;
    subtitle: string;
    onBack: () => void;
  }) {
    return (
      <View className="mb-3 flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour au compte"
          onPress={onBack}
          android_ripple={{ color: "transparent" }}
          className="h-10 w-10 items-center justify-center rounded-[13px] border bg-white"
          style={{ borderColor: "#E7E2EB" }}
        >
          <SymbolView
            name={{ ios: "chevron.left", android: "chevron_left", web: "chevron_left" }}
            tintColor={theme.colors.foreground}
            size={15}
            weight="bold"
          />
        </Pressable>

        <View className="ml-3 min-w-0 flex-1">
          <Text
            className="text-[20px] font-black leading-[24px]"
            style={{ color: theme.colors.foreground }}
          >
            {title}
          </Text>
          <Text
            className="mt-0.5 text-[12px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {subtitle}
          </Text>
        </View>
      </View>
    );
  }

  function MenuRow({
    icon,
    tone,
    title,
    subtitle,
    onPress,
    last = false,
  }: {
    icon: SymbolName;
    tone: "violet" | "blue" | "green" | "pink" | "red" | "gray";
    title: string;
    subtitle: string;
    onPress: () => void;
    last?: boolean;
  }) {
    const tones = {
      violet: { background: "#F2EAFE", foreground: "#7C3AED" },
      blue: { background: "#EAF3FF", foreground: "#2877D4" },
      green: { background: "#E8F8F0", foreground: "#13966A" },
      pink: { background: "#FDEAF7", foreground: "#C63A98" },
      red: { background: "#FFF0F0", foreground: "#D33A3A" },
      gray: { background: "#EEF2F6", foreground: "#64748B" },
    } as const;

    const current = tones[tone];

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={subtitle}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className={`min-h-[72px] flex-row items-center px-3 py-3 ${last ? "" : "border-b"}`}
        style={{ borderBottomColor: "#EEEAF0" }}
      >
        <View
          className="h-10 w-10 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: current.background }}
        >
          <SymbolView
            name={icon}
            tintColor={current.foreground}
            size={16}
            weight="bold"
          />
        </View>

        <View className="ml-3 min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className="text-[14px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {title}
          </Text>
          <Text
            numberOfLines={1}
            className="mt-0.5 text-[11px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {subtitle}
          </Text>
        </View>

        <View className="ml-2 h-7 w-7 items-center justify-center rounded-full bg-[#F8F5FA]">
          <SymbolView
            name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
            tintColor="#7C3AED"
            size={10}
            weight="bold"
          />
        </View>
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
        className="min-h-[50px] w-full flex-row items-center justify-center rounded-[13px] bg-[#7C3AED] px-4"
        style={{ opacity: disabled ? 0.55 : 1 }}
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

  function SuccessBanner({
    message,
    compact = false,
  }: {
    message: string;
    compact?: boolean;
  }) {
    return (
      <View
        className={`${compact ? "mb-3" : "mt-3"} flex-row items-center rounded-[14px] bg-[#EAFBF3] px-3 py-2.5`}
      >
        <SymbolView
          name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }}
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
}
